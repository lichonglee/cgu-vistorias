const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const context=vm.createContext({Uint8Array,Blob});
vm.runInContext(fs.readFileSync(path.join(__dirname,'../report.js'),'utf8')+';globalThis.Report=Rep;',context);
const lib=context.Report;
test('relatório identifica PNG, JPEG e WebP pelos bytes, não por nome de arquivo',()=>{
 assert.equal(lib.imageKind(Uint8Array.from([255,216,255,224])),'jpg');
 assert.equal(lib.imageKind(Uint8Array.from([137,80,78,71,13,10,26,10])),'png');
 assert.equal(lib.imageKind(Uint8Array.from(Buffer.from('RIFF0000WEBP'))),'webp');
 assert.throws(()=>lib.imageKind(Uint8Array.from(Buffer.from('<svg>'))),/não suportado/);
 assert.throws(()=>lib.imageKind(Uint8Array.from([137,80])),/não suportado/);
});
test('PNG e JPEG não são recodificados nem modificam a evidência de origem',async()=>{
 for(const bytes of [Uint8Array.from([255,216,255,224]),Uint8Array.from([137,80,78,71,13,10,26,10])]){
  const before=bytes.slice(),result=await lib.prepareReportImage({bytes});
  assert.equal(result.bytes,bytes);
  assert.deepEqual(bytes,before);
 }
});
