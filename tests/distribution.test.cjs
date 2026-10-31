const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const brandContext=vm.createContext({});
vm.runInContext(read('brand.js')+';globalThis.identity=CGU;',brandContext);
const identity=brandContext.identity;

test('new inspection requests geolocation only after explicit user action',()=>{
 const app=read('app.js');
 const start=app.indexOf("$('#nv').onclick = async () => {");
 const end=app.indexOf('\n  };',start);
 assert.ok(start>=0&&end>start,'new-inspection handler found');
 assert.doesNotMatch(app.slice(start,end),/getPos\s*\(/,'creation must not capture GPS in the background');
 const gpsStart=app.indexOf("$('#gps').onclick = async () => {");
 const gpsEnd=app.indexOf('\n    };',gpsStart);
 assert.ok(gpsStart>=0&&gpsEnd>gpsStart,'explicit GPS action found');
 assert.match(app.slice(gpsStart,gpsEnd),/getPos\s*\(/,'GPS remains available by explicit request');
});

test('a distribuição usa X.Y.Z consistente no produto, HTML e manifesto de ferramentas',()=>{
 assert.match(identity.version,/^\d+\.\d+\.\d+$/);
 assert.equal(JSON.parse(read('package.json')).version,identity.version);
 assert.ok(read('index.html').includes('v'+identity.version+' ·'), 'versão de fallback no HTML');
 assert.ok(read('sw.js').includes('brand.js?v='+identity.version), 'versão no import do service worker');
 assert.ok(read('README.md').startsWith('# CGU Vistorias · v'+identity.version));
 assert.ok(read('LEIA-ME.md').startsWith('# CGU Vistorias v'+identity.version));
 const manual=read('manual.html');
 assert.ok(manual.includes('<title>Manual do usuário | CGU Vistorias v'+identity.version+'</title>'));
 assert.ok(manual.includes('<span class="version">v'+identity.version+'</span>'));
 const manualVersion=manual.match(/corresponde à versão (\d+\.\d+\.\d+)/);
 assert.ok(manualVersion,'manual declares which app version it describes');
 assert.equal(manualVersion[1],identity.version,'manual body version matches product version');
 // As capturas foram refeitas na versão atual: legendas, LEIA-ME e link do PDF declaram essa versão e nada as dá como antigas.
 assert.ok(manual.includes('Tela da versão '+identity.version+' com dados fictícios.'));
 assert.ok(!manual.includes('Tela ilustrativa') && !/desatualizad/.test(manual),'manual sem aviso de telas ou PDF antigos');
 assert.ok(manual.includes('Baixar manual em PDF (versão '+identity.version+')'));
 assert.ok(read('LEIA-ME.md').includes('capturas de tela foram refeitas na versão '+identity.version));
 assert.ok(manual.includes('O bloco analítico usa snapshots verificáveis'));
 assert.ok(manual.includes('GPS, snapshots, arquivos PDF/DOCX emitidos e ações declaradas'));
 assert.ok(manual.includes('esquema v3'));
 assert.ok(manual.includes('Ações declaradas'));
 assert.ok(manual.includes('v1.2.0 também não aceita a lista opcional acoes'));
 assert.ok(manual.includes('achados anteriores verificados do mesmo edifício'));
 assert.ok(manual.includes('não infere pelo texto'));
 assert.ok(manual.includes('As dimensões aparecem como barras com contagens e rótulos'));
 assert.ok(manual.includes('Itens para acompanhamento'));
 assert.ok(manual.includes('não projete em tela pública ou TV'));
 assert.ok(manual.includes('O PIN é barreira de interface, não acesso institucional'));
 assert.match(read('db.js'),/NAME = 'cgu-vistorias', VER = 3/);
 assert.ok(read('CHANGELOG.md').includes('rowVersion'));
 assert.ok(read('CHANGELOG.md').includes('## 1.4.0 · 30/10/2026'));
 assert.ok(read('CHANGELOG.md').includes('## 1.6.0 \u00b7 30/10/2026'));
 assert.ok(read('CHANGELOG.md').includes('A fila reconcilia cada motivo com os contadores de a\u00e7\u00f5es'));
 assert.ok(read('CHANGELOG.md').includes('## 1.5.0 · 30/10/2026'));
 assert.ok(read('CHANGELOG.md').includes('A versão 1.3.0 rejeita o novo campo opcional'));
 assert.ok(manual.includes('responsável técnico/CREA e usuário) são incluídos nos snapshots'));
 assert.ok(read('CHANGELOG.md').startsWith('# Histórico de versões\n\n## '+identity.version+' · '));
});

test('precache força revalidação HTTP e ativação remove caches da versão anterior',async()=>{
 const listeners={},requests=[],deleted=[];let cacheKeys=[];
 const context=vm.createContext({URL,Request,location:{origin:'https://example.invalid'},
  self:{registration:{scope:'https://example.invalid/cgu/'},clients:{claim:()=>Promise.resolve()},addEventListener:(name,fn)=>listeners[name]=fn,skipWaiting:()=>Promise.resolve()},
  caches:{open:async()=>({add:async request=>requests.push(request)}),keys:async()=>cacheKeys,delete:async key=>{deleted.push(key);return true;}},importScripts(){}});
 vm.runInContext(read('brand.js'),context);
 vm.runInContext(read('sw.js')+';globalThis.cacheName=CACHE;globalThis.cachePrefix=PREFIX;globalThis.precacheFiles=FILES;',context);
 assert.ok(context.cacheName.endsWith(identity.version));
 let install;listeners.install({waitUntil:p=>install=p});await install;
 assert.equal(requests.length,context.precacheFiles.length);
 assert.ok(requests.every(request=>request.cache==='reload'));
 assert.ok(requests.every(request=>new URL(request.url).origin==='https://example.invalid'));
 cacheKeys=[context.cachePrefix+'1.0.6',context.cacheName,'unrelated-cache'];
 let activation;listeners.activate({waitUntil:p=>activation=p});await activation;
 assert.deepEqual(deleted,[context.cachePrefix+'1.0.6']);
});

test('todos os scripts próprios têm sintaxe JavaScript válida',()=>{
 for(const file of fs.readdirSync(root).filter(n=>n.endsWith('.js'))){
  const result=spawnSync(process.execPath,['--check',path.join(root,file)],{encoding:'utf8',timeout:15000});
  assert.equal(result.status,0,file+': '+result.stderr);
 }
});

test('o precache inclui os scripts da página e só aponta para arquivos distribuídos',()=>{
 const context=vm.createContext({URL,location:{origin:'https://example.invalid'},self:{registration:{scope:'https://example.invalid/cgu/'},addEventListener(){}},importScripts(){}});
 vm.runInContext(read('brand.js'),context);
 vm.runInContext(read('sw.js')+';globalThis.distributionFiles=FILES;',context);
 const files=Array.from(context.distributionFiles);
 for(const file of files){
  assert.ok(!file.includes('://')&&!file.includes('..'),file);
  assert.ok(fs.existsSync(path.join(root,file==='./'?'index.html':file)), 'arquivo ausente no precache: '+file);
 }
 for(const match of read('index.html').matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)){
  assert.ok(!/^https?:/i.test(match[1]),'script externo não esperado');
  assert.ok(files.includes(match[1]),'script fora do precache: '+match[1]);
 }
});

test('as bibliotecas vendor correspondem aos hashes registrados',()=>{
 const manifest=JSON.parse(read('vendor/INTEGRITY.json'));
 assert.equal(manifest.schemaVersion,'1.0.0');
 assert.ok(manifest.files.length>=2);
 for(const entry of manifest.files){
  const bytes=fs.readFileSync(path.join(root,'vendor',entry.file));
  assert.equal(bytes.length,entry.bytes,entry.file+' tamanho');
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),entry.sha256,entry.file+' SHA-256');
 }
 const javascript=fs.readdirSync(path.join(root,'vendor')).filter(n=>n.endsWith('.js')).sort();
 assert.deepEqual(manifest.files.map(e=>e.file).sort(),javascript,'todo vendor JS precisa estar inventariado');
});
