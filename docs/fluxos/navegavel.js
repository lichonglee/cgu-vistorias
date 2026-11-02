'use strict';
/**
 * Gera docs/fluxos/index.html: apresentação navegável (um slide por vez), no modelo de navegação do
 * Apresentacao-Alunos.html do app-fluxos: botões de grupo no topo, anterior/próximo, pontos de progresso,
 * teclado (setas, PageUp/PageDown, espaço, Home/End, 1 a 6, F), zoom e arraste nos fluxogramas.
 * Acrescenta um índice recolhível (☰). node docs/fluxos/navegavel.js
 */
const fs = require('fs');
const path = require('path');
const { ATORES, CASOS } = require('./casos');
const TEC = require('./tecnicos');
const COMP = require('./complementos');
const DIR = __dirname;
const INDICE = JSON.parse(fs.readFileSync(path.join(DIR, 'indice.json'), 'utf8'));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const selo = 'data:image/png;base64,' + fs.readFileSync(path.join(DIR, '..', '..', 'assets', 'selo-cgu.png')).toString('base64');
const RESP = 'Responsável: Eng. DSc Li Chong Lee Bacelar de Castro';
const flId = (x) => x.slice(0, 5);
const flDe = (c) => INDICE.filter((f) => c.fl.split(' e ').includes(flId(f.titulo)));
const nCampo = (c) => +c.id.slice(2) <= 15, nFlCampo = (f) => +flId(f.titulo).slice(3) <= 14;

const GRUPOS = ['Início', 'Diagramas', 'Casos de uso · campo', 'Casos de uso · central', 'Fluxos · campo', 'Fluxos · central', 'Estrutura, dados e segurança', 'Documentação complementar'];
const slides = []; // {g, t, html, cls}
const add = (g, t, html, cls) => slides.push({ g, t, html, cls: cls || '' });

const nPdf = (() => { try { return (fs.readFileSync(path.join(DIR, 'Caso-de-uso-e-fluxogramas.html'), 'utf8').match(/class="pg"/g) || []).length; } catch (e) { return 0; } })();

add(0, 'Caso de uso e fluxogramas', `<div class="capa-in"><img class="logo" src="${selo}" alt="CGU"><div class="resp">${RESP}</div><div class="rot">CGU Vistorias v1.0.5 e plataforma central</div>
<h1>Caso de uso<br>e fluxogramas</h1><p class="sub">${CASOS.length} casos de uso e ${INDICE.length} fluxogramas BPMN 2.0, levantados do manual do usuário e do relato da plataforma central, desenhados no app-fluxos com a identidade visual da CGU.</p>
<p class="peq">Use as setas do teclado, os botões do topo ou o índice (☰). Tecla F: tela cheia. Teclas 1 a 8: grupos.</p>
<p class="dl"><button data-ir="T:estrutura">Estrutura</button><button data-ir="T:relacionamentos">Relacionamentos</button><button data-ir="T:seguranca">Segurança</button></p><p class="dl">${nPdf ? `<a href="Caso-de-uso-e-fluxogramas.pdf">Baixar PDF (${nPdf} páginas)</a>` : ''}<a href="../../manual.html">Manual do usuário</a><a href="../diagramas.html">Diagramas UML e BPMN</a></p></div>`, 'capa');

add(0, 'Atores', `<h2>Atores</h2><table><thead><tr><th style="width:24%">Ator</th><th>Papel no sistema</th></tr></thead><tbody>${ATORES.map((a) => `<tr><td><b>${esc(a[0])}</b></td><td>${esc(a[1])}</td></tr>`).join('')}</tbody></table>
<p class="rod">Os atores Gestor, Operacional, Chefia e Administrador vêm do relato do agente Compasso (v1.27.12) e devem ser confirmados nos manuais da Central e do Painel.</p>`);

[['casos-de-uso', 'Casos de uso do aplicativo de campo (UC01 a UC15)'], ['casos-de-uso-central', 'Casos de uso da plataforma central, Central e Painel (UC16 a UC27)']].forEach(([arq, t]) =>
  add(1, t, `<h2>${esc(t)}</h2><div class="vwb">${botoesZoom()}</div><div class="vw" data-w="1320" data-h="${680}"><img src="${arq}.svg" alt="${esc(t)}" draggable="false"></div>`, 'fluxo'));

