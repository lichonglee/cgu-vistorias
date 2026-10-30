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
/* linha de emissões coerente com o snapshot, como o app grava */
const linha = (snap, extra = {}) => ({ id: snap.emissaoId, vistoriaId: snap.vistoriaId, obraId: snap.obraId, tipo: snap.tipo, formato: snap.formato, rev: snap.rev,
  numero: `${{ tecnico: 'VT', fotografico: 'MF', consolidado: 'RC' }[snap.tipo]}-${String(snap.numero.seq).padStart(3, '0')}/${snap.numero.ano}`, arquivo: 'VT-007-2026_Rev00.pdf', snapshotId: snap.id, snapshotHash: snap.hash, ...extra });
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
  assert.equal(snap.hash, await S.hashSnapshot(snap));
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
    ['formato do envelope', mut(x => { x.formato = 'docx'; })],
    ['numero do envelope', mut(x => { x.numero = { seq: 99, ano: 2026 }; })],
    ['criadoEm do envelope', mut(x => { x.criadoEm += 1; })],
    ['emissaoId do envelope', mut(x => { x.emissaoId = U(); })],
    ['sem sha foto', mut(x => { delete x.conteudo.evidencias[0].sha256; })]
  ]) assert.equal((await S.validar(x)).ok, false, nome);
  assert.equal((await S.validar(null)).ok, false);
  assert.equal((await S.validar([])).ok, false);
});
test('hash forjado: conteúdo alterado com hash recalculado passa em validar, mas é pego pelo hash gravado na emissão', async () => {
  const { snap } = await emitido();
  const em = linha(snap);
  const forjado = clonar(snap);
  forjado.conteudo.constatacoes[0].gravidade = 'Informativa';
  forjado.hash = await S.hashSnapshot(forjado);
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
  const em = linha(snap);
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
test('fallback de DB.uid gera UUID v4 aceito por validar()', () => {
  const fs = require('node:fs'), src = fs.readFileSync(__dirname + '/../db.js', 'utf8');
  const m = src.match(/const uid = \(\) => \{[\s\S]*?\n  \};/); assert.ok(m);
  const uid = new Function('crypto', m[0] + '; return uid;')({ getRandomValues: a => crypto.getRandomValues(a) });
  for (let i = 0; i < 50; i++) assert.match(uid(), /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

/* ---------- artefato emitido ---------- */
const pdfBlob = (extra = '') => new Blob(['%PDF-1.7\n' + 'conteudo' + extra], { type: 'application/pdf' });
async function comArquivo(b = pdfBlob()) {
  const { c, snap } = await emitido();
  const arq = await S.criarArquivo({ id: U(), snapshot: snap, arquivo: 'VT-007-2026_Rev00.pdf', blob: b });
  const em = linha(snap, { arquivoSha256: arq.sha256, arquivoId: arq.id, arquivo: arq.arquivo });
  return { c, snap, arq, em };
}
test('arquivo emitido: criação, hash dos bytes e verificação', async () => {
  const { arq, snap, em } = await comArquivo();
  assert.equal(arq.mime, 'application/pdf'); assert.equal(arq.snapshotId, snap.id); assert.equal(arq.emissaoId, snap.emissaoId);
  assert.equal(arq.sha256, sha('%PDF-1.7\nconteudo')); assert.equal(arq.bytes, arq.blob.size);
  assert.equal((await S.verificarArquivo(em, snap, arq)).estado, 'verificado');
});
test('arquivo emitido: roundtrip por data URL (como no backup) preserva o hash', async () => {
  const { arq, snap, em } = await comArquivo();
  const dataUrl = 'data:application/pdf;base64,' + Buffer.from(await arq.blob.arrayBuffer()).toString('base64');
  const bytes = Buffer.from(dataUrl.split(',')[1], 'base64');
  const restaurado = { ...arq, blob: new Blob([bytes], { type: 'application/pdf' }) };
  assert.equal((await S.verificarArquivo(em, snap, restaurado)).estado, 'verificado');
});
test('arquivo emitido: ausente nunca é verificado; adulterado/forjado diverge', async () => {
  const { arq, snap, em } = await comArquivo();
  assert.equal((await S.verificarArquivo(em, snap, undefined)).estado, 'ausente');
  assert.equal((await S.verificarArquivo(em, snap, { ...arq, blob: pdfBlob('X') })).estado, 'divergente');                    // bytes trocados
  const forjado = { ...arq, blob: pdfBlob('X') }; forjado.sha256 = sha('%PDF-1.7\nconteudoX'); forjado.bytes = forjado.blob.size;
  assert.equal((await S.verificarArquivo(em, snap, forjado)).estado, 'divergente');                                           // sha recalculado não bate com a emissão
  assert.equal((await S.verificarArquivo(em, snap, { ...arq, emissaoId: U() })).estado, 'divergente');
  assert.equal((await S.verificarArquivo(em, snap, { ...arq, mime: 'text/html' })).estado, 'divergente');
  assert.equal((await S.verificarArquivo(em, snap, { ...arq, bytes: 1 })).estado, 'divergente');
  const html = new Blob(['<html>']); 
  assert.equal((await S.verificarArquivo({ ...em, arquivoSha256: sha('<html>') }, snap, { ...arq, blob: html, sha256: sha('<html>'), bytes: 6 })).estado, 'divergente'); // magic bytes
});
test('arquivo emitido: limite de tamanho', async () => {
  const { snap } = await emitido();
  const grande = { size: S.MAX_ARQUIVO_BYTES + 1 };
  await assert.rejects(() => S.criarArquivo({ id: U(), snapshot: snap, arquivo: 'a.pdf', blob: grande }), /limite/);
});
test('docx: mime e assinatura PK', async () => {
  const { c } = await emitido();
  const snap = await S.criar({ id: U(), emissaoId: U(), formato: 'docx', conteudo: await S.capturar(c), appVersion: '1.0.6' });
  const arq = await S.criarArquivo({ id: U(), snapshot: snap, arquivo: 'a.docx', blob: new Blob([Buffer.from([0x50, 0x4b, 3, 4, 9])]) });
  assert.equal(arq.mime, S.MIMES.docx);
  assert.equal((await S.verificarArquivo(linha(snap, { arquivoSha256: arq.sha256, arquivo: 'a.docx' }), snap, arq)).estado, 'verificado');
});
test('consistência do envelope: numero, appVersion, evidências e refs são conferidos', async () => {
  const { snap } = await emitido();
  const mut = f => { const x = clonar(snap); f(x); return x; };
  const recalc = async x => { x.hash = await S.hashSnapshot(x); return x; };   // adversário recalcula o hash: validar ainda recusa por consistência
  for (const [nome, x] of [
    ['numero', mut(x => { x.numero = { seq: 8, ano: 2026 }; })],
    ['appVersion', mut(x => { x.appVersion = '9.9.9'; })],
    ['ref de foto inexistente', mut(x => { x.conteudo.constatacoes[0].fotoIds.push(U()); })],
    ['evidência duplicada', mut(x => { x.conteudo.evidencias.push(x.conteudo.evidencias[0]); })],
    ['evidência de outra vistoria', mut(x => { x.conteudo.evidencias[0].vistoriaId = U(); })],
    ['seq da vistoria', mut(x => { x.conteudo.vistoria.seq = 99; })],
    ['obraId da vistoria', mut(x => { x.conteudo.vistoria.obraId = U(); })]
  ]) { const r = await S.validar(await recalc(x)); assert.equal(r.ok, false, nome); }
});

test('snapshot preserva vínculo explícito e rejeita ID inválido ou autorreferência', async () => {
  const c=cenario(), target=U();
  c.vistoria.constatacoes[0].recorrenciaDeId=target;
  const {snap}=await emitido(c);
  assert.equal((await S.validar(snap)).ok,true);
  assert.equal(snap.conteudo.constatacoes[0].recorrenciaDeId,target);
  for(const bad of ['not-a-uuid',snap.conteudo.constatacoes[0].id]){
    const altered=clonar(snap);altered.conteudo.constatacoes[0].recorrenciaDeId=bad;altered.hash=await S.hashSnapshot(altered);
    assert.equal((await S.validar(altered)).ok,false,bad);
  }
});
test('ids legados (não UUID) de vistoria/edifício são aceitos; id do snapshot/emissão continua UUID', async () => {
  const c = cenario(); c.obra.id = 'lx3k9a2b1f'; c.vistoria.id = 'lx3k9a2b5q'; c.vistoria.obraId = c.obra.id; c.fotos[0].vistoriaId = c.vistoria.id;
  const { snap } = await emitido(c);
  assert.deepEqual(await S.validar(snap), { ok: true, erros: [] });
  const ruim = await S.criar({ id: 'nao-uuid', emissaoId: U(), formato: 'pdf', conteudo: snap.conteudo, appVersion: '1.0.6' });
  assert.equal((await S.validar(ruim)).ok, false);
});
test('app.js: emitir clona o contexto antes dos awaits e snapshot/relatório usam a mesma cópia', () => {
  const src = require('node:fs').readFileSync(__dirname + '/../app.js', 'utf8');
  const corpo = src.slice(src.indexOf('async function emitir('), src.indexOf('function baixar('));
  assert.ok(corpo.indexOf('structuredClone') > 0 && corpo.indexOf('structuredClone') < corpo.indexOf('SnapshotLib.capturar'));
  assert.ok(corpo.indexOf('structuredClone') < corpo.indexOf('Rep.buildTecnico'));
  assert.match(corpo, /capturar\(\{ obra: C\.obra, vistoria: C\.vistoria, fotos: C\.fotos/);
  assert.match(corpo, /settings: C\.S, obra: C\.obra, vistoria: C\.vistoria, fotos: C\.fotos/);
  assert.match(corpo, /Rep\.toDocx\(model, C\.S, logo\) : await Rep\.toPdf\(model, C\.S, logo\)/);
  assert.doesNotMatch(corpo.replace(/C\.S/g, ''), /\bS\.(empresa|rt|usuario)/);
});

test('verificarEmissao: cada metadado da linha mutado diverge do snapshot', async () => {
  const { snap } = await emitido();
  const em = linha(snap);
  assert.equal((await S.verificarEmissao(em, snap)).estado, 'verificado');
  for (const [campo, v] of [['vistoriaId', 'outra-vistoria-1'], ['obraId', 'outra-obra-0001'], ['tipo', 'consolidado'], ['formato', 'docx'], ['rev', 1],
    ['numero', 'VT-008/2026'], ['numero', 'VT-007/2025'], ['numero', 'MF-007/2026'], ['numero', 'RASCUNHO'], ['numero', null]]) {
    const r = await S.verificarEmissao({ ...em, [campo]: v }, snap);
    assert.equal(r.estado, 'divergente', campo + '=' + v); assert.match(r.detalhe, new RegExp(campo));
  }
});
test('verificarArquivo: arquivoId, nome, formato e extensão da emissão são conferidos', async () => {
  const { snap, arq, em } = await comArquivo();
  assert.equal((await S.verificarArquivo(em, snap, arq)).estado, 'verificado');
  for (const [nome, e, a] of [
    ['arquivoId', { ...em, arquivoId: U() }, arq],
    ['nome', { ...em, arquivo: 'outro.pdf' }, arq],
    ['nome ausente', { ...em, arquivo: undefined }, arq],
    ['formato', { ...em, formato: 'docx' }, arq],
    ['extensão', { ...em, arquivo: 'x.docx' }, { ...arq, arquivo: 'x.docx' }]
  ]) assert.equal((await S.verificarArquivo(e, snap, a)).estado, 'divergente', nome);
});
