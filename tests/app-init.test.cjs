const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const app = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

test('inicialização informa quando o armazenamento local não abre e as rotas não sobrescrevem o aviso', () => {
  const init = app.slice(app.lastIndexOf('(async () => {'));
  assert.match(init, /try \{ await DB\.open\(\); await loadSettings\(\); await loadLogo\(\); \}\s*catch \(e\) \{/);
  assert.match(init, /Não foi possível abrir o armazenamento local deste navegador\./);
  assert.ok(init.indexOf('return;') < init.indexOf('route();'), 'falha interrompe antes de rotear');
  const doRoute = app.slice(app.indexOf('async function doRoute()'), app.indexOf("window.addEventListener('hashchange'"));
  assert.ok(doRoute.indexOf('if (!S) return;') > -1 && doRoute.indexOf('if (!S) return;') < doRoute.indexOf('try {'), 'rota não renderiza sem configurações carregadas');
});
