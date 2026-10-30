const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const vm = require('node:vm');
const Analytics = require('../analytics.js');
const SnapshotLib = require('../emission-snapshot.js');
const Taxonomia = require('../taxonomia.js');
const Backup = require('../backup.js');
const uid = () => crypto.randomUUID();

async function report({ obraId, vistoriaId, seq, rev, date, timestamp, findings = [], withGps = false, withPhoto = false }) {
  const obra = { id: obraId, nome: 'SENSITIVE BUILDING NAME', cliente: 'private', endereco: 'private', contrato: '', art: '', criadoEm: 1 };
  const photo = withPhoto ? { id: uid(), vistoriaId, blob: new Blob([new Uint8Array([255, 216, 255, 1])], { type: 'image/jpeg' }), ts: timestamp, lat: null, lon: null, descricao: 'SENSITIVE PHOTO NOTE', origem: 'camera', w: 2, h: 2, marks: [], notas: [] } : null;
  const vistoria = { id: vistoriaId, obraId, local: 'SENSITIVE LOCATION', tipo: 'Vistoria técnica de rotina', data: date, hora: '09:00', status: 'emitido', nFotos: photo ? 1 : 0, seq, ano: 2026, updatedAt: timestamp, gps: withGps ? { lat: -15.8, lon: -47.9, acc: 5 } : null, constatacoes: findings.map((f, i) => ({ id: f.id || uid(), ...(f.recorrenciaDeId ? { recorrenciaDeId: f.recorrenciaDeId } : {}), titulo: 'SENSITIVE FINDING', tipo: f.tipo, gravidade: f.gravidade, ambiente: f.ambiente, local: 'private', descricao: 'private', recomendacao: 'private', fotoIds: photo && i === 0 ? [photo.id] : [] })) };
  const emissaoId = uid();
  const conteudo = await SnapshotLib.capturar({ obra, vistoria, fotos: photo ? [photo] : [], cfg: { empresa: { nome: 'private' }, rt: { nome: 'private' }, usuario: 'private' }, emissao: { tipo: 'tecnico', numero: { seq, ano: 2026 }, rev }, appVersion: '1.6.0' });
  const snapshot = await SnapshotLib.criar({ id: uid(), emissaoId, formato: 'pdf', conteudo, appVersion: '1.6.0', criadoEm: timestamp });
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

  assert.deepEqual(Object.fromEntries(['localBuildings', 'localInspections', 'emissionRows', 'inspectionsWithEmission', 'inspectionsWithVerifiedSnapshot', 'unverifiedLatestEmissions', 'verifiedFindings'].map(k => [k, result.counts[k]])), { localBuildings: 2, localInspections: 3, emissionRows: 4, inspectionsWithEmission: 3, inspectionsWithVerifiedSnapshot: 2, unverifiedLatestEmissions: 1, verifiedFindings: 5 });
  assert.equal(result.kpis.coverage.numerator, 2);
  assert.equal(result.kpis.coverage.denominator, 2);
  assert.equal(result.kpis.severeDensity.numerator, 2);
  assert.equal(result.kpis.severeDensity.denominator, 2);
  assert.equal(result.kpis.formalization.numerator, 3);
  assert.equal(result.kpis.formalization.denominator, 4);
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
  assert.deepEqual([result.kpis.recurrence.numerator,result.kpis.recurrence.denominator,result.kpis.recurrence.calculable],[0,5,true]);
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
  assert.equal(result.kpis.recurrence.calculable,false);
  assert.equal(result.kpis.severeDensity.denominator, 0);
  assert.equal(result.scope.includes('Somente registros deste aparelho'), true);
});

test('densidade acima de 100% é exibida como razão, sem símbolo de percentual', () => {
  const rendered = Analytics.formatDensity({ numerator: 5, denominator: 2 });
  assert.equal(rendered, '2,5 constatações por vistoria (5 / 2)');
  assert.equal(rendered.includes('%'), false);
});

