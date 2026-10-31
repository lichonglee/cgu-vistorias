const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const Registry = require('../indicator-registry.js');
const Analytics = require('../analytics.js');
const Export = require('../analytics-export.js');
const SnapshotLib = require('../emission-snapshot.js');
const read = name => fs.readFileSync(path.join(__dirname, '..', name), 'utf8');

test('todo KPI, indicador de ação e motivo da fila têm ficha completa e ID único', async () => {
  const summary = await Analytics.resumir({ snapshotLib: SnapshotLib, asOf: '2026-10-30' });
  assert.equal(summary.ruleVersion, Registry.RULE_VERSION);
  for (const [key, value] of Object.entries(summary.kpis)) {
    const item = Registry.forKey('kpi.' + key);
    assert.ok(item, 'ficha para KPI ' + key);
    assert.equal(value.indicatorId, item.id);
  }
  const actionSummary = Analytics.summarizeActions();
  assert.equal(actionSummary.ruleVersion, Registry.RULE_VERSION);
  for (const id of Object.values(actionSummary.indicatorIds)) assert.ok(Registry.get(id), 'ficha de ação ' + id);

  const snapshots = [{ id: 's1', conteudo: { obra: { nome: 'Edifício sintético' }, constatacoes: [
    { id: 'f1', titulo: 'Crítica sem ação', gravidade: 'Crítica' },
    { id: 'f2', titulo: 'Ação vencida', gravidade: 'Média' }
  ] } }];
  const records = [{ vistoriaId: 'v1', snapshotId: 's1' }];
  const actions = [{ id: 'a1', vistoriaId: 'v1', constatacaoId: 'f2', estado: 'aberta', prazo: '2026-10-01', criadoEm: Date.parse('2026-09-01T00:00:00Z') }];
  const rows = Analytics.listFollowUp(records, snapshots, actions, { asOf: '2026-10-30', now: Date.parse('2026-10-30T12:00:00Z') });
  assert.deepEqual(new Set(rows.map(row => row.indicatorId)), new Set(['followup.sem_acao', 'followup.vencida', 'followup.aberta_30d'].map(Registry.idForKey)));
  for (const row of rows) assert.equal(Registry.get(row.indicatorId).key, 'followup.' + row.motivo);
});

test('fichas têm todos os campos, IDs únicos e textos sem alegação institucional ou percentual indevido', () => {
  const items = Registry.list();
  assert.ok(items.length >= 18);
  assert.equal(new Set(items.map(item => item.id)).size, items.length);
  for (const item of items) {
    for (const key of ['id', 'key', 'label', 'definition', 'numerator', 'denominator', 'unit', 'window', 'source', 'exclusions', 'limits', 'ruleVersion']) {
      assert.equal(typeof item[key], 'string');
      assert.ok(item[key].trim(), item.id + ' missing ' + key);
    }
    assert.equal(item.ruleVersion, Registry.RULE_VERSION);
    assert.doesNotMatch(item.label + ' ' + item.definition, /\brisco\b|\bcentral\b|\btaxa\b/i);
    if (item.unit.startsWith('razão')) assert.equal(item.unit.includes('%'), false, item.id);
  }
  const serialized = JSON.stringify(items);
  assert.equal(serialized.includes('GPS, fotos ou nomes'), false);
});

test('numeradores/denominadores das fichas reconciliam com os resumos calculados', async () => {
  const summary = await Analytics.resumir({ snapshotLib: SnapshotLib, asOf: '2026-10-30' });
  for (const [key, result] of Object.entries(summary.kpis)) {
    const item = Registry.forKey('kpi.' + key);
    if (Number.isSafeInteger(result.numerator)) assert.equal(typeof item.numerator, 'string');
    if (Number.isSafeInteger(result.denominator)) assert.equal(typeof item.denominator, 'string');
  }
  assert.equal(summary.kpis.coverage.numerator, 0);
  assert.equal(summary.kpis.coverage.denominator, 0);
  const actionSummary = Analytics.summarizeActions();
  assert.equal(actionSummary.completed, 0);
  assert.equal(actionSummary.declared, 0);
  assert.equal(actionSummary.indicatorIds.completed, Registry.idForKey('action.completion'));
  assert.equal(actionSummary.indicatorIds.declared, Registry.idForKey('action.completion'));
});

