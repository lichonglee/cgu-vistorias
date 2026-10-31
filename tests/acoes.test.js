const test=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');
const SnapshotLib=require('../emission-snapshot.js');
const Backup=require('../backup.js');
let fake=null;try{fake=require(process.env.FAKE_IDB||'fake-indexeddb');}catch{}
const skip=fake?false:'fake-indexeddb indisponível (defina FAKE_IDB)';
const source=fs.readFileSync(path.join(__dirname,'..','db.js'),'utf8');
const fresh=()=>new Function('indexedDB','crypto',source+';return DB;')(new fake.IDBFactory(),globalThis.crypto);
const U=()=>crypto.randomUUID();
const makeAction=(overrides={})=>({id:U(),constatacaoId:U(),vistoriaId:U(),snapshotId:U(),responsavelFuncao:'Manutenção predial',prazo:'2026-12-15',estado:'aberta',concluidaEm:null,observacao:'',...overrides});
const seedLink=async(db,a,snapshot={id:a.snapshotId,vistoriaId:a.vistoriaId,hash:'a'.repeat(64),conteudo:{constatacoes:[{id:a.constatacaoId}]}})=>{await db.put('vistorias',{id:a.vistoriaId,obraId:U()});await db.put('snapshots',snapshot);};

test('IDB v2→v3 preserva registros e snapshots e cria store/indexes de ações',{skip},async()=>{
  const idb=new fake.IDBFactory();
  await new Promise((resolve,reject)=>{const req=idb.open('cgu-vistorias',2);req.onupgradeneeded=()=>{const d=req.result;d.createObjectStore('obras',{keyPath:'id'});d.createObjectStore('vistorias',{keyPath:'id'}).createIndex('obraId','obraId');d.createObjectStore('fotos',{keyPath:'id'}).createIndex('vistoriaId','vistoriaId');d.createObjectStore('emissoes',{keyPath:'id'}).createIndex('vistoriaId','vistoriaId');d.createObjectStore('settings',{keyPath:'key'});d.createObjectStore('arquivosEmitidos',{keyPath:'id'}).createIndex('emissaoId','emissaoId');d.createObjectStore('snapshots',{keyPath:'id'}).createIndex('vistoriaId','vistoriaId');};req.onsuccess=()=>{const d=req.result,t=d.transaction(['obras','vistorias','fotos','emissoes','settings','arquivosEmitidos','snapshots'],'readwrite');t.objectStore('obras').put({id:'obra-0001',nome:'Preservada'});t.objectStore('vistorias').put({id:'vistoria-0001',obraId:'obra-0001'});t.objectStore('snapshots').put({id:U(),vistoriaId:'vistoria-0001',emissaoId:U(),conteudo:{}});t.oncomplete=()=>{d.close();resolve();};t.onerror=()=>reject(t.error);};req.onerror=()=>reject(req.error);});
  const db=new Function('indexedDB','crypto',source+';return DB;')(idb,globalThis.crypto);await db.open();
  assert.equal((await db.get('obras','obra-0001')).nome,'Preservada');assert.equal((await db.get('vistorias','vistoria-0001')).obraId,'obra-0001');assert.equal((await db.all('snapshots')).length,1);assert.deepEqual(await db.all('acoes'),[]);
  const a=makeAction({vistoriaId:'vistoria-0001'});await db.put('snapshots',{id:a.snapshotId,vistoriaId:a.vistoriaId,hash:'a'.repeat(64),conteudo:{constatacoes:[{id:a.constatacaoId}]}});await db.putAcao(a,0);assert.equal((await db.by('acoes','vistoriaId',a.vistoriaId)).length,1);assert.equal((await db.by('acoes','constatacaoId',a.constatacaoId)).length,1);assert.equal((await db.by('acoes','snapshotId',a.snapshotId)).length,1);
});