test('barras dimensionais mantêm contagens exatas, largura proporcional e casos vazios/zero', () => {
  assert.deepEqual(Analytics.formatDimensions([]),[]);
  assert.deepEqual(Analytics.formatDimensions([{label:'Sem classificação',count:0},{label:'Alta',count:4},{label:'Baixa',count:2}]),[
    {label:'Sem classificação',count:0,available:true,maximum:4,widthPct:0},{label:'Alta',count:4,available:true,maximum:4,widthPct:100},{label:'Baixa',count:2,available:true,maximum:4,widthPct:50}
  ]);
  assert.deepEqual(Analytics.formatDimensions([{label:'Zero',count:0}]),[{label:'Zero',count:0,available:true,maximum:1,widthPct:0}]);
  assert.deepEqual(Analytics.formatDimensions([{label:'Inválida',count:-2}]),[{label:'Inválida',count:null,available:false,maximum:1,widthPct:0}]);
  const css=fs.readFileSync(require.resolve('../app.css'),'utf8'),track='#e4eaf0';
  const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
  const lum=h=>{const [r,g,b]=rgb(h);return .2126*r+.7152*g+.0722*b;};
  const contrast=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
  for(const [,hex] of css.matchAll(/\.tone-[\w-]+\{background:#([0-9a-f]{6})\}/gi)){
    assert.ok(contrast('#'+hex,track)>=3,hex+' bar contrast against track');
  }
  assert.ok(contrast('#172b3d','#ffffff')>=4.5,'dimension label contrast');
  assert.ok(contrast('#541b16','#fff4f2')>=4.5,'integrity callout contrast');
  const app=fs.readFileSync(require.resolve('../app.js'),'utf8');
  assert.match(app,/Analytics\.formatDimensions\(xs\)/);assert.match(app,/role="meter"/);assert.match(app,/role="note"/);assert.match(app,/integrity-alert/);
  assert.match(app,/Rascunhos e alterações posteriores só entram após uma nova emissão/);
});

test('recorrência conta só vínculos explícitos válidos, sem inferir pelo conteúdo', async () => {
  const obraId=uid(), target=uid();
  const r=await report({obraId,vistoriaId:uid(),seq:61,rev:0,date:'2026-10-01',timestamp:610,findings:[
    {id:uid(),gravidade:'Alta',tipo:'Fissura',ambiente:'Fachada'},
    {id:uid(),recorrenciaDeId:target,gravidade:'Alta',tipo:'Fissura',ambiente:'Fachada'}
  ]});
  const result=await Analytics.resumir({obras:[r.obra],vistorias:[r.vistoria],emissoes:[r.emission],snapshots:[r.snapshot],snapshotLib:SnapshotLib});
  assert.deepEqual([result.kpis.recurrence.numerator,result.kpis.recurrence.denominator,result.kpis.recurrence.calculable],[1,2,true]);
  assert.equal(JSON.stringify(result.kpis.recurrence).includes(target),false);
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
  assert.match(app, /const taxonomia = typeof Taxonomia !== 'undefined' \? Taxonomia : null/);
  assert.match(app, /periodUnverifiedLatestEmissions/);
});

test('janela de 12 meses filtra pela data da vistoria, informa lacunas e trata base vazia', async () => {
  const old = await report({ obraId: uid(), vistoriaId: uid(), seq: 30, rev: 0, date: '2024-01-12', timestamp: 20, findings: [{ gravidade: 'Alta', tipo: 'Fissura', ambiente: 'Fachada' }] });
  const recent = await report({ obraId: uid(), vistoriaId: uid(), seq: 31, rev: 0, date: '2026-04-03', timestamp: 30, findings: [{ gravidade: 'Alta', tipo: 'Fissura', ambiente: 'Fachada' }] });
  const result = await Analytics.resumir({ obras: [old.obra, recent.obra], vistorias: [old.vistoria, recent.vistoria], emissoes: [old.emission, recent.emission], snapshots: [old.snapshot, recent.snapshot], snapshotLib: SnapshotLib, taxonomia: Taxonomia, asOf: '2026-10-30', janelaMeses: 12 });
  assert.deepEqual(result.period, { asOf: '2026-10-30', windowMonths: 12, from: '2025-11-01', to: '2026-10-30', label: '12 meses (2025-11-01 a 2026-10-30)' });
  assert.equal(result.counts.periodInspections, 1);
  assert.equal(result.kpis.severeDensity.denominator, 1);
  assert.equal(result.kpis.coverage.numerator, 1);
  assert.equal(result.kpis.coverage.denominator, 2);
  const empty = await Analytics.resumir({ obras: [], vistorias: [], emissoes: [], snapshots: [], snapshotLib: SnapshotLib, asOf: '2026-10-30', janelaMeses: 12 });
  assert.equal(empty.kpis.severeDensity.denominator, 0);
  assert.equal(empty.kpis.coverage.denominator, 0);
});

test('candidatos a duplicata exigem edifício/data/conteúdo iguais e só devolvem ids', async () => {
  const obraId = uid(), finding = { gravidade: 'Alta', tipo: 'Fissura', ambiente: 'Fachada' };
  const a = await report({ obraId, vistoriaId: uid(), seq: 32, rev: 0, date: '2026-08-01', timestamp: 30, findings: [finding] });
  const b = await report({ obraId, vistoriaId: uid(), seq: 33, rev: 0, date: '2026-08-01', timestamp: 40, findings: [finding] });
  const rows = [a, b];
  const before = JSON.stringify(rows.map(x => x.vistoria));
  const result = await Analytics.resumir({ obras: [a.obra], vistorias: rows.map(x => x.vistoria), emissoes: rows.map(x => x.emission), snapshots: rows.map(x => x.snapshot), snapshotLib: SnapshotLib, taxonomia: Taxonomia, asOf: '2026-10-30', janelaMeses: null });
  const sortedIds = rows.map(x => x.vistoria.id).sort();
  assert.deepEqual(result.duplicateCandidates.map(x => [x.vistoriaIdA, x.vistoriaIdB]), [[sortedIds[0], sortedIds[1]]]);
  assert.equal(JSON.stringify(rows.map(x => x.vistoria)), before);
  assert.equal(JSON.stringify(result.duplicateCandidates).includes('SENSITIVE'), false);
});

test('relatório de lacunas conta campos ausentes/inválidos e IDs locais sem refletir conteúdo', async()=>{
  const obra={id:uid(),endereco:'',contrato:''};
  const vistoria={id:uid(),obraId:obra.id,data:'data-ruim',constatacoes:[{id:uid(),tipo:'__proto__',ambiente:'<script>',gravidade:'urgente',descricao:'PRIVATE TEXT'}]};
  const result=await Analytics.resumir({obras:[obra],vistorias:[vistoria],snapshotLib:SnapshotLib,taxonomia:Taxonomia,asOf:'2026-10-30',janelaMeses:12});
  const gaps=Object.fromEntries(result.dataGaps.map(x=>[x.field,x]));
  for(const field of ['endereco','contrato','data','tipo','ambiente','gravidade']) assert.equal(gaps[field].count,1);
  assert.equal(JSON.stringify(result.dataGaps).includes('PRIVATE TEXT'),false);
  assert.equal(result.counts.undatedInspectionsExcluded,1);
});

test('janela usa a data congelada para KPIs emitidos e denominadores GPS',async()=>{
  const a=await report({obraId:uid(),vistoriaId:uid(),seq:41,rev:0,date:'2026-04-01',timestamp:10,withGps:false,findings:[]});
  a.vistoria.data='2024-01-01';
  const b=await report({obraId:uid(),vistoriaId:uid(),seq:42,rev:0,date:'2024-01-01',timestamp:20,withGps:true,findings:[]});
  const result=await Analytics.resumir({obras:[a.obra,b.obra],vistorias:[a.vistoria,b.vistoria],emissoes:[a.emission,b.emission],snapshots:[a.snapshot,b.snapshot],snapshotLib:SnapshotLib,asOf:'2026-10-30',janelaMeses:12});
  assert.equal(result.counts.periodInspections,1);
  assert.equal(result.kpis.formalization.numerator,1);assert.equal(result.kpis.formalization.denominator,1);
  assert.equal(result.kpis.snapshotIntegrity.numerator,1);assert.equal(result.kpis.snapshotIntegrity.denominator,1);
  assert.equal(result.kpis.gpsAvailability.numerator,0);assert.equal(result.kpis.gpsAvailability.denominator,1);
});

test('falha do digest desativa somente candidatos a duplicata',async()=>{
  const original=Object.getOwnPropertyDescriptor(globalThis,'crypto');
  Object.defineProperty(globalThis,'crypto',{configurable:true,value:{subtle:{digest:async()=>{throw new Error('simulated digest failure');}}}});
  try {
    const snapshot={id:'22222222-2222-4222-8222-222222222222',conteudo:{obra:{id:'obra'},vistoria:{data:'2026-06-01'},constatacoes:[{titulo:'x',tipo:'y',gravidade:'Alta',ambiente:'z'}],evidencias:[]}};
    const emission={id:'33333333-3333-4333-8333-333333333333',vistoriaId:'11111111-1111-4111-8111-111111111111',snapshotId:snapshot.id,rev:1,data:1};
    const fakeSnapshotLib={verificarEmissao:async()=>({estado:'verificado'}),canonicalize:value=>JSON.stringify(value)};
    const result=await Analytics.resumir({obras:[{id:'obra'}],vistorias:[{id:emission.vistoriaId,obraId:'obra',data:'2026-06-01'}],emissoes:[emission],snapshots:[snapshot],snapshotLib:fakeSnapshotLib});
    assert.equal(result.duplicateCandidatesAvailable,false);assert.deepEqual(result.duplicateCandidates,[]);
    assert.equal(result.counts.verifiedFindings,1);
  } finally {
    if(original)Object.defineProperty(globalThis,'crypto',original);else delete globalThis.crypto;
  }
});

test('constatações idênticas sem data válida não são candidatas a duplicata',async()=>{
  const obraId=uid(),finding={gravidade:'Alta',tipo:'Fissura',ambiente:'Fachada'};
  const a=await report({obraId,vistoriaId:uid(),seq:51,rev:0,date:'invalida',timestamp:1,findings:[finding]});
  const b=await report({obraId,vistoriaId:uid(),seq:52,rev:0,date:'invalida',timestamp:2,findings:[finding]});
  const result=await Analytics.resumir({obras:[a.obra],vistorias:[a.vistoria,b.vistoria],emissoes:[a.emission,b.emission],snapshots:[a.snapshot,b.snapshot],snapshotLib:SnapshotLib,janelaMeses:null});
  assert.deepEqual(result.duplicateCandidates,[]);
});

test('limite de 200 candidatos é determinístico e informa o total omitido',async()=>{
  const rows=Array.from({length:201},(_,i)=>{const vistoriaId=`v-${String(i).padStart(3,'0')}`,snapshotId=`s-${String(i).padStart(3,'0')}`;return{obra:{id:'obra'},vistoria:{id:vistoriaId,obraId:'obra',data:'2026-06-01'},emission:{id:`e-${i}`,vistoriaId,snapshotId,rev:1,data:i},snapshot:{id:snapshotId,conteudo:{obra:{id:'obra'},vistoria:{data:'2026-06-01'},constatacoes:[{titulo:'igual',tipo:'x',gravidade:'Alta',ambiente:'y'}],evidencias:[]}}};});
  const lib={canonicalize:SnapshotLib.canonicalize,verificarEmissao:async()=>({estado:'verificado'})};
  const summarize=items=>Analytics.resumir({obras:[{id:'obra'}],vistorias:items.map(x=>x.vistoria),emissoes:items.map(x=>x.emission),snapshots:items.map(x=>x.snapshot),snapshotLib:lib,janelaMeses:null});
  const a=await summarize(rows),b=await summarize([...rows].reverse());
  assert.equal(a.duplicateCandidates.length,200);assert.equal(a.duplicateCandidatesTotal,20100);assert.equal(a.duplicateCandidatesTruncated,true);
  assert.deepEqual(a.duplicateCandidates,b.duplicateCandidates);
});

test('declaração local continua associada pelo ID estável em nova revisão',()=>{
  const vistoriaId=uid(),findingId=uid(),oldSnapshot={id:uid(),conteudo:{constatacoes:[{id:findingId,gravidade:'Alta'}]}},currentSnapshot={id:uid(),conteudo:{constatacoes:[{id:findingId,gravidade:'Alta'}]}};
  const action={vistoriaId,constatacaoId:findingId,snapshotId:oldSnapshot.id,estado:'concluida',concluidaEm:1,criadoEm:1,prazo:'2026-10-29'};
  const summary=Analytics.summarizeActions([{vistoriaId,snapshotId:currentSnapshot.id}],[oldSnapshot,currentSnapshot],[action],{asOf:'2026-10-30',now:40*86400000});
  assert.deepEqual(summary,{completed:1,declared:1,active:0,cancelled:0,overdue:0,aging30:0,highCriticalWithoutAction:0,highCriticalTotal:1});
});

test('fila local reconcilia motivos com os KPIs e exclui ações concluídas/canceladas',()=>{
  const vistoriaId=uid(),snapshotId=uid(),ids=[uid(),uid(),uid(),uid()];
  const snapshot={id:snapshotId,conteudo:{obra:{nome:'Edifício local'},constatacoes:[
    {id:ids[0],titulo:'Sem ação',gravidade:'Alta',descricao:'não exportar',local:'privado'},
    {id:ids[1],titulo:'Vencida e antiga',gravidade:'Crítica'},
    {id:ids[2],titulo:'Concluída',gravidade:'Média'},
    {id:ids[3],titulo:'Cancelada',gravidade:'Alta'}
  ]}};
  const records=[{vistoriaId,snapshotId}],now=100*86400000;
  const actions=[
    {id:uid(),vistoriaId,constatacaoId:ids[1],estado:'aberta',prazo:'2026-10-01',criadoEm:now-40*86400000,observacao:'segredo'},
    {id:uid(),vistoriaId,constatacaoId:ids[1],estado:'em-execucao',prazo:'2026-11-01',criadoEm:now-35*86400000},
    {id:uid(),vistoriaId,constatacaoId:ids[2],estado:'concluida',prazo:'2026-10-01',criadoEm:now-40*86400000},
    {id:uid(),vistoriaId,constatacaoId:ids[3],estado:'cancelada',prazo:'2026-10-01',criadoEm:now-40*86400000}
  ];
  const summary=Analytics.summarizeActions(records,[snapshot],actions,{asOf:'2026-10-30',now});
  const list=Analytics.listFollowUp(records,[snapshot],actions,{asOf:'2026-10-30',now});
  const count=reason=>list.filter(x=>x.motivo===reason).length;
  assert.equal(count('vencida'),summary.overdue);
  assert.equal(count('aberta_30d'),summary.aging30);
  assert.equal(count('sem_acao'),summary.highCriticalWithoutAction);
  assert.deepEqual(summary,{completed:1,declared:3,active:2,cancelled:1,overdue:1,aging30:2,highCriticalWithoutAction:2,highCriticalTotal:3});
  assert.equal(list.some(x=>x.constatacaoId===ids[2]&&x.motivo!=='sem_acao'),false);
  assert.equal(list.some(x=>x.constatacaoId===ids[3]&&x.motivo!=='sem_acao'),false);
  assert.ok(list.every(x=>!Object.hasOwn(x,'observacao')&&!Object.hasOwn(x,'descricao')&&!Object.hasOwn(x,'gps')));
  assert.ok(list.every(x=>Object.keys(x).sort().join(',')==='actionId,constatacaoId,edificio,gravidade,motivo,prazo,snapshotId,titulo,vistoriaId'));
});

test('fila local é determinística, respeita apenas snapshots selecionados e não infere decisão de recorrência',()=>{
  const v1=uid(),v2=uid(),s1=uid(),s2=uid(),c1=uid(),c2=uid();
  const snapshots=[
    {id:s1,conteudo:{obra:{nome:'A'},constatacoes:[{id:c1,titulo:'<img onerror=x>',gravidade:'Alta'}]}},
    {id:s2,conteudo:{obra:{nome:'B'},constatacoes:[{id:c2,titulo:'B',gravidade:'Crítica'}]}},
    {id:uid(),conteudo:{obra:{nome:'Fora'},constatacoes:[{id:uid(),gravidade:'Crítica'}]}}
  ];
  const records=[{vistoriaId:v1,snapshotId:s1},{vistoriaId:v2,snapshotId:s2}],actions=[];
  const a=Analytics.listFollowUp(records,snapshots,actions,{asOf:'2026-10-30'});
  const b=Analytics.listFollowUp([...records].reverse(),[...snapshots].reverse(),actions,{asOf:'2026-10-30'});
  assert.deepEqual(a,b);assert.equal(a.length,2);assert.equal(a[0].gravidade,'Crítica');
  assert.ok(a.every(x=>x.motivo==='sem_acao'));
  assert.ok(a.every(x=>!('descricao' in x)&&!('fotoIds' in x)&&!('recorrenciaDeId' in x)));
  assert.equal(a.find(x=>x.constatacaoId===c1).titulo,'<img onerror=x>');
});

test('fila vazia e dados legados incompletos não quebram, e UI escapa rótulos e só navega',()=>{
  assert.deepEqual(Analytics.listFollowUp(),[]);
  const snapshot={id:'legacy-snapshot',conteudo:{obra:{},constatacoes:[{id:'legacy-finding',gravidade:'Alta',titulo:'<svg onload=alert(1)>'}]}};
  const rows=Analytics.listFollowUp([{vistoriaId:'legacy-vistoria',snapshotId:'legacy-snapshot'}],[snapshot],[],{asOf:'2026-10-30'});
  assert.equal(rows.length,1);assert.equal(rows[0].edificio,'');assert.equal(rows[0].prazo,'');
  const app=fs.readFileSync(require.resolve('../app.js'),'utf8');
  assert.match(app,/Analytics\.listFollowUp\(resumo\.migrationRecords/);
  assert.match(app,/esc\(item\.titulo\)/);assert.match(app,/data-open-follow-up/);
  assert.match(app,/pendingFollowUpFindingId/);assert.match(app,/data-open-follow-up/);
  assert.match(app,/aria-label="Abrir constatação: /);assert.match(app,/aria-live="polite"/);
  assert.match(app,/if \(!v\) \{ pendingFollowUpFindingId = ''/);assert.match(app,/decodeRouteSegment\(h\[1\]\)/);
  assert.match(app,/if \(focusControl\?\.disabled\) info\.focus\(\)/);assert.match(app,/const actionOptions=\{asOf:hoje\(\),now:Date\.now\(\)\}/);
  assert.match(app,/Ausência de vínculo de recorrência não significa que ele não foi avaliado/);
  assert.doesNotMatch(app,/DB\.put\(['"]acoes['"]/);
  const helper=app.match(/function decodeRouteSegment\(segment\) \{[^\n]+\}/);
  assert.ok(helper);const context=vm.createContext({});vm.runInContext(helper[0],context);
  assert.equal(vm.runInContext('decodeRouteSegment("%E0%A4%A")',context),null);
  assert.equal(vm.runInContext('decodeRouteSegment("legacy-123")',context),'legacy-123');
  const reader=app.match(/function openFollowUpFinding\(item, records, snapshots\) \{[\s\S]*?\n\}/);
  assert.ok(reader);for(const field of ['titulo','gravidade','nome','ambiente','local','descricao','recomendacao'])assert.match(reader[0],new RegExp('esc\\([^\\n]*'+field));
  assert.doesNotMatch(reader[0],/DB\.put|DB\.putAcao/);assert.match(reader[0],/follow-up-open-current/);
  let html='',toastMessage='',closed=0,modalCount=0,modalOnClose=null,headingFocused=0,restoredFocus=0;const buttons={},trigger={focus:()=>restoredFocus++},dialogAttrs={};
  const modalRoot={setAttribute:(name,value)=>dialogAttrs[name]=value,querySelector:selector=>selector==='#follow-up-dialog-title'?{focus:()=>headingFocused++}:buttons[selector]||(buttons[selector]={})};
  const modalContext=vm.createContext({document:{activeElement:trigger},esc:Backup.escapeHtml,gravCls:()=> 'mut',toast:message=>{toastMessage=message;},modal:(markup,onclose)=>{html=markup;modalCount++;modalOnClose=onclose;return modalRoot;},closeModal:()=>{closed++;modalOnClose?.();},location:{hash:''},tab:'painel',pendingFollowUpFindingId:''});
  vm.runInContext(reader[0],modalContext);
  const vistoriaId='legacy /vistoria?',snapshotId='legacy-snapshot',constatacaoId='legacy-finding';
  const modalSnapshot={id:snapshotId,conteudo:{obra:{nome:'<b>Edifício</b>'},constatacoes:[{id:constatacaoId,titulo:'<svg onload=x>',gravidade:'Alta',ambiente:'<img>',local:'<script>',descricao:'<iframe>',recomendacao:'<object>'}]}};
  modalContext.openFollowUpFinding({vistoriaId,snapshotId,constatacaoId},[{vistoriaId,snapshotId,rev:2}],[modalSnapshot]);
  assert.ok(html.includes('&lt;svg onload=x&gt;'));assert.ok(html.includes('&lt;iframe&gt;'));assert.doesNotMatch(html,/<svg onload=x>|<iframe>/);
  assert.equal(dialogAttrs.role,'dialog');assert.equal(dialogAttrs['aria-modal'],'true');assert.equal(headingFocused,1);
  buttons['#follow-up-open-current'].onclick();
  assert.equal(modalContext.tab,'const');assert.equal(modalContext.pendingFollowUpFindingId,constatacaoId);assert.equal(modalContext.location.hash,'#/vistoria/legacy%20%2Fvistoria%3F');assert.equal(closed,1);assert.equal(restoredFocus,1);
  modalContext.openFollowUpFinding({vistoriaId,snapshotId,constatacaoId},[],[]);
  assert.equal(modalCount,1);assert.ok(toastMessage.includes('snapshot selecionado'));
});

test('paginador aplica filtro e limites sem perder nem duplicar linhas',()=>{
  const rows=Array.from({length:5},(_,i)=>({id:i,motivo:i===4?'sem_acao':'vencida'}));
  assert.deepEqual(Analytics.pageFollowUp(rows,'vencida',1,2),{items:[{id:2,motivo:'vencida'},{id:3,motivo:'vencida'}],total:4,page:1,pageSize:2,pages:2});
  assert.deepEqual(Analytics.pageFollowUp(rows,'sem_acao',99,2),{items:[rows[4]],total:1,page:0,pageSize:2,pages:1});
  assert.deepEqual(Analytics.pageFollowUp(rows,'vencida',-1,0),{items:rows.slice(0,4),total:4,page:0,pageSize:50,pages:1});
  assert.deepEqual(Analytics.pageFollowUp([],''),{items:[],total:0,page:0,pageSize:50,pages:1});
});

test('migrationRecords duplicados não repetem linhas e seleções ambíguas ficam fora',()=>{
  const vistoriaId=uid(),s1=uid(),s2=uid(),findingId=uid();
  const snapshots=[{id:s1,conteudo:{obra:{nome:'A'},constatacoes:[{id:findingId,gravidade:'Alta'}]}},{id:s2,conteudo:{obra:{nome:'B'},constatacoes:[{id:findingId,gravidade:'Crítica'}]}}];
  assert.equal(Analytics.listFollowUp([{vistoriaId,snapshotId:s1},{vistoriaId,snapshotId:s1}],snapshots).length,1);
  assert.deepEqual(Analytics.listFollowUp([{vistoriaId,snapshotId:s1},{vistoriaId,snapshotId:s2}],snapshots),[]);
});