const DIM = { estrutura: [1320, 800], relacionamentos: [1480, 800], seguranca: [1320, 700] };
Object.keys(TEC.SAIDA).forEach((k) => add(6, TEC.TITULOS[k], `<h2>${esc(TEC.TITULOS[k])}</h2><div class="vwb">${botoesZoom()}</div><div class="vw" data-w="${DIM[k][0]}" data-h="${DIM[k][1]}"><img src="${k}.svg" alt="${esc(TEC.TITULOS[k])}" draggable="false"></div>`, 'fluxo'));

COMP.ITENS.forEach((it) => {
  if (it.tipo === 'svg') { const m = it.svg().match(/viewBox="0 0 (\d+) (\d+)"/); add(7, it.titulo, `<h2>${esc(it.titulo)}</h2><div class="vwb">${botoesZoom()}</div><div class="vw" data-w="${m[1]}" data-h="${m[2]}"><img src="${it.id}.svg" alt="${esc(it.titulo)}" draggable="false"></div>`, 'fluxo'); }
  else add(7, it.titulo, `<h2>${esc(it.titulo)}</h2>${it.html}${it.nota ? `<p class="rod">${esc(it.nota)}</p>` : ''}`);
});

function botoesZoom() {
  return '<button data-z="fit">Ajustar</button><button data-z="det">Detalhe</button><button data-z="-">−</button><button data-z="+">+</button><button data-z="l">◀</button><button data-z="r">▶</button><span class="dica">Arraste para mover · Ctrl + roda para ampliar</span>';
}

CASOS.forEach((c) => {
  const fls = flDe(c).map((f) => `<button data-ir="${flId(f.titulo)}">${esc(f.titulo)}</button>`).join('');
  add(nCampo(c) ? 2 : 3, `${c.id} · ${c.nome}`, `<h2><span class="id">${c.id}</span>${esc(c.nome)}</h2>
<p class="tags"><span>${esc(c.grupo)}</span><span>${esc(c.etapa)}</span></p>
<div class="duas"><div><h4>Atores</h4><p>${esc(c.ator)}</p><h4>Pré-condição</h4><p>${esc(c.pre)}</p><h4>Fluxo principal</h4><ol>${c.principal.map((p) => `<li>${esc(p)}</li>`).join('')}</ol></div>
<div><h4>Alternativas</h4><p>${esc(c.alt)}</p><h4>Pós-condição</h4><p>${esc(c.pos)}</p><div class="card"><h4>Atenção ao uso</h4><p>${esc(c.obs)}</p></div><h4>Fluxograma</h4><p class="irs">${fls || '<i>Ver FL-00 (visão geral)</i>'}</p></div></div>`);
});

INDICE.forEach((f) => {
  const ucs = CASOS.filter((c) => c.fl.split(' e ').includes(flId(f.titulo))).map((c) => `<button data-ir="${c.id}">${c.id} · ${esc(c.nome)}</button>`).join('');
  add(nFlCampo(f) ? 4 : 5, f.titulo, `<h2>${esc(f.titulo)}</h2><p class="lead">${esc(f.resumo)}</p>
<div class="vwb">${botoesZoom()}</div><div class="vw" data-w="${Math.round(f.w)}" data-h="${Math.round(f.h)}"><img src="${f.arq}.svg" alt="${esc(f.titulo)}" loading="lazy" draggable="false"></div>
<p class="dl">${ucs}<a href="${f.arq}.svg" download>SVG</a><a href="${f.arq}.bpmn" download>BPMN 2.0</a><a href="${f.arq}.json" download>JSON (app-fluxos)</a></p>`, 'fluxo');
});

/* chaves para ir de um slide a outro: UCnn e FL-nn */
const TK = { 'Diagrama de estrutura': 'T:estrutura', 'Diagrama de relacionamentos (banco central)': 'T:relacionamentos', 'Diagrama de segurança': 'T:seguranca' };
const chave = slides.map((s) => { const m = s.t.match(/^(UC\d+|FL-\d+)/); return m ? m[1] : (TK[s.t] || ''); });
const meta = slides.map((s) => ({ g: s.g, t: s.t }));

