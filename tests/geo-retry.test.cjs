const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const app = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

/* Executa geoState e geoDecision do app com um navigator simulado. */
const geoFnsWith = navigator => {
  const state = app.match(/const geoState = async \(\) => \{[^\n]*\};/)[0];
  const start = app.indexOf('const geoDecision = () =>');
  const decision = app.slice(start, app.indexOf('\n});', start) + 4);
  return new Function('navigator', `${state}\n${decision}\nreturn { geoState, geoDecision };`)(navigator);
};
const permWith = status => ({ permissions: { query: async q => { assert.equal(q.name, 'geolocation'); return status; } } });
const flush = () => new Promise(r => setImmediate(r));

/* Executa o trecho de espera pelo GPS de addPhotos com cap.pos, getPos, geoState, geoDecision e toast simulados. */
const GEO_WAIT_MS = Number(app.match(/const GEO_WAIT_MS = (\d+);/)[1]);
const startRetry = ({ kind = 'cam', capPos, state, decision, reads }) => {
  const body = app.slice(app.indexOf('async function addPhotos'), app.indexOf('for (const file of files)', app.indexOf('async function addPhotos')));
  const block = body.slice(body.indexOf('  const prazo ='), body.indexOf("if (kind === 'cam' && !pos) toast("));
  const calls = { getPos: 0, states: 0, decisions: 0, toasts: [] };
  const deps = {
    cap: { pos: capPos },
    getPos: async () => reads[calls.getPos++] ?? null,
    geoState: async () => { calls.states++; return state; },
    geoDecision: async () => { calls.decisions++; return decision; },
    toast: msg => calls.toasts.push(msg)
  };
  const run = new Function('kind', 'GEO_WAIT_MS', ...Object.keys(deps), `return (async () => { ${block}; return pos; })();`);
  return { result: run(kind, GEO_WAIT_MS, ...Object.values(deps)), calls };
};

test('a espera máxima pelo GPS depois da foto é de 15 s', () => {
  assert.equal(GEO_WAIT_MS, 15000);
});

test('geoState devolve o estado da permissão ou "unknown"; geoDecision espera a resposta ao pedido', async t => {
  for (const state of ['denied', 'prompt', 'granted']) assert.equal(await geoFnsWith(permWith({ state })).geoState(), state);
  assert.equal(await geoFnsWith({}).geoState(), 'unknown');
  assert.equal(await geoFnsWith({}).geoDecision(), 'unknown');
  const status = { state: 'prompt', onchange: null };
  const pending = geoFnsWith(permWith(status)).geoDecision();
  await flush();
  status.state = 'granted'; status.onchange();
  assert.equal(await pending, 'granted'); assert.equal(status.onchange, null);
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const silent = { state: 'prompt', onchange: null };
  const expiring = geoFnsWith(permWith(silent)).geoDecision();
  await flush(); t.mock.timers.tick(60000);
  assert.equal(await expiring, 'prompt');
});

test('foto da câmera: posição dentro do prazo é usada; sem posição, nova leitura e última leitura se concedida', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const fix = { lat: 37.42, lon: -122.08, acc: 5 };
  let r = startRetry({ capPos: Promise.resolve(fix), state: 'prompt', decision: 'prompt', reads: [] });
  assert.deepEqual(await r.result, fix); assert.equal(r.calls.getPos, 0); assert.deepEqual(r.calls.toasts, ['Obtendo localização…']);
  r = startRetry({ capPos: Promise.resolve(null), state: 'prompt', decision: 'prompt', reads: [fix] });
  assert.deepEqual(await r.result, fix); assert.equal(r.calls.decisions, 0, 'leitura com posição não espera a decisão');
  r = startRetry({ capPos: Promise.resolve(null), state: 'prompt', decision: 'granted', reads: [null, fix] });
  assert.deepEqual(await r.result, fix, 'concedida dentro do prazo: última leitura'); assert.equal(r.calls.getPos, 2);
  r = startRetry({ capPos: Promise.resolve(null), state: 'denied', decision: 'denied', reads: [fix] });
  assert.equal(await r.result, null, 'negada: não lê de novo'); assert.equal(r.calls.getPos, 0);
  r = startRetry({ kind: 'gal', capPos: Promise.resolve(null), state: 'prompt', decision: 'prompt', reads: [fix] });
  assert.equal(await r.result, null, 'galeria não lê GPS'); assert.equal(r.calls.getPos, 0); assert.deepEqual(r.calls.toasts, []);
});

test('leitura presa no pedido de permissão: a foto segue sem GPS exatamente no fim do prazo', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const never = new Promise(() => {});
  const r = startRetry({ capPos: never, state: 'prompt', decision: 'granted', reads: [] });
  r.calls.getPos = 0;
  let done = false; r.result.then(() => { done = true; });
  await flush(); t.mock.timers.tick(GEO_WAIT_MS - 1); await flush();
  assert.equal(done, false, 'ainda dentro do prazo');
  t.mock.timers.tick(1); await flush(); await flush();
  assert.equal(done, true, 'no fim do prazo não espera mais');
  assert.equal(await r.result, null);
});

test('a espera vem antes do aviso de foto sem coordenadas', () => {
  const body = app.slice(app.indexOf('async function addPhotos'), app.indexOf('for (const file of files)', app.indexOf('async function addPhotos')));
  assert.ok(body.indexOf('const prazo =') > -1 && body.indexOf('const prazo =') < body.indexOf('Sem GPS'));
});