test('valores de uma vistoria sintética conferem com as definições e com as referências da fila', async () => {
  const obraId = crypto.randomUUID(), vistoriaId = crypto.randomUUID(), snapshotId = crypto.randomUUID(), emissionId = crypto.randomUUID();
  const photoId = crypto.randomUUID(), recurrenceId = crypto.randomUUID();
  const obra = { id: obraId, nome: 'EDIFICIO SENSIVEL', endereco: 'ENDERECO PRIVADO', contrato: '' };
  const vistoria = { id: vistoriaId, obraId, data: '2026-10-01', updatedAt: 10, seq: 1, ano: 2026, gps: { lat: -15.8, lon: -47.9 }, constatacoes: [
    { id: crypto.randomUUID(), titulo: 'ACHADO PRIVADO', tipo: 'Fissura', gravidade: 'Crítica', ambiente: 'Fachada', descricao: 'DESCRICAO PRIVADA', fotoIds: [photoId], recorrenciaDeId: recurrenceId },
    { id: crypto.randomUUID(), titulo: 'ACHADO ALTO', tipo: 'Fissura', gravidade: 'Alta', ambiente: 'Fachada', fotoIds: [] },
    { id: crypto.randomUUID(), titulo: 'ACHADO MEDIO', tipo: 'Outra', gravidade: 'Média', ambiente: 'Sala', fotoIds: [] }
  ] };
  const photo = { id: photoId, vistoriaId, blob: new Blob([new Uint8Array([255, 216, 255, 1])], { type: 'image/jpeg' }), ts: 1, lat: null, lon: null, descricao: 'NOTA PRIVADA' };
  const conteudo = await SnapshotLib.capturar({ obra, vistoria, fotos: [photo], cfg: { empresa: {}, rt: {}, usuario: '' }, emissao: { tipo: 'tecnico', numero: { seq: 1, ano: 2026 }, rev: 0 }, appVersion: '1.10.0' });
  const snapshot = await SnapshotLib.criar({ id: snapshotId, emissaoId: emissionId, formato: 'pdf', conteudo, appVersion: '1.10.0' });
  const emission = { id: emissionId, vistoriaId, obraId, tipo: 'tecnico', formato: 'pdf', numero: 'VT-001/2026', rev: 0, data: 1, arquivo: 'VT-001.pdf', snapshotId, snapshotHash: snapshot.hash };
  const summary = await Analytics.resumir({ obras: [obra], vistorias: [vistoria], emissoes: [emission], snapshots: [snapshot], snapshotLib: SnapshotLib, asOf: '2026-10-30' });
  const read = path => path.split('.').reduce((value, key) => value?.[key], summary);
  const kpis = {
    'local.coverage': ['kpis.coverage.numerator', 'kpis.coverage.denominator'],
    'local.severe-density': ['kpis.severeDensity.numerator', 'kpis.severeDensity.denominator'],
    'local.recurrence': ['kpis.recurrence.numerator', 'kpis.recurrence.denominator'],
    'local.formalization': ['kpis.formalization.numerator', 'kpis.formalization.denominator'],
    'local.snapshot-integrity': ['kpis.snapshotIntegrity.numerator', 'kpis.snapshotIntegrity.denominator'],
    'local.photo-association': ['kpis.photoAssociation.numerator', 'kpis.photoAssociation.denominator'],
    'local.gps-availability': ['kpis.gpsAvailability.numerator', 'kpis.gpsAvailability.denominator']
  };
  for (const [id, [numeratorPath, denominatorPath]] of Object.entries(kpis)) {
    const item = Registry.get(id);
    assert.ok(item.numerator && item.denominator);
    assert.ok(Number.isSafeInteger(read(numeratorPath)) && Number.isSafeInteger(read(denominatorPath)));
  }
  assert.deepEqual([summary.kpis.coverage.numerator, summary.kpis.coverage.denominator], [1, 1]);
  assert.deepEqual([summary.kpis.severeDensity.numerator, summary.kpis.severeDensity.denominator], [2, 1]);
  assert.deepEqual([summary.kpis.recurrence.numerator, summary.kpis.recurrence.denominator], [1, 3]);
  assert.deepEqual([summary.kpis.formalization.numerator, summary.kpis.formalization.denominator], [1, 1]);
  assert.deepEqual([summary.kpis.snapshotIntegrity.numerator, summary.kpis.snapshotIntegrity.denominator], [1, 1]);
  assert.deepEqual([summary.kpis.photoAssociation.numerator, summary.kpis.photoAssociation.denominator], [1, 3]);
  assert.deepEqual([summary.kpis.gpsAvailability.numerator, summary.kpis.gpsAvailability.denominator], [1, 1]);
  assert.equal(summary.kpis.remediation.indicatorId, Registry.idForKey('kpi.remediation'));
  assert.equal(summary.kpis.remediation.calculable, false);

  const record = { vistoriaId, snapshotId };
  const actions = [
    { id: crypto.randomUUID(), vistoriaId, constatacaoId: vistoria.constatacoes[0].id, estado: 'concluida', criadoEm: 1 },
    { id: crypto.randomUUID(), vistoriaId, constatacaoId: vistoria.constatacoes[2].id, estado: 'aberta', prazo: '2026-10-01', criadoEm: 1 },
    { id: crypto.randomUUID(), vistoriaId, constatacaoId: vistoria.constatacoes[2].id, estado: 'cancelada', criadoEm: 1 }
  ];
  const options = { asOf: '2026-10-30', now: Date.parse('2026-10-30T12:00:00Z') };
  const actionSummary = Analytics.summarizeActions([record], [snapshot], actions, options);
  assert.deepEqual([actionSummary.completed, actionSummary.declared, actionSummary.overdue, actionSummary.aging30, actionSummary.cancelled, actionSummary.highCriticalWithoutAction, actionSummary.highCriticalTotal], [1, 2, 1, 1, 1, 1, 2]);
  for (const id of Object.values(actionSummary.indicatorIds)) assert.ok(Registry.get(id));
  const followUp = Analytics.listFollowUp([record], [snapshot], actions, options);
  assert.deepEqual(followUp.map(row => row.indicatorId).sort(), [Registry.idForKey('followup.aberta_30d'), Registry.idForKey('followup.sem_acao'), Registry.idForKey('followup.vencida')].sort());
  const exported = await Export.gerarAgregado(summary, { SnapshotLib });
  for (const secret of ['EDIFICIO SENSIVEL', 'ENDERECO PRIVADO', 'ACHADO PRIVADO', 'DESCRICAO PRIVADA', 'NOTA PRIVADA', '-15.8', '-47.9']) assert.equal(exported.json.includes(secret), false);
});

