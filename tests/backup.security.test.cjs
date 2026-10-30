const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const Backup = require('../backup.js');
const S = require('../emission-snapshot.js');
const U = () => require('node:crypto').randomUUID();
const base = () => ({app:'cgu-vistorias',v:1,appVersion:'1.0.6',exportadoEm:1,seqs:{},obras:[],vistorias:[],emissoes:[],fotos:[]});
const jpeg = 'data:image/jpeg;base64,/9j/AA==';
function fakeIndexedDB(seed={}) {
  const stores=new Map(Object.entries(seed).map(([name,items])=>[name,new Map(items.map(x=>[x.id||x.key,x]))]));
  const fakeDb={transaction(){let pending=0,completed=false,aborted=false,tx;const check=()=>queueMicrotask(()=>{if(!pending&&!completed&&!aborted){completed=true;tx.oncomplete?.();}});const request=task=>{const req={};pending++;queueMicrotask(()=>{if(!aborted)task(req);pending--;check();});return req;};tx={error:null,abort(){aborted=true;queueMicrotask(()=>tx.onabort?.());},objectStore(name){if(!stores.has(name))stores.set(name,new Map());const records=stores.get(name);const getAll=predicate=>request(req=>{req.result=[...records.values()].filter(predicate);req.onsuccess?.();});return {get(key){return request(req=>{req.result=records.get(key);req.onsuccess?.();});},getAll(){return getAll(()=>true);},put(value){return request(req=>{const key=value.id||value.key;records.set(key,value);req.result=key;req.onsuccess?.();});},add(value){return request(req=>{records.set(value.id,value);req.result=value.id;req.onsuccess?.();});},delete(key){return request(req=>{records.delete(key);req.onsuccess?.();});},index(field){return {getAll(value){return getAll(x=>x[field]===value);}};}};}};return tx;}};
  const indexedDB={open(){const req={};queueMicrotask(()=>{req.result=fakeDb;req.onsuccess?.();});return req;}};
  return {indexedDB,stores};
}

