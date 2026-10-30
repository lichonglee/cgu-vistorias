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
        t.objectStore('snapshots').add(sn); t.objectStore('arquivosEmitidos').add(arq); t.objectStore('emissoes').put(em);
        t.oncomplete = () => res(em); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error);
      });
    },
    async nextSeq(ano) {
      const k = 'seq-' + ano; const n = (await this.getSetting(k, 0)) + 1;
      await this.setSetting(k, n); return n;
    }
  };
})();
