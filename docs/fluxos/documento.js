'use strict';
/**
 * Monta o documento "Caso de uso e fluxogramas" (HTML + PDF A4 paisagem), o diagrama de casos de uso (SVG + PlantUML)
 * e a rastreabilidade casos de uso x fluxogramas. Roda depois de gerar.js (lê os .svg e indice.json desta pasta).
 *   node docs/fluxos/documento.js
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');
const { pathToFileURL } = require('url');
const { ATORES, CASOS } = require('./casos');
const TEC = require('./tecnicos');
const COMP = require('./complementos');

const DIR = __dirname;
const VERSAO = 'v1.0.5';
const RESP = 'Responsável: Eng. DSc Li Chong Lee Bacelar de Castro';
const DATA = '1 de novembro de 2026';
const NOME = 'Caso-de-uso-e-fluxogramas';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const b64 = (f) => fs.readFileSync(path.join(DIR, '..', '..', 'assets', f)).toString('base64');
const MARCA = 'data:image/png;base64,' + b64('marca-cgu.png');
const SELO = 'data:image/png;base64,' + b64('selo-cgu.png');
const INDICE = JSON.parse(fs.readFileSync(path.join(DIR, 'indice.json'), 'utf8'));

/* ---------- diagrama de casos de uso (SVG desenhado aqui; o app-fluxos não tem UML de casos de uso) ---------- */
const NAVY = '#002543', AZUL = '#49ABE1', VERDE = '#049B6F';
const ROTULO = {
  UC01: ['Instalar e preparar', 'o aplicativo'], UC02: ['Configurar', 'o perfil'], UC03: ['Cadastrar e localizar', 'edifício'], UC04: ['Criar', 'vistoria'], UC14: ['Consultar o manual', 'e solucionar dúvidas'],
  UC05: ['Preencher os dados', 'da visita'], UC06: ['Registrar', 'fotos'], UC07: ['Descrever e recortar', 'a imagem'], UC08: ['Marcar pontos', 'de interesse'], UC09: ['Registrar', 'constatações'],
  UC10: ['Concluir', 'o registro'], UC11: ['Emitir documento', '(Word ou PDF)'], UC12: ['Acompanhar', 'pelo Painel'], UC13: ['Exportar e importar', 'backup'], UC15: ['Excluir', 'registros'],
  UC16: ['Entrar e controlar', 'acesso por papel'], UC17: ['Sincronizar, arquivar', 'e restaurar'], UC18: ['Gravar e enviar', 'vídeo'], UC19: ['Gerir', 'pessoas'], UC20: ['Gerir edifícios', 'e vínculos'],
  UC21: ['Fazer backup', 'e limpar dados'], UC22: ['Cadastrar', 'a unidade'], UC23: ['Armazenamento', 'e cotas'], UC24: ['Consultar o', 'painel gerencial'], UC25: ['Tratar chamado', '(baixa e aprovação)'],
  UC26: ['Gerir OKR', '(objetivos e KRs)'], UC27: ['Governar a', 'regra de risco'],
};
const CFG_CAMPO = {
  arq: 'casos-de-uso', titulo: 'DIAGRAMA DE CASOS DE USO · APLICATIVO DE CAMPO ' + VERSAO,
  sub: 'Levantado do manual do usuário. Cada grupo agrupa os casos de uso da mesma fase da jornada.',
  nota: 'O Vistoriador participa de todos os casos de uso de cada grupo. O Dispositivo atua em UC05 e UC06 (câmera e GPS) e no armazenamento local; a Equipe recebe os documentos (UC11) e os backups (UC13).',
  grupos: [
    ['Preparação', ['UC01', 'UC02', 'UC03', 'UC04', 'UC14']],
    ['Registro em campo', ['UC05', 'UC06', 'UC07', 'UC08', 'UC09']],
    ['Emissão e guarda', ['UC10', 'UC11', 'UC12', 'UC13', 'UC15']],
  ],
  esq: [['Vistoriador', [0, 1, 2]]],
  dir: [['Dispositivo\n(câmera, GPS,\narmazenamento)', 1], ['Equipe da unidade\n/ Responsável técnico', 2]],
  rels: [[1, 1, 2, '«include»'], [1, 3, 2, '«extend»']],
  puml: ['UC06 ..> UC07 : <<include>>', 'UC08 ..> UC07 : <<extend>>', 'D1 --> UC05', 'D1 --> UC06', 'D2 --> UC11', 'D2 --> UC13'],
};
const CFG_CENTRAL = {
  arq: 'casos-de-uso-central', titulo: 'DIAGRAMA DE CASOS DE USO · PLATAFORMA CENTRAL, CENTRAL E PAINEL',
  sub: 'Relato do agente Compasso (branch codex/release-candidate-1.1.0, v1.27.12). A confirmar nos manuais da Central e do Painel.',
  nota: 'O Vistoriador usa o login, a sincronização e o vídeo. O Administrador (da unidade ou da plataforma) opera a Central e a governança. Gestor, Operacional e Chefia atuam no painel; Operacional e Chefia não usam o aplicativo de campo.',
  grupos: [
    ['Plataforma e sincronização', ['UC16', 'UC17', 'UC18']],
    ['Central (administração)', ['UC19', 'UC20', 'UC21', 'UC22', 'UC23']],
    ['Painel e governança', ['UC24', 'UC25', 'UC26', 'UC27']],
  ],
  esq: [['Vistoriador', [0]], ['Administrador\n(unidade / plataforma)', [0, 1, 2]]],
  dir: [['Gestor, Operacional\ne Chefia', 2]],
  rels: [],
  puml: ['D1 --> UC24', 'D1 --> UC25'],
};

