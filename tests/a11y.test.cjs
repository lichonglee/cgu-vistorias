const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = name => fs.readFileSync(path.join(__dirname, '..', name), 'utf8');
const app = read('app.js');

/* Extrai a11yFix do app e executa sobre elementos simulados (sem DOM real). */
function loadA11yFix() {
  const start = app.indexOf('let a11ySeq = 0;');
  const end = app.indexOf('new MutationObserver', start);
  return new Function(app.slice(start, end) + '; return a11yFix;')();
}
const el = (tag, props = {}) => ({ tag, id: '', htmlFor: '', attrs: {}, children: [], ...props,
  matches(sel) { return sel.split(',').includes(this.tag); },
  querySelector(sel) { return this.children.find(c => c.matches(sel)) || null; },
  setAttribute(k, v) { this.attrs[k] = v; } });

test('a11yFix associa rótulo ao campo seguinte e dá foco/nome às tabelas roláveis', () => {
  const a11yFix = loadA11yFix();
  const input = el('input'), select = el('select', { id: 'existente' }), wrapped = el('input');
  const l1 = el('label', { nextElementSibling: input }), l2 = el('label', { nextElementSibling: select });
  const l3 = el('label', { nextElementSibling: el('p'), children: [wrapped] }), l4 = el('label', { nextElementSibling: el('div') });
  const tw = el('div', { previousElementSibling: { textContent: '  Registro de emissões ' } }), tw2 = el('div', { previousElementSibling: null });
  const root = { querySelectorAll: sel => sel.startsWith('label') ? [l1, l2, l3, l4] : [tw, tw2] };
  a11yFix(root);
  assert.match(input.id, /^campo-\d+$/); assert.equal(l1.htmlFor, input.id);
  assert.equal(select.id, 'existente'); assert.equal(l2.htmlFor, 'existente');
  assert.equal(l3.htmlFor, ''); assert.equal(l4.htmlFor, '');
  assert.equal(tw.tabIndex, 0); assert.equal(tw.attrs.role, 'region');
  assert.equal(tw.attrs['aria-label'], 'Registro de emissões — tabela com rolagem horizontal');
  assert.equal(tw2.attrs['aria-label'], 'Tabela — tabela com rolagem horizontal');
});

test('a11yFix roda em toda inserção de nós no documento', () => {
  assert.match(app, /new MutationObserver\(list => \{ for \(const m of list\) for \(const n of m\.addedNodes\) if \(n\.nodeType === 1\) a11yFix\(n\.parentElement \|\| n\); \}\)\.observe\(document\.body, \{ childList: true, subtree: true \}\);/);
});

test('etiquetas (.chip) têm contraste mínimo de 4,5:1 (WCAG AA, texto normal)', () => {
  const css = read('app.css');
  const vars = Object.fromEntries([...css.match(/:root\{([^}]*)\}/)[1].matchAll(/--([\w-]+):(#[0-9a-fA-F]{6})/g)].map(m => [m[1], m[2]]));
  const color = v => v.startsWith('var(') ? vars[v.slice(6, -1)] : v;
  const lum = hex => { const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const rules = [...css.matchAll(/\.chip(\.\w+)?\{([^}]*)\}/g)].filter(m => /background:/.test(m[2]) && /(^|;)color:/.test(m[2]));
  assert.ok(rules.length >= 5);
  for (const m of rules) {
    const bg = color(m[2].match(/background:([^;]+)/)[1].trim()), fg = color(m[2].match(/(?:^|;)color:([^;]+)/)[1].trim());
    assert.ok(ratio(fg, bg) >= 4.5, `.chip${m[1] || ''} ${fg} sobre ${bg}: ${ratio(fg, bg).toFixed(2)}`);
  }
});

test('toda imagem montada pelo app tem texto alternativo', () => {
  const imgs = app.match(/<img\b[^>]*>/g) || [];
  assert.ok(imgs.length >= 3);
  for (const tag of imgs) assert.match(tag, /\balt="/, tag);
});
