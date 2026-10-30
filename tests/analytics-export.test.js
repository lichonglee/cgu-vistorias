const test=require('node:test');
const assert=require('node:assert/strict');
const SnapshotLib=require('../emission-snapshot.js');
const Export=require('../analytics-export.js');
const Analytics=require('../analytics.js');
const sample=()=>({schema:'cgu-local-analytics-v1',period:{asOf:'2026-10-30',windowMonths:12,from:'2025-11-01',to:'2026-10-30'},taxonomyVersion:'cgu-app-taxonomia-1',counts:{verifiedFindings:2,periodInspections:1},kpis:{severeDensity:{numerator:2,denominator:1,meaning:'private description'},risk:{calculable:false,reason:'private text'}},dimensions:{severity:[{label:'Alta',count:2}],hostile:[{label:'<img onerror=1>',count:0}]},migrationRecords:[{vistoriaId:'11111111-1111-4111-8111-111111111111',snapshotId:'22222222-2222-4222-8222-222222222222',snapshotHash:'a'.repeat(64),emissaoId:'33333333-3333-4333-8333-333333333333',tipo:'tecnico',rev:1,completeness:{data:true,tipo:true,ambiente:true,gravidade:false}}],secret:'BUILDING NAME GPS USER DESCRIPTION'});

async function verify(sealed){
  const {sha256,...payload}=sealed.object;
  const actual=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(SnapshotLib.canonicalize(payload)));
  assert.equal([...new Uint8Array(actual)].map(x=>x.toString(16).padStart(2,'0')).join(''),sha256);
  assert.equal(sealed.json,SnapshotLib.canonicalize(sealed.object));
}

test('export agregado é determinístico, minimizado e tem hash canônico verificável',async()=>{
  const a=await Export.gerarAgregado(sample(),{SnapshotLib});
  const b=await Export.gerarAgregado(sample(),{SnapshotLib});
  assert.equal(a.json,b.json);assert.equal(a.sha256,b.sha256);await verify(a);
  for(const secret of ['BUILDING NAME','GPS','USER','DESCRIPTION','private description','<img onerror=1>']) assert.equal(a.json.includes(secret),false);
  assert.equal(a.object.schema,'cgu-local-analytics-v1');
});

test('KPI sem denominador não é marcado como calculável',async()=>{
  const input=sample();input.kpis.coverage={numerator:0,denominator:0};
  const result=await Export.gerarAgregado(input,{SnapshotLib});
  assert.equal(result.object.kpis.coverage.calculable,false);
  assert.equal(result.object.kpis.coverage.denominator,0);
});

test('manifesto omite IDs por padrão e só os inclui por opção explícita',async()=>{
  const noIds=await Export.gerarManifesto(sample(),{SnapshotLib});
  assert.equal(noIds.object.idsIncluded,false);assert.equal('vistoriaId' in noIds.object.records[0],false);await verify(noIds);
  const withIds=await Export.gerarManifesto(sample(),{SnapshotLib,incluirIds:true});
  assert.equal(withIds.object.idsIncluded,true);assert.equal(withIds.object.records[0].snapshotId,'22222222-2222-4222-8222-222222222222');await verify(withIds);
  for(const text of ['BUILDING NAME','GPS','USER','DESCRIPTION']) assert.equal(noIds.json.includes(text),false);
});

test('exportadores usam allowlist e ignoram chaves hostis/desconhecidas',async()=>{
  const input=sample();input.counts.__proto__={polluted:1};input.dimensions.constructor=[{label:'private',count:1}];input.dimensions.severity.push({label:'<img onerror=1>',count:77});input.migrationRecords[0].tipo='<script>alert(1)</script>';
  const out=await Export.gerarAgregado(input,{SnapshotLib});
  assert.equal(Object.hasOwn(out.object.counts,'__proto__'),false);
  assert.equal(Object.hasOwn(out.object.dimensions,'constructor'),false);
  assert.equal(Object.hasOwn(out.object,'secret'),false);
  assert.equal(out.json.includes('<img'),false);
  const manifest=await Export.gerarManifesto(input,{SnapshotLib});
  assert.equal(manifest.json.includes('<script'),false);
});

test('ordem de entrada de contagens, dimensões e proveniência não altera JSON ou hash',async()=>{
  const a=sample(),b=sample();
  b.counts=Object.fromEntries(Object.entries(b.counts).reverse());
  b.dimensions.severity.reverse();
  b.migrationRecords.reverse();
  const ea=await Export.gerarAgregado(a,{SnapshotLib}),eb=await Export.gerarAgregado(b,{SnapshotLib});
  const ma=await Export.gerarManifesto(a,{SnapshotLib,incluirIds:true}),mb=await Export.gerarManifesto(b,{SnapshotLib,incluirIds:true});
  assert.equal(ea.json,eb.json);assert.equal(ea.sha256,eb.sha256);assert.equal(ma.json,mb.json);assert.equal(ma.sha256,mb.sha256);
});

test('reordenar vistorias, emissões e snapshots preserva JSON agregado e manifesto',async()=>{
  const uuid=n=>`${String(n).padStart(8,'0')}-1111-4111-8111-111111111111`;
  const makeRecord=async(seq,date)=>{
    const obra={id:uuid(seq),endereco:'Rua privada',contrato:'Contrato privado'};
    const vistoria={id:uuid(seq+10),obraId:obra.id,data:date,constatacoes:[{id:uuid(seq+20),titulo:'Texto privado',tipo:'Fissura / trinca em elemento estrutural',ambiente:'Fachada',gravidade:'Alta',fotoIds:[]} ]};
    const snapshot={id:uuid(seq+30),hash:'a'.repeat(64),conteudo:{obra,vistoria,constatacoes:vistoria.constatacoes,evidencias:[]}};
    const emission={id:uuid(seq+40),vistoriaId:vistoria.id,obraId:obra.id,tipo:'tecnico',formato:'pdf',rev:1,data:seq,snapshotId:snapshot.id,snapshotHash:snapshot.hash};
    return {obra,vistoria,snapshot,emission};
  };
  const records=[await makeRecord(1,'2026-05-01'),await makeRecord(2,'2026-06-01')];
  const snapshotLib={canonicalize:SnapshotLib.canonicalize,verificarEmissao:async()=>({estado:'verificado'})};
  const summarize=items=>Analytics.resumir({obras:items.map(x=>x.obra),vistorias:items.map(x=>x.vistoria),emissoes:items.map(x=>x.emission),snapshots:items.map(x=>x.snapshot),snapshotLib,asOf:'2026-10-30',janelaMeses:12});
  const first=await summarize(records),second=await summarize([...records].reverse());
  const a=await Export.gerarAgregado(first,{SnapshotLib}),b=await Export.gerarAgregado(second,{SnapshotLib});
  const ma=await Export.gerarManifesto(first,{SnapshotLib,incluirIds:true}),mb=await Export.gerarManifesto(second,{SnapshotLib,incluirIds:true});
  assert.equal(a.json,b.json);assert.equal(a.sha256,b.sha256);assert.equal(ma.json,mb.json);assert.equal(ma.sha256,mb.sha256);
  for(const secret of ['Rua privada','Contrato privado','Texto privado']){assert.equal(a.json.includes(secret),false);assert.equal(ma.json.includes(secret),false);}
});
