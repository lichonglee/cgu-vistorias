/* CGU Vistorias — camada de dados local (IndexedDB). Tudo fica no próprio aparelho. */
const DB = (() => {
  let db;
  const NAME = 'cgu-vistorias', VER = 1;
  function open() {
    return new Promise((res, rej) => {
      const r = indexedDB.open(NAME, VER);
      r.onupgradeneeded = e => {
        const d = e.target.result;
        d.createObjectStore('obras', { keyPath: 'id' });
        d.createObjectStore('vistorias', { keyPath: 'id' }).createIndex('obraId', 'obraId');
        d.createObjectStore('fotos', { keyPath: 'id' }).createIndex('vistoriaId', 'vistoriaId');
        d.createObjectStore('emissoes', { keyPath: 'id' }).createIndex('vistoriaId', 'vistoriaId');
        d.createObjectStore('settings', { keyPath: 'key' });
      };
      r.onsuccess = () => { db = r.result; res(); };
      r.onerror = () => rej(r.error);
    });
  }
  const st = (s, m = 'readonly') => db.transaction(s, m).objectStore(s);
  const w = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2, 10));
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
    async nextSeq(ano) {
      const k = 'seq-' + ano; const n = (await this.getSetting(k, 0)) + 1;
      await this.setSetting(k, n); return n;
    }
  };
})();
