/* Testa db.js contra um IndexedDB simulado (fake-indexeddb). Não é dependência do projeto:
   npm install fake-indexeddb numa pasta fora do repositório e rode com FAKE_IDB=<pasta>/node_modules/fake-indexeddb
   (sem isso os testes são pulados). Não substitui o teste em navegador real. */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
let fake = null;
try { fake = require(process.env.FAKE_IDB || 'fake-indexeddb'); } catch { /* pulado */ }
const skip = fake ? false : 'fake-indexeddb indisponível (defina FAKE_IDB)';
const src = fs.readFileSync(path.join(__dirname, '..', 'db.js'), 'utf8');

/* Cada chamada simula uma aba: nova instância de DB sobre o mesmo banco. */
const novaAba = (idb) => new Function('indexedDB', 'crypto', src + '; return DB;')(idb, globalThis.crypto);
const nomeBanco = 'cgu-vistorias';
const novoIdb = () => new fake.IDBFactory();   // banco isolado por teste
const vist = (id, extra = {}) => ({ id, obraId: 'obra-0001', local: id, constatacoes: [], status: 'rascunho', ...extra });

test('Promise.all em abas distintas: vistorias diferentes recebem seq únicos e consecutivos', { skip }, async () => {
  const idb = novoIdb();
  const abas = [novaAba(idb), novaAba(idb), novaAba(idb)];
  for (const a of abas) await a.open();
  for (let i = 0; i < 24; i++) await abas[0].put('vistorias', vist('vistoria-' + String(i).padStart(3, '0')));
  const rs = await Promise.all(Array.from({ length: 24 }, (_, i) => abas[i % 3].reservarNumeracao('vistoria-' + String(i).padStart(3, '0'), 2026)));
  assert.deepEqual(rs.map(r => r.seq).sort((a, b) => a - b), Array.from({ length: 24 }, (_, i) => i + 1));
  assert.ok(rs.every(r => r.ano === 2026));
  assert.equal(await abas[1].getSetting('seq-2026', 0), 24);
  for (let i = 0; i < 24; i++) assert.equal((await abas[2].get('vistorias', 'vistoria-' + String(i).padStart(3, '0'))).seq, rs[i].seq); // vistoria gravada na mesma transação
});
test('reservar repetidamente a MESMA vistoria é idempotente e não consome números', { skip }, async () => {
  const idb = novoIdb();
  const a = novaAba(idb), b = novaAba(idb); await a.open(); await b.open();
  await a.put('vistorias', vist('vistoria-unica'));
  const rs = await Promise.all([a, b, a, b, a, b, a, b].map(d => d.reservarNumeracao('vistoria-unica', 2026)));
  assert.ok(rs.every(r => r.seq === 1 && r.ano === 2026));
  assert.equal(await a.getSetting('seq-2026', 0), 1);
  await a.put('vistorias', vist('vistoria-outra'));
  assert.equal((await b.reservarNumeracao('vistoria-outra', 2026)).seq, 2);
});
test('vistoria com seq/ano já gravados mantém o número e o ano originais', { skip }, async () => {
  const idb = novoIdb(); const d = novaAba(idb); await d.open();
  await d.put('vistorias', vist('vistoria-velha', { seq: 41, ano: 2025 }));
  assert.deepEqual(await d.reservarNumeracao('vistoria-velha', 2026), { seq: 41, ano: 2025 });
  assert.equal(await d.getSetting('seq-2026', 0), 0);
});
test('anos separados têm contadores separados; vistoria inexistente rejeita sem consumir número', { skip }, async () => {
  const idb = novoIdb(); const d = novaAba(idb); await d.open();
  await d.put('vistorias', vist('vistoria-a')); await d.put('vistorias', vist('vistoria-b'));
  assert.equal((await d.reservarNumeracao('vistoria-a', 2026)).seq, 1);
  assert.equal((await d.reservarNumeracao('vistoria-b', 2027)).seq, 1);
  await assert.rejects(() => d.reservarNumeracao('nao-existe', 2026));
  assert.equal(await d.getSetting('seq-2026', 0), 1);
});
test('registrarEmissao é atômico (snapshot, arquivo, emissão) e snapshot/arquivo nunca são sobrescritos', { skip }, async () => {
  const idb = novoIdb(); const d = novaAba(idb); await d.open();
  const sn = { id: 's1', vistoriaId: 'v1', emissaoId: 'e1', hash: 'h' }, ar = { id: 'a1', emissaoId: 'e1', snapshotId: 's1' }, em = { id: 'e1', vistoriaId: 'v1' };
  await d.registrarEmissao(sn, em, ar);
  assert.deepEqual(await d.get('snapshots', 's1'), sn); assert.deepEqual(await d.get('arquivosEmitidos', 'a1'), ar); assert.deepEqual(await d.get('emissoes', 'e1'), em);
  // snapshot repetido: nada do segundo lote pode persistir
  await assert.rejects(() => d.registrarEmissao({ ...sn, hash: 'FORJADO' }, { id: 'e2', vistoriaId: 'v1' }, { id: 'a2', emissaoId: 'e2', snapshotId: 's1' }));
  assert.equal((await d.get('snapshots', 's1')).hash, 'h');
  assert.equal(await d.get('emissoes', 'e2'), undefined); assert.equal(await d.get('arquivosEmitidos', 'a2'), undefined);
  // arquivo repetido com snapshot novo: nada persiste
  await assert.rejects(() => d.registrarEmissao({ ...sn, id: 's3', emissaoId: 'e3' }, { id: 'e3' }, { ...ar, hash: 'x' }));
  assert.equal(await d.get('snapshots', 's3'), undefined); assert.equal(await d.get('emissoes', 'e3'), undefined);
  await assert.rejects(() => d.addSnapshot(sn));
  assert.equal(typeof d.delSnapshot, 'undefined');
});
test('migração IndexedDB v1 → v3 preserva obra, vistoria, foto, emissão legada e settings; cria stores novas', { skip }, async () => {
  const idb = novoIdb();
  await new Promise((res, rej) => {                        // banco no formato da v1.0.6
    const r = idb.open(nomeBanco, 1);
    r.onupgradeneeded = e => { const d = e.target.result;
      d.createObjectStore('obras', { keyPath: 'id' }); d.createObjectStore('vistorias', { keyPath: 'id' }).createIndex('obraId', 'obraId');
      d.createObjectStore('fotos', { keyPath: 'id' }).createIndex('vistoriaId', 'vistoriaId'); d.createObjectStore('emissoes', { keyPath: 'id' }).createIndex('vistoriaId', 'vistoriaId');
      d.createObjectStore('settings', { keyPath: 'key' }); };
    r.onsuccess = () => { const d = r.result, t = d.transaction(['obras', 'vistorias', 'fotos', 'emissoes', 'settings'], 'readwrite');
      t.objectStore('obras').put({ id: 'obra-0001', nome: 'Sede' }); t.objectStore('vistorias').put({ id: 'vist-0001', obraId: 'obra-0001', seq: 3, ano: 2025 });
      t.objectStore('fotos').put({ id: 'foto-0001', vistoriaId: 'vist-0001', ts: 1 }); t.objectStore('emissoes').put({ id: 'em-legada', vistoriaId: 'vist-0001', numero: 'VT-003/2025', rev: 0 });
      t.objectStore('settings').put({ key: 'seq-2025', value: 3 }); t.oncomplete = () => { d.close(); res(); }; t.onerror = () => rej(t.error); };
    r.onerror = () => rej(r.error);
  });
  const d = novaAba(idb); await d.open();
  assert.equal((await d.get('obras', 'obra-0001')).nome, 'Sede'); assert.equal((await d.get('vistorias', 'vist-0001')).seq, 3);
  assert.equal((await d.by('fotos', 'vistoriaId', 'vist-0001')).length, 1); assert.equal((await d.get('emissoes', 'em-legada')).numero, 'VT-003/2025');
  assert.equal(await d.getSetting('seq-2025', 0), 3);
  assert.deepEqual(await d.all('snapshots'), []); assert.deepEqual(await d.all('arquivosEmitidos'), []);
  assert.equal((await d.by('snapshots', 'vistoriaId', 'x')).length, 0); assert.equal((await d.by('arquivosEmitidos', 'emissaoId', 'x')).length, 0);
  await d.put('vistorias', vist('vist-0002')); assert.equal((await d.reservarNumeracao('vist-0002', 2025)).seq, 4);   // contador legado continua
  const SnapshotLib = require('../emission-snapshot.js');                                                               // emissão legada segue legível como legado
  assert.equal((await SnapshotLib.verificarEmissao(await d.get('emissoes', 'em-legada'), undefined)).estado, 'legado');
});
test('DB.uid gera UUID v4', { skip }, async () => {
  const d = novaAba(novoIdb());
  for (let i = 0; i < 20; i++) assert.match(d.uid(), /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});
test('app.js: emitir usa reservarNumeracao (sem nextSeq nem get/put de seq fora da transação)', () => {
  const app = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  const corpo = app.slice(app.indexOf('async function emitir('), app.indexOf('function baixar('));
  assert.match(corpo, /DB\.reservarNumeracao\(vid, new Date\(\)\.getFullYear\(\)\)/);
  assert.doesNotMatch(corpo, /nextSeq|x\.seq = /);
});
test('controle negativo: o nextSeq antigo (get+set separados) duplica números entre abas concorrentes', { skip }, async () => {
  const idb = novoIdb(); const a = novaAba(idb), b = novaAba(idb); await a.open(); await b.open();
  const ns = await Promise.all([a, b, a, b, a, b].map(d => d.nextSeq(2026)));
  assert.ok(new Set(ns).size < ns.length, 'esperado duplicar: ' + ns);   // documenta o defeito que reservarNumeracao corrige
});
