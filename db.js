/* CGU Vistorias — camada de dados local (IndexedDB). Tudo fica no próprio aparelho. */
const DB = (() => {
  let db;
  const NAME = 'cgu-vistorias', VER = 2;
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
      };
      r.onsuccess = () => { db = r.result; res(); };
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
  return {
    open, uid,
    all: s => w(st(s).getAll()),
    get: (s, id) => w(st(s).get(id)),
    put: (s, o) => w(st(s, 'readwrite').put(o)),
    del: (s, id) => w(st(s, 'readwrite').delete(id)),
    by: (s, idx, v) => w(st(s).index(idx).getAll(v)),
    async getSetting(k, def) { const r = await w(st('settings').get(k)); return r ? r.value : def; },
    setSetting: (k, value) => w(st('settings', 'readwrite').put({ key: k, value })),
    async delVistoria(id) {
      for (const f of await this.by('fotos', 'vistoriaId', id)) await this.del('fotos', f.id);
      await this.del('vistorias', id);
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
      const stores = ['obras','vistorias','fotos','snapshots','arquivosEmitidos','emissoes','settings'];
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
        for (const x of batch.fotos) addOrCompare('fotos',x,'id');
        const snaps = new Map((batch.snapshots || []).map(x=>[x.id,x]));
        const files = new Map((batch.arquivosEmitidos || []).map(x=>[x.id,x]));
        const filesByEmission = new Map((batch.arquivosEmitidos || []).map(x=>[x.emissaoId,x]));
        const sameEmission = (a,b) => { const x={...a},y={...b}; delete x.estadoSnapshot;delete x.estadoArquivo;delete y.estadoSnapshot;delete y.estadoArquivo;return same(x,y); };
        const conflict = (store,x) => result.conflitos.push({store,id:x.id,acao:'mantido_local'});
        for (const em of batch.emissoes) {
          const er=t.objectStore('emissoes').get(em.id);
          er.onsuccess=()=>{
            const oldEm=er.result;
            if(oldEm&&!sameEmission(oldEm,em)){conflict('emissoes',em);return;}
            const sn=em.snapshotId&&snaps.get(em.snapshotId), ar=(em.arquivoId&&files.get(em.arquivoId))||filesByEmission.get(em.id);
            const verifyRef=(store,item,refId,expectedHash,hashKey,done)=>{
              const key=item?.id||refId;if(!key){done(null);return;}
              const req=t.objectStore(store).get(key);
              req.onsuccess=()=>{const old=req.result;if(!old){done(item?{old:null}:null);return;}if(old[hashKey]===expectedHash){done({old,duplicate:true});return;}conflict(store,item||{id:key});done({error:true});};
            };
            verifyRef('snapshots',sn,em.snapshotId,em.snapshotHash,'hash',sres=>verifyRef('arquivosEmitidos',ar,em.arquivoId,em.arquivoSha256,'sha256',ares=>{
              if(sres?.error||ares?.error){conflict('emissoes',em);return;}
              const ss=t.objectStore('snapshots'),fs=t.objectStore('arquivosEmitidos'),es=t.objectStore('emissoes');
              if(sn&&!sres?.old){ss.add(sn);result.novos++;}else if(sn&&sres?.duplicate)result.duplicados++;
              if(ar&&!ares?.old){fs.add(ar);result.novos++;}else if(ar&&ares?.duplicate)result.duplicados++;
              if(!oldEm){es.add(em);result.novos++;}else result.duplicados++;
            }));
          };
        }
        for (const [year, value] of Object.entries(batch.seqs || {})) {
          const s=t.objectStore('settings'), key='seq-'+year, req=s.get(key);
          req.onsuccess=()=>{ if (Number.isInteger(value) && value > (req.result?.value || 0)) s.put({key,value}); };
        }
        t.oncomplete=()=>resolve(result); t.onerror=()=>reject(t.error); t.onabort=()=>reject(t.error || new Error('Importação cancelada; nenhuma alteração foi gravada.'));
      });
    },
    async nextSeq(ano) {
      const k = 'seq-' + ano; const n = (await this.getSetting(k, 0)) + 1;
      await this.setSetting(k, n); return n;
    }
  };
})();
