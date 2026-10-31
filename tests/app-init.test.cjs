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

test('aba antiga mantém tela e modal para copiar o rascunho e mostra aviso acima de tudo ao perder o banco', () => {
  const start = app.indexOf("addEventListener('cgu-db-versionchange'");
  assert.ok(start > -1);
  const listener = app.slice(start, app.indexOf('});', start) + 3);
  assert.match(listener, /S = null;/);
  assert.doesNotMatch(listener, /#view'\)\.innerHTML/, 'não apaga a tela com campos não salvos');
  assert.doesNotMatch(listener, /closeModal\(\)/, 'não fecha o modal com campos não salvos');
  assert.match(listener, /setAttribute\('role', 'alert'\)/);
  assert.match(listener, /if \(\$\('#db-gone'\)\) return;/, 'aviso único');
  assert.match(app, /addEventListener\('hashchange', \(\) => \{ if \(!S\) return; closeModal\(\);/, 'navegar sem banco não fecha o modal com rascunho');
  const css = fs.readFileSync(path.join(__dirname, '..', 'app.css'), 'utf8');
  const z = Number((css.match(/\.db-gone\{[^}]*z-index:(\d+)/) || [])[1]);
  const maxOther = Math.max(...[...css.matchAll(/([^{}]+)\{([^}]*)\}/g)].filter(m => !m[1].includes('db-gone')).map(m => Number((m[2].match(/z-index:(\d+)/) || [])[1] || 0)));
  assert.ok(z > maxOther, `aviso (${z}) acima de modal/editor (${maxOther})`);
});
