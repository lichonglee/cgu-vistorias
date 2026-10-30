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

test('a distribuição usa X.Y.Z consistente no produto, HTML e manifesto de ferramentas',()=>{
 assert.match(identity.version,/^\d+\.\d+\.\d+$/);
 assert.equal(JSON.parse(read('package.json')).version,identity.version);
 assert.ok(read('index.html').includes('v'+identity.version+' ·'), 'versão de fallback no HTML');
 assert.ok(read('sw.js').includes('brand.js?v='+identity.version), 'versão no import do service worker');
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