test('accepts compatible legacy v1 envelope with optional new arrays omitted', async()=>{
  const d=base(); assert.equal((await Backup.validate(d,JSON.stringify(d).length,S)).data.v,1);
});
test('rejects hostile id, invalid envelope, missing arrays, unknown and prototype keys',async()=>{
  const cases=[];
  let d=base();d.obras=[{id:'x" onclick="alert(1)',nome:'x'}];cases.push(d);
  d=base();d.v=2;cases.push(d);
  d=base();delete d.fotos;cases.push(d);
  d=base();d.obras=[{id:U(),nome:'x',unexpected:1}];cases.push(d);
  d=JSON.parse('{"app":"cgu-vistorias","v":1,"appVersion":"1.0.6","exportadoEm":1,"seqs":{},"obras":[],"vistorias":[],"emissoes":[],"fotos":[],"__proto__":{"polluted":true}}');cases.push(d);
  for(const x of cases) await assert.rejects(()=>Backup.validate(x,100,S));
});
test('rejects oversized input and pathological arrays before records are traversed',async()=>{
  await assert.rejects(()=>Backup.validate(base(),Backup.limits.MAX_BACKUP_BYTES+1,S),/512 MiB/);
  const d=base();d.obras=new Array(100001);await assert.rejects(()=>Backup.validate(d,10,S),/limite|Lista/);
});
test('rejects external URLs, SVG, HTML, malformed base64 and fake image magic',()=>{
  for(const x of ['https://example.test/x','data:image/svg+xml;base64,PHN2Zz4=','data:text/html;base64,PGgxPg==','data:image/jpeg;base64,@@==','data:image/png;base64,/9j/AA==']) assert.throws(()=>Backup.dataUrl(x));
});
test('rejects external data without issuing a fetch and decodes only bounded image MIME',async()=>{
  assert.equal(Backup.dataUrl(jpeg).bytes.length,4);
  assert.throws(()=>Backup.dataUrl('data:image/jpeg;base64,'+'A'.repeat(Backup.limits.MAX_IMAGE_BYTES*2)));
  const original=global.fetch;let requests=0;global.fetch=async()=>{requests++;throw new Error('unexpected network request');};
  try { assert.throws(()=>Backup.dataUrl('https://attacker.test/photo')); } finally { global.fetch=original; }
  assert.equal(requests,0);
  const source=fs.readFileSync(require.resolve('../app.js'),'utf8');assert.doesNotMatch(source,/fetch\(data\)/);
});
test('cropBackup blob/base survive JSON roundtrip and restore as Blobs',async()=>{
  const toData=async b=>'data:image/jpeg;base64,'+Buffer.from(await b.arrayBuffer()).toString('base64');
  const largeBase=Buffer.alloc(150*1024,7);largeBase.set([255,216,255],0);
  const f={id:U(),vistoriaId:U(),blob:new Blob([Buffer.from([255,216,255,0])],{type:'image/jpeg'}),cropBackup:{blob:new Blob([Buffer.from([255,216,255,1])],{type:'image/jpeg'}),base:new Blob([largeBase],{type:'image/jpeg'}),w:20,h:10,marks:[],notas:[],stampLines:['a'],cortada:true}};
  const exported=await Backup.photoJson(f,toData);const restored=Backup.decodePhoto(JSON.parse(JSON.stringify(exported)));
  assert.deepEqual(Buffer.from(await restored.cropBackup.blob.arrayBuffer()),Buffer.from([255,216,255,1]));
  assert.deepEqual(Buffer.from(await restored.cropBackup.base.arrayBuffer()),largeBase);
  assert.ok(exported.cropBackup.base.length>150*1024);
  const d=base();const obra={id:U(),nome:'Obra'},vis={id:f.vistoriaId,obraId:obra.id};d.obras=[obra];d.vistorias=[vis];d.fotos=[exported];
  const checked=await Backup.validate(d,JSON.stringify(d).length,S);
  assert.equal(checked.photoHashes.get(f.id),await Backup.photoFingerprint(restored));
  d.fotos[0].cropBackup.marks=[{t:'script',n:'\"><img'}];
  await assert.rejects(()=>Backup.validate(d,JSON.stringify(d).length,S),/crop marks/);
});
test('CSV neutralizes formula-leading cells and HTML escaping encodes attribute payloads',()=>{
  assert.equal(Backup.csvCell('=1+1'),"\"'=1+1\"");
  assert.equal(Backup.csvCell('  @cmd'),"\"'  @cmd\"");
  assert.equal(Backup.escapeHtml('\"><img src=x onerror=alert(1)>'),'&quot;&gt;&lt;img src=x onerror=alert(1)&gt;');
});
test('CSP contains required same-origin restrictions and no inline script element',()=>{
  const html=fs.readFileSync(require.resolve('../index.html'),'utf8');
  for(const d of ["default-src 'self'","script-src 'self'","style-src 'self' 'unsafe-inline'","img-src 'self' blob: data:","connect-src 'self' data: blob:","object-src 'none'","base-uri 'none'","form-action 'none'","worker-src 'self'","manifest-src 'self'"])assert.ok(html.includes(d),d);
  assert.doesNotMatch(html,/<script\s*[^>]*>\s*[^<]/i);assert.doesNotMatch(html,/\son(?:error|load|click)=/i);
  const sw=fs.readFileSync(require.resolve('../sw.js'),'utf8'),brand=fs.readFileSync(require.resolve('../brand.js'),'utf8');
  assert.match(sw,/importScripts\(['"]brand\.js\?v=1\.0\.6['"]\)/);assert.match(brand,/version:\s*['"]1\.0\.6['"]/);
  assert.match(sw,/['"]backup\.js['"]/);assert.match(html,/<script src="backup\.js"><\/script>/);
});
test('import schema rejects orphaned vistoria and wrong typed metadata',async()=>{
  const d=base();const vid=U();d.vistorias=[{id:vid,obraId:U(),updatedAt:'1'}];
  await assert.rejects(()=>Backup.validate(d,100,S));
  d.vistorias[0].updatedAt=1;d.vistorias[0].obraId=U();await assert.rejects(()=>Backup.validate(d,100,S));
});
test('validates PDF/DOCX backup artifacts by MIME, magic bytes and declared size',()=>{
  const pdf=Buffer.from('%PDF-1.7');
  assert.equal(Backup.artifactData('data:application/pdf;base64,'+pdf.toString('base64'),'application/pdf',pdf.length).length,pdf.length);
  assert.throws(()=>Backup.artifactData('data:application/pdf;base64,'+Buffer.from('<html>').toString('base64'),'application/pdf',6));
  assert.throws(()=>Backup.artifactData('data:application/pdf;base64,'+pdf.toString('base64'),'text/html',pdf.length));
  assert.throws(()=>Backup.artifactData('https://example.test/report.pdf','application/pdf',pdf.length));
  assert.throws(()=>Backup.artifactData('data:application/pdf;base64,'+pdf.toString('base64'),'application/pdf',999));
});
test('backup import recomputes snapshot and exact PDF digest before acceptance',async()=>{
  const obra={id:U(),nome:'Obra',cliente:'',endereco:'',contrato:'',art:'',criadoEm:1};
  const vistoria={id:U(),obraId:obra.id,local:'Sala',tipo:'Vistoria técnica de rotina',data:'2026-10-01',hora:'10:00',status:'emitido',nFotos:0,seq:1,ano:2026,updatedAt:2,constatacoes:[]};
  const emissaoId=U(),snapshotId=U(),arquivoId=U(),bytes=Buffer.from('%PDF-1.7 sample');
  const emissionInfo={tipo:'tecnico',numero:{seq:1,ano:2026},rev:0};
  const conteudo=await S.capturar({obra,vistoria,fotos:[],cfg:{empresa:{nome:'CGU'},rt:{nome:'RT'},usuario:'u'},emissao:emissionInfo,appVersion:'1.0.6'});
  const snapshot=await S.criar({id:snapshotId,emissaoId,formato:'pdf',conteudo,appVersion:'1.0.6'});
  const digest=require('node:crypto').createHash('sha256').update(bytes).digest('hex');
  const d=base();Object.assign(d,{obras:[obra],vistorias:[vistoria],emissoes:[{id:emissaoId,vistoriaId:vistoria.id,obraId:obra.id,tipo:'tecnico',formato:'pdf',numero:'VT-001/2026',rev:0,data:1,arquivo:'report.pdf',usuario:'u',snapshotId,snapshotHash:snapshot.hash,arquivoSha256:digest,arquivoId}],snapshots:[snapshot],arquivosEmitidos:[{id:arquivoId,emissaoId,snapshotId,arquivo:'report.pdf',mime:'application/pdf',sha256:digest,bytes:bytes.length,data:'data:application/pdf;base64,'+bytes.toString('base64')}]});
  assert.equal((await Backup.validate(d,JSON.stringify(d).length,S)).data.snapshots.length,1);
  d.arquivosEmitidos[0].data='data:application/pdf;base64,'+Buffer.from('%PDF-1.7 sasmle').toString('base64');
  await assert.rejects(()=>Backup.validate(d,JSON.stringify(d).length,S),/SHA-256/);
});
test('roundtrip backup preserves evidence bytes, crop undo source, snapshot and emitted PDF bytes',async()=>{
  const obra={id:U(),nome:'Obra',cliente:'',endereco:'',contrato:'',art:'',criadoEm:1};
  const vistoria={id:U(),obraId:obra.id,local:'Sala',tipo:'Vistoria técnica de rotina',data:'2026-10-01',hora:'10:00',status:'emitido',nFotos:1,seq:1,ano:2026,updatedAt:2,constatacoes:[]};
  const photoId=U(), original=new Uint8Array([255,216,255,1,2]), current=new Uint8Array([255,216,255,3,4]);
  const photo={id:photoId,vistoriaId:vistoria.id,blob:new Blob([current],{type:'image/jpeg'}),cropBackup:{blob:new Blob([original],{type:'image/jpeg'}),base:new Blob([original],{type:'image/jpeg'}),w:20,h:10,cortada:true},ts:1,lat:-15,lon:-47,acc:4,descricao:'fachada',origem:'camera',w:10,h:5,cortada:true,marks:[],notas:[]};
  const emissaoId=U(),snapshotId=U(),arquivoId=U(),pdf=Buffer.from('%PDF-1.7 roundtrip');
  const conteudo=await S.capturar({obra,vistoria,fotos:[photo],cfg:{empresa:{nome:'CGU'},rt:{nome:'RT'},usuario:'u'},emissao:{tipo:'tecnico',numero:{seq:1,ano:2026},rev:0},appVersion:'1.0.6'});
  const snapshot=await S.criar({id:snapshotId,emissaoId,formato:'pdf',conteudo,appVersion:'1.0.6'});
  const pdfHash=require('node:crypto').createHash('sha256').update(pdf).digest('hex');
  const emission={id:emissaoId,vistoriaId:vistoria.id,obraId:obra.id,tipo:'tecnico',formato:'pdf',numero:'VT-001/2026',rev:0,data:1,arquivo:'r.pdf',usuario:'u',snapshotId,snapshotHash:snapshot.hash,arquivoSha256:pdfHash,arquivoId};
  const toData=async b=>'data:'+b.type+';base64,'+Buffer.from(await b.arrayBuffer()).toString('base64');
  const jsonPhoto=await Backup.photoJson(photo,toData);
  const payload={app:'cgu-vistorias',v:1,appVersion:'1.0.6',exportadoEm:1,obras:[obra],vistorias:[vistoria],emissoes:[emission],fotos:[jsonPhoto],snapshots:[snapshot],arquivosEmitidos:[{id:arquivoId,emissaoId,snapshotId,arquivo:'r.pdf',mime:'application/pdf',sha256:pdfHash,bytes:pdf.length,data:'data:application/pdf;base64,'+pdf.toString('base64')}]};
  const checked=await Backup.validate(payload,JSON.stringify(payload).length,S);
  const restoredPhoto=Backup.decodePhoto(JSON.parse(JSON.stringify(jsonPhoto)));
  assert.equal(checked.photoHashes.get(photoId),await Backup.photoFingerprint(restoredPhoto));
  assert.deepEqual(new Uint8Array(await restoredPhoto.blob.arrayBuffer()),current);
  assert.deepEqual(new Uint8Array(await restoredPhoto.cropBackup.blob.arrayBuffer()),original);
  assert.deepEqual(new Uint8Array(await restoredPhoto.cropBackup.base.arrayBuffer()),original);
  const artifactBytes=Backup.artifactData(payload.arquivosEmitidos[0].data,'application/pdf',pdf.length);
  assert.deepEqual(Buffer.from(artifactBytes),pdf);
  assert.equal((await S.validar(snapshot)).ok,true);
  const cosmetic=JSON.parse(JSON.stringify(payload));cosmetic.emissoes[0].estadoSnapshot='verificado';
  await assert.rejects(()=>Backup.validate(cosmetic,JSON.stringify(cosmetic).length,S),/campo não permitido estadoSnapshot/);
  delete cosmetic.emissoes[0].estadoSnapshot;cosmetic.emissoes[0].estadoArquivo='verificado';
  await assert.rejects(()=>Backup.validate(cosmetic,JSON.stringify(cosmetic).length,S),/campo não permitido estadoArquivo/);
});
test('atomicImport treats identical photo digest as duplicate and changed same-id content as conflict',async()=>{
  const source=fs.readFileSync(require.resolve('../db.js'),'utf8'),stores=new Map();
  const fakeDb={transaction(){let pending=0,completed=false,tx;const finish=()=>queueMicrotask(()=>{if(!pending&&!completed){completed=true;tx.oncomplete?.();}});tx={objectStore(name){if(!stores.has(name))stores.set(name,new Map());const records=stores.get(name);return {get(key){const req={};pending++;queueMicrotask(()=>{req.result=records.get(key);req.onsuccess?.();pending--;finish();});return req;},add(value){records.set(value.id,value);return {};},put(value){records.set(value.id||value.key,value);return {};}};}};return tx;}};
  const indexedDB={open(){const req={};queueMicrotask(()=>{req.result=fakeDb;req.onsuccess?.();});return req;}};
  const context={indexedDB,Backup,Blob,crypto:globalThis.crypto,console};context.globalThis=context;vm.runInNewContext(source,context);
  await vm.runInNewContext('DB.open()',context);
  const photoId=U(),obra={id:U(),nome:'Obra'},vistoria={id:U(),obraId:obra.id};
  const makeBatch=async(description,bytes)=>{const payload=base();payload.obras=[obra];payload.vistorias=[vistoria];payload.fotos=[{id:photoId,vistoriaId:vistoria.id,descricao:description,data:'data:image/jpeg;base64,'+Buffer.from(bytes).toString('base64')}];const checked=await Backup.validate(payload,JSON.stringify(payload).length,S);const photos=payload.fotos.map(f=>({...Backup.decodePhoto(f),contentSha256:checked.photoHashes.get(f.id)}));return {...checked.data,obras:[],vistorias:[],fotos:photos,snapshots:[],arquivosEmitidos:[],seqs:{}};};
  const original=await makeBatch('fachada',[255,216,255,1]);
  const first=await vm.runInNewContext('DB.atomicImport(batch)',Object.assign(context,{batch:original}));
  assert.equal(first.novos,1);
  const repeated=await vm.runInNewContext('DB.atomicImport(batch)',Object.assign(context,{batch:await makeBatch('fachada',[255,216,255,1])}));
  assert.equal(repeated.duplicados,1);assert.equal(repeated.conflitos.length,0);
  const conflictingBatch=await makeBatch('conteúdo diferente',[255,216,255,2]);
  const conflict=await vm.runInNewContext('DB.atomicImport(batch)',Object.assign(context,{batch:conflictingBatch}));
  assert.equal(conflict.conflitos.length,1);assert.equal(conflict.conflitos[0].store,'fotos');assert.equal(conflict.conflitos[0].id,photoId);
  assert.equal(stores.get('fotos').get(photoId).contentSha256,original.fotos[0].contentSha256);
  assert.equal(stores.get('fotos').get(photoId).descricao,'fachada');
});
test('DB.put serializes same-photo hashes and commits the last call with its digest',async()=>{
  const source=fs.readFileSync(require.resolve('../db.js'),'utf8'),id=U(),vistoriaId=U(),{indexedDB,stores}=fakeIndexedDB({vistorias:[{id:vistoriaId}]});
  let releaseFirst,firstStarted=false,secondStarted=false;
  const firstGate=new Promise(resolve=>{releaseFirst=resolve;});
  const originalFingerprint=Backup.photoFingerprint;
  const backup={...Backup,photoFingerprint:async photo=>{if(photo.descricao==='first'){firstStarted=true;await firstGate;}else secondStarted=true;return originalFingerprint(photo);}};
  const context={indexedDB,Backup:backup,Blob,crypto:globalThis.crypto,console};context.globalThis=context;vm.runInNewContext(source,context);await vm.runInNewContext('DB.open()',context);
  const photo1={id,vistoriaId,descricao:'first',blob:new Blob([Buffer.from([255,216,255,1])],{type:'image/jpeg'})},photo2={id,vistoriaId,descricao:'last',blob:new Blob([Buffer.from([255,216,255,2])],{type:'image/jpeg'})};
  const write1=vm.runInNewContext('DB.put("fotos",photo)',Object.assign(context,{photo:photo1}));
  const write2=vm.runInNewContext('DB.put("fotos",photo)',Object.assign(context,{photo:photo2}));
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(firstStarted,true);assert.equal(secondStarted,false,'segunda hash aguarda a primeira gravação');
  releaseFirst();await Promise.all([write1,write2]);
  const saved=stores.get('fotos').get(id);assert.equal(saved.descricao,'last');
  assert.equal(saved.contentSha256,await originalFingerprint(photo2));
});
test('DB.put fotos fails closed without Backup and index.html loads db before backup before app',async()=>{
  const source=fs.readFileSync(require.resolve('../db.js'),'utf8'),{indexedDB,stores}=fakeIndexedDB();
  const context={indexedDB,Blob,crypto:globalThis.crypto,console};context.globalThis=context;vm.runInNewContext(source,context);await vm.runInNewContext('DB.open()',context);
  await assert.rejects(()=>vm.runInNewContext('DB.put("fotos",photo)',Object.assign(context,{photo:{id:U(),blob:new Blob([Buffer.from([255,216,255,1])],{type:'image/jpeg'})}})),/Backup não carregado/);
  assert.equal(stores.get('fotos')?.size||0,0);
  const html=fs.readFileSync(require.resolve('../index.html'),'utf8'),db=html.indexOf('<script src="db.js">'),backup=html.indexOf('<script src="backup.js">'),app=html.indexOf('<script src="app.js">');
  assert.ok(db>=0&&backup>db&&app>backup,'db.js precede backup.js e app.js');
});
test('DB.del(foto) waits for a pending same-id put and leaves the photo absent',async()=>{
  const source=fs.readFileSync(require.resolve('../db.js'),'utf8'),photoId=U(),vistoriaId=U(),{indexedDB,stores}=fakeIndexedDB({vistorias:[{id:vistoriaId}]});
  let releaseHash,signalStarted;const gate=new Promise(resolve=>{releaseHash=resolve;}),started=new Promise(resolve=>{signalStarted=resolve;});
  const backup={...Backup,photoFingerprint:async photo=>{signalStarted();await gate;return Backup.photoFingerprint(photo);}};
  const context={indexedDB,Backup:backup,Blob,crypto:globalThis.crypto,console};context.globalThis=context;vm.runInNewContext(source,context);await vm.runInNewContext('DB.open()',context);
  const photo={id:photoId,vistoriaId,blob:new Blob([Buffer.from([255,216,255,1])],{type:'image/jpeg'})};
  const put=vm.runInNewContext('DB.put("fotos",photo)',Object.assign(context,{photo}));await started;
  const del=vm.runInNewContext('DB.del("fotos",id)',Object.assign(context,{id:photoId}));
  releaseHash();await Promise.all([put,del]);assert.equal(stores.get('fotos')?.has(photoId)||false,false);
});
test('DB.delVistoria atomically removes existing photos and blocks a pending put',async()=>{
  const source=fs.readFileSync(require.resolve('../db.js'),'utf8'),vistoriaId=U(),photoId=U(),existingId=U();
  const {indexedDB,stores}=fakeIndexedDB({vistorias:[{id:vistoriaId}],fotos:[{id:existingId,vistoriaId,blob:new Blob([Buffer.from([255,216,255,9])],{type:'image/jpeg'})}]});
  let releaseHash,signalStarted;const gate=new Promise(resolve=>{releaseHash=resolve;}),started=new Promise(resolve=>{signalStarted=resolve;});
  const backup={...Backup,photoFingerprint:async photo=>{signalStarted();await gate;return Backup.photoFingerprint(photo);}};
  const context={indexedDB,Backup:backup,Blob,crypto:globalThis.crypto,console};context.globalThis=context;vm.runInNewContext(source,context);await vm.runInNewContext('DB.open()',context);
  const photo={id:photoId,vistoriaId,blob:new Blob([Buffer.from([255,216,255,1])],{type:'image/jpeg'})};
  const put=vm.runInNewContext('DB.put("fotos",photo)',Object.assign(context,{photo}));await started;
  const del=vm.runInNewContext('DB.delVistoria(id)',Object.assign(context,{id:vistoriaId}));await del;releaseHash();
  await assert.rejects(()=>put,/Vistoria ausente/);
  assert.equal(stores.get('vistorias')?.has(vistoriaId)||false,false);
  assert.equal([...stores.get('fotos').values()].some(f=>f.vistoriaId===vistoriaId),false);
});
