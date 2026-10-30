const { test } = require('node:test');
const assert = require('node:assert/strict');
const Diff = require('../snapshot-diff.js');
const hash = n => String(n).padStart(64, '0');
const finding = (id, extra = {}) => ({ id, titulo: 'Fissura', gravidade: 'Alta', fotoIds: [], ...extra });
const snapshot = (vistoriaId, findings = [], evidence = [], obraId = 'obra-1') => ({
  obraId, vistoriaId,
  conteudo: { obra: { id: obraId }, vistoria: { id: vistoriaId }, constatacoes: findings, evidencias: evidence }
});

test('snapshots idênticos e ordem diferente de arrays de constatações não geram diferenças', () => {
  const left = snapshot('v1', [finding('b'), finding('a')]);
  const right = snapshot('v1', [finding('a'), finding('b')]);
  const result = Diff.compareSnapshots(left, right);
  assert.equal(result.available, true);
  assert.equal(result.added.length + result.removed.length + result.changed.length, 0);
  assert.equal(result.unchanged.length, 2);
  assert.deepEqual(result.totals, { left: 2, right: 2, leftReconciles: true, rightReconciles: true });
});

test('classifica constatações acrescentadas, removidas e alteradas por id com campos', () => {
  const result = Diff.compareSnapshots(
    snapshot('v1', [finding('keep'), finding('edit', { gravidade: 'Baixa' }), finding('gone')]),
    snapshot('v1', [finding('keep'), finding('edit', { gravidade: 'Crítica', ambiente: 'Cobertura' }), finding('new')])
  );
  assert.deepEqual(result.added.map(x => x.id), ['new']);
  assert.deepEqual(result.removed.map(x => x.id), ['gone']);
  assert.deepEqual(result.changed.map(x => [x.id, x.fields]), [['edit', ['ambiente', 'gravidade']]]);
  assert.deepEqual(result.unchanged.map(x => x.id), ['keep']);
  assert.equal(result.totals.leftReconciles && result.totals.rightReconciles, true);
});

test('evidências são comparadas por SHA-256, mesmo quando seus IDs mudam', () => {
  const before = [{ id: 'foto-antiga', sha256: hash(1) }, { id: 'retirada', sha256: hash(2) }];
  const after = [{ id: 'foto-nova-id', sha256: hash(1) }, { id: 'nova', sha256: hash(3) }];
  const result = Diff.compareSnapshots(snapshot('v1', [], before), snapshot('v1', [], after));
  assert.deepEqual(result.evidence.unchanged, [{ sha256: hash(1), count: 1 }]);
  assert.deepEqual(result.evidence.removed, [{ sha256: hash(2), count: 1 }]);
  assert.deepEqual(result.evidence.added, [{ sha256: hash(3), count: 1 }]);
});

test('recusa snapshots de edifícios/vistorias diferentes, vínculos inválidos e IDs repetidos', () => {
  assert.equal(Diff.compareSnapshots(snapshot('v1'), snapshot('v1', [], [], 'obra-2')).available, false);
  assert.equal(Diff.compareSnapshots(snapshot('v1'), snapshot('v2')).available, false);
  const broken = snapshot('v1'); broken.vistoriaId = 'v2';
  assert.equal(Diff.compareSnapshots(snapshot('v1'), broken).available, false);
  assert.equal(Diff.compareSnapshots(snapshot('v1', [finding('dup'), finding('dup')]), snapshot('v1')).available, false);
  assert.equal(Diff.compareSnapshots(snapshot('v1'), snapshot('v1', [], [{ sha256: 'bad' }])).available, false);
});

test('resultado é determinístico e não modifica os snapshots recebidos', () => {
  const left = snapshot('v1', Array.from({ length: 400 }, (_, i) => finding('id-' + i, { titulo: 'Antes ' + i })));
  const right = snapshot('v1', Array.from({ length: 400 }, (_, i) => finding('id-' + (399 - i), { titulo: 'Depois ' + (399 - i) })));
  const before = structuredClone([left, right]);
  const first = Diff.compareSnapshots(left, right), second = Diff.compareSnapshots(left, right);
  assert.equal(first.available, true);
  assert.equal(first.changed.length, 400);
  assert.equal(JSON.stringify(first), JSON.stringify(second));
  assert.deepEqual([left, right], before);
});

test('campos opcionais legados ausentes são aceitos e diferenças conciliam os dois lados', () => {
  const result = Diff.compareSnapshots(snapshot('v1', [{ id: 'legacy' }]), snapshot('v1', [finding('legacy', { titulo: 'Novo' })]));
  assert.equal(result.available, true);
  assert.equal(result.changed.length, 1);
  assert.equal(result.totals.leftReconciles, true);
  assert.equal(result.totals.rightReconciles, true);
});

test('comparação de emissões rejeita auto-comparação, snapshot ausente ou estado que mudou após abrir', async () => {
  const a = snapshot('v1', [finding('same')]);
  const emission = { id: 'e1', snapshotId: 's1' }, other = { id: 'e2', snapshotId: 's2' };
  const snapshots = [{ ...a, id: 's1' }, { ...structuredClone(a), id: 's2' }];
  const verify = async () => ({ estado: 'verificado' });
  assert.equal((await Diff.compareEmissions(emission, emission, snapshots, verify)).available, false);
  assert.equal((await Diff.compareEmissions(emission, other, snapshots.slice(0,1), verify)).available, false);
  assert.equal((await Diff.compareEmissions(emission, other, snapshots, async e => ({ estado: e.id === 'e1' ? 'divergente' : 'verificado' }))).available, false);
  const valid = await Diff.compareEmissions(emission, other, snapshots, verify);
  assert.equal(valid.available, true);
  assert.equal(valid.unchanged.length, 1);
});

test('a tela de comparação exige estados verificados e escapa texto interpolado', () => {
  const source = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'app.js'), 'utf8');
  assert.match(source, /SnapshotDiff\.compareEmissions/);
  assert.match(source, /snEst\[e\.id\]\?\.estado\s*!==\s*'verificado'/);
  assert.match(source, /esc\(row\.titulo/);
  assert.match(source, /data-emission-card=/);
  assert.match(source, /item\.dataset\.emissionCard === e\.id/);
  assert.match(source, /setAttribute\('aria-modal', 'true'\)/);
  assert.match(source, /opener\?\.focus\(\)/);
  assert.match(source, /Mostrar mais \$\{batchSize\}/);
  assert.match(source, /consistência local \(SHA-256\), não autoria/i);
});
