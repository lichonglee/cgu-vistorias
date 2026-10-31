/* Abertura do banco com outra aba: atualização bloqueada falha de forma visível e a conexão aberta cede a versões novas.
   Usa fake-indexeddb via FAKE_IDB (sem ele, pulado). */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
let fake = null;
try { fake = require(process.env.FAKE_IDB || 'fake-indexeddb'); } catch { /* pulado */ }
const skip = fake ? false : 'fake-indexeddb indisponível (defina FAKE_IDB)';
const src = fs.readFileSync(path.join(__dirname, '..', 'db.js'), 'utf8');
const novaAba = idb => new Function('indexedDB', 'crypto', src + '; return DB;')(idb, globalThis.crypto);
const rawOpen = (idb, version) => new Promise((res, rej) => { const r = idb.open('cgu-vistorias', version); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); r.onblocked = () => rej(new Error('blocked')); });
const within = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('pendente')), ms))]);

test('atualização bloqueada por aba antiga rejeita com BlockedError em vez de ficar pendente', { skip }, async () => {
  const idb = new fake.IDBFactory();
  const antiga = await rawOpen(idb, 2);
  await assert.rejects(within(novaAba(idb).open(), 2000), err => err.name === 'BlockedError' && /outra aba/.test(err.message));
  antiga.close();
});

test('conexão aberta fecha ao receber versionchange e não bloqueia versão mais nova', { skip }, async () => {
  const idb = new fake.IDBFactory();
  await novaAba(idb).open();
  const nova = await within(rawOpen(idb, 4), 2000);
  assert.equal(nova.version, 4);
  nova.close();
});
