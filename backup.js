/* Strict, side-effect-free validation and decoding for v1 backups. */
(function (root) {
  'use strict';
  const MAX_BACKUP_BYTES = 512 * 1024 * 1024, MAX_IMAGE_BYTES = 15 * 1024 * 1024, MAX_IMAGES_TOTAL = 300 * 1024 * 1024;
  const MAX_ARTIFACT_BYTES = 50 * 1024 * 1024, MAX_SNAPSHOT_TOTAL = 50 * 1024 * 1024;
  const MAX_ITEMS = 50000, MAX_DEPTH = 32, MAX_STRING = 100000, MAX_DATA_STRING = 72 * 1024 * 1024, MAX_BINARY_TOTAL = 400 * 1024 * 1024;
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const LEGACY_ID = /^[A-Za-z0-9_-]{8,64}$/;
  const MIME = {
    'application/pdf': [0x25,0x50,0x44,0x46,0x2d],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [0x50,0x4b,0x03,0x04]
  };
  const FIELDS = {
    backup: ['app','v','appVersion','exportadoEm','seqs','obras','vistorias','emissoes','fotos','snapshots','arquivosEmitidos'],
    obras: ['id','nome','cliente','endereco','contrato','art','criadoEm'],
    vistorias: ['id','obraId','local','tipo','data','hora','participantes','clima','objetivo','metodologia','documentos','descricao','constatacoes','conclusao','recomendacoes','status','nFotos','gps','criadoEm','updatedAt','seq','ano'],
    constatacoes: ['id','titulo','tipo','gravidade','ambiente','local','descricao','recomendacao','fotoIds'],
    emissoes: ['id','vistoriaId','obraId','tipo','formato','numero','rev','data','arquivo','usuario','snapshotId','snapshotHash','arquivoSha256','arquivoId'],
    fotos: ['id','vistoriaId','ts','lat','lon','acc','descricao','origem','w','h','stampLines','marks','notas','cortada','ajustada','cropBackup','data','baseData'],
    crop: ['blob','base','marks','notas','stampLines','w','h','cortada','ajustada'],
    snapshots: ['id','schema','schemaVersion','canonicalizacao','hashAlgoritmo','hash','criadoEm','appVersion','emissaoId','vistoriaId','obraId','tipo','formato','numero','rev','conteudo'],
    artifacts: ['id','emissaoId','snapshotId','arquivo','mime','sha256','bytes','data']
    ,mark: ['t','n','x1','y1','x2','y2','c'], note:['n','txt']
  };
  const fail = m => { throw new Error(m); };
  function object(o, fields, label) {
    if (!o || typeof o !== 'object' || Array.isArray(o) || (Object.getPrototypeOf(o) !== Object.prototype && Object.getPrototypeOf(o) !== null)) fail(label + ': objeto inválido');
    for (const k of Object.keys(o)) if (k === '__proto__' || k === 'constructor' || k === 'prototype' || !fields.includes(k)) fail(label + ': campo não permitido ' + k);
  }
  function safeTree(o, depth = 0, key = '') {
    if (depth > MAX_DEPTH) fail('Profundidade JSON excedida');
    if (typeof o === 'string') { if (o.length > (['data','baseData','blob','base'].includes(key)?MAX_DATA_STRING:MAX_STRING)) fail('Texto excede o limite'); return; }
    if (typeof o === 'number') { if (!Number.isFinite(o)) fail('Número inválido'); return; }
    if (o == null || typeof o === 'boolean') return;
    if (Array.isArray(o)) { if (o.length > MAX_ITEMS) fail('Lista excede o limite'); for (const x of o) safeTree(x, depth + 1); return; }
    if (typeof o !== 'object') fail('Tipo JSON inválido');
    object(o, Object.keys(o), 'JSON');
    for (const [k,v] of Object.entries(o)) { if (k.length>200 || k === '__proto__' || k === 'constructor' || k === 'prototype') fail('Chave proibida'); safeTree(v, depth + 1, k); }
  }
  function id(v, label) { if (typeof v !== 'string' || !(UUID.test(v) || LEGACY_ID.test(v))) fail(label + ': ID inválido'); }
  function num(v, label, min = 0, max = Number.MAX_SAFE_INTEGER) { if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max) fail(label + ': número fora do limite'); }
  function str(v, label, max = 10000, optional = false) { if (optional && v == null) return; if (typeof v !== 'string' || v.length > max) fail(label + ': texto inválido'); }
  function bytesFromBase64(b64, max) {
    if (!b64 || b64.length % 4 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(b64)) fail('Base64 inválido');
    if (b64.length > Math.ceil(max / 3) * 4 + 4) fail('Blob excede o limite');
    const bin = atob(b64); if (bin.length > max || btoa(bin) !== b64) fail('Base64 inválido ou acima do limite');
    return Uint8Array.from(bin, c => c.charCodeAt(0));
  }
  function dataUrl(s, max = MAX_IMAGE_BYTES) {
    str(s, 'dataURL', Math.ceil(max * 4 / 3) + 64);
    const m = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]*={0,2})$/.exec(s);
    if (!m) fail('Imagem deve ser data:image jpeg/png/webp base64');
    const b = bytesFromBase64(m[2], max), h = [...b.slice(0, 12)];
    const valid = m[1] === 'jpeg' ? h[0] === 0xff && h[1] === 0xd8 && h[2] === 0xff : m[1] === 'png' ? h.slice(0,8).join() === '137,80,78,71,13,10,26,10' : h.slice(0,4).join() === '82,73,70,70' && h.slice(8,12).join() === '87,69,66,80';
    if (!valid) fail('Assinatura de imagem não confere com o MIME');
    return { mime: 'image/' + m[1], bytes: b };
  }
  function artifactData(s, mime, size) {
    if (!Object.hasOwn(MIME, mime)) fail('MIME de arquivo emitido não permitido');
    const m = /^data:(application\/pdf|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document);base64,([A-Za-z0-9+/]*={0,2})$/.exec(String(s));
    if (!m || m[1] !== mime) fail('Data URL do arquivo emitido inválida');
    const b = bytesFromBase64(m[2], MAX_ARTIFACT_BYTES);
    if (size !== b.length || b.length < MIME[mime].length || MIME[mime].some((x,i) => b[i] !== x)) fail('Tamanho ou assinatura do arquivo emitido inválida');
    return b;
  }
  async function validate(d, rawSize, snapshotLib = root.SnapshotLib) {
    if (rawSize > MAX_BACKUP_BYTES) fail('Backup excede o limite de 512 MiB');
    safeTree(d); object(d, FIELDS.backup, 'backup');
    if (d.app !== 'cgu-vistorias' || d.v !== 1 || typeof d.appVersion !== 'string' || d.appVersion.length > 32) fail('Envelope v1 inválido');
    num(d.exportadoEm,'exportadoEm');
    for (const k of ['obras','vistorias','emissoes','fotos']) if (!Array.isArray(d[k]) || d[k].length > MAX_ITEMS) fail('Lista inválida: ' + k);
    const maps = {}; for (const k of ['obras','vistorias','emissoes','fotos']) maps[k] = new Map();
    const checkRows = (k, schema) => { for (const x of d[k]) { object(x, schema, k); id(x.id,k+'.id'); if (maps[k].has(x.id)) fail('ID duplicado em '+k); maps[k].set(x.id,x); } };
    checkRows('obras',FIELDS.obras); checkRows('vistorias',FIELDS.vistorias); checkRows('emissoes',FIELDS.emissoes); checkRows('fotos',FIELDS.fotos);
    let decodedTotal=0; const photoPayload=new Map();
    const checkMarks = (items,label) => { if(items==null)return; if(!Array.isArray(items)||items.length>1000)fail(label+' inválidas'); for(const m of items){object(m,FIELDS.mark,'mark');if(!['arr','rect','ell','num'].includes(m.t)||m.c!=null&&!['vermelho','amarelo','azul','branco','preto'].includes(m.c))fail(label+' inválidas');for(const k of ['x1','y1','x2','y2'])if(m[k]!=null)num(m[k],k,0,1);if(m.t==='num')num(m.n,'mark.n',1,9999);} };
    const checkNotes = (items,label) => { if(items==null)return; if(!Array.isArray(items)||items.length>1000)fail(label+' inválidas'); for(const n of items){object(n,FIELDS.note,'nota');num(n.n,'nota.n',1,9999);str(n.txt,'nota.txt',10000);} };
    const checkStamp = (items,label) => { if(items==null)return; if(!Array.isArray(items)||items.length>10)fail(label+' inválido'); for(const x of items)str(x,'stampLine',500); };
    for (const o of d.obras) { str(o.nome,'obra.nome',500); for(const k of ['cliente','endereco','contrato','art']) str(o[k],k,2000,true); if(o.criadoEm!=null)num(o.criadoEm,'obra.criadoEm'); }
    if(d.seqs!=null){object(d.seqs,Object.keys(d.seqs),'seqs');for(const [y,n] of Object.entries(d.seqs)){if(!/^\d{4}$/.test(y))fail('Ano de sequência inválido');num(n,'seq',0,999999);}}
    for (const v of d.vistorias) {
      id(v.obraId,'obraId'); if(!maps.obras.has(v.obraId)) fail('Vistoria sem edifício');
      for(const k of ['local','participantes','clima','objetivo','metodologia','documentos','descricao','conclusao','recomendacoes'])str(v[k],'vistoria.'+k,k==='local'?1000:20000,true);
      if(v.hora!=null&&(typeof v.hora!=='string'||!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(v.hora)))fail('hora inválida');
      for(const k of ['criadoEm','updatedAt','nFotos'])if(v[k]!=null)num(v[k],'vistoria.'+k,0,Number.MAX_SAFE_INTEGER);
      str(v.status,'status',20,true); if(v.status!=null&&!['rascunho','emitido'].includes(v.status)) fail('status inválido');
      if(v.tipo!=null&&!['Vistoria técnica de rotina','Vistoria de patologias / manifestações','Acompanhamento de execução','Recebimento de serviço','Vistoria cautelar / pré-obra','Pós-ocorrência','Outra'].includes(v.tipo))str(v.tipo,'tipo',200);
      if(v.data!=null&&!/^\d{4}-\d{2}-\d{2}$/.test(v.data)) fail('data inválida'); if(v.updatedAt!=null) num(v.updatedAt,'updatedAt');
      if(v.seq!=null) num(v.seq,'seq',1,999999); if(v.ano!=null) num(v.ano,'ano',2000,2200);
      if(v.gps){ object(v.gps,['lat','lon','acc'],'gps'); num(v.gps.lat,'lat',-90,90);num(v.gps.lon,'lon',-180,180);if(v.gps.acc!=null)num(v.gps.acc,'acc',0,100000); }
      if(v.constatacoes!=null){if(!Array.isArray(v.constatacoes)||v.constatacoes.length>5000)fail('constatacoes inválidas');const cids=new Set();for(const c of v.constatacoes){object(c,FIELDS.constatacoes,'constatação');id(c.id,'constatação.id');if(cids.has(c.id))fail('constatação duplicada');cids.add(c.id);for(const k of ['titulo','tipo','ambiente','local','descricao','recomendacao'])str(c[k],'constatação.'+k,20000,true);if(c.gravidade!=null&&!['Informativa','Baixa','Média','Alta','Crítica'].includes(c.gravidade))fail('gravidade inválida');if(c.fotoIds!=null&&(!Array.isArray(c.fotoIds)||c.fotoIds.length>5000))fail('fotoIds inválido');for(const fid of c.fotoIds||[])id(fid,'fotoId');}}
    }
    for (const f of d.fotos){id(f.vistoriaId,'foto.vistoriaId');if(!maps.vistorias.has(f.vistoriaId))fail('Foto sem vistoria');const data=dataUrl(f.data);decodedTotal+=data.bytes.length;let baseBytes=null;if(f.baseData){baseBytes=dataUrl(f.baseData).bytes;decodedTotal+=baseBytes.length;}photoPayload.set(f.id,{data:data.bytes,base:baseBytes,record:f});if(f.ts!=null)num(f.ts,'foto.ts');if(f.lat!=null)num(f.lat,'foto.lat',-90,90);if(f.lon!=null)num(f.lon,'foto.lon',-180,180);if(f.acc!=null)num(f.acc,'foto.acc',0,100000);if(f.w!=null)num(f.w,'foto.w',1,50000);if(f.h!=null)num(f.h,'foto.h',1,50000);if(f.origem!=null&&!['camera','galeria'].includes(f.origem))fail('origem de foto inválida');str(f.descricao,'foto.descricao',10000,true);checkStamp(f.stampLines,'stampLines');checkMarks(f.marks,'marks');checkNotes(f.notas,'notas');for(const k of ['cortada','ajustada'])if(f[k]!=null&&typeof f[k]!=='boolean')fail(k+' inválido');if(f.cropBackup){object(f.cropBackup,FIELDS.crop,'cropBackup');if(!f.cropBackup.blob)fail('cropBackup sem imagem original');const b=dataUrl(f.cropBackup.blob);decodedTotal+=b.bytes.length;if(f.cropBackup.base){const bb=dataUrl(f.cropBackup.base);decodedTotal+=bb.bytes.length;}num(f.cropBackup.w,'crop.w',1,50000);num(f.cropBackup.h,'crop.h',1,50000);if(f.cropBackup.cortada!==true&&f.cropBackup.ajustada!==true)fail('cropBackup sem estado de recorte/ajuste');checkMarks(f.cropBackup.marks,'crop marks');checkNotes(f.cropBackup.notas,'crop notas');checkStamp(f.cropBackup.stampLines,'crop stampLines');for(const k of ['cortada','ajustada'])if(f.cropBackup[k]!=null&&typeof f.cropBackup[k]!=='boolean')fail('crop '+k+' inválido');}}
    if(decodedTotal>MAX_IMAGES_TOTAL)fail('Imagens excedem o teto agregado de 300 MiB');
    for(const e of d.emissoes){id(e.vistoriaId,'emissao.vistoriaId');id(e.obraId,'emissao.obraId');if(!maps.vistorias.has(e.vistoriaId)||!maps.obras.has(e.obraId)||maps.vistorias.get(e.vistoriaId).obraId!==e.obraId)fail('Emissão órfã/inconsistente');if(e.tipo!=null&&!['tecnico','fotografico','consolidado'].includes(e.tipo))fail('tipo de emissão inválido');if(e.formato!=null&&!['pdf','docx'].includes(e.formato))fail('formato de emissão inválido');for(const k of ['numero','arquivo','usuario'])str(e[k],'emissao.'+k,2000,true);for(const k of ['rev','data'])if(e[k]!=null)num(e[k],'emissao.'+k,0,Number.MAX_SAFE_INTEGER);if(e.rev!=null)num(e.rev,'rev',0,9999);if(e.snapshotId){id(e.snapshotId,'snapshotId');if(!/^[0-9a-f]{64}$/.test(e.snapshotHash||''))fail('snapshotHash inválido');}else if(e.snapshotHash!=null)fail('snapshotHash sem snapshotId');if(e.arquivoId){id(e.arquivoId,'arquivoId');if(!/^[0-9a-f]{64}$/.test(e.arquivoSha256||''))fail('arquivoSha256 inválido');}}
    for(const v of d.vistorias)for(const c of v.constatacoes||[])for(const fid of c.fotoIds||[])if(!maps.fotos.has(fid)||maps.fotos.get(fid).vistoriaId!==v.id)fail('Constatação referencia foto inexistente/outra vistoria');
    const snaps=d.snapshots||[], arts=d.arquivosEmitidos||[]; if(!Array.isArray(snaps)||snaps.length>5000||!Array.isArray(arts)||arts.length>5000)fail('Lista de snapshots/arquivos inválida');
    let snapTotal=0, artifactTotal=0; const snapMap=new Map();
    for(const s of snaps){object(s,FIELDS.snapshots,'snapshot');if(!snapshotLib)fail('Validador de snapshot indisponível');const r=await snapshotLib.validar(s);if(!r.ok)fail('Snapshot inválido: '+r.erros.join('; '));snapTotal+=new TextEncoder().encode(snapshotLib.canonicalize(s)).length;if(snapTotal>MAX_SNAPSHOT_TOTAL)fail('Snapshots excedem teto agregado de 50 MiB');snapMap.set(s.id,s);for(const ev of s.conteudo.evidencias){const p=photoPayload.get(ev.id);if(!p||p.record.vistoriaId!==s.vistoriaId)fail('Evidência do snapshot ausente no backup');const sha=await snapshotLib.sha256(p.data);if(sha!==ev.sha256||p.data.length!==ev.bytes)fail('Hash/tamanho da foto diverge do snapshot');if(ev.baseSha256){if(!p.base||await snapshotLib.sha256(p.base)!==ev.baseSha256||p.base.length!==ev.baseBytes)fail('Hash/tamanho da foto original diverge do snapshot');}}}
    const artifactIds=new Set();for(const a of arts){object(a,FIELDS.artifacts,'arquivoEmitido');id(a.id,'arquivo.id');id(a.emissaoId,'arquivo.emissaoId');id(a.snapshotId,'arquivo.snapshotId');if(artifactIds.has(a.id))fail('ID de arquivo duplicado');artifactIds.add(a.id);const em=maps.emissoes.get(a.emissaoId),sn=snapMap.get(a.snapshotId);if(!em)fail('Arquivo sem emissão');if(!sn||!em.snapshotId||em.snapshotId!==a.snapshotId||sn.emissaoId!==a.emissaoId||em.arquivoId&&em.arquivoId!==a.id)fail('Arquivo sem snapshot/emissão correspondente');const raw=artifactData(a.data,a.mime,a.bytes);artifactTotal+=raw.length;if(artifactTotal>MAX_BACKUP_BYTES)fail('Arquivos emitidos excedem teto agregado');if(!/^[0-9a-f]{64}$/.test(a.sha256)||typeof crypto==='undefined'||!crypto.subtle)fail('Digest inválido/indisponível');const digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',raw))].map(x=>x.toString(16).padStart(2,'0')).join('');if(digest!==a.sha256||!em.arquivoSha256||digest!==em.arquivoSha256)fail('SHA-256 do arquivo não confere');const verified=await snapshotLib.verificarArquivo(em,sn,{...a,blob:new Blob([raw],{type:a.mime})});if(verified.estado!=='verificado')fail('Arquivo emitido divergente: '+verified.detalhe);}
    decodedTotal+=artifactTotal;if(decodedTotal>MAX_BINARY_TOTAL)fail('Bytes binários decodificados excedem o limite agregado de 400 MiB');
    for(const s of snaps){const e=maps.emissoes.get(s.emissaoId);if(!e)fail('Snapshot sem emissão');if(e.snapshotId!==s.id||e.snapshotHash!==s.hash||e.vistoriaId!==s.vistoriaId||e.obraId!==s.obraId)fail('Snapshot não corresponde à emissão');}
    for(const e of d.emissoes) if(e.snapshotId){id(e.snapshotId,'snapshotId');if(!snapMap.has(e.snapshotId))continue;const s=snapMap.get(e.snapshotId);if(s.emissaoId!==e.id||s.hash!==e.snapshotHash)fail('Snapshot não corresponde à emissão');}
    return { data:d, decodedTotal, snapshotIds:new Set(snaps.map(s=>s.id)), artifactIds:new Set(arts.map(a=>a.id)) };
  }
  async function photoJson(f, b64) { const {blob,base,cropBackup,...rest}=f; const c=cropBackup?{...cropBackup,blob:cropBackup.blob?await b64(cropBackup.blob):undefined,base:cropBackup.base?await b64(cropBackup.base):undefined}:undefined; return {...rest,data:await b64(blob),...(base?{baseData:await b64(base)}:{}),...(c?{cropBackup:c}:{})}; }
  function decodePhoto(f, BlobCtor=Blob) {
    const {data,baseData,cropBackup,...rest}=f;
    const decode=s=>{const x=dataUrl(s);return new BlobCtor([x.bytes],{type:x.mime});};
    const crop=cropBackup?{...cropBackup,blob:cropBackup.blob?decode(cropBackup.blob):undefined,base:cropBackup.base?decode(cropBackup.base):undefined}:undefined;
    return {...rest,blob:decode(data),...(baseData?{base:decode(baseData)}:{}),...(crop?{cropBackup:crop}:{})};
  }
  const csvCell = v => { const s=String(v??''); return '"'+((/^[\t\r ]*[=+\-@]/.test(s)?"'":'')+s).replace(/"/g,'""')+'"'; };
  const escapeHtml = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  root.Backup = Object.freeze({ validate, dataUrl, artifactData, photoJson, decodePhoto, csvCell, escapeHtml, limits:{MAX_BACKUP_BYTES,MAX_IMAGE_BYTES,MAX_IMAGES_TOTAL,MAX_ARTIFACT_BYTES,MAX_SNAPSHOT_TOTAL} });
  if(typeof module!=='undefined'&&module.exports)module.exports=root.Backup;
})(typeof globalThis!=='undefined'?globalThis:this);
