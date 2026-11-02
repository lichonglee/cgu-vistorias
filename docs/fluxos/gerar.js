'use strict';
/**
 * Gera os fluxogramas do CGU Vistorias com o app-fluxos (Index.html) e aplica a identidade visual da CGU.
 *   APP_FLUXOS=<pasta do clone de github.com/lichonglee/app-fluxos> node docs/fluxos/gerar.js
 * Saída em docs/fluxos: .bpmn, .json (abre no app-fluxos), .svg e, por fim, o documento (documento.js).
 * Requer Edge/Chrome (variável EDGE ou CHROME aponta o navegador) e Node 22+.
 */
const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const AF = process.env.APP_FLUXOS;
if (!AF || !fs.existsSync(path.join(AF, 'Index.html'))) throw new Error('Defina APP_FLUXOS com a pasta do clone do app-fluxos.');
const base = require(path.join(AF, 'docs', 'at1', 'gerar_at1'));
const { finalizar } = require(path.join(AF, 'docs', 'at1', 'finalizar_bpmn'));
const FLUXOS = require('./fluxos');

const VERSAO = 'v1.0.5';
const RESP = 'Responsável: Eng. DSc Li Chong Lee Bacelar de Castro';
const ASSETS = path.join(DIR, '..', '..', 'assets');
const marca = 'data:image/png;base64,' + fs.readFileSync(path.join(ASSETS, 'marca-cgu.png')).toString('base64');

/* paleta IPOG do app-fluxos -> paleta CGU (Manual de Identidade Visual 2023: #002543, #49ABE1, #049B6F) */
const CORES = {
  '#B70E0C': '#002543', '#44546A': '#002543', '#C5D7EE': '#D3EAF8', '#DADDE2': '#A9D8F2',
  '#D7EFD9': '#CDEFE3', '#2E7D32': '#049B6F', '#F9D2D2': '#DCE6EE', '#B71C1C': '#002543',
  '#F7B7B7': '#FFF1C9', '#AA3333': '#8A6A00', '#F8CB93': '#E6EEF4', '#E4F3E7': '#DDF3EC', '#2E6B3A': '#04785A',
  '#1F5A2C': '#04523C', '#5A0000': '#002543', '#FFF3C4': '#FFF1C9', '#8A6D00': '#8A6A00',
};
function recolor(txt) {
  return txt.replace(/#[0-9A-Fa-f]{6}\b/g, (c) => CORES[c.toUpperCase()] || c).replace(/#A33\b/g, '#8A6A00');
}
function marcaCgu(svg, f) {
  const campo = /^(Etapa|Todas)/.test(f.etapa);
  const meta = `CGU Vistorias ${VERSAO}  ·  Controladoria-Geral da União  ·  ${campo ? (f.etapa === 'Todas' ? 'Manual do usuário' : 'Manual do usuário, ' + f.etapa.toLowerCase()) : 'Plataforma central, ' + f.etapa}  ·  Rev. R01`;
  const fonte = campo ? 'Fluxo desenhado a partir do manual do usuário (manual.html) · identidade visual baseada no Manual da CGU, 2023' : 'Fluxo desenhado a partir do relato da plataforma central (v1.27.12), a confirmar nos manuais da Central e do Painel · identidade visual da CGU';
  return recolor(svg)
    .replace(/<image href="data:[^"]+" x="([^"]+)" y="([^"]+)" width="([^"]+)"([^>]*)\/>/, (t, x, y, w, r) => '<image href="' + marca + '" x="' + x + '" y="' + y + '" width="' + w + '"' + r + '/><text x="' + (+x + +w) + '" y="' + (+y + 40) + '" font-size="9" text-anchor="end" fill="#002543">' + RESP + '</text>')
    .replace(/(<text[^>]*>)Processos e Fluxos de Trabalho[^<]*(<\/text>)/, '$1' + meta + '$2')
    .replace(/(<text[^>]*>)Produzido pelo Professor[^<]*(<\/text>)/, '$1' + fonte + '$2');
}
function marcaJson(json) {
  const d = JSON.parse(json);
  Object.assign(d, { disciplina: 'CGU Vistorias ' + VERSAO, curso: 'Controladoria-Geral da União', turma: '', grupo: '', autores: RESP });
  return JSON.stringify(d);
}

(async () => {
  if (!base.NAVEGADOR) throw new Error('Edge/Chrome não encontrado. Defina a variável EDGE ou CHROME.');
  const fluxos = await base.gerarFluxos(FLUXOS.map((f) => Object.assign({}, f, { grupo: '' })), '');
  const resumo = [];
  fluxos.forEach((f) => {
    f.svg = marcaCgu(f.svg, f);
    f.json = marcaJson(f.json);
    f.bpmn = f.bpmn.replace(/Fluxo de trabalho/g, 'Fluxo de trabalho');
    fs.writeFileSync(path.join(DIR, f.arq + '.bpmn'), recolor(finalizar(f)));
    fs.writeFileSync(path.join(DIR, f.arq + '.json'), f.json);
    fs.writeFileSync(path.join(DIR, f.arq + '.svg'), f.svg);
    const e = f.chk.filter((r) => r.l === 'err').length, w = f.chk.filter((r) => r.l === 'warn').length;
    console.log(f.arq + ': ' + e + ' erro(s), ' + w + ' aviso(s)');
    f.chk.filter((r) => r.l !== 'ok').forEach((r) => console.log('   ' + r.l + ' · ' + r.msg));
    resumo.push({ arq: f.arq, titulo: f.titulo, etapa: f.etapa, resumo: f.resumo, w: f.w, h: f.h, erros: e, avisos: w });
  });
  fs.writeFileSync(path.join(DIR, 'indice.json'), JSON.stringify(resumo, null, 1));
  console.log('Fluxos gerados.');
})().catch((e) => { console.error(e); process.exit(1); });
