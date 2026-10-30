/* Executar: node --test tests/ */
const test = require('node:test'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const S = require('../emission-snapshot.js');
const U = () => crypto.randomUUID();
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const blob = t => new Blob([t], { type: 'image/jpeg' });
const clonar = o => JSON.parse(JSON.stringify(o));

function cenario() {
  const obra = { id: U(), nome: 'Edifício Sede', cliente: 'CGU', endereco: 'SAUS', contrato: '', art: '', criadoEm: 1 };
  const vistoria = { id: U(), obraId: obra.id, local: 'Térreo', tipo: 'Vistoria técnica de rotina', data: '2026-10-01', hora: '09:00', status: 'rascunho', nFotos: 1, seq: 7, ano: 2026, updatedAt: 5,
    constatacoes: [{ id: U(), titulo: 'Fissura', tipo: 'Fissura em alvenaria / vedação', gravidade: 'Alta', ambiente: 'Fachada', local: 'P1', descricao: 'd', recomendacao: 'r', fotoIds: [] }] };
  const foto = { id: U(), vistoriaId: vistoria.id, blob: blob('IMG-A'), base: blob('IMG-BASE'), ts: 100, lat: -15.1, lon: -47.9, acc: 8, descricao: 'x', origem: 'camera', w: 10, h: 20, marks: [{ t: 'num', n: 1, x1: 0.1, y1: 0.2, c: 'vermelho' }], notas: [{ n: 1, txt: 'a' }], stampLines: ['a', 'b'], bytes: new Uint8Array([1]) };
  vistoria.constatacoes[0].fotoIds = [foto.id];
  return { obra, vistoria, fotos: [foto], cfg: { empresa: { nome: 'CGU' }, rt: { nome: 'RT' }, usuario: 'u' }, emissao: { tipo: 'tecnico', numero: { seq: 7, ano: 2026 }, rev: 0 }, appVersion: '1.0.6' };
}
async function emitido(c = cenario()) {
  const conteudo = await S.capturar(c);
  return { c, snap: await S.criar({ id: U(), emissaoId: U(), formato: 'pdf', conteudo, appVersion: '1.0.6' }) };
}

test('canonicalização: chaves ordenadas, sem espaços, undefined omitido, -0 vira 0', () => {
  assert.equal(S.canonicalize({ b: 1, a: [2, { d: undefined, c: -0 }], z: null, s: 'é"' }), '{"a":[2,{"c":0}],"b":1,"s":"é\\"","z":null}');
});
test('canonicalização: independe da ordem de inserção', () => {
  assert.equal(S.canonicalize({ a: 1, b: { x: 1, y: 2 } }), S.canonicalize({ b: { y: 2, x: 1 }, a: 1 }));
});
test('canonicalização: rejeita não-JSON e não finitos', () => {
  for (const bad of [NaN, Infinity, -Infinity, 1n, () => 1, Symbol('x'), new Date(), new Map(), new Uint8Array(2), blob('x')])
    assert.throws(() => S.canonicalize({ v: bad }), undefined, String(typeof bad));
  const ciclo = {}; ciclo.a = ciclo; assert.throws(() => S.canonicalize(ciclo), /circular/);
});
test('hash conhecido: SHA-256 do JSON canônico UTF-8', async () => {
  assert.equal(await S.hashConteudo({ nome: 'ação', n: 1 }), sha('{"n":1,"nome":"ação"}'));
});
test('captura inclui vistoria, constatações, metadados e evidências com hash dos bytes; sem blobs; sem status', async () => {
  const { c, snap } = await emitido();
  const k = snap.conteudo;
  assert.equal(k.vistoria.id, c.vistoria.id); assert.equal(k.constatacoes.length, 1);
  assert.equal(k.constatacoes[0].fotoIds[0], c.fotos[0].id);
  const e = k.evidencias[0];
  assert.equal(e.sha256, sha('IMG-A')); assert.equal(e.baseSha256, sha('IMG-BASE')); assert.equal(e.bytes, 5);
  assert.deepEqual(e.marks, c.fotos[0].marks); assert.equal(e.lat, -15.1);
  for (const proibido of ['blob', 'base', 'cropBackup']) assert.ok(!(proibido in e));
  assert.ok(!('status' in k.vistoria)); assert.ok(!('constatacoes' in k.vistoria));
  assert.deepEqual(k.emissao, { tipo: 'tecnico', numero: { seq: 7, ano: 2026 }, rev: 0 });
  assert.equal(snap.hash, await S.hashConteudo(k));
  assert.deepEqual(await S.validar(snap), { ok: true, erros: [] });
});
test('reedição posterior da vistoria/constatação/foto/configuração não altera o snapshot capturado', async () => {
  const { c, snap } = await emitido();
  const antes = S.canonicalize(snap.conteudo), h = snap.hash;
  c.vistoria.constatacoes[0].gravidade = 'Baixa'; c.vistoria.constatacoes.push({ id: U() }); c.vistoria.local = 'Outro';
  c.obra.nome = 'Renomeado'; c.fotos[0].marks.push({ t: 'num', n: 2 }); c.fotos[0].descricao = 'mudou'; c.cfg.rt.nome = 'Outro RT';
  assert.equal(S.canonicalize(snap.conteudo), antes);
  assert.equal(snap.hash, h);
  assert.equal((await S.validar(snap)).ok, true);
});
test('mesmo conteúdo => mesmo hash; conteúdo ou bytes de foto diferentes => hash diferente', async () => {
  const c = cenario();
  const a = await S.hashConteudo(await S.capturar(c));
  assert.equal(a, await S.hashConteudo(await S.capturar(c)));
  const f = c.fotos[0];
  const h1 = (await S.capturar({ ...c, fotos: [{ ...f, blob: blob('IMG-A') }] })).evidencias[0].sha256;
  const h2 = (await S.capturar({ ...c, fotos: [{ ...f, blob: blob('IMG-B') }] })).evidencias[0].sha256;
  assert.notEqual(h1, h2);
  c.vistoria.constatacoes[0].descricao = 'outra';
  assert.notEqual(await S.hashConteudo(await S.capturar(c)), a);
});
test('adulteração é detectada: conteúdo, hash, vínculo, schema, id inválido', async () => {
  const { snap } = await emitido();
  const mut = f => { const x = clonar(snap); f(x); return x; };
  for (const [nome, x] of [
    ['conteudo', mut(x => { x.conteudo.constatacoes[0].gravidade = 'Baixa'; })],
    ['hash zerado', mut(x => { x.hash = '0'.repeat(64); })],
    ['hash formato', mut(x => { x.hash = 'ABC'; })],
    ['vistoriaId', mut(x => { x.vistoriaId = U(); })],
    ['schema', mut(x => { x.schema = 'x'; })],
    ['versão', mut(x => { x.schemaVersion = 2; })],
    ['id html', mut(x => { x.id = '"><img src=x onerror=alert(1)>'; })],
    ['sem sha foto', mut(x => { delete x.conteudo.evidencias[0].sha256; })]
  ]) assert.equal((await S.validar(x)).ok, false, nome);
  assert.equal((await S.validar(null)).ok, false);
  assert.equal((await S.validar([])).ok, false);
});
test('hash forjado: conteúdo alterado com hash recalculado passa em validar, mas é pego pelo hash gravado na emissão', async () => {
  const { snap } = await emitido();
  const em = { id: snap.emissaoId, snapshotId: snap.id, snapshotHash: snap.hash };
  const forjado = clonar(snap);
  forjado.conteudo.constatacoes[0].gravidade = 'Informativa';
  forjado.hash = await S.hashConteudo(forjado.conteudo);
  assert.equal((await S.validar(forjado)).ok, true);                       // consistente internamente
  assert.equal((await S.verificarEmissao(em, forjado)).estado, 'divergente'); // mas não é o que foi emitido
  assert.equal(S.compararExistente(snap, forjado), 'conflito');            // na mesclagem nunca sobrescreve
});
test('limite de tamanho por snapshot', async () => {
  const c = cenario(); c.vistoria.constatacoes[0].descricao = 'x'.repeat(S.MAX_SNAPSHOT_BYTES + 1);
  await assert.rejects(async () => S.hashConteudo(await S.capturar(c)), /excede/);
});
test('emissões legadas: sem snapshot => estado legado explícito, nada fabricado', async () => {
  const legada = { id: U(), vistoriaId: U(), tipo: 'tecnico', formato: 'pdf', numero: 'VT-001/2025', rev: 0, data: 1, arquivo: 'a.pdf', usuario: '' };
  const r = await S.verificarEmissao(legada, undefined);
  assert.equal(r.estado, 'legado'); assert.match(r.detalhe, /não verificável/);
  assert.equal((await S.verificarEmissao(legada, await emitido().then(x => x.snap))).estado, 'legado'); // snapshot alheio não "adota" a legada
});
test('verificarEmissao: ausente, divergente, verificado', async () => {
  const { snap } = await emitido();
  const em = { id: snap.emissaoId, snapshotId: snap.id, snapshotHash: snap.hash };
  assert.equal((await S.verificarEmissao(em, null)).estado, 'ausente');
  assert.equal((await S.verificarEmissao(em, snap)).estado, 'verificado');
  assert.equal((await S.verificarEmissao({ ...em, snapshotHash: '1'.repeat(64) }, snap)).estado, 'divergente');
  assert.equal((await S.verificarEmissao({ ...em, id: U() }, snap)).estado, 'divergente');
  const adulterado = clonar(snap); adulterado.conteudo.obra.nome = 'X';
  assert.equal((await S.verificarEmissao(em, adulterado)).estado, 'divergente');
});
test('compararExistente: novo / duplicata idempotente / conflito', async () => {
  const { snap } = await emitido();
  assert.equal(S.compararExistente(undefined, snap), 'novo');
  assert.equal(S.compararExistente(snap, clonar(snap)), 'duplicata');
  assert.equal(S.compararExistente(snap, { ...snap, hash: '2'.repeat(64) }), 'conflito');
});
test('revisões: nova emissão após edição gera snapshot distinto e preserva o anterior', async () => {
  const c = cenario();
  const r0 = await emitido(c); const antes = S.canonicalize(r0.snap.conteudo);
  c.vistoria.constatacoes[0].descricao = 'revisada'; c.emissao = { ...c.emissao, rev: 1 };
  const r1 = await emitido(c);
  assert.notEqual(r0.snap.hash, r1.snap.hash);
  assert.equal(S.canonicalize(r0.snap.conteudo), antes);
  assert.equal(r0.snap.rev, 0); assert.equal(r1.snap.rev, 1);
});
