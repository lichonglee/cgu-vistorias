const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const Analytics = require('../analytics.js');
const SnapshotLib = require('../emission-snapshot.js');
const uid = () => crypto.randomUUID();

async function report({ obraId, vistoriaId, seq, rev, date, timestamp, findings = [], withGps = false, withPhoto = false }) {
  const obra = { id: obraId, nome: 'SENSITIVE BUILDING NAME', cliente: 'private', endereco: 'private', contrato: '', art: '', criadoEm: 1 };
  const photo = withPhoto ? { id: uid(), vistoriaId, blob: new Blob([new Uint8Array([255, 216, 255, 1])], { type: 'image/jpeg' }), ts: timestamp, lat: null, lon: null, descricao: 'SENSITIVE PHOTO NOTE', origem: 'camera', w: 2, h: 2, marks: [], notas: [] } : null;
  const vistoria = { id: vistoriaId, obraId, local: 'SENSITIVE LOCATION', tipo: 'Vistoria técnica de rotina', data: date, hora: '09:00', status: 'emitido', nFotos: photo ? 1 : 0, seq, ano: 2026, updatedAt: timestamp, gps: withGps ? { lat: -15.8, lon: -47.9, acc: 5 } : null, constatacoes: findings.map((f, i) => ({ id: uid(), titulo: 'SENSITIVE FINDING', tipo: f.tipo, gravidade: f.gravidade, ambiente: f.ambiente, local: 'private', descricao: 'private', recomendacao: 'private', fotoIds: photo && i === 0 ? [photo.id] : [] })) };
  const emissaoId = uid();
  const conteudo = await SnapshotLib.capturar({ obra, vistoria, fotos: photo ? [photo] : [], cfg: { empresa: { nome: 'private' }, rt: { nome: 'private' }, usuario: 'private' }, emissao: { tipo: 'tecnico', numero: { seq, ano: 2026 }, rev }, appVersion: '1.1.0' });
  const snapshot = await SnapshotLib.criar({ id: uid(), emissaoId, formato: 'pdf', conteudo, appVersion: '1.1.0', criadoEm: timestamp });
  const emission = { id: emissaoId, vistoriaId, obraId, tipo: 'tecnico', formato: 'pdf', numero: `VT-${String(seq).padStart(3, '0')}/2026`, rev, data: timestamp, arquivo: `VT-${String(seq).padStart(3, '0')}-2026_Rev${String(rev).padStart(2, '0')}.pdf`, snapshotId: snapshot.id, snapshotHash: snapshot.hash };
  return { obra, vistoria, snapshot, emission };
}

test('agrega somente o último snapshot verificável de cada vistoria e não multiplica revisões', async () => {
  const obra1 = uid(), obra2 = uid(), v1 = uid(), v2 = uid(), v3 = uid();
  const old = await report({ obraId: obra1, vistoriaId: v1, seq: 1, rev: 0, date: '2026-09-01', timestamp: 100, findings: [{ gravidade: 'Alta', tipo: 'Fissura', ambiente: 'Fachada' }] });
  const latest = await report({ obraId: obra1, vistoriaId: v1, seq: 1, rev: 1, date: '2026-10-01', timestamp: 50, withGps: true, withPhoto: true, findings: [{ gravidade: 'Crítica', tipo: 'Fissura', ambiente: 'Fachada' }, { gravidade: 'Alta', tipo: 'Fissura', ambiente: 'Fachada' }] });
  const second = await report({ obraId: obra2, vistoriaId: v2, seq: 2, rev: 0, date: 'invalid', timestamp: 150, findings: [{ gravidade: 'Média', tipo: 'Outra', ambiente: 'Outro ambiente' }, { gravidade: 'desconhecida', tipo: 'constructor', ambiente: '<img onerror=alert(1)>' }, { gravidade: '??', tipo: '__proto__', ambiente: 'constructor' }] });
  const works = [old, latest, second].flatMap(x => x.obra).filter((x, i, a) => a.findIndex(y => y.id === x.id) === i);
  const inspections = [old, latest, second].map(x => x.vistoria);
  inspections[1] = { ...inspections[1], updatedAt: 500 };
  inspections.push({ id: v3, obraId: obra2, status: 'rascunho' });
  const legacy = { id: uid(), vistoriaId: v3, obraId: obra2, tipo: 'tecnico', formato: 'pdf', numero: 'VT-003/2026', rev: 0, data: 300, arquivo: 'legacy.pdf' };
  const result = await Analytics.resumir({ obras: works, vistorias: inspections, emissoes: [old.emission, latest.emission, second.emission, legacy], snapshots: [old.snapshot, latest.snapshot, second.snapshot], snapshotLib: SnapshotLib, sistemaPorTipo: { Fissura: 'Estrutura', Outra: 'Outros' }, grupoPorAmbiente: { Fachada: 'Acesso', 'Outro ambiente': 'Outros' } });

  assert.deepEqual(result.counts, { localBuildings: 2, localInspections: 3, emissionRows: 4, inspectionsWithEmission: 3, inspectionsWithVerifiedSnapshot: 2, unverifiedLatestEmissions: 1, verifiedFindings: 5 });
  assert.equal(result.kpis.coverage.numerator, 2);
  assert.equal(result.kpis.coverage.denominator, 2);
  assert.equal(result.kpis.severeDensity.numerator, 2);
  assert.equal(result.kpis.severeDensity.denominator, 2);
  assert.equal(result.kpis.formalization.numerator, 3);
  assert.equal(result.kpis.formalization.denominator, 3);
  assert.equal(result.kpis.snapshotIntegrity.numerator, 2);
  assert.equal(result.kpis.snapshotIntegrity.denominator, 3);
  assert.equal(result.kpis.photoAssociation.numerator, 1);
  assert.equal(result.kpis.photoAssociation.denominator, 5);
  assert.equal(result.kpis.gpsAvailability.numerator, 1);
  assert.equal(result.kpis.gpsAvailability.denominator, 2);
  assert.equal(result.dimensions.severity.find(x => x.label === 'Alta').count, 1);
  assert.equal(result.dimensions.severity.find(x => x.label === 'Crítica').count, 1);
  assert.equal(result.dimensions.severity.find(x => x.label === 'Sem classificação').count, 2);
  assert.deepEqual(result.dimensions.systemGroup, [{ label: 'Estrutura', count: 2 }, { label: 'Tipo sem correspondência no catálogo da interface', count: 2 }, { label: 'Outros', count: 1 }]);
  assert.equal(result.dimensions.environmentGroup.find(x => x.label === 'Ambiente sem correspondência no catálogo da interface').count, 2);
  for (const unsafe of ['constructor', '__proto__', '<img onerror=alert(1)>']) assert.equal(JSON.stringify(result.dimensions).includes(unsafe), false);
  assert.equal(result.dimensions.month.find(x => x.label === 'Data ausente').count, 1);
  assert.equal(result.stale.inspectionsEditedAfterEmission, 1);
  assert.equal(result.kpis.recurrence.calculable, false);
  assert.equal(result.kpis.remediation.calculable, false);
  assert.equal(result.risk.calculable, false);
  const serialized = JSON.stringify(result);
  for (const privateValue of ['SENSITIVE BUILDING NAME', 'SENSITIVE PHOTO NOTE', 'SENSITIVE FINDING', 'SENSITIVE LOCATION', 'private']) assert.equal(serialized.includes(privateValue), false);
});