test('rowVersion serializa atualizações concorrentes e rejeita escrita obsoleta',{skip},async()=>{
  const db=fresh();await db.open();const a=makeAction();await seedLink(db,a);const first=await db.putAcao(a,0);assert.equal(first.rowVersion,1);
  const updates=await Promise.allSettled([db.putAcao({...first,responsavelFuncao:'Equipe A'},1),db.putAcao({...first,responsavelFuncao:'Equipe B'},1)]);
  assert.equal(updates.filter(x=>x.status==='fulfilled').length,1);assert.equal(updates.filter(x=>x.status==='rejected').length,1);assert.equal(updates.find(x=>x.status==='rejected').reason.code,'ACAO_CONFLICT');
  const stored=await db.get('acoes',a.id);assert.equal(stored.rowVersion,2);assert.ok(['Equipe A','Equipe B'].includes(stored.responsavelFuncao));
  await assert.rejects(()=>db.putAcao({...stored,observacao:'x'.repeat(501)},2),/Observação excede/);
  await assert.rejects(()=>db.putAcao({...stored,constatacaoId:U()},2),e=>e.code==='ACAO_LINK_INVALID');
});

test('importação preserva ação local em conflito e exclusão da ação não altera snapshot',{skip},async()=>{
  const db=fresh();await db.open();const a=makeAction(),snapshot={id:a.snapshotId,vistoriaId:a.vistoriaId,hash:'a'.repeat(64),conteudo:{constatacoes:[{id:a.constatacaoId}]}};await seedLink(db,a,snapshot);const saved=await db.putAcao(a,0);
  const emission={id:U(),vistoriaId:a.vistoriaId,snapshotId:snapshot.id,snapshotHash:snapshot.hash};
  const batch=actions=>({obras:[],vistorias:[],fotos:[],snapshots:[snapshot],arquivosEmitidos:[],emissoes:[emission],settings:{},acoes:actions});
  const orphan=await db.atomicImport({...batch([saved]),emissoes:[],snapshots:[]});assert.deepEqual(orphan.conflitos.map(x=>x.acao),['rejeitado_vinculo']);
  const duplicate=await db.atomicImport(batch([saved]));assert.equal(duplicate.duplicados,2);assert.equal(duplicate.conflitos.length,0);
  const result=await db.atomicImport(batch([{...saved,responsavelFuncao:'Importação diferente'}]));
  assert.deepEqual(result.conflitos.map(x=>[x.store,x.acao]),[['acoes','mantido_local']]);assert.equal((await db.get('acoes',a.id)).responsavelFuncao,'Manutenção predial');
  await db.deleteAcao(a.id,1);assert.equal(await db.get('acoes',a.id),undefined);assert.deepEqual(await db.get('snapshots',snapshot.id),snapshot);
});

test('excluir vistoria remove suas ações locais junto com fotos',{skip},async()=>{
  const db=fresh();await db.open();const a=makeAction();await seedLink(db,a);await db.putAcao(a,0);await db.delVistoria(a.vistoriaId);assert.equal(await db.get('acoes',a.id),undefined);
});

test('ação não é gravada sem vínculo local consistente e importação rejeita snapshot conflitante',{skip},async()=>{
  const db=fresh();await db.open();const a=makeAction();await seedLink(db,a);
  await assert.rejects(()=>db.putAcao({...a,constatacaoId:U()},0),e=>e.code==='ACAO_LINK_INVALID');
  const local={id:a.snapshotId,vistoriaId:a.vistoriaId,hash:'a'.repeat(64),conteudo:{constatacoes:[{id:a.constatacaoId}]}};await db.putAcao(a,0);
  const incoming={...local,hash:'b'.repeat(64),conteudo:{constatacoes:[{id:U()}]}};
  const result=await db.atomicImport({obras:[],vistorias:[],fotos:[],snapshots:[incoming],arquivosEmitidos:[],emissoes:[{id:U(),vistoriaId:a.vistoriaId,snapshotId:a.snapshotId,snapshotHash:incoming.hash}],settings:{},acoes:[{...a,id:U(),constatacaoId:incoming.conteudo.constatacoes[0].id}]});
  assert.ok(result.conflitos.some(x=>x.store==='snapshots'));assert.ok(result.conflitos.some(x=>x.store==='acoes'));assert.equal((await db.get('acoes',a.id)).constatacaoId,a.constatacaoId);assert.equal((await db.all('acoes')).length,1);
});

