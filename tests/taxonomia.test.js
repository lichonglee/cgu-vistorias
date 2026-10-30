const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const Taxonomia = require('../taxonomia.js');

test('taxonomia interna tem catalogos completos, codigos unicos e snapshot congelado', () => {
  assert.equal(Taxonomia.TAXONOMIA_VERSAO, 'cgu-app-taxonomia-1');
  assert.equal(Taxonomia.TIPOS.length, 46);
  assert.equal(Taxonomia.AMBIENTES.length, 34);
  const rows = [...Taxonomia.TIPOS, ...Taxonomia.AMBIENTES];
  assert.equal(new Set(rows.map(x => x.code)).size, rows.length);
  assert.equal(new Set(Taxonomia.TIPOS.map(x => x.label)).size, Taxonomia.TIPOS.length);
  assert.equal(new Set(Taxonomia.AMBIENTES.map(x => x.label)).size, Taxonomia.AMBIENTES.length);
  assert.equal(crypto.createHash('sha256').update(JSON.stringify({ tipos: Taxonomia.TIPOS, ambientes: Taxonomia.AMBIENTES })).digest('hex'), 'efb4984711660c24b56dc520051fc3f813d65f62685cda9b884afc17c3cfe813');
});

test('texto desconhecido ou hostil nao e devolvido nem refletido', () => {
  for (const value of ['__proto__', 'constructor', '<img onerror=alert(1)>', 'tipo fora do catalogo']) {
    assert.equal(Taxonomia.codigoDeTipo(value), null);
    assert.equal(Taxonomia.sistemaDeTipo(value), null);
    assert.equal(Taxonomia.codigoDeAmbiente(value), null);
    assert.equal(Taxonomia.grupoDeAmbiente(value), null);
  }
});

test('codigos derivam sistema e ambiente sem alterar os rotulos catalogados', () => {
  const type = Taxonomia.TIPOS[0], env = Taxonomia.AMBIENTES[0];
  assert.equal(Taxonomia.codigoDeTipo(type.label), type.code);
  assert.equal(Taxonomia.sistemaDeTipo(type.label), type.group);
  assert.equal(Taxonomia.codigoDeAmbiente(env.label), env.code);
  assert.equal(Taxonomia.grupoDeAmbiente(env.label), env.group);
});

test('todo rótulo atual da interface tem código e nenhum código sobrou do catálogo', () => {
  const source=fs.readFileSync(require.resolve('../app.js'),'utf8');
  const current=name=>{const m=source.match(new RegExp(`const ${name} = (\\{[\\s\\S]*?\\n\\});`));assert.ok(m,`${name} presente`);return Function(`return (${m[1]})`)();};
  const currentTypes=Object.values(current('TIPOS_CONST')).flat();
  const currentEnvs=Object.values(current('AMBIENTES')).flat();
  assert.deepEqual(new Set(Taxonomia.TIPOS.map(x=>x.label)),new Set(currentTypes));
  assert.deepEqual(new Set(Taxonomia.AMBIENTES.map(x=>x.label)),new Set(currentEnvs));
});
