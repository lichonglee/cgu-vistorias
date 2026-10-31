const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const app = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

/* Executa geoDenied do app com um navigator simulado. */
const geoDeniedWith = navigator => {
  const line = app.match(/const geoDenied = async \(\) => \{[^\n]*\};/)[0];
  return new Function('navigator', line + '; return geoDenied;')(navigator);
};

test('geoDenied só é verdadeiro quando a permissão de localização foi negada', async () => {
  const perm = state => ({ permissions: { query: async q => { assert.equal(q.name, 'geolocation'); return { state }; } } });
  assert.equal(await geoDeniedWith(perm('denied'))(), true);
  assert.equal(await geoDeniedWith(perm('prompt'))(), false);
  assert.equal(await geoDeniedWith(perm('granted'))(), false);
  assert.equal(await geoDeniedWith({})(), false, 'sem Permissions API não bloqueia a nova tentativa');
  assert.equal(await geoDeniedWith({ permissions: { query: async () => { throw new Error('x'); } } })(), false);
});

test('foto da câmera sem posição tenta o GPS de novo antes de avisar e de carimbar', () => {
  const body = app.slice(app.indexOf('async function addPhotos'), app.indexOf('for (const file of files)', app.indexOf('async function addPhotos')));
  const retry = body.indexOf("if (kind === 'cam' && !pos && !(await geoDenied())) pos = await getPos();");
  assert.ok(retry > -1, 'nova tentativa presente');
  assert.ok(retry < body.indexOf('Sem GPS'), 'nova tentativa antes do aviso de foto sem coordenadas');
  assert.match(body, /let pos = await cap\.pos/);
});