test('putAcao concorrente com exclusão da vistoria não deixa ação órfã',{skip},async()=>{
  const db=fresh();await db.open();const a=makeAction();await seedLink(db,a);
  await Promise.allSettled([db.putAcao(a,0),db.delVistoria(a.vistoriaId)]);
  assert.equal(await db.get('vistorias',a.vistoriaId),undefined);assert.equal(await db.get('acoes',a.id),undefined);
});

test('backup valida ações por campos, estado, rowVersion e vínculo com constatação do snapshot',async()=>{
  const obra={id:U(),nome:'Edifício'},constatacao={id:U(),recorrenciaDeId:U(),titulo:'Fissura',tipo:'Fissura / trinca em elemento estrutural',gravidade:'Alta',ambiente:'Fachada',local:'',descricao:'',recomendacao:'',fotoIds:[]};
  const vistoria={id:U(),obraId:obra.id,local:'Fachada',tipo:'Vistoria técnica de rotina',data:'2026-08-01',hora:'10:00',status:'emitido',nFotos:0,seq:1,ano:2026,updatedAt:10,constatacoes:[constatacao]};
  const emissaoId=U(),snapshotId=U(),conteudo=await SnapshotLib.capturar({obra,vistoria,fotos:[],cfg:{empresa:{nome:'Unidade'},rt:{nome:'RT'},usuario:'Técnico'},emissao:{tipo:'tecnico',numero:{seq:1,ano:2026},rev:0},appVersion:'1.3.0'});
  const snapshot=await SnapshotLib.criar({id:snapshotId,emissaoId,formato:'pdf',conteudo,appVersion:'1.3.0'});
  const emission={id:emissaoId,vistoriaId:vistoria.id,obraId:obra.id,tipo:'tecnico',formato:'pdf',numero:'VT-001/2026',rev:0,data:10,arquivo:'report.pdf',snapshotId,snapshotHash:snapshot.hash};
  const action={id:U(),constatacaoId:constatacao.id,vistoriaId:vistoria.id,snapshotId,responsavelFuncao:'Manutenção',prazo:'2026-12-15',estado:'aberta',concluidaEm:null,observacao:'Acompanhar',criadoEm:1,atualizadoEm:1,rowVersion:1};
  const base={app:'cgu-vistorias',v:1,appVersion:'1.3.0',exportadoEm:1,seqs:{},obras:[obra],vistorias:[vistoria],emissoes:[emission],fotos:[],snapshots:[snapshot],acoes:[action]};
  assert.equal((await Backup.validate(base,JSON.stringify(base).length,SnapshotLib)).data.acoes.length,1);
  const unknownTarget=constatacao.recorrenciaDeId;assert.equal(snapshot.conteudo.constatacoes[0].recorrenciaDeId,unknownTarget);
  const selfLink=structuredClone(base);selfLink.vistorias[0].constatacoes[0].recorrenciaDeId=selfLink.vistorias[0].constatacoes[0].id;await assert.rejects(()=>Backup.validate(selfLink,JSON.stringify(selfLink).length,SnapshotLib),/autorreferente|hash não confere/);
  const malformedLink=structuredClone(base);malformedLink.vistorias[0].constatacoes[0].recorrenciaDeId='not-a-uuid';await assert.rejects(()=>Backup.validate(malformedLink,JSON.stringify(malformedLink).length,SnapshotLib),/recorrenciaDeId/);
  const orphanEmission={...emission,id:U(),vistoriaId:U()};
  await assert.rejects(()=>Backup.validate({...base,emissoes:[emission,orphanEmission]},JSON.stringify({...base,emissoes:[emission,orphanEmission]}).length,SnapshotLib),/Emissão órfã\/inconsistente/);
  const keptEmissions=Backup.selectEmissionsForVistorias([emission,orphanEmission],new Set([vistoria.id]));assert.deepEqual(keptEmissions,[emission]);
  assert.equal((await Backup.validate({...base,emissoes:keptEmissions},JSON.stringify({...base,emissoes:keptEmissions}).length,SnapshotLib)).data.emissoes.length,1);
  const wrongFinding=structuredClone(base);wrongFinding.acoes[0].constatacaoId=U();await assert.rejects(()=>Backup.validate(wrongFinding,JSON.stringify(wrongFinding).length,SnapshotLib),/constatação no snapshot/);
  const duplicateSnapshot=structuredClone(base);duplicateSnapshot.snapshots.push(snapshot);await assert.rejects(()=>Backup.validate(duplicateSnapshot,JSON.stringify(duplicateSnapshot).length,SnapshotLib),/Snapshot duplicado/);
  const invalidState=structuredClone(base);invalidState.acoes[0].estado='resolvida';await assert.rejects(()=>Backup.validate(invalidState,JSON.stringify(invalidState).length,SnapshotLib),/Estado de ação inválido/);
  const extra=structuredClone(base);extra.acoes[0].admin=true;await assert.rejects(()=>Backup.validate(extra,JSON.stringify(extra).length,SnapshotLib),/campo não permitido/);
});

