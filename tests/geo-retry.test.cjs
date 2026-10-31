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
const flush = async () => { for (let i = 0; i < 5; i++) await new Promise(r => setImmediate(r)); };

/* Executa o trecho de espera pelo GPS de addPhotos com cap.pos, getPos, geoState, geoDecision e toast simulados. */
const GEO_WAIT_MS = Number(app.match(/const GEO_WAIT_MS = (\d+);/)[1]);
const startRetry = ({ kind = 'cam', capPos, states, decision, reads }) => {
  const body = app.slice(app.indexOf('async function addPhotos'), app.indexOf('for (const file of files)', app.indexOf('async function addPhotos')));
  const block = body.slice(body.indexOf('  let pos = null, last = null;'), body.indexOf("if (kind === 'cam' && !pos) toast("));
  const calls = { getPos: 0, decisions: 0, toasts: [] };
  const deps = {
    cap: { pos: capPos },
    getPos: () => { const r = reads[calls.getPos++]; return r instanceof Promise ? r : Promise.resolve(r ?? null); },
    geoState: async () => states.length > 1 ? states.shift() : states[0],
    geoDecision: () => { calls.decisions++; return decision; },
    toast: msg => calls.toasts.push(msg)
  };
  const run = new Function('kind', 'GEO_WAIT_MS', ...Object.keys(deps), `return (async () => { ${block}; return pos; })();`);
  const result = run(kind, GEO_WAIT_MS, ...Object.values(deps));
  let done = false; result.then(() => { done = true; });
  return { result, calls, isDone: () => done };
};
const later = (value, ms) => new Promise(res => setTimeout(() => res(value), ms));
const never = () => new Promise(() => {});
const fix = { lat: 37.42, lon: -122.08, acc: 5 };

test('a espera máxima pelo GPS é de 15 s depois da resposta ao pedido', () => {
  assert.equal(GEO_WAIT_MS, 15000);
});

test('geoState devolve o estado ou "unknown"; geoDecision espera a resposta ao pedido (até 30 s)', async t => {
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
  let expired = false; expiring.then(() => { expired = true; });
  await flush(); t.mock.timers.tick(29999); await flush();
  assert.equal(expired, false, 'ainda aguardando a resposta');
  t.mock.timers.tick(1);
  assert.equal(await expiring, 'prompt', 'sem resposta em 30 s desiste');
});

test('sem pedido na tela: usa a posição da primeira leitura ou lê de novo dentro do prazo', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let r = startRetry({ capPos: Promise.resolve(fix), states: ['granted'], decision: never(), reads: [] });
  assert.deepEqual(await r.result, fix); assert.equal(r.calls.decisions, 0); assert.deepEqual(r.calls.toasts, ['Obtendo localização…']);
  r = startRetry({ capPos: Promise.resolve(null), states: ['granted'], decision: never(), reads: [fix] });
  assert.deepEqual(await r.result, fix); assert.equal(r.calls.getPos, 1);
  r = startRetry({ capPos: Promise.resolve(null), states: ['denied'], decision: never(), reads: [fix] });
  assert.equal(await r.result, null, 'negada: não lê de novo'); assert.equal(r.calls.getPos, 0);
  r = startRetry({ kind: 'gal', capPos: Promise.resolve(null), states: ['granted'], decision: never(), reads: [fix] });
  assert.equal(await r.result, null, 'galeria não lê GPS'); assert.deepEqual(r.calls.toasts, []);
});

test('com o pedido na tela, os 15 s contam a partir da resposta da pessoa', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  // Concede 20 s depois; a leitura posterior chega 5 s após a resposta: sai com GPS.
  let r = startRetry({ capPos: Promise.resolve(null), states: ['prompt', 'granted'], decision: later('granted', 20000), reads: [later(fix, 5000)] });
  await flush(); t.mock.timers.tick(20000); await flush(); t.mock.timers.tick(5000); await flush();
  assert.deepEqual(await r.result, fix, 'resposta lenta ainda recebe GPS');
  // Concede 20 s depois, mas a leitura não responde: segue sem GPS exatamente 15 s após a resposta.
  r = startRetry({ capPos: never(), states: ['prompt', 'granted'], decision: later('granted', 20000), reads: [never()] });
  await flush(); t.mock.timers.tick(20000); await flush();
  t.mock.timers.tick(GEO_WAIT_MS - 1); await flush();
  assert.equal(r.isDone(), false, 'ainda dentro do prazo contado da resposta');
  t.mock.timers.tick(1); await flush();
  assert.equal(r.isDone(), true); assert.equal(await r.result, null);
  // Posição que chega antes da resposta encerra a espera pelo pedido.
  r = startRetry({ capPos: later(fix, 3000), states: ['prompt'], decision: never(), reads: [] });
  await flush(); t.mock.timers.tick(3000); await flush();
  assert.deepEqual(await r.result, fix);
  // Negada no pedido: não lê de novo.
  r = startRetry({ capPos: Promise.resolve(null), states: ['prompt', 'denied'], decision: later('denied', 4000), reads: [fix] });
  await flush(); t.mock.timers.tick(4000); await flush();
  assert.equal(await r.result, null); assert.equal(r.calls.getPos, 0);
});

test('a espera vem antes do aviso de foto sem coordenadas', () => {
  const body = app.slice(app.indexOf('async function addPhotos'), app.indexOf('for (const file of files)', app.indexOf('async function addPhotos')));
  assert.ok(body.indexOf('const prazo =') > -1 && body.indexOf('const prazo =') < body.indexOf('Sem GPS'));
});
