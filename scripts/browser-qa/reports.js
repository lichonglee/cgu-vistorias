(async()=>{
 if(location.port!=='8767')throw Error('Somente origem QA');
 const ids=JSON.parse(sessionStorage.getItem('qa-fixture'));
 S.usuario='Operador fictício QA';S.rt={nome:'Responsável fictício QA',titulo:'Engenheiro QA',crea:'FICTICIO-QA'};
 S.empresa={nome:'Unidade fictícia QA',cnpj:'',endereco:'Endereço fictício',fone:'',email:''};
 const generated=[],originalPdf=Rep.toPdf,originalDocx=Rep.toDocx;let label='';window.QAReportFiles=[];
 for(const [method,original] of [['toPdf',originalPdf],['toDocx',originalDocx]])Rep[method]=async(...args)=>{const blob=await original(...args),bytes=new Uint8Array(await blob.arrayBuffer());const pageCount=method==='toPdf'?(await PDFLib.PDFDocument.load(bytes)).getPageCount():null;generated.push({method,bytes:bytes.length,signature:String.fromCharCode(...bytes.slice(0,5)),pageCount});window.QAReportFiles.push({label,blob});return blob};
 try{
  for(const tipo of ['tecnico','fotografico','consolidado'])for(const formato of ['pdf','docx']){label=tipo+'.'+formato;await emitir(ids.vistoria,tipo,formato,true,formato==='pdf')}
  const ems=await DB.all('emissoes'),snapshots=await DB.all('snapshots'),verified=[];
  for(const em of ems.filter(e=>e.snapshotId)){const sn=snapshots.find(s=>s.id===em.snapshotId);const result=await SnapshotLib.verificarEmissao(em,sn);if(result.estado!=='verificado')throw Error('Emissão não verificada: '+result.detalhe);const artifact=await DB.get('arquivosEmitidos',em.arquivoId),ar=await SnapshotLib.verificarArquivo(em,sn,artifact);if(ar.estado!=='verificado')throw Error('Arquivo não preservado: '+ar.detalhe);verified.push({type:em.tipo,format:em.formato,revision:em.rev,snapshotHash:sn.hash,contentHash:await SnapshotLib.hashConteudo(sn.conteudo),fileHash:em.arquivoSha256})}
  for(const type of ['tecnico','fotografico','consolidado']){const pair=verified.filter(e=>e.type===type);if(pair.length!==2||pair[0].contentHash!==pair[1].contentHash)throw Error('Conteúdo de PDF/DOCX diverge em '+type)}
  if(generated.some(g=>g.method==='toPdf'?!g.signature.startsWith('%PDF-'):!g.signature.startsWith('PK')))throw Error('Assinatura de arquivo inválida');
  const original=snapshots[0],before=original.hash,v=await DB.get('vistorias',ids.vistoria);v.constatacoes[0].titulo='Título editado depois da emissão';v.updatedAt=Date.now();await DB.put('vistorias',v);
  const preserved=await DB.get('snapshots',original.id);if(preserved.hash!==before||preserved.conteudo.constatacoes[0].titulo===v.constatacoes[0].titulo)throw Error('Snapshot não preservado');
  const originalPhoto=await DB.get('fotos',ids.foto);await DB.del('fotos',ids.foto);
  const em=ems.find(e=>e.snapshotId),sn=snapshots.find(s=>s.id===em.snapshotId),artifact=await DB.get('arquivosEmitidos',em.arquivoId);
  const afterDelete=await SnapshotLib.verificarArquivo(em,sn,artifact);await DB.put('fotos',originalPhoto);if(afterDelete.estado!=='verificado')throw Error('Arquivo histórico perdido após excluir foto');
  const beforeEm=ems.length,beforeAr=(await DB.all('arquivosEmitidos')).length,newEmId=DB.uid(),newArId=DB.uid();let aborted=false;
  try{await DB.registrarEmissao(sn,{...em,id:newEmId},{...artifact,id:newArId,emissaoId:newEmId})}catch{aborted=true}
  if(!aborted||(await DB.all('emissoes')).length!==beforeEm||(await DB.all('arquivosEmitidos')).length!==beforeAr||await DB.get('emissoes',newEmId))throw Error('Transação não reverteu gravação parcial');
  return JSON.stringify({schema:(await indexedDB.databases()).find(d=>d.name==='cgu-vistorias').version,generated,verified:verified.length,snapshots:snapshots.length,artifacts:beforeAr,pdfDocxSameContent:true,snapshotPreservedAfterEdit:true,artifactPreservedAfterPhotoDeletion:true,atomicRollbackConfirmed:true,legacy:(await SnapshotLib.verificarEmissao(ems.find(e=>!e.snapshotId),null)).estado});
 }finally{Rep.toPdf=originalPdf;Rep.toDocx=originalDocx}
})()