test('interface deixa claro que ação é declarada, não altera snapshot, e backup inclui acoes opcionais',()=>{
  const app=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
  assert.match(app,/DB\.putAcao\(action,existing\?\.rowVersion\|\|0\)/);
  assert.match(app,/não verificada/);
  assert.match(app,/Emitir um laudo não conclui nem encerra uma ação/);
  assert.match(app,/DB\.all\('acoes'\)/);
  assert.match(app,/if\(acoes\.length\)d\.acoes=acoes/);
  assert.match(app,/Ações declaradas ligadas às constatações selecionadas verificáveis no período/i);
  assert.match(app,/Constatações altas\/críticas sem ação declarada/i);
  assert.match(app,/Analytics\.summarizeActions\(resumo\.migrationRecords,snaps,acoes/);
  assert.match(app,/Seu rascunho está preservado/);
  assert.match(app,/!actionSummary \? '<section class="card warnbox"><b>Indicadores de ações indisponíveis/);
  assert.match(app,/tied=emissions\.filter/);
  assert.match(app,/Backup\.selectEmissionsForVistorias\(ems,vids\)/);
  const dbSource=fs.readFileSync(path.join(__dirname,'..','db.js'),'utf8');
  assert.match(dbSource,/Os vínculos da ação são imutáveis/);
  assert.match(dbSource,/rejeitado_vinculo/);
  assert.match(dbSource,/if\(!emissionSnapshotIds\.has\(action\.snapshotId\)\)rejectActionLink/);
  assert.match(app,/resumo\.period\.label/);
  assert.match(app,/recurrenceChoices\(v,c\)/);
  assert.match(app,/Vínculo explícito com constatação anterior/);
  assert.match(app,/não deduz recorrência pelo texto/);
  assert.match(app,/content\.obra\?\.id!==v\.obraId/);
  assert.match(app,/VÍNCULOS EXPLÍCITOS DE RECORRÊNCIA DECLARADOS/);
  assert.match(app,/Backup\.selectEmissionsForVistorias/);
  assert.match(app,/ficarão fora deste backup/);
  const snapshotSource=fs.readFileSync(path.join(__dirname,'..','emission-snapshot.js'),'utf8');
  assert.doesNotMatch(snapshotSource,/\bacoes\b|rowVersion/);
});

test('função responsável vazia e longa têm mensagens distintas e nada é gravado',{skip},async()=>{
  const db=fresh();await db.open();
  for(const [responsavelFuncao,message] of [['',/Informe a função responsável/],['   ',/Informe a função responsável/],['x'.repeat(121),/excede 120 caracteres/]]){
    const a=makeAction({responsavelFuncao});await seedLink(db,a);
    await assert.rejects(()=>db.putAcao(a,0),message);
  }
  assert.deepEqual(await db.all('acoes'),[]);
});