test('revisão maior vence data local menor; emissão mais recente sem snapshot invalida o recorte, sem voltar atrás', async () => {
  const valid = await report({ obraId: uid(), vistoriaId: uid(), seq: 7, rev: 0, date: '2026-09-01', timestamp: 100, findings: [{ gravidade: 'Crítica', tipo: 'Fissura', ambiente: 'Fachada' }] });
  const invalidLatest = { ...valid.emission, id: uid(), rev: 1, data: 200, snapshotId: uid(), snapshotHash: '0'.repeat(64), numero: valid.emission.numero };
  const result = await Analytics.resumir({ obras: [valid.obra], vistorias: [valid.vistoria], emissoes: [valid.emission, invalidLatest], snapshots: [valid.snapshot], snapshotLib: SnapshotLib });
  assert.equal(result.counts.inspectionsWithVerifiedSnapshot, 0);
  assert.equal(result.counts.unverifiedLatestEmissions, 1);
  assert.equal(result.counts.verifiedFindings, 0);
});

test('contrato local não calcula porcentagens nem percentuais artificiais quando a base é zero', async () => {
  const result = await Analytics.resumir({ snapshotLib: SnapshotLib });
  assert.deepEqual(result.kpis.coverage.numerator, 0);
  assert.deepEqual(result.kpis.coverage.denominator, 0);
  assert.equal(result.kpis.severeDensity.denominator, 0);
  assert.equal(result.scope.includes('Somente registros deste aparelho'), true);
});

test('densidade acima de 100% é exibida como razão, sem símbolo de percentual', () => {
  const rendered = Analytics.formatDensity({ numerator: 5, denominator: 2 });
  assert.equal(rendered, '2,5 constatações por vistoria (5 / 2)');
  assert.equal(rendered.includes('%'), false);
});

test('empate de revisão/data exige todos os snapshots válidos e conteúdo analítico idêntico', async () => {
  const valid = await report({ obraId: uid(), vistoriaId: uid(), seq: 9, rev: 1, date: '2026-10-01', timestamp: 500, findings: [{ gravidade: 'Alta', tipo: 'Fissura', ambiente: 'Fachada' }] });
  const divergent = { ...valid.emission, id: uid(), snapshotHash: '0'.repeat(64) };
  const result = await Analytics.resumir({ obras: [valid.obra], vistorias: [valid.vistoria], emissoes: [valid.emission, divergent], snapshots: [valid.snapshot], snapshotLib: SnapshotLib });
  assert.equal(result.counts.inspectionsWithVerifiedSnapshot, 0);
  assert.equal(result.counts.unverifiedLatestEmissions, 1);
  assert.equal(result.counts.verifiedFindings, 0);
});

test('falha de indicadores não remove fallback da lista no painel', () => {
  const fs = require('node:fs');
  const app = fs.readFileSync(require.resolve('../app.js'), 'utf8');
  assert.match(app, /try\s*\{[\s\S]*?Analytics\.resumir[\s\S]*?catch\s*\(e\)/);
  assert.match(app, /Indicadores locais indisponíveis\.[\s\S]*?lista de vistorias continua disponível/);
});