const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Caso de uso e fluxogramas · CGU Vistorias</title><style>
:root{--nv:#002543;--az:#49ABE1;--vd:#049B6F;--tx:#15344C;--mu:#52697A;--bd:#C9DCE8;--sf:#F1F7FB}
*{box-sizing:border-box}
html,body{height:100%;margin:0;background:#fff;color:var(--tx);font-family:Calibri,Carlito,'Segoe UI',Arial,sans-serif;overflow:hidden}
body{display:flex;flex-direction:column;font-size:clamp(13px,1.12vw,21px)}
header{display:flex;align-items:center;gap:1vw;padding:.5vw 1.2vw;background:var(--nv);border-bottom:.3vw solid var(--az);flex:none;color:#fff}
header .lg{display:flex;flex-direction:column;align-items:flex-start;line-height:1.1}header .logo{height:2.3vw;min-height:26px}header .lg small{font-size:.62em;color:#BDE6FA;white-space:nowrap}header .tit{font-weight:700;margin-right:auto;white-space:nowrap;font-size:1.02em}
#idx{font:700 1em inherit;border:1px solid #ffffff88;background:none;color:#fff;border-radius:.5vw;padding:.3vw .8vw;cursor:pointer}
nav{display:flex;gap:.45vw;flex-wrap:wrap}
nav button{font:700 .84em Calibri,Carlito,'Segoe UI',Arial,sans-serif;border:1px solid var(--az);background:transparent;color:#fff;border-radius:.5vw;padding:.3vw .9vw;cursor:pointer}
nav button:hover{background:#ffffff22}nav button.on{background:var(--az);color:var(--nv)}
.corpo{flex:1;min-height:0;display:flex;position:relative}
aside{width:0;overflow:hidden;flex:none;border-right:1px solid var(--bd);background:var(--sf);transition:width .2s}
aside.open{width:min(24vw,340px)}
aside .in{width:min(24vw,340px);height:100%;overflow:auto;padding:.7vw .8vw 2vw}
aside input{width:100%;border:1px solid var(--bd);border-radius:.4vw;padding:.4vw .6vw;font:inherit;margin-bottom:.5vw}
aside h5{margin:.9vw 0 .2vw;color:var(--mu);font-size:.72em;letter-spacing:.08em;text-transform:uppercase}
aside a{display:block;padding:.28vw .6vw;border-radius:.4vw;color:var(--tx);text-decoration:none;font-size:.88em;cursor:pointer}aside a:hover{background:#fff}aside a.on{background:var(--nv);color:#fff}
main{flex:1;min-width:0;position:relative}
.slide{position:absolute;inset:0;padding:1.3vw 3vw 1vw;overflow:auto}.slide[hidden]{display:none}
h2{margin:0 0 .8vw;color:var(--nv);font-size:1.7em;line-height:1.15;font-weight:800}
h4{margin:.8vw 0 .2vw;color:var(--vd);font-size:.85em;text-transform:uppercase;letter-spacing:.06em}
p{margin:0 0 .6vw;line-height:1.5}li{margin-bottom:.35vw;line-height:1.42}ol{margin:0;padding-left:1.3em}
.lead{color:var(--tx);font-size:1.02em}
.id{background:var(--nv);color:#fff;border-radius:.4vw;padding:.05vw .6vw;margin-right:.6vw;font-size:.8em}
.tags span{display:inline-block;background:var(--sf);border:1px solid var(--az);color:var(--nv);border-radius:999px;padding:0 .8vw;margin-right:.5vw;font-size:.85em}
.duas{display:grid;grid-template-columns:1fr 1fr;gap:2.4vw}
.card{border:1px solid var(--bd);border-left:.3vw solid var(--vd);border-radius:.5vw;padding:.5vw 1vw;background:#F1FAF6;margin:.6vw 0}.card h4{margin-top:0}
table{border-collapse:collapse;width:100%}th,td{border:1px solid var(--bd);padding:.45vw .7vw;vertical-align:top;text-align:left}thead th{background:var(--nv);color:#fff;font-size:.85em}tbody tr:nth-child(even) td{background:var(--sf)}
.rod{color:var(--mu);font-size:.82em;margin-top:.6vw}
.capa{display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#002543 0%,#003B66 62%,#04785A 100%);color:#fff}
.capa-in{max-width:66vw}.capa .logo{height:6vw;min-height:60px;margin-bottom:.3vw}.capa .resp{color:#BDE6FA;margin-bottom:1.6vw;font-size:.95em}.capa .rot{color:#8FD3F2;font-weight:700;letter-spacing:.08em;text-transform:uppercase;font-size:.9em}
.capa h1{font-size:3.6em;margin:.2vw 0 .6vw;line-height:1.05}.capa .sub{font-size:1.3em;color:#BDE6FA}.capa .peq{color:#BDE6FA;font-size:.95em}
.dl a,.dl button,.irs button{display:inline-block;font:700 .85em Calibri,Carlito,'Segoe UI',Arial,sans-serif;background:var(--nv);color:#fff;border:0;border-radius:.5vw;padding:.35vw .9vw;margin:.3vw .5vw 0 0;text-decoration:none;cursor:pointer}
.capa .dl a{background:var(--az);color:var(--nv)}.dl a:hover,.dl button:hover,.irs button:hover{filter:brightness(1.2)}
.fluxo{display:flex;flex-direction:column;overflow:auto}.fluxo .vw{flex:1;min-height:12vw}
.vwb{display:flex;gap:.4vw;align-items:center;margin-bottom:.5vw;flex-wrap:wrap}
.vwb button{font:700 .82em Calibri,Carlito,'Segoe UI',Arial,sans-serif;border:1px solid var(--nv);background:#fff;color:var(--nv);border-radius:.4vw;padding:.25vw .8vw;cursor:pointer}.vwb button:hover{background:var(--sf)}
.dica{color:var(--mu);font-size:.78em;margin-left:.6vw}
.vw{overflow:auto;border:1px solid var(--bd);border-radius:.5vw;background:#fff;cursor:grab}.vw:active{cursor:grabbing}.vw img{display:block;max-width:none;border:0}
footer{flex:none;display:flex;align-items:center;gap:1vw;padding:.45vw 1.2vw;border-top:1px solid var(--bd);background:#fff}
footer .ft{flex:1;color:var(--mu);font-size:.85em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
footer button{font:700 .9em Calibri,Carlito,'Segoe UI',Arial,sans-serif;border:1px solid var(--nv);background:var(--nv);color:#fff;border-radius:.5vw;padding:.3vw 1.1vw;cursor:pointer}footer button:disabled{opacity:.35;cursor:default}
.dots{display:flex;gap:.28vw;flex-wrap:wrap;max-width:34vw}.dots i{width:.55vw;height:.55vw;min-width:7px;min-height:7px;border-radius:50%;background:#C9DCE8;display:block;cursor:pointer}.dots i.on{background:var(--nv)}
.cnt{color:var(--mu);font-size:.85em;min-width:5vw;text-align:right}
@media(max-width:800px){header .lg small{display:none}.duas{grid-template-columns:1fr}header .tit{display:none}aside.open{position:absolute;z-index:3;height:100%;width:80vw}aside .in{width:80vw}.dots{display:none}}
</style></head><body>
<header><button id="idx" aria-label="Índice" title="Índice (recolher/expandir)">☰ Índice</button><div class="lg"><img class="logo" src="${selo}" alt="CGU"><small>${RESP}</small></div><span class="tit">Caso de uso e fluxogramas · CGU Vistorias</span><nav id="nav"></nav></header>
<div class="corpo"><aside id="ind"><div class="in"><input id="q" type="search" placeholder="Buscar caso ou fluxo…" aria-label="Buscar"><div id="lista"></div></div></aside>
<main>${slides.map((s) => `<section class="slide ${s.cls}" hidden>${s.html}</section>`).join('')}</main></div>
<footer><button id="ant">‹ Anterior</button><button id="prox">Próximo ›</button><span class="ft" id="ft"></span><span class="dots" id="dots"></span><span class="cnt" id="cnt"></span></footer>
<script>window.__META=${JSON.stringify(meta)};window.__CH=${JSON.stringify(chave)};window.__G=${JSON.stringify(GRUPOS)};</script>
<script>
(function(){
  var S=[].slice.call(document.querySelectorAll('.slide')),meta=window.__META,ch=window.__CH,G=window.__G,atual=0,zoom={};
  var nav=document.getElementById('nav'),ft=document.getElementById('ft'),cnt=document.getElementById('cnt'),dots=document.getElementById('dots'),ant=document.getElementById('ant'),prox=document.getElementById('prox'),ind=document.getElementById('ind'),lista=document.getElementById('lista'),q=document.getElementById('q');
  G.forEach(function(n,g){var b=document.createElement('button');b.textContent=n;b.setAttribute('data-g',g);b.onclick=function(){irGrupo(g)};nav.appendChild(b)});
  /* índice recolhível */
  var h='';G.forEach(function(n,g){h+='<h5 data-g="'+g+'">'+n+'</h5>';meta.forEach(function(m,i){if(m.g===g)h+='<a data-i="'+i+'">'+m.t.replace(/&/g,'&amp;').replace(/</g,'&lt;')+'</a>'})});lista.innerHTML=h;
  var aberto=false;try{aberto=localStorage.getItem('cgu-fl-ind')==='1'}catch(e){}
  if(innerWidth<800)aberto=false;
  function indice(v){aberto=v;ind.classList.toggle('open',v);try{localStorage.setItem('cgu-fl-ind',v?'1':'0')}catch(e){}setTimeout(ajustaAtual,230)}
  document.getElementById('idx').onclick=function(){indice(!aberto)};indice(aberto);
  lista.onclick=function(ev){var a=ev.target.closest('a');if(a){ir(+a.getAttribute('data-i'));if(innerWidth<800)indice(false)}};
  q.addEventListener('input',function(){var v=q.value.trim().toLowerCase();[].forEach.call(lista.querySelectorAll('a'),function(a){a.hidden=!!v&&a.textContent.toLowerCase().indexOf(v)<0});[].forEach.call(lista.querySelectorAll('h5'),function(x){var n=x.nextElementSibling,t=false;while(n&&n.tagName==='A'){if(!n.hidden)t=true;n=n.nextElementSibling}x.hidden=!t})});
  function primeiro(g){for(var i=0;i<meta.length;i++)if(meta[i].g===g)return i;return -1}
  function irGrupo(g){var p=primeiro(g);if(p>=0)ir(p)}
  function ir(i){
    if(i<0||i>=S.length)return;S[atual].hidden=true;atual=i;S[atual].hidden=false;S[atual].scrollTop=0;
    var m=meta[i];ft.textContent=m.t;cnt.textContent=(i+1)+' / '+S.length;
    [].forEach.call(nav.children,function(b){b.classList.toggle('on',+b.getAttribute('data-g')===m.g)});
    [].forEach.call(lista.querySelectorAll('a'),function(a){a.classList.toggle('on',+a.getAttribute('data-i')===i)});
    var on=lista.querySelector('a.on');if(on&&on.scrollIntoView&&aberto)on.scrollIntoView({block:'nearest'});
    dots.innerHTML='';meta.forEach(function(x,j){if(x.g===m.g){var d=document.createElement('i');if(j===i)d.className='on';d.title=x.t;d.onclick=function(){ir(j)};dots.appendChild(d)}});
    ant.disabled=i===0;prox.disabled=i===S.length-1;
    try{history.replaceState(null,'','#'+(ch[i]||('s'+(i+1))))}catch(e){}
    setTimeout(ajustaAtual,30);
  }
  function irChave(k){var i=ch.indexOf(k);if(i>=0)ir(i)}
  function ajustaAtual(){var vw=S[atual].querySelector('.vw');if(vw)ajusta(vw,zoom[atual]?'keep':'fit')}
  function ajusta(vw,modo){
    var img=vw.querySelector('img'),w=+vw.getAttribute('data-w'),h=+vw.getAttribute('data-h'),z=zoom[atual]||0;
    if(modo==='fit'){z=Math.min((vw.clientWidth-2)/w,(vw.clientHeight-2)/h)}else if(modo==='det'){z=0.95}else if(modo==='+'){z=z*1.25}else if(modo==='-'){z=z/1.25}else if(modo==='keep'){}
    if(modo==='fit')zoom[atual]=0;else zoom[atual]=z=Math.max(0.05,Math.min(3,z||0.5));
    if(modo==='fit'||!z){z=Math.min((vw.clientWidth-2)/w,(vw.clientHeight-2)/h)}
    img.style.width=Math.round(w*z)+'px';img.style.height=Math.round(h*z)+'px';
    if(modo==='det')vw.scrollLeft=0;
  }
  document.addEventListener('click',function(ev){
    var t=ev.target.closest('button');if(!t)return;
    var z=t.getAttribute('data-z');if(z){var vw=S[atual].querySelector('.vw');if(!vw)return;
      if(z==='l')vw.scrollBy({left:-vw.clientWidth*0.8,behavior:'smooth'});else if(z==='r')vw.scrollBy({left:vw.clientWidth*0.8,behavior:'smooth'});else ajusta(vw,z);return}
    var k=t.getAttribute('data-ir');if(k)irChave(k);
  });
  ant.onclick=function(){ir(atual-1)};prox.onclick=function(){ir(atual+1)};
  document.addEventListener('keydown',function(ev){
    if(ev.target&&/INPUT|TEXTAREA/.test(ev.target.tagName))return;
    var k=ev.key;if(ev.ctrlKey||ev.metaKey||ev.altKey)return;
    if(k==='ArrowRight'||k==='PageDown'||k===' '){ev.preventDefault();ir(atual+1)}else if(k==='ArrowLeft'||k==='PageUp'){ev.preventDefault();ir(atual-1)}
    else if(k==='Home'){ir(0)}else if(k==='End'){ir(S.length-1)}
    else if(/^[1-8]$/.test(k)){irGrupo(+k-1)}else if(k==='i'||k==='I'||k==='m'||k==='M'){indice(!aberto)}
    else if(k==='f'||k==='F'){if(!document.fullscreenElement)document.documentElement.requestFullscreen&&document.documentElement.requestFullscreen();else document.exitFullscreen&&document.exitFullscreen()}
  });
  document.addEventListener('mousedown',function(ev){var vw=ev.target.closest&&ev.target.closest('.vw');if(!vw||ev.button!==0)return;var x=ev.clientX,y=ev.clientY,sl=vw.scrollLeft,st=vw.scrollTop;
    function mv(e){vw.scrollLeft=sl-(e.clientX-x);vw.scrollTop=st-(e.clientY-y)}function up(){document.removeEventListener('mousemove',mv);document.removeEventListener('mouseup',up)}
    document.addEventListener('mousemove',mv);document.addEventListener('mouseup',up)});
  document.addEventListener('wheel',function(ev){var vw=ev.target.closest&&ev.target.closest('.vw');if(vw&&ev.ctrlKey){ev.preventDefault();ajusta(vw,ev.deltaY<0?'+':'-')}},{passive:false});
  var tx=null;document.addEventListener('touchstart',function(e){tx=(e.target.closest&&e.target.closest('.vw'))?null:e.touches[0].clientX},{passive:true});
  document.addEventListener('touchend',function(e){if(tx===null)return;var d=e.changedTouches[0].clientX-tx;if(Math.abs(d)>70)ir(atual+(d<0?1:-1));tx=null},{passive:true});
  window.addEventListener('resize',ajustaAtual);
  window.addEventListener('hashchange',function(){irChave(location.hash.slice(1))});
  var h0=location.hash.slice(1),i0=ch.indexOf(h0);if(i0<0&&/^s\\d+$/.test(h0))i0=+h0.slice(1)-1;
  ir(i0>=0?i0:0);
})();
</script></body></html>`;
fs.writeFileSync(path.join(DIR, 'index.html'), html);
console.log('index.html gerado: ' + slides.length + ' slides');
