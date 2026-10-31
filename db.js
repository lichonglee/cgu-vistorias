/* CGU Vistorias — camada de dados local (IndexedDB). Tudo fica no próprio aparelho. */
const DB = (() => {
  let db;
  const photoQueues = new Map();
  const NAME = 'cgu-vistorias', VER = 3;
  function open() {
    return new Promise((res, rej) => {
      const r = indexedDB.open(NAME, VER);
      r.onupgradeneeded = e => {
        const d = e.target.result;
        if (!d.objectStoreNames.contains('obras')) d.createObjectStore('obras', { keyPath: 'id' });
        if (!d.objectStoreNames.contains('vistorias')) d.createObjectStore('vistorias', { keyPath: 'id' }).createIndex('obraId', 'obraId');
        if (!d.objectStoreNames.contains('fotos')) d.createObjectStore('fotos', { keyPath: 'id' }).createIndex('vistoriaId', 'vistoriaId');
        if (!d.objectStoreNames.contains('emissoes')) d.createObjectStore('emissoes', { keyPath: 'id' }).createIndex('vistoriaId', 'vistoriaId');
        if (!d.objectStoreNames.contains('settings')) d.createObjectStore('settings', { keyPath: 'key' });
        if (!d.objectStoreNames.contains('arquivosEmitidos')) { const ar = d.createObjectStore('arquivosEmitidos', { keyPath: 'id' }); ar.createIndex('emissaoId', 'emissaoId'); ar.createIndex('snapshotId', 'snapshotId'); }
        if (!d.objectStoreNames.contains('snapshots')) { const sn = d.createObjectStore('snapshots', { keyPath: 'id' }); sn.createIndex('vistoriaId', 'vistoriaId'); sn.createIndex('emissaoId', 'emissaoId'); }
        if (!d.objectStoreNames.contains('acoes')) { const ac = d.createObjectStore('acoes', { keyPath: 'id' }); ac.createIndex('vistoriaId', 'vistoriaId'); ac.createIndex('constatacaoId', 'constatacaoId'); ac.createIndex('snapshotId', 'snapshotId'); }
      };
      /* Outra aba com versão antiga segura a atualização: falha visível em vez de promessa pendente; a conexão aberta
         cede quando uma versão mais nova pede o banco, para não bloquear outras abas. */
      r.onblocked = () => { const e = new Error('Atualização do armazenamento bloqueada por outra aba aberta do aplicativo.'); e.name = 'BlockedError'; rej(e); };
      r.onsuccess = () => { db = r.result; db.onversionchange = () => { db.close(); if (typeof dispatchEvent === 'function' && typeof Event === 'function') dispatchEvent(new Event('cgu-db-versionchange')); }; res(); };
      r.onerror = () => rej(r.error);
    });
  }
  const st = (s, m = 'readonly') => db.transaction(s, m).objectStore(s);
  const w = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const uid = () => {
    if (crypto.randomUUID) return crypto.randomUUID();
    const b = crypto.getRandomValues(new Uint8Array(16)); b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
    const h = Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
  };
  const ACTION_STATES = ['aberta','em-execucao','concluida','cancelada'];
  const ACTION_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const ACTION_LEGACY_ID = /^[A-Za-z0-9_-]{8,64}$/;
  function validateAction(a) {
    if (!a || typeof a !== 'object' || Array.isArray(a)) throw new TypeError('Ação inválida.');
    const allowed=['id','constatacaoId','vistoriaId','snapshotId','responsavelFuncao','prazo','estado','concluidaEm','observacao','criadoEm','atualizadoEm','rowVersion'];
    if(Object.keys(a).some(k=>!allowed.includes(k))||Object.getPrototypeOf(a)!==Object.prototype)throw new TypeError('A ação contém campo inválido.');
    if (!ACTION_UUID.test(a.id || '') || !ACTION_UUID.test(a.constatacaoId || '') || !(ACTION_UUID.test(a.vistoriaId || '') || ACTION_LEGACY_ID.test(a.vistoriaId || '')) || !ACTION_UUID.test(a.snapshotId || '')) throw new TypeError('IDs da ação inválidos.');
    if (typeof a.responsavelFuncao !== 'string' || !a.responsavelFuncao.trim()) throw new TypeError('Informe a função responsável.');
    if (a.responsavelFuncao.length > 120) throw new TypeError('Função responsável excede 120 caracteres.');
    if (typeof a.prazo !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(a.prazo) || new Date(`${a.prazo}T00:00:00Z`).toISOString().slice(0,10) !== a.prazo) throw new TypeError('Prazo inválido.');
    if (!ACTION_STATES.includes(a.estado)) throw new TypeError('Estado da ação inválido.');
    if (typeof a.observacao !== 'string' || a.observacao.length > 500) throw new TypeError('Observação excede 500 caracteres.');
    if (a.estado === 'concluida' ? !Number.isFinite(a.concluidaEm) || a.concluidaEm < 0 : a.concluidaEm != null) throw new TypeError('Data de conclusão incompatível com o estado.');
    for(const k of ['criadoEm','atualizadoEm'])if(a[k]!=null&&(!Number.isFinite(a[k])||a[k]<0))throw new TypeError('Data da ação inválida.');
    if(a.rowVersion!=null&&(!Number.isSafeInteger(a.rowVersion)||a.rowVersion<1))throw new TypeError('rowVersion inválido.');
    return a;
  }
  const cloneRecord = value => {
    if (typeof Blob !== 'undefined' && value instanceof Blob) return value;
    if (Array.isArray(value)) return value.map(cloneRecord);
    if (value && Object.getPrototypeOf(value) === Object.prototype) return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,cloneRecord(v)]));
    return value;
  };
  function enqueuePhoto(id, task) {
    const previous=photoQueues.get(id)||Promise.resolve();
    const pending=previous.catch(()=>{}).then(task);
    photoQueues.set(id,pending);
    const cleanup=()=>{if(photoQueues.get(id)===pending)photoQueues.delete(id);};
    pending.then(cleanup,cleanup);
    return pending;
  }
  const delPhoto = id => enqueuePhoto(id,()=>new Promise((resolve,reject)=>{
    const tx=db.transaction(['fotos'],'readwrite');tx.objectStore('fotos').delete(id);
    tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error || new Error('Falha ao excluir foto.'));tx.onabort=()=>reject(tx.error || new Error('Exclusão da foto cancelada.'));
  }));
  /* Fila por foto mantém a ordem da chamada durante hash assíncrono e commit IndexedDB. */
  function putPhoto(record) {
    const backup = globalThis.Backup;
    if (!backup || typeof backup.photoFingerprint !== 'function') return Promise.reject(new Error('Backup não carregado; foto não foi gravada.'));
    const snapshot = cloneRecord(record), id = snapshot.id;
    return enqueuePhoto(id,async()=>{
      const helper = globalThis.Backup;
      if (!helper || typeof helper.photoFingerprint !== 'function') throw new Error('Backup não carregado; foto não foi gravada.');
      const incoming = { ...snapshot, contentSha256: await helper.photoFingerprint(snapshot) };
      return new Promise((resolve,reject)=>{
        const tx = db.transaction(['fotos','vistorias'],'readwrite'), vr=tx.objectStore('vistorias').get(incoming.vistoriaId);
        let key, failure;
        vr.onsuccess=()=>{if(!vr.result){failure=new Error('Vistoria ausente; foto não foi gravada.');tx.abort();return;}const req=tx.objectStore('fotos').put(incoming);req.onsuccess=()=>{key=req.result;};};
        tx.oncomplete=()=>resolve(key);
        tx.onerror=()=>reject(tx.error || new Error('Falha ao gravar foto.'));
        tx.onabort=()=>reject(failure || tx.error || new Error('Gravação da foto cancelada.'));
      });
    });
  }
  return {
    open, uid,
    all: s => w(st(s).getAll()),
    get: (s, id) => w(st(s).get(id)),
    async put(s, o) {
      if (s === 'fotos') return putPhoto(o);
      return w(st(s, 'readwrite').put(o));
    },
    putAcao(action, expectedRowVersion = 0) {
      try { validateAction(action); } catch (error) { return Promise.reject(error); }
      if (!Number.isSafeInteger(expectedRowVersion) || expectedRowVersion < 0) return Promise.reject(new TypeError('rowVersion esperado inválido.'));
      return new Promise((resolve,reject)=>{
        const tx=db.transaction(['acoes','vistorias','snapshots'],'readwrite'), store=tx.objectStore('acoes'); let saved, failure, vistoria, snapshot, current, ready=0;
        const persist=()=>{
          if(++ready!==3)return;
          if((current?.rowVersion||0)!==expectedRowVersion){failure=Object.assign(new Error('A ação foi alterada em outra tela. Recarregue antes de salvar.'),{code:'ACAO_CONFLICT'});tx.abort();return;}
          if(!current&&expectedRowVersion!==0){failure=Object.assign(new Error('A ação não existe mais.'),{code:'ACAO_CONFLICT'});tx.abort();return;}
          if(current&&(current.vistoriaId!==action.vistoriaId||current.constatacaoId!==action.constatacaoId||current.snapshotId!==action.snapshotId)){failure=Object.assign(new Error('Os vínculos da ação são imutáveis.'),{code:'ACAO_LINK_INVALID'});tx.abort();return;}
          const findingIds=new Set((snapshot?.conteudo?.constatacoes||[]).map(c=>c?.id));
          if(!vistoria||!snapshot||snapshot.vistoriaId!==action.vistoriaId||!findingIds.has(action.constatacaoId)){failure=Object.assign(new Error('A ação precisa apontar para uma constatação existente no snapshot da vistoria.'),{code:'ACAO_LINK_INVALID'});tx.abort();return;}
          const now=Date.now(); saved={...action,rowVersion:(current?.rowVersion||0)+1,criadoEm:current?.criadoEm||now,atualizadoEm:now};
          try{validateAction(saved);store.put(saved);}catch(error){failure=error;tx.abort();}
        };
        const req=store.get(action.id);req.onsuccess=()=>{current=req.result;persist();};
        tx.objectStore('vistorias').get(action.vistoriaId).onsuccess=e=>{vistoria=e.target.result;persist();};
        tx.objectStore('snapshots').get(action.snapshotId).onsuccess=e=>{snapshot=e.target.result;persist();};
        tx.oncomplete=()=>resolve(saved);tx.onerror=()=>reject(failure||tx.error||new Error('Falha ao salvar ação.'));tx.onabort=()=>reject(failure||tx.error||new Error('Salvamento da ação cancelado.'));
      });
    },
    deleteAcao(id, expectedRowVersion) {
      return new Promise((resolve,reject)=>{
        const tx=db.transaction(['acoes'],'readwrite'),store=tx.objectStore('acoes'),req=store.get(id);let failure;
        req.onsuccess=()=>{if(!req.result||req.result.rowVersion!==expectedRowVersion){failure=Object.assign(new Error('A ação foi alterada ou removida. Recarregue antes de excluir.'),{code:'ACAO_CONFLICT'});tx.abort();return;}store.delete(id);};
        tx.oncomplete=()=>resolve();tx.onerror=()=>reject(failure||tx.error||new Error('Falha ao excluir ação.'));tx.onabort=()=>reject(failure||tx.error||new Error('Exclusão da ação cancelada.'));
      });
    },
    del: (s, id) => s === 'fotos' ? delPhoto(id) : w(st(s, 'readwrite').delete(id)),
    by: (s, idx, v) => w(st(s).index(idx).getAll(v)),
    async getSetting(k, def) { const r = await w(st('settings').get(k)); return r ? r.value : def; },
    setSetting: (k, value) => w(st('settings', 'readwrite').put({ key: k, value })),
    async delVistoria(id) {
      return new Promise((resolve,reject)=>{
        // Inclui snapshots para serializar esta exclusão com putAcao, que valida o vínculo na mesma faixa de stores.
        const tx=db.transaction(['fotos','vistorias','snapshots','acoes'],'readwrite'),fs=tx.objectStore('fotos'),as=tx.objectStore('acoes'),req=fs.index('vistoriaId').getAll(id),ar=as.index('vistoriaId').getAll(id);
        req.onsuccess=()=>{for(const f of req.result)fs.delete(f.id);tx.objectStore('vistorias').delete(id);};
        ar.onsuccess=()=>{for(const a of ar.result)as.delete(a.id);};
        tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error || new Error('Falha ao excluir vistoria.'));tx.onabort=()=>reject(tx.error || new Error('Exclusão da vistoria cancelada.'));
      });
    },
    async delObra(id) {
      for (const v of await this.by('vistorias', 'obraId', id)) await this.delVistoria(v.id);
      await this.del('obras', id);
    },
    /* Snapshots são imutáveis: add() falha (ConstraintError) se o id já existir; não há put/del. */
    addSnapshot: sn => w(st('snapshots', 'readwrite').add(sn)),
    /* Grava snapshot, arquivo emitido e emissão na mesma transação: ou tudo ou nada. Snapshot e arquivo só por add(). */
    registrarEmissao(sn, em, arq) {
      return new Promise((res, rej) => {
        const t = db.transaction(['snapshots', 'arquivosEmitidos', 'emissoes'], 'readwrite');
        t.objectStore('snapshots').add(sn); t.objectStore('arquivosEmitidos').add(arq); t.objectStore('emissoes').add(em);
        t.oncomplete = () => res(em); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error);
      });
    },
    /* Reserva atômica da numeração LOCAL: devolve o seq já gravado na vistoria ou reserva o próximo do ano e grava a
       vistoria, tudo numa transação readwrite sobre ['vistorias','settings'] (serializa entre abas do mesmo aparelho).
       Sem await de promessas alheias dentro da transação, senão ela confirma antes. Não garante unicidade entre aparelhos. */
    reservarNumeracao(vistoriaId, ano) {
      return new Promise((res, rej) => {
        const t = db.transaction(['vistorias', 'settings'], 'readwrite'); let out;
        const vs = t.objectStore('vistorias'), cf = t.objectStore('settings');
        t.oncomplete = () => res(out); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error || new Error('transação abortada'));
        vs.get(vistoriaId).onsuccess = e => {
          const v = e.target.result;
          if (!v) { t.abort(); return; }
          if (v.seq) { out = { seq: v.seq, ano: v.ano }; return; }
          const k = 'seq-' + ano;
          cf.get(k).onsuccess = ev => {
            const n = (ev.target.result ? ev.target.result.value : 0) + 1;
            cf.put({ key: k, value: n });
            v.seq = n; v.ano = ano; vs.put(v); out = { seq: n, ano };
          };
        };
      });
    },
    atomicImport(batch) {
      const stores = ['obras','vistorias','fotos','snapshots','arquivosEmitidos','emissoes','settings','acoes'];
      return new Promise((resolve, reject) => {
        const t = db.transaction(stores, 'readwrite');
        const result = { novos: 0, duplicados: 0, conflitos: [] };
        const stable = v => JSON.stringify(v, (k,x) => x && typeof x === 'object' && !(x instanceof Blob) && !Array.isArray(x) ? Object.keys(x).sort().reduce((o,key)=>(o[key]=x[key],o),{}) : x);
        const same = (a,b) => stable(a) === stable(b);
        const addOrCompare = (store, incoming, key, compareHash) => {
          const s = t.objectStore(store);
          const req = s.get(incoming[key]);
          req.onsuccess = () => {
            const old = req.result;
            if (!old) { s.add(incoming); result.novos++; return; }
            if (compareHash && old[compareHash] && old[compareHash] === incoming[compareHash]) { result.duplicados++; return; }
            if (store !== 'fotos' && store !== 'arquivosEmitidos' && store !== 'snapshots' && same(old,incoming)) { result.duplicados++; return; }
            if (store === 'vistorias' && same(old,incoming)) { result.duplicados++; return; }
            result.conflitos.push({ store, id: incoming[key], acao: 'mantido_local' });
          };
        };
        // Independent records are added only when absent; collisions preserve local data.
        for (const x of batch.obras) addOrCompare('obras',x,'id');
        for (const x of batch.vistorias) addOrCompare('vistorias',x,'id');
        for (const x of batch.fotos) {
          if (!/^[0-9a-f]{64}$/.test(x.contentSha256 || '')) { t.abort(); return; }
          const s=t.objectStore('fotos'),req=s.get(x.id);
          req.onsuccess=()=>{const old=req.result;if(!old){s.add(x);result.novos++;return;}if(globalThis.Backup?.classifyPhotoCollision(old.contentSha256,x.contentSha256)==='duplicata'){result.duplicados++;return;}result.conflitos.push({store:'fotos',id:x.id,acao:'mantido_local'});};
        }
        const snaps = new Map((batch.snapshots || []).map(x=>[x.id,x]));
        const files = new Map((batch.arquivosEmitidos || []).map(x=>[x.id,x]));
        const filesByEmission = new Map((batch.arquivosEmitidos || []).map(x=>[x.emissaoId,x]));
        const sameEmission = (a,b) => { const x={...a},y={...b}; delete x.estadoSnapshot;delete x.estadoArquivo;delete y.estadoSnapshot;delete y.estadoArquivo;return same(x,y); };
        const conflict = (store,x) => result.conflitos.push({store,id:x.id,acao:'mantido_local'});
        const actionsBySnapshot=new Map();
        for(const action of batch.acoes||[]){if(!actionsBySnapshot.has(action.snapshotId))actionsBySnapshot.set(action.snapshotId,[]);actionsBySnapshot.get(action.snapshotId).push(action);}
        const actionsForSnapshot = snapshotId => actionsBySnapshot.get(snapshotId)||[];
        const rejectedActionIds=new Set();
        const rejectActionLink = action => {if(rejectedActionIds.has(action.id))return;rejectedActionIds.add(action.id);result.conflitos.push({store:'acoes',id:action.id,acao:'rejeitado_vinculo'});};
        const rejectActionsForSnapshot = snapshotId => actionsForSnapshot(snapshotId).forEach(rejectActionLink);
        const importedActionIds=new Set();
        const importActionsForSnapshot = snapshotId => {
          const incoming=snaps.get(snapshotId), actions=actionsForSnapshot(snapshotId);
          if(!incoming){rejectActionsForSnapshot(snapshotId);return;}
          const validActions=[];
          for(const action of actions){
            if(action.vistoriaId!==incoming.vistoriaId||!(incoming.conteudo?.constatacoes||[]).some(c=>c?.id===action.constatacaoId)){rejectActionLink(action);continue;}
            try{validateAction(action);validActions.push(action);}catch{rejectActionLink(action);}
          }
          const req=t.objectStore('snapshots').get(snapshotId);
          req.onsuccess=()=>{
            const local=req.result;
            const localFindings=new Set((local?.conteudo?.constatacoes||[]).map(c=>c?.id));
            if(!local||local.hash!==incoming.hash||local.vistoriaId!==incoming.vistoriaId){rejectActionsForSnapshot(snapshotId);return;}
            for(const action of validActions){
              if(!localFindings.has(action.constatacaoId)){rejectActionLink(action);continue;}
              if(importedActionIds.has(action.id)){result.duplicados++;continue;}
              importedActionIds.add(action.id);
              addOrCompare('acoes',action,'id');
            }
          };
        };
        const emissionSnapshotIds=new Set((batch.emissoes||[]).map(e=>e.snapshotId).filter(Boolean));
        for(const action of batch.acoes||[])if(!emissionSnapshotIds.has(action.snapshotId))rejectActionLink(action);
        for (const em of batch.emissoes) {
          const er=t.objectStore('emissoes').get(em.id);
          er.onsuccess=()=>{
            const oldEm=er.result;
            if(oldEm&&!sameEmission(oldEm,em)){conflict('emissoes',em);rejectActionsForSnapshot(em.snapshotId);return;}
            const sn=em.snapshotId&&snaps.get(em.snapshotId), ar=(em.arquivoId&&files.get(em.arquivoId))||filesByEmission.get(em.id);
            const verifyRef=(store,item,refId,expectedHash,hashKey,done)=>{
              const key=item?.id||refId;if(!key){done(null);return;}
              const req=t.objectStore(store).get(key);
              req.onsuccess=()=>{const old=req.result;if(!old){done(item?{old:null}:null);return;}if(old[hashKey]===expectedHash){done({old,duplicate:true});return;}conflict(store,item||{id:key});done({error:true});};
            };
            verifyRef('snapshots',sn,em.snapshotId,em.snapshotHash,'hash',sres=>verifyRef('arquivosEmitidos',ar,em.arquivoId,em.arquivoSha256,'sha256',ares=>{
              if(sres?.error||ares?.error){conflict('emissoes',em);rejectActionsForSnapshot(em.snapshotId);return;}
              const ss=t.objectStore('snapshots'),fs=t.objectStore('arquivosEmitidos'),es=t.objectStore('emissoes');
              if(sn&&!sres?.old){ss.add(sn);result.novos++;}else if(sn&&sres?.duplicate)result.duplicados++;
              if(ar&&!ares?.old){fs.add(ar);result.novos++;}else if(ar&&ares?.duplicate)result.duplicados++;
              if(!oldEm){es.add(em);result.novos++;}else result.duplicados++;
              if(sn)importActionsForSnapshot(sn.id);else rejectActionsForSnapshot(em.snapshotId);
            }));
          };
        }
        for (const [year, value] of Object.entries(batch.seqs || {})) {
          const s=t.objectStore('settings'), key='seq-'+year, req=s.get(key);
          req.onsuccess=()=>{ if (Number.isInteger(value) && value > (req.result?.value || 0)) s.put({key,value}); };
        }
        t.oncomplete=()=>resolve(result); t.onerror=()=>reject(t.error); t.onabort=()=>reject(t.error || new Error('Importação cancelada; nenhuma alteração foi gravada.'));
      });
    }
  };
})();