function ator(x, y, nome) {
  const linhas = nome.split('\n');
  return `<g stroke="${NAVY}" stroke-width="2" fill="none"><circle cx="${x}" cy="${y - 30}" r="11" fill="#fff"/><path d="M${x} ${y - 19}V${y + 12}M${x - 18} ${y - 8}H${x + 18}M${x} ${y + 12}L${x - 14} ${y + 36}M${x} ${y + 12}L${x + 14} ${y + 36}"/></g>`
    + linhas.map((l, i) => `<text x="${x}" y="${y + 56 + i * 15}" text-anchor="middle" font-size="12.5" font-weight="700" fill="${NAVY}">${esc(l)}</text>`).join('');
}

function diagramaUC(cfg) {
  const ng = cfg.grupos.length, W = 1320, px = 170, pw = 990, ph = 168, py0 = 78, gap = 14, H = py0 + ng * (ph + gap) + 56;
  const cx = (i) => px + 100 + i * 192, ow = 156, oh = 64;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="Calibri, Carlito, 'Segoe UI', Arial, sans-serif">
<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M0 0L10 5L0 10z" fill="${NAVY}"/></marker></defs>
<rect width="${W}" height="${H}" fill="#fff"/>
<text x="24" y="36" font-size="23" font-weight="700" fill="${NAVY}">${esc(cfg.titulo)}</text>
<text x="24" y="56" font-size="12.5" fill="#52697A">${esc(cfg.sub)}</text>
<rect x="${px - 20}" y="66" width="${pw + 40}" height="${ng * ph + (ng - 1) * gap + 24}" rx="14" fill="#F7FBFD" stroke="${NAVY}" stroke-width="2"/>`;
  const centro = [];
  cfg.grupos.forEach(([nome, ids], g) => {
    const y = py0 + g * (ph + gap), cy = y + ph / 2 + 12;
    centro.push(cy);
    s += `<rect x="${px}" y="${y}" width="${pw}" height="${ph}" rx="10" fill="#EAF4FA" stroke="${AZUL}" stroke-width="1.5" stroke-dasharray="7 4"/>
<text x="${px + 14}" y="${y + 22}" font-size="13" font-weight="700" fill="${NAVY}">${esc(nome.toUpperCase())}</text>`;
    ids.forEach((id, i) => {
      const x = cx(i), r = ROTULO[id];
      s += `<ellipse cx="${x}" cy="${cy}" rx="${ow / 2}" ry="${oh / 2}" fill="#fff" stroke="${NAVY}" stroke-width="1.8"/>
<text x="${x}" y="${cy - 14}" text-anchor="middle" font-size="11" font-weight="700" fill="${VERDE}">${id}</text>
<text x="${x}" y="${cy + 2}" text-anchor="middle" font-size="13" fill="${NAVY}">${esc(r[0])}</text>
<text x="${x}" y="${cy + 17}" text-anchor="middle" font-size="13" fill="${NAVY}">${esc(r[1])}</text>`;
    });
  });
  cfg.rels.forEach(([g, de, para, rot]) => {
    const cy = centro[g], x1 = de < para ? cx(de) + ow / 2 : cx(de) - ow / 2, x2 = de < para ? cx(para) - ow / 2 : cx(para) + ow / 2;
    s += `<path d="M${x1} ${cy + 20}H${x2}" stroke="${NAVY}" stroke-width="1.3" stroke-dasharray="5 3" marker-end="url(#ah)" fill="none"/>
<text x="${(x1 + x2) / 2}" y="${cy + 14}" text-anchor="middle" font-size="10.5" font-style="italic" fill="${NAVY}">${rot}</text>`;
  });
  cfg.esq.forEach(([nome, lig]) => {
    const ax = 70, ay = lig.reduce((t, g) => t + centro[g], 0) / lig.length + (lig.length > 1 ? 0 : -4);
    s += ator(ax, ay, nome);
    lig.forEach((g) => { s += `<path d="M${ax + 20} ${ay}L${px} ${centro[g]}" stroke="${NAVY}" stroke-width="1.5" fill="none"/>`; });
  });
  cfg.dir.forEach(([nome, g]) => {
    const rx = 1250;
    s += ator(rx, centro[g] - 4, nome) + `<path d="M${rx - 20} ${centro[g] - 4}L${px + pw} ${centro[g]}" stroke="${NAVY}" stroke-width="1.5" fill="none"/>`;
  });
  s += `<text x="24" y="${H - 22}" font-size="11.5" fill="#52697A">${esc(cfg.nota)}</text>
<line x1="16" y1="${H - 12}" x2="${W - 16}" y2="${H - 12}" stroke="${NAVY}" stroke-width="1.5"/>
<image href="${MARCA}" x="${W - 120}" y="${H - 54}" width="96" height="40" preserveAspectRatio="xMaxYMid meet"/>
<text x="${W - 24}" y="${H - 2}" font-size="9" text-anchor="end" fill="${NAVY}">${RESP}</text>
</svg>`;
  return s;
}

function plantUML(cfg) {
  const l = ['@startuml', 'title ' + cfg.titulo, 'left to right direction', 'skinparam packageStyle rectangle', 'footer ' + RESP];
  cfg.esq.forEach((a, i) => l.push('actor "' + a[0].replace('\n', '\\n') + '" as L' + (i + 1)));
  cfg.dir.forEach((a, i) => l.push('actor "' + a[0].replace(/\n/g, '\\n') + '" as D' + (i + 1)));
  l.push('rectangle "CGU Vistorias" {');
  cfg.grupos.forEach(([n, ids]) => {
    l.push('  package "' + n + '" {');
    ids.forEach((id) => l.push('    usecase "' + ROTULO[id].join(' ') + '" as ' + id));
    l.push('  }');
  });
  l.push('}');
  cfg.esq.forEach((a, i) => a[1].forEach((g) => cfg.grupos[g][1].forEach((id) => l.push('L' + (i + 1) + ' --> ' + id))));
  cfg.puml.forEach((x) => l.push(x));
  l.push('@enduml');
  return l.join('\n');
}

/* ---------- documento ---------- */
const CSS = `
@page{size:A4 landscape;margin:0}
*{box-sizing:border-box}
:root{--navy:#002543;--azul:#49ABE1;--verde:#049B6F;--claro:#EAF4FA;--linha:#C9DCE8}
html,body{margin:0;font-family:Calibri,Carlito,'Segoe UI',Arial,sans-serif;color:#15344C;font-size:11.5px;line-height:1.45;background:#e9eef2}
.pg{width:297mm;height:210mm;position:relative;overflow:hidden;page-break-after:always;background:#fff;padding:24mm 16mm 14mm 16mm;margin:0 auto 6mm}
.pg:last-child{page-break-after:auto}
.faixa{position:absolute;left:0;top:0;right:0;height:17mm;background:var(--navy);border-bottom:1.6mm solid var(--azul);display:flex;align-items:center;gap:6mm;padding:0 16mm;color:#fff}
.faixa .lg{display:flex;flex-direction:column;align-items:flex-start;gap:.4mm;padding-top:.6mm}.faixa .lg img{height:11mm}.faixa .lg small{font-size:7.5px;color:#BDE6FA;white-space:nowrap}.faixa b{font-size:13px;letter-spacing:.2px}.faixa span{margin-left:auto;font-size:11px;color:#BDE6FA}
.rodape{position:absolute;left:16mm;right:16mm;bottom:6mm;display:flex;justify-content:space-between;color:#52697A;font-size:9.5px;border-top:.3mm solid var(--linha);padding-top:1.6mm}
h1{font-size:25px;color:var(--navy);margin:0 0 3mm}h2{font-size:18px;color:var(--navy);margin:0 0 2.5mm}h3{font-size:13px;color:var(--navy);margin:3mm 0 1mm}
p{margin:0 0 2.5mm}code{font-family:Consolas,monospace;font-size:10.5px;background:#EEF4F8;padding:0 3px;border-radius:3px}
table{border-collapse:collapse;width:100%}th{background:var(--navy);color:#fff;text-align:left;padding:2mm 2.5mm;font-size:10.5px}
td{border:.3mm solid var(--linha);padding:1.6mm 2.5mm;vertical-align:top;font-size:10.5px}tr:nth-child(even) td{background:#F5FAFD}
td.k{font-weight:700;color:var(--navy);white-space:nowrap}
.capa{position:absolute;inset:0;background:linear-gradient(135deg,#002543 0%,#003B66 62%,#04785A 100%);color:#fff;padding:34mm 26mm}
.capa img.m{height:30mm;margin-bottom:2mm}.capa .resp{font-size:13px;color:#BDE6FA;margin-bottom:12mm}.capa h1{color:#fff;font-size:42px;line-height:1.1;margin:0 0 6mm}.capa .sub{font-size:17px;color:#BDE6FA;max-width:190mm;margin-bottom:14mm}
.capa dl{display:grid;grid-template-columns:42mm 1fr;gap:2.4mm 6mm;font-size:13px;max-width:200mm}.capa dt{color:#8FD3F2;font-weight:700}.capa dd{margin:0}
.capa .bar{position:absolute;left:0;right:0;bottom:0;height:5mm;background:var(--azul)}.capa .selo{position:absolute;right:26mm;bottom:22mm;height:30mm;opacity:.95}
.fig{border:.3mm solid var(--linha);border-radius:3mm;padding:2mm;background:#fff;text-align:center}
.fig svg{max-width:100%;max-height:128mm;width:auto;height:auto}
.cap{font-size:10px;color:#52697A;margin-top:1.5mm}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:6mm}
.card{border:.3mm solid var(--linha);border-radius:3mm;padding:3mm 4mm;margin-bottom:4mm;background:#fff}
.card .id{display:inline-block;background:var(--navy);color:#fff;border-radius:2mm;padding:.2mm 2mm;font-weight:700;margin-right:2mm}
.card ol{margin:1mm 0 1mm 4.5mm;padding:0}.card li{margin-bottom:.4mm}
.card .m{font-size:10px;color:#52697A}.card .at{border-left:1mm solid var(--verde);background:#F1FAF6;padding:1mm 2.5mm;margin-top:1.4mm;font-size:10px}
.tag{display:inline-block;background:var(--claro);color:var(--navy);border:.3mm solid var(--azul);border-radius:2mm;padding:0 2mm;font-size:10px;margin-right:1.5mm}
@media screen{.pg{box-shadow:0 2px 10px #00254322}}
@media print{html,body{background:#fff}.pg{margin:0}}
`;

function montar() {
  let n = 0;
  const pagina = (secao, miolo) => {
    n++;
    return `<section class="pg"><div class="faixa"><div class="lg"><img src="${SELO}" alt="CGU"><small>${RESP}</small></div><b>CGU Vistorias ${VERSAO} · Caso de uso e fluxogramas</b><span>${esc(secao)}</span></div>${miolo}<div class="rodape"><span>Controladoria-Geral da União · documentação técnica da ferramenta · ${DATA}</span><span>${n}</span></div></section>`;
  };
  const pg = [];
  n++;
  pg.push(`<section class="pg"><div class="capa"><img class="m" src="${SELO}" alt="CGU"><div class="resp">${RESP}</div><h1>Caso de uso<br>e fluxogramas</h1>
<div class="sub">Casos de uso e fluxogramas BPMN do CGU Vistorias ${VERSAO}, levantados do manual do usuário e desenhados no app-fluxos com a identidade visual da CGU.</div>
<dl><dt>Sistema</dt><dd>CGU Vistorias ${VERSAO} · aplicação web instalável (PWA)</dd><dt>Fonte</dt><dd>Manual do usuário (manual.html, 14 etapas), README e relato do agente Compasso sobre a plataforma central, a Central e o Painel (v1.27.12)</dd><dt>Casos de uso</dt><dd>${CASOS.length} casos de uso, ${ATORES.length} atores</dd><dt>Fluxogramas</dt><dd>${INDICE.length} fluxos BPMN 2.0: visão geral, uma etapa do manual cada (FL-01 a FL-14) e a plataforma central, a Central e o Painel (FL-15 a FL-26)</dd><dt>Complementos</dt><dd>${COMP.ITENS.length} itens: matriz de papéis, estados, sequências, privacidade, implantação, telas, modelo local, dicionário, KPIs, testes, guias e glossário</dd><dt>Ferramenta</dt><dd>app-fluxos (github.com/lichonglee/app-fluxos)</dd><dt>Data</dt><dd>Brasília, DF, ${DATA}</dd></dl>
<div class="bar"></div></div></section>`);

  pg.push(pagina('Escopo e atores', `<h1>Escopo e atores</h1>
<p>O CGU Vistorias organiza vistorias técnicas, registra evidências fotográficas e emite documentos em Word e PDF com a identidade visual da Controladoria-Geral da União. Os dados ficam no navegador do aparelho (IndexedDB); não há servidor de dados, login institucional, sincronização em nuvem, criptografia nem assinatura digital.</p>
<table><tr><th style="width:62mm">Ator</th><th>Papel no sistema</th></tr>${ATORES.map((a) => `<tr><td class="k">${esc(a[0])}</td><td>${esc(a[1])}</td></tr>`).join('')}</table>
<h3>Como ler este documento</h3>
<p>O diagrama de casos de uso mostra o que o sistema faz para cada ator. O catálogo detalha cada caso (pré-condição, fluxo principal, alternativas, pós-condição e observações do manual). Cada caso aponta o fluxograma BPMN que descreve a sequência de passos. Os arquivos <code>.bpmn</code>, <code>.json</code> e <code>.svg</code> estão em <code>docs/fluxos</code>; os <code>.json</code> abrem no app-fluxos e os <code>.bpmn</code> em Bizagi, Camunda e bpmn.io.</p>
<h3>Convenção dos fluxogramas</h3>
<p>Raias de responsabilidade aparecem na faixa inferior de cada atividade (Usuário ou Aplicativo); a etiqueta verde indica a funcionalidade ou tecnologia envolvida; losangos são decisões; a seta vermelha tracejada indica retorno a uma etapa anterior.</p>`));

  [CFG_CAMPO, CFG_CENTRAL].forEach((cfg, k) => pg.push(pagina('Diagrama de casos de uso', `<div class="fig">${diagramaUC(cfg).replace(/^<svg /, '<svg style="max-height:158mm" ')}</div><div class="cap">Figura ${k + 1} · ${esc(cfg.titulo)}. Arquivos <code>${cfg.arq}.svg</code> e <code>${cfg.arq}.puml</code>.</div>`)));

  Object.entries(TEC.SAIDA).forEach(([k, f], j) => pg.push(pagina('Diagramas técnicos', `<div class="fig">${f().replace(/^<svg /, '<svg style="max-height:158mm" ')}</div><div class="cap">Figura ${3 + j} · ${esc(TEC.TITULOS[k])}. Arquivo <code>${k}.svg</code>.</div>`)));
  COMP.ITENS.forEach((it, j) => pg.push(pagina('Documentação complementar', it.tipo === 'svg'
    ? `<div class="fig">${it.svg().replace(/^<svg /, '<svg style="max-height:158mm" ')}</div><div class="cap">Figura ${6 + j} · ${esc(it.titulo)}. Arquivo <code>${it.id}.svg</code>.</div>`
    : `<h2>${esc(it.titulo)}</h2>${it.html}${it.nota ? `<p class="cap">${esc(it.nota)}</p>` : ''}`)));
  for (let i = 0; i < CASOS.length; i += 14) pg.push(pagina('Catálogo', `<h1>Catálogo de casos de uso${i ? ' (continuação)' : ''}</h1><table><tr><th style="width:15mm">ID</th><th>Caso de uso</th><th style="width:40mm">Grupo</th><th style="width:44mm">Atores</th><th style="width:24mm">Origem</th><th style="width:26mm">Fluxograma</th></tr>${CASOS.slice(i, i + 14).map((c) => `<tr><td class="k">${c.id}</td><td><b>${esc(c.nome)}</b></td><td>${esc(c.grupo)}</td><td>${esc(c.ator)}</td><td>${esc(c.etapa)}</td><td>${esc(c.fl)}</td></tr>`).join('')}</table>`));

  const card = (c) => `<div class="card"><div><span class="id">${c.id}</span><b style="font-size:13px;color:var(--navy)">${esc(c.nome)}</b> <span class="tag">${esc(c.grupo)}</span><span class="tag">${esc(c.etapa)}</span><span class="tag">${esc(c.fl)}</span></div>
<div class="m"><b>Atores:</b> ${esc(c.ator)} · <b>Pré-condição:</b> ${esc(c.pre)}</div>
<ol>${c.principal.map((p) => `<li>${esc(p)}</li>`).join('')}</ol>
<div class="m"><b>Alternativas:</b> ${esc(c.alt)}</div><div class="m"><b>Pós-condição:</b> ${esc(c.pos)}</div><div class="at"><b>Atenção ao uso:</b> ${esc(c.obs)}</div></div>`;
  for (let i = 0; i < CASOS.length; i += 4) {
    const lote = CASOS.slice(i, i + 4);
    pg.push(pagina('Especificação dos casos de uso', `<h2>Especificação dos casos de uso · ${lote[0].id} a ${lote[lote.length - 1].id}</h2><div class="cols"><div>${lote.slice(0, 2).map(card).join('')}</div><div>${lote.slice(2).map(card).join('')}</div></div>`));
  }

  INDICE.forEach((f, i) => {
    const svg = fs.readFileSync(path.join(DIR, f.arq + '.svg'), 'utf8').replace(/^<\?xml[^>]*>\s*/, '').replace(/^<svg /, '<svg style="max-height:136mm" ');
    const ucs = CASOS.filter((c) => c.fl.split(' e ').includes(f.titulo.slice(0, 5))).map((c) => c.id);
    pg.push(pagina('Fluxograma · ' + f.etapa, `<h2>${esc(f.titulo)}</h2><p style="margin-bottom:2mm">${esc(f.resumo)}${ucs.length ? ' <b>Casos de uso: ' + ucs.join(', ') + '.</b>' : ' <b>Visão de todos os casos de uso.</b>'}</p><div class="fig">${svg}</div><div class="cap">Figura ${i + 2} · ${esc(f.titulo)}. Arquivo <code>${esc(f.arq)}.bpmn</code> (editável no app-fluxos pelo <code>.json</code>).</div>`));
  });

  pg.push(pagina('Rastreabilidade', `<h1>Rastreabilidade: manual × caso de uso × fluxograma</h1><table><tr><th style="width:26mm">Etapa do manual</th><th>Título da etapa</th><th style="width:20mm">Caso de uso</th><th style="width:26mm">Fluxograma</th><th>Arquivos em docs/fluxos</th></tr>
${CASOS.filter((c) => c.id !== 'UC15').map((c) => { const f = INDICE.find((x) => x.titulo.startsWith(c.fl)); return `<tr><td class="k">${esc(c.etapa)}</td><td>${esc(c.nome)}</td><td>${c.id}</td><td>${esc(c.fl)}</td><td><code>${f ? esc(f.arq) : ''}.bpmn / .json / .svg</code></td></tr>`; }).join('')}
<tr><td class="k">Todas</td><td>Visão geral da vistoria</td><td>UC01 a UC${CASOS.length}</td><td>FL-00</td><td><code>FL-00-Visao-geral.bpmn / .json / .svg</code></td></tr></table>
<p style="margin-top:3mm">Para refazer os desenhos: <code>APP_FLUXOS=&lt;clone do app-fluxos&gt; node docs/fluxos/gerar.js</code> e depois <code>node docs/fluxos/documento.js</code> (requer Edge ou Chrome e Node 22 ou superior). Os fluxos estão em <code>fluxos.js</code> e os casos de uso em <code>casos.js</code>.</p>`));

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Caso de uso e fluxogramas · CGU Vistorias</title><style>${CSS}</style></head><body>${pg.join('')}</body></html>`;
}

/* ---------- PDF pelo Edge/Chrome (protocolo DevTools, como no gerar_at1 do app-fluxos) ---------- */
const CAND = [process.env.EDGE, process.env.CHROME, 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe', 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'].filter(Boolean);
const NAV = CAND.find((p) => fs.existsSync(p));
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const getJSON = (url) => new Promise((res, rej) => http.get(url, (r) => { let d = ''; r.on('data', (c) => d += c); r.on('end', () => { try { res(JSON.parse(d)); } catch (e) { rej(e); } }); }).on('error', rej));

async function pdf(arqHtml) {
  const porta = 9331, perfil = fs.mkdtempSync(path.join(os.tmpdir(), 'cgu-fl-'));
  const proc = spawn(NAV, ['--headless=new', '--remote-debugging-port=' + porta, '--user-data-dir=' + perfil, '--no-first-run', '--disable-gpu', 'about:blank'], { stdio: 'ignore' });
  let ws;
  try {
    let alvo = null;
    for (let i = 0; i < 60 && !alvo; i++) { await esperar(300); try { alvo = (await getJSON('http://127.0.0.1:' + porta + '/json/list')).find((t) => t.type === 'page'); } catch (e) { /* aguarda */ } }
    if (!alvo) throw new Error('O navegador não respondeu.');
    ws = new WebSocket(alvo.webSocketDebuggerUrl);
    await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
    let id = 0; const pend = {};
    ws.onmessage = (m) => { const o = JSON.parse(m.data); if (o.id && pend[o.id]) { pend[o.id](o); delete pend[o.id]; } };
    const send = (method, params) => new Promise((res, rej) => { const i = ++id; pend[i] = (o) => o.error ? rej(new Error(o.error.message)) : res(o.result); ws.send(JSON.stringify({ id: i, method, params: params || {} })); });
    await send('Page.enable');
    await send('Page.navigate', { url: pathToFileURL(arqHtml).href });
    await esperar(2500);
    const r = await send('Page.printToPDF', { landscape: true, printBackground: true, preferCSSPageSize: true, marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0 });
    return Buffer.from(r.data, 'base64');
  } finally { try { ws && ws.close(); } catch (e) { /* ok */ } proc.kill(); await esperar(300); try { fs.rmSync(perfil, { recursive: true, force: true }); } catch (e) { /* ok */ } }
}

(async () => {
  [CFG_CAMPO, CFG_CENTRAL].forEach((cfg) => {
    fs.writeFileSync(path.join(DIR, cfg.arq + '.svg'), diagramaUC(cfg));
    fs.writeFileSync(path.join(DIR, cfg.arq + '.puml'), plantUML(cfg));
  });
  Object.entries(TEC.SAIDA).forEach(([k, f]) => fs.writeFileSync(path.join(DIR, k + '.svg'), f()));
  COMP.ITENS.filter((i) => i.tipo === 'svg').forEach((i) => fs.writeFileSync(path.join(DIR, i.id + '.svg'), i.svg()));
  const html = path.join(DIR, NOME + '.html');
  fs.writeFileSync(html, montar());
  if (!NAV) throw new Error('Edge/Chrome não encontrado: PDF não gerado.');
  fs.writeFileSync(path.join(DIR, NOME + '.pdf'), await pdf(html));
  console.log('Documento gerado: ' + NOME + '.html e .pdf');
})().catch((e) => { console.error(e); process.exit(1); });