test('ruleVersion e referências aditivas de ficha são incluídos no resumo e no export v1', async () => {
  const summary = await Analytics.resumir({ snapshotLib: SnapshotLib, asOf: '2026-10-30' });
  const out = await Export.gerarAgregado(summary, { SnapshotLib });
  assert.equal(out.object.schema, 'cgu-local-analytics-v1');
  assert.equal(out.object.ruleVersion, Registry.RULE_VERSION);
  for (const [key, value] of Object.entries(out.object.kpis)) assert.equal(value.indicatorId, Registry.idForKey('kpi.' + key));
  const missingRule = { ...summary, ruleVersion: undefined };
  await assert.rejects(Export.gerarAgregado(missingRule, { SnapshotLib }), /version mismatch/);
  await assert.rejects(Export.gerarAgregado({ ...summary, ruleVersion: 'different-rules' }, { SnapshotLib }), /version mismatch/);
});

test('fichas explicitam limites de recorrência, janela, fotos e duplicatas', () => {
  const recurrence = Registry.forKey('kpi.recurrence');
  assert.match(recurrence.numerator, /formato UUID válido/);
  assert.match(recurrence.denominator, /primeira emissão/);
  assert.match(recurrence.exclusions, /não confirma se o destino existe/);
  assert.match(recurrence.limits, /destino não conferido/);
  const photo = Registry.forKey('kpi.photoAssociation');
  assert.match(photo.source, /IDs das evidências do mesmo snapshot/);
  assert.doesNotMatch(photo.source, /hash/i);
  const coverage = Registry.get('local.coverage');
  assert.match(coverage.window, /data atual editável/);
  assert.match(coverage.exclusions, /sem data válida/);
  const duplicates = Registry.get('local.duplicate-candidates');
  assert.match(duplicates.source, /limitada a 200 pares/);
  assert.match(duplicates.source, /obraId atual/);
});

test('versão da regra e hash da ficha congelam mudanças de definição', () => {
  assert.equal(Registry.RULE_VERSION, 'cgu-local-indicators-1.0.1');
  const hash = crypto.createHash('sha256').update(JSON.stringify(Registry.list())).digest('hex');
  assert.equal(hash, '3de84974a0f0b3ffbc8955ef4d22015afef9669fae318e051a501ac61bf23764');
});

test('fichas são definidas em uma única lista, sem overrides paralelos', () => {
  const source = read('indicator-registry.js');
  assert.match(source, /const raw = \[/);
  assert.doesNotMatch(source, /const overrides\s*=/);
  assert.doesNotMatch(source, /overrides\[item\.id\]/);
});

test('renderização escapa período e rótulos; tabela documental coincide com o registro', () => {
  const html = Registry.renderDetails('local.coverage', '<img src=x onerror=alert(1)>');
  assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
  assert.equal(html.includes('<img'), false);
  assert.ok(html.includes('Janela da análise'));
  assert.ok(html.includes('Janela ou critério da ficha'));
  const docs = read('docs/ANALYTICS-LOCAL.md');
  const start = docs.indexOf('<!-- INDICATOR-REGISTRY:START -->');
  const end = docs.indexOf('<!-- INDICATOR-REGISTRY:END -->');
  assert.ok(start >= 0 && end > start);
  assert.equal(docs.slice(start + '<!-- INDICATOR-REGISTRY:START -->'.length, end).trim(), Registry.markdownTable());
});
