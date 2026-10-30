/* CGU Vistorias — aplicativo de campo + painel administrativo. Sem servidor: tudo roda e fica salvo no aparelho. */
'use strict';
const $ = s => document.querySelector(s);
const esc = Backup.escapeHtml;
const pad = (n, l = 2) => String(n).padStart(l, '0');
const hoje = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const agora = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const slug = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'x';
const TIPOS = ['Vistoria técnica de rotina', 'Vistoria de patologias / manifestações', 'Acompanhamento de execução', 'Recebimento de serviço', 'Vistoria cautelar / pré-obra', 'Pós-ocorrência', 'Outra'];
const CLIMAS = ['Ensolarado', 'Nublado', 'Chuvoso', 'Chuva recente', 'Iluminação artificial'];
const TIPOS_CONST = {
  'Estrutura e vedações': ['Fissura / trinca em elemento estrutural', 'Corrosão de armadura / desplacamento de concreto', 'Deformação excessiva / flecha', 'Fissura em alvenaria / vedação', 'Descolamento de revestimento (argamassa, cerâmica)', 'Eflorescência / manchas em fachada'],
  'Impermeabilização e umidade': ['Infiltração em laje / cobertura', 'Infiltração em parede / subsolo', 'Umidade ascendente', 'Mofo / bolor', 'Impermeabilização danificada'],
  'Cobertura e drenagem': ['Telhas quebradas / deslocadas', 'Calhas, rufos e ralos obstruídos', 'Drenagem pluvial deficiente', 'Empoçamento de água'],
  'Esquadrias e acabamentos': ['Esquadria com vedação deficiente / defeito', 'Vidro quebrado / trincado', 'Porta ou ferragem com defeito', 'Pintura deteriorada', 'Forro danificado / com mancha', 'Piso danificado / desnivelado', 'Guarda-corpo / corrimão inadequado'],
  'Instalações elétricas': ['Quadro elétrico com defeito / sem identificação', 'Fiação exposta / improvisada', 'Luminária inoperante', 'Tomada / interruptor danificado', 'SPDA / aterramento com deficiência'],
  'Instalações hidrossanitárias': ['Vazamento em tubulação', 'Louça / metal sanitário com defeito', 'Reservatório com limpeza / conservação deficiente', 'Esgoto entupido / mau cheiro', 'Falta de pressão / abastecimento'],
  'Climatização, elevadores e outros': ['Ar-condicionado com defeito / sem manutenção', 'Exaustão / ventilação deficiente', 'Elevador com falha / sem manutenção', 'Gerador / no-break com defeito', 'Instalação de gás irregular'],
  'Segurança, acessibilidade e conservação': ['Combate a incêndio irregular (extintor, hidrante, alarme)', 'Rota de fuga / saída de emergência obstruída', 'Sinalização de segurança ausente', 'Acessibilidade inadequada (rampa, piso tátil, banheiro)', 'Infestação (pragas, cupins)', 'Vegetação / raízes danificando a edificação', 'Limpeza / conservação deficiente', 'Irregularidade documental (AVCB, laudos, PMOC)'],
  'Outros': ['Outra constatação']
};
const AMBIENTES = {
  'Acesso e circulação': ['Fachada', 'Entrada / portaria / recepção', 'Hall', 'Corredor', 'Escada', 'Rampa', 'Elevador / poço', 'Estacionamento / garagem', 'Calçada / área externa'],
  'Áreas de trabalho': ['Sala de trabalho / gabinete', 'Sala de reunião', 'Auditório', 'Biblioteca / arquivo', 'Atendimento ao público', 'Almoxarifado', 'Sala de TI / CPD / servidores'],
  'Áreas de apoio': ['Copa / cozinha', 'Refeitório', 'Banheiro / sanitário', 'Vestiário', 'Depósito / DML', 'Lixo / resíduos'],
  'Áreas técnicas': ['Casa de máquinas', 'Sala de quadros elétricos / subestação', 'Gerador', 'Reservatório / cisterna / casa de bombas', 'Central de ar-condicionado / ar-condicionado', 'Central de gás', 'Sala de bombas de incêndio'],
  'Cobertura e subsolo': ['Cobertura / telhado', 'Laje de cobertura / terraço', 'Subsolo', 'Casa de máquinas de elevador (barrilete)'],
  'Outros': ['Outro ambiente']
};
const optG = (G, sel) => '<option value="">— Selecione —</option>' + Object.entries(G).map(([g, l]) => '<optgroup label="' + esc(g) + '">' + l.map(t => '<option value="' + esc(t) + '"' + (t === sel ? ' selected' : '') + '>' + esc(t) + '</option>').join('') + '</optgroup>').join('');
const GRAVS = ['Informativa', 'Baixa', 'Média', 'Alta', 'Crítica'];
const gravCls = g => ({ Informativa: 'mut', Baixa: 'ok', 'Média': 'warn', Alta: 'warn', 'Crítica': 'bad' }[g] || 'mut');
const METOD = 'Inspeção visual realizada in loco, com registro fotográfico georreferenciado e datado, sem ensaios destrutivos.';
const DEFAULTS = {
  empresa: { nome: 'Controladoria-Geral da União', cnpj: '26.664.015/0001-48', endereco: 'SAUS, Quadra 5, Bloco A, Lotes 9 e 10, Edifício MultiBrasil, Asa Sul, Brasília/DF - CEP 70070-050', fone: '(61) 2020-6831', email: 'cglpe.cogea@cgu.gov.br' },
  rt: { nome: 'Li Chong Lee Bacelar de Castro', titulo: 'Coordenador de Engenharia e Arquitetura - COGEA', crea: '12158 DF' },
  usuario: '', carimbo: true, maxpx: 1600, pinHash: ''
};
let S = null, logo = null, token = 0, tab = 'dados';
const urls = {};
const urlOf = f => urls[f.id] || (urls[f.id] = URL.createObjectURL(f.blob));
const byTs = (a, b) => a.ts - b.ts;

/* ---------- utilidades de interface ---------- */
function toast(msg, ms = 2600) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => t.hidden = true, ms); }
function modal(html, onclose) {
  const m = $('#modal'); m.innerHTML = `<div class="sheet">${html}</div>`; m.hidden = false;
  m.onclick = e => { if (e.target === m) closeModal(); }; m._close = onclose; return m.firstChild;
}
function closeModal() { const m = $('#modal'); m.hidden = true; m.innerHTML = ''; if (m._close) m._close(); m._close = null; }
const confirmar = msg => Promise.resolve(window.confirm(msg));
function setTitle(t, back) { $('#title').textContent = t; const b = $('#back'); b.hidden = !back; b.onclick = () => { location.hash = back; }; }
function setNav(n) { document.querySelectorAll('.tabbar a').forEach(a => a.classList.toggle('on', a.dataset.nav === n)); }
function setPath(o, path, v) { const k = path.split('.'); while (k.length > 1) o = o[k.shift()]; o[k[0]] = v; }
function bindFields(root, obj, save) {
  root.querySelectorAll('[data-f]').forEach(el => {
    let tm; const read = () => el.type === 'checkbox' ? el.checked : el.value;
    el.addEventListener('input', () => { setPath(obj, el.dataset.f, read()); clearTimeout(tm); tm = setTimeout(() => save && save(el.dataset.f, read()), 300); });
    el.addEventListener('change', () => { clearTimeout(tm); setPath(obj, el.dataset.f, read()); save && save(el.dataset.f, read()); });
  });
}
async function patchV(id, path, value) { const x = await DB.get('vistorias', id); if (!x) return; setPath(x, path, value); x.updatedAt = Date.now(); await DB.put('vistorias', x); }
const val = (o, path) => path.split('.').reduce((a, k) => a?.[k], o);
const fld = (label, path, obj, o = {}) => {
  const v = val(obj, path) ?? '';
  const a = `data-f="${path}"` + (o.ph ? ` placeholder="${esc(o.ph)}"` : '') + (o.list ? ` list="${o.list}"` : '');
  if (o.area) return `<div><label>${label}</label><textarea ${a} rows="${o.rows || 3}">${esc(v)}</textarea></div>`;
  return `<div><label>${label}</label><input ${a} type="${o.type || 'text'}" value="${esc(v)}"></div>`;
};
const datalist = (id, arr) => `<datalist id="${id}">${arr.map(x => `<option value="${esc(x)}">`).join('')}</datalist>`;

/* ---------- dados ---------- */
async function loadSettings() {
  const c = await DB.getSetting('cfg', {});
  S = { ...DEFAULTS, ...c, empresa: { ...DEFAULTS.empresa, ...(c.empresa || {}) }, rt: { ...DEFAULTS.rt, ...(c.rt || {}) } };
  // Completa o perfil CGU existente sem substituir dados personalizados.
  if (S.empresa.nome.trim() === DEFAULTS.empresa.nome) {
    let changed = false;
    for (const k of ['cnpj', 'endereco', 'fone', 'email']) {
      if (!String(S.empresa[k] || '').trim()) { S.empresa[k] = DEFAULTS.empresa[k]; changed = true; }
    }
    for (const k of ['nome', 'titulo', 'crea']) {
      if (!String(S.rt[k] || '').trim()) { S.rt[k] = DEFAULTS.rt[k]; changed = true; }
    }
    if (changed) await DB.setSetting('cfg', S);
  }
}
const saveSettings = () => DB.setSetting('cfg', S);
async function loadLogo() {
  const r = await fetch('assets/logo.png'); const bytes = new Uint8Array(await r.arrayBuffer());
  const bmp = await createImageBitmap(new Blob([bytes], { type: 'image/png' })); logo = { bytes, w: bmp.width, h: bmp.height };
}
async function touchV(v) { v.updatedAt = Date.now(); await DB.put('vistorias', v); }
function getPos() {
  return new Promise(res => {
    if (!navigator.geolocation) return res(null);
    navigator.geolocation.getCurrentPosition(p => res({ lat: p.coords.latitude, lon: p.coords.longitude, acc: p.coords.accuracy }), () => res(null), { enableHighAccuracy: true, timeout: 12000, maximumAge: 15000 });
  });
}

/* ---------- fotos ---------- */
let cap = { vid: null, pos: null, then: null };
function startCapture(vid, kind) {
  cap = { vid, pos: kind === 'cam' ? getPos() : Promise.resolve(null), kind, t0: Date.now() };
  (kind === 'cam' ? $('#camIn') : $('#galIn')).click();
}
const stampBh = (w, n) => { const fs = Math.max(13, Math.round(w * 0.021)); return Math.round(fs * 1.35) * n + Math.round(fs * 0.9); };
async function drawStamp(ctx, w, h, lines) {
  const fs = Math.max(13, Math.round(w * 0.021)), lh = Math.round(fs * 1.35), bh = lh * lines.length + Math.round(fs * 0.9);
  ctx.fillStyle = 'rgba(42,52,78,.80)'; ctx.fillRect(0, h - bh, w, bh);
  ctx.fillStyle = '#476AAA'; ctx.fillRect(0, h - bh, w, Math.max(2, Math.round(fs * 0.15)));
  ctx.fillStyle = '#fff'; ctx.font = `600 ${fs}px Arial, sans-serif`; ctx.textBaseline = 'top';
  lines.forEach((l, i) => ctx.fillText(l, Math.round(fs * 0.6), h - bh + Math.round(fs * 0.45) + i * lh, w - fs));
}
async function processImage(file, ts, pos, v) {
  let bmp; try { bmp = await createImageBitmap(file); } catch { bmp = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = URL.createObjectURL(file); }); }
  const sw = bmp.width, sh = bmp.height, r = Math.min(1, S.maxpx / Math.max(sw, sh)), w = Math.round(sw * r), h = Math.round(sh * r);
  const c = document.createElement('canvas'); c.width = w; c.height = h; const ctx = c.getContext('2d'); ctx.drawImage(bmp, 0, 0, w, h);
  const stampLines = S.carimbo ? [Rep.fTs(ts) + '  ·  ' + (v.local || 'Local não informado'), Rep.fLoc(pos ? { lat: pos.lat, lon: pos.lon, acc: pos.acc } : {})] : null;
  if (stampLines) await drawStamp(ctx, w, h, stampLines);
  const blob = await new Promise(ok => c.toBlob(ok, 'image/jpeg', 0.84));
  return { blob, w, h, stampLines };
}
async function addPhotos(files, kind) {
  const v = await DB.get('vistorias', cap.vid); if (!v) return;
  const pos = await cap.pos; let last = null;
  if (kind === 'cam' && !pos) toast('Sem GPS: a foto foi salva sem coordenadas. Verifique a permissão de localização.', 4200);
  for (const file of files) {
    const lm = file.lastModified, now = Date.now();
    const ts = kind === 'cam' ? (lm && Math.abs(now - lm) < 15 * 60000 ? lm : now) : (lm || now);
    const { blob, w, h, stampLines } = await processImage(file, ts, pos, v);
    last = { id: DB.uid(), vistoriaId: v.id, blob, ts, lat: pos?.lat ?? null, lon: pos?.lon ?? null, acc: pos?.acc ?? null, descricao: '', origem: kind === 'cam' ? 'camera' : 'galeria', w, h, stampLines };
    await DB.put('fotos', last);
  }
  { const x = await DB.get('vistorias', v.id); x.nFotos = (await DB.by('fotos', 'vistoriaId', v.id)).length; await touchV(x); }
  if (last) { toast(files.length > 1 ? `${files.length} fotos adicionadas` : 'Foto registrada'); await route(); if (files.length === 1 && kind === 'cam') photoSheet(last.id, true); }
}
$('#camIn').addEventListener('change', e => { const f = [...e.target.files]; e.target.value = ''; if (f.length) addPhotos(f, 'cam'); });
$('#galIn').addEventListener('change', e => { const f = [...e.target.files]; e.target.value = ''; if (f.length) addPhotos(f, 'gal'); });

async function photoSheet(id, fromCam) {
  const f = await DB.get('fotos', id); if (!f) return;
  const all = (await DB.by('fotos', 'vistoriaId', f.vistoriaId)).sort(byTs); const n = all.findIndex(x => x.id === id) + 1;
  const nums = [...new Set((f.marks || []).filter(m => m.t === 'num').map(m => m.n))].sort((x, y) => x - y);
  const el = modal(`<h2>Foto ${pad(n)}</h2><img class="big" src="${urlOf(f)}">
    <div class="mut small">🕒 ${esc(Rep.fTs(f.ts))}<br>📍 ${esc(Rep.fLoc(f))}${f.origem === 'galeria' ? '<br>(importada da galeria)' : ''}</div>
    <button class="btn sec block" id="pcr" style="margin-top:10px">✂ Recortar para caber na meia folha${f.cortada ? ' (já recortada)' : ''}</button>
    <button class="btn sec block" id="pfit" style="margin-top:8px">↘ Diminuir foto para caber inteira${f.ajustada ? ' (já ajustada)' : ''}</button>
    ${f.cropBackup ? `<button class="btn sec block" id="pun" style="margin-top:8px">↩ Desfazer ${f.cortada ? 'recorte' : 'redução'}</button>` : '' }
    <button class="btn sec block" id="pmk" style="margin-top:10px">${CGU.icon("pen")} Marcar foto (seta, formas, números)</button>
    <label>Descrição da foto (legenda)</label><textarea id="pd" rows="3" placeholder="Ex.: Fissura no pilar P12, 2º pavimento">${esc(f.descricao)}</textarea>
    ${nums.length ? `<label>Legenda dos números marcados</label>${nums.map(k => `<div class="row" style="margin-bottom:6px"><b class="numb">${esc(k)}</b><input class="pn" data-n="${esc(k)}" placeholder="O que é o ponto ${esc(k)}?" value="${esc((f.notas || []).find(x => x.n === k)?.txt || '')}"></div>`).join('')}` : ''}
    <div class="row wrap" style="margin-top:12px"><button class="btn grow" id="ps">Salvar</button>${fromCam ? '<button class="btn sec grow" id="pn">Salvar e nova foto</button>' : ''}</div>
    <div class="row sp" style="margin-top:10px"><button class="btn bad sm" id="pdel">Excluir foto</button><button class="btn ghost sm" id="pc">Fechar</button></div>`);
  const save = async () => { f.descricao = $('#pd').value.trim(); f.notas = nums.map(k => ({ n: k, txt: (el.querySelector(`.pn[data-n="${k}"]`)?.value || '').trim() })); await DB.put('fotos', f); const v = await DB.get('vistorias', f.vistoriaId); await touchV(v); };
  el.querySelector('#pcr').onclick = async () => { await save(); closeModal(); await recortarFoto(f); await route(); photoSheet(f.id, fromCam); };
  el.querySelector('#pfit').onclick = async () => { await save(); closeModal(); await recortarFoto(f, 'fit'); await route(); photoSheet(f.id, fromCam); };
  const pun = el.querySelector('#pun'); if (pun) pun.onclick = async () => { await save(); closeModal(); await desfazerRecorte(f); await route(); photoSheet(f.id, fromCam); };
  el.querySelector('#pmk').onclick = async () => { await save(); closeModal(); const ok = await editarMarcas(f); await route(); photoSheet(f.id, fromCam); };
  el.querySelector('#ps').onclick = async () => { await save(); closeModal(); route(); };
  const pn = el.querySelector('#pn'); if (pn) pn.onclick = async () => { await save(); closeModal(); await route(); startCapture(f.vistoriaId, 'cam'); };
  el.querySelector('#pc').onclick = async () => { closeModal(); route(); };
  el.querySelector('#pdel').onclick = async () => {
    if (!await confirmar('Excluir esta foto?')) return; await DB.del('fotos', f.id);
    const v = await DB.get('vistorias', f.vistoriaId); v.nFotos = Math.max(0, (v.nFotos || 1) - 1); (v.constatacoes || []).forEach(c => c.fotoIds = (c.fotoIds || []).filter(x => x !== f.id)); await touchV(v); closeModal(); route();
  };
}


/* ---------- editor de marcações (seta, retângulo, círculo, números) ---------- */
const MCOR = { vermelho: '#E02020', amarelo: '#FFD400', azul: '#1E6BFF', branco: '#FFFFFF', preto: '#111111' };
function desenharMarcas(ctx, w, h, marks) {
  const lw = Math.max(3, w * 0.006);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const m of marks) {
    const col = MCOR[m.c] || m.c; ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = lw;
    const X = v => v * w, Y = v => v * h;
    if (m.t === 'rect') { ctx.strokeRect(X(Math.min(m.x1, m.x2)), Y(Math.min(m.y1, m.y2)), Math.abs(X(m.x2) - X(m.x1)), Math.abs(Y(m.y2) - Y(m.y1))); }
    else if (m.t === 'ell') { ctx.beginPath(); ctx.ellipse(X((m.x1 + m.x2) / 2), Y((m.y1 + m.y2) / 2), Math.max(1, Math.abs(X(m.x2) - X(m.x1)) / 2), Math.max(1, Math.abs(Y(m.y2) - Y(m.y1)) / 2), 0, 0, 7); ctx.stroke(); }
    else if (m.t === 'arr') {
      const x1 = X(m.x1), y1 = Y(m.y1), x2 = X(m.x2), y2 = Y(m.y2), L = Math.hypot(x2 - x1, y2 - y1); if (L < 2) continue;
      const a = Math.atan2(y2 - y1, x2 - x1), hl = Math.min(L * 0.5, Math.max(lw * 5, w * 0.035));
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2 - Math.cos(a) * hl * 0.6, y2 - Math.sin(a) * hl * 0.6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - hl * Math.cos(a - 0.42), y2 - hl * Math.sin(a - 0.42)); ctx.lineTo(x2 - hl * Math.cos(a + 0.42), y2 - hl * Math.sin(a + 0.42)); ctx.closePath(); ctx.fill();
    } else if (m.t === 'num') {
      const r = Math.max(14, w * 0.03), cx = X(m.x1), cy = Y(m.y1);
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fillStyle = col; ctx.fill();
      ctx.lineWidth = Math.max(2, lw * 0.6); ctx.strokeStyle = (m.c === 'branco' || m.c === 'amarelo') ? '#111' : '#fff'; ctx.stroke();
      ctx.fillStyle = (m.c === 'branco' || m.c === 'amarelo') ? '#111' : '#fff'; ctx.font = `700 ${Math.round(r * 1.15)}px Arial, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(m.n), cx, cy + r * 0.05); ctx.textAlign = 'left';
    }
  }
}
async function bmpOf(blob) { try { return await createImageBitmap(blob); } catch { return await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = URL.createObjectURL(blob); }); } }
function editarMarcas(f) {
  return new Promise(async resolve => {
    const base = f.base || f.blob, bmp = await bmpOf(base), W = bmp.width, H = bmp.height;
    let marks = JSON.parse(JSON.stringify(f.marks || [])), tool = 'arr', cor = 'vermelho', drag = null;
    const ov = document.createElement('div'); ov.className = 'editor';
    ov.innerHTML = `<div class="ed-top"><button class="btn ghost sm" id="edx">Cancelar</button><b>Marcar foto</b><button class="btn sm" id="edok">Concluir</button></div>
      <div class="ed-stage"><canvas id="edc"></canvas></div>
      <div class="ed-bar">
        <div class="ed-row" id="edt">
          <button data-t="arr" class="on">➚<span>Seta</span></button><button data-t="rect">▭<span>Retângulo</span></button><button data-t="ell">◯<span>Círculo</span></button><button data-t="num">①<span>Número</span></button>
        </div>
        <div class="ed-row" id="edcor">${Object.keys(MCOR).map(k => `<i data-c="${k}" class="${k === cor ? 'on' : ''}" style="background:${MCOR[k]}"></i>`).join('')}
          <button id="edun" class="sm2">↶ Desfazer</button><button id="edcl" class="sm2">🗑 Limpar</button></div>
        <div class="ed-hint" id="edh"></div>
      </div>`;
    document.body.appendChild(ov);
    const cv = ov.querySelector('#edc'); cv.width = W; cv.height = H; const ctx = cv.getContext('2d');
    const nextN = () => marks.filter(m => m.t === 'num').reduce((a, m) => Math.max(a, m.n), 0) + 1;
    const hints = { arr: 'Arraste do início até o ponto que quer apontar.', rect: 'Arraste para desenhar um retângulo.', ell: 'Arraste para desenhar um círculo/elipse.', num: 'Toque na foto para colocar o próximo número. Descreva cada número depois, na legenda.' };
    const redraw = () => { ctx.clearRect(0, 0, W, H); ctx.drawImage(bmp, 0, 0, W, H); desenharMarcas(ctx, W, H, drag ? [...marks, drag] : marks); ov.querySelector('#edh').textContent = (hints[tool] || '') + (marks.length ? '' : ''); };
    const pt = e => { const r = cv.getBoundingClientRect(); return { x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) }; };
    cv.style.touchAction = 'none';
    cv.onpointerdown = e => { e.preventDefault(); cv.setPointerCapture(e.pointerId); const p = pt(e);
      if (tool === 'num') { marks.push({ t: 'num', n: nextN(), x1: p.x, y1: p.y, c: cor }); redraw(); return; }
      drag = { t: tool, x1: p.x, y1: p.y, x2: p.x, y2: p.y, c: cor }; redraw(); };
    cv.onpointermove = e => { if (!drag) return; const p = pt(e); drag.x2 = p.x; drag.y2 = p.y; redraw(); };
    const fim = e => { if (!drag) return; const d = drag; drag = null; if (Math.hypot((d.x2 - d.x1) * W, (d.y2 - d.y1) * H) > W * 0.015) marks.push(d); redraw(); };
    cv.onpointerup = fim; cv.onpointercancel = () => { drag = null; redraw(); };
    ov.querySelectorAll('#edt button').forEach(b => b.onclick = () => { tool = b.dataset.t; ov.querySelectorAll('#edt button').forEach(x => x.classList.toggle('on', x === b)); redraw(); });
    ov.querySelectorAll('#edcor i').forEach(i => i.onclick = () => { cor = i.dataset.c; ov.querySelectorAll('#edcor i').forEach(x => x.classList.toggle('on', x === i)); });
    ov.querySelector('#edun').onclick = () => { marks.pop(); redraw(); };
    ov.querySelector('#edcl').onclick = () => { marks = []; redraw(); };
    const sair = v => { ov.remove(); resolve(v); };
    ov.querySelector('#edx').onclick = () => sair(false);
    ov.querySelector('#edok').onclick = async () => {
      const fresh = await DB.get('fotos', f.id) || f;
      if (!marks.length) { if (fresh.base) { fresh.blob = fresh.base; delete fresh.base; } delete fresh.marks; fresh.notas = []; }
      else {
        if (!fresh.base) fresh.base = fresh.blob;
        const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'); x.drawImage(bmp, 0, 0, W, H); desenharMarcas(x, W, H, marks);
        fresh.blob = await new Promise(ok => c.toBlob(ok, 'image/jpeg', 0.86)); fresh.marks = marks;
        const used = new Set(marks.filter(m => m.t === 'num').map(m => m.n)); fresh.notas = (fresh.notas || []).filter(n => used.has(n.n));
      }
      await DB.put('fotos', fresh); Object.assign(f, fresh); if (urls[f.id]) { URL.revokeObjectURL(urls[f.id]); delete urls[f.id]; }
      const v = await DB.get('vistorias', f.vistoriaId); if (v) await touchV(v); sair(true);
    };
    redraw();
  });
}

/* ---------- recorte ou redução para meia folha ---------- */
const RECORTES = { memorial: ['Meia folha – Memorial fotográfico (15,5 × 8,8 cm)', 15.5 / 8.8], dupla: ['Lado a lado – Relatório consolidado (7,9 × 5,9 cm)', 7.9 / 5.9], custom: ['Personalizado – proporção livre', null] };
function recortarFoto(f, modo = 'crop') {
  return new Promise(async resolve => {
    const encaixar = modo === 'fit';
    if ((f.marks || []).length && !await confirmar('Este ajuste remove as marcações desta foto (setas, formas, números). Continuar?')) return resolve(false);
    const src = f.cropBackup?.blob || f.base || f.blob, bmp = await bmpOf(src), W = bmp.width, H = bmp.height;
    const lines = f.stampLines || null, sb = lines ? stampBh(W, lines.length) : 0, HU = H - sb;
    let ratio = RECORTES.memorial[1], z = 1, cw = 0, customH = 0, custom = false, x = 0, y = 0, drag = null;
    const ov = document.createElement('div'); ov.className = 'editor';
    ov.innerHTML = `<div class="ed-top"><button class="btn ghost sm" id="rcx">Cancelar</button><b>${encaixar ? 'Diminuir foto inteira' : 'Recortar foto'}</b><button class="btn sm" id="rcok">Aplicar</button></div>
      <div class="ed-stage"><canvas id="rcc"></canvas></div>
      <div class="ed-bar">
        <select id="rcr" style="width:100%;margin-bottom:8px">${Object.entries(RECORTES).map(([k, v]) => '<option value="' + esc(k) + '">' + esc(v[0]) + '</option>').join('')}</select>
        <div class="ed-row" style="flex-wrap:nowrap"><span style="font-size:14px">${encaixar ? 'Ajuste' : 'Zoom'}</span><input id="rcz" type="range" min="30" max="100" value="100" style="flex:1" ${encaixar ? 'disabled' : ''}></div>
        <div class="ed-hint">${encaixar ? 'A foto inteira será reduzida e centralizada no formato escolhido.' : 'Arraste o quadro para escolher o trecho e puxe o canto inferior direito para ajustar o tamanho. Você pode reposicionar e redimensionar antes de aplicar.'}</div>
      </div>`;
    document.body.appendChild(ov);
    const cv = ov.querySelector('#rcc'); cv.width = W; cv.height = H; const ctx = cv.getContext('2d'); cv.style.touchAction = 'none';
    const geom = () => { if (custom) { cw = Math.max(1, Math.min(cw, W)); customH = Math.max(1, Math.min(customH, HU)); ratio = cw / customH; } else { const max = Math.min(W, HU * ratio); cw = max * z; } const ch = custom ? customH : cw / ratio; x = Math.min(Math.max(0, x), W - cw); y = Math.min(Math.max(0, y), HU - ch); return ch; };
    const centralizar = () => { z = 1; if (custom) { cw = W * .75; customH = HU * .75; ratio = cw / customH; } else cw = Math.min(W, HU * ratio); x = (W - cw) / 2; y = (HU - (custom ? customH : cw / ratio)) / 2; };
    const redraw = () => { const ch = geom(); ctx.drawImage(bmp, 0, 0, W, H);
      if (encaixar) {
        ctx.fillStyle = '#fff'; ctx.fillRect(x, y, cw, ch);
        const stampH = lines ? Math.min(ch, stampBh(cw, lines.length)) : 0;
        const photoH = Math.max(1, ch - stampH), sc = Math.min(cw / W, photoH / HU), dw = W * sc, dh = HU * sc;
        ctx.drawImage(bmp, 0, 0, W, HU, x + (cw - dw) / 2, y + (photoH - dh) / 2, dw, dh);
        if (lines) { ctx.save(); ctx.translate(x, y); drawStamp(ctx, cw, ch, lines); ctx.restore(); }
      }
      ctx.fillStyle = 'rgba(0,0,0,.62)';
      ctx.fillRect(0, 0, W, y); ctx.fillRect(0, y + ch, W, H - y - ch); ctx.fillRect(0, y, x, ch); ctx.fillRect(x + cw, y, W - x - cw, ch);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(3, W / 250); ctx.strokeRect(x, y, cw, ch); if (!encaixar) { const hs = Math.max(24, W / 28); ctx.fillStyle = '#fff'; ctx.fillRect(x + cw - hs, y + ch - hs, hs, hs); ctx.strokeStyle = '#333'; ctx.lineWidth = Math.max(2, W / 500); ctx.strokeRect(x + cw - hs, y + ch - hs, hs, hs); } };
    const pt = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H }; };
    cv.onpointerdown = e => { if (encaixar) return; e.preventDefault(); cv.setPointerCapture(e.pointerId); const p = pt(e), ch0 = custom ? customH : cw / ratio, h = Math.max(28, W / 32); const resize = p.x >= x + cw - h && p.y >= y + ch0 - h; drag = resize ? { resize: true, sx: p.x, sy: p.y, cw, ch: ch0, x, y } : { dx: p.x - x, dy: p.y - y }; };
    cv.onpointermove = e => { if (!drag) return; const p = pt(e); if (drag.resize) { const nw = Math.max(W * .15, Math.min(W - drag.x, drag.cw + (p.x - drag.sx))); const nh = Math.max(HU * .15, Math.min(HU - drag.y, drag.ch + (p.y - drag.sy))); if (custom) { cw = nw; customH = nh; ratio = cw / customH; } else { const max = Math.min(W - drag.x, (HU - drag.y) * ratio); const min = Math.min(max, Math.min(W, HU * ratio) * .3); cw = Math.max(min, Math.min(max, drag.cw + ((p.x - drag.sx) + (p.y - drag.sy) * ratio) / 2)); } z = cw / Math.min(W, HU * ratio); x = drag.x; y = drag.y; ov.querySelector('#rcz').value = Math.round(z * 100); } else { x = p.x - drag.dx; y = p.y - drag.dy; } redraw(); };
    cv.onpointerup = cv.onpointercancel = () => { drag = null; };
    ov.querySelector('#rcz').oninput = e => { if (encaixar) return; z = e.target.value / 100; if (custom) { cw = W * .75 * z; customH = HU * .75 * z; ratio = cw / customH; x = (W - cw) / 2; y = (HU - customH) / 2; } else { const ch0 = cw / ratio, cx = x + cw / 2, cy = y + ch0 / 2; const ch = Math.min(W, HU * ratio) * z / ratio; x = cx - Math.min(W, HU * ratio) * z / 2; y = cy - ch / 2; } redraw(); };
    ov.querySelector('#rcr').onchange = e => { custom = e.target.value === 'custom'; if (!custom) ratio = RECORTES[e.target.value][1]; centralizar(); redraw(); };
    const sair = v => { ov.remove(); resolve(v); };
    ov.querySelector('#rcx').onclick = () => sair(false);
    ov.querySelector('#rcok').onclick = async () => {
      const ch = geom(), ow = Math.round(Math.min(encaixar ? W : cw, S.maxpx)), oh = Math.round(ow / ratio), c = document.createElement('canvas'); c.width = ow; c.height = oh;
      const o = c.getContext('2d');
      if (encaixar) {
        o.fillStyle = '#fff'; o.fillRect(0, 0, ow, oh);
        const stampH = lines ? stampBh(ow, lines.length) : 0, photoH = Math.max(1, oh - stampH);
        const sc = Math.min(ow / W, photoH / HU), dw = W * sc, dh = HU * sc;
        o.drawImage(bmp, 0, 0, W, HU, (ow - dw) / 2, (photoH - dh) / 2, dw, dh);
      } else o.drawImage(bmp, x, y, cw, ch, 0, 0, ow, oh);
      if (lines) await drawStamp(o, ow, oh, lines);
      const fresh = await DB.get('fotos', f.id) || f;
      if (!fresh.cropBackup) fresh.cropBackup = { blob: fresh.blob, base: fresh.base, marks: fresh.marks, notas: fresh.notas, stampLines: fresh.stampLines, w: fresh.w, h: fresh.h, cortada: fresh.cortada, ajustada: fresh.ajustada };
      fresh.blob = await new Promise(ok => c.toBlob(ok, 'image/jpeg', 0.86)); fresh.w = ow; fresh.h = oh;
      if (encaixar) { fresh.ajustada = true; delete fresh.cortada; } else { fresh.cortada = true; delete fresh.ajustada; }
      delete fresh.base; delete fresh.marks; fresh.notas = [];
      await DB.put('fotos', fresh); Object.assign(f, fresh); if (urls[f.id]) { URL.revokeObjectURL(urls[f.id]); delete urls[f.id]; }
      const v = await DB.get('vistorias', f.vistoriaId); if (v) await touchV(v); sair(true);
    };
    centralizar(); redraw();
  });
}
async function desfazerRecorte(f) {
  const fresh = await DB.get('fotos', f.id) || f, backup = fresh.cropBackup;
  if (!backup) return false;
  const newerAnnotations = (fresh.marks || []).length || (fresh.notas || []).some(n => String(n.txt || '').trim());
  if (newerAnnotations && !await confirmar('Desfazer restaura as marcações e legendas originais. As marcações e legendas adicionadas após o ajuste serão substituídas. Continuar?')) return false;
  fresh.blob = backup.blob; fresh.w = backup.w; fresh.h = backup.h;
  for (const k of ['base', 'marks', 'notas', 'cortada', 'ajustada']) {
    if (Object.prototype.hasOwnProperty.call(backup, k)) fresh[k] = backup[k]; else delete fresh[k];
  }
  if (Object.prototype.hasOwnProperty.call(backup, 'stampLines')) fresh.stampLines = backup.stampLines;
  delete fresh.cropBackup;
  await DB.put('fotos', fresh); Object.assign(f, fresh);
  if (urls[f.id]) { URL.revokeObjectURL(urls[f.id]); delete urls[f.id]; }
  const v = await DB.get('vistorias', f.vistoriaId); if (v) await touchV(v);
  return true;
}

/* ---------- rotas ---------- */
let chain = Promise.resolve();
function route() { const my = ++token; chain = chain.then(() => my === token ? doRoute() : null).catch(console.error); return chain; }
async function doRoute() {
  const my = token; const h = location.hash.replace(/^#\/?/, '').split('/');
  const view = $('#view'); const R = h[0] || 'obras';
  try {
    if (R === 'obras') await vObras(view, my);
    else if (R === 'obra') await vObra(view, h[1], my);
    else if (R === 'vistoria') await vVistoria(view, h[1], my);
    else if (R === 'painel') await vPainel(view, my);
    else if (R === 'ajustes') await vAjustes(view, my);
    else location.hash = '#/';
  } catch (e) { console.error(e); view.innerHTML = `<div class="warnbox">Erro ao abrir a tela: ${esc(e.message)}</div>`; }
}
window.addEventListener('hashchange', () => { closeModal(); route(); window.scrollTo(0, 0); });

/* ---------- OBRAS ---------- */
async function vObras(view) {
  setTitle('Edifícios', ''); setNav('obras');
  const obras = (await DB.all('obras')).sort((a, b) => a.nome.localeCompare(b.nome));
  const vs = await DB.all('vistorias');
  const rasc = vs.filter(v => v.status !== 'emitido').sort((a, b) => b.updatedAt - a.updatedAt)[0];
  const ob = rasc && obras.find(o => o.id === rasc.obraId);
  view.innerHTML = `
    ${rasc && ob ? `<div class="card tap" data-go="#/vistoria/${esc(rasc.id)}" style="border-color:var(--a)"><div class="mut small">CONTINUAR VISTORIA</div><b>${esc(rasc.local || 'Sem local')}</b><div class="mut small">${esc(ob.nome)} · ${esc(Rep.fData(rasc.data))} · ${Number(rasc.nFotos)||0} foto(s)</div></div>` : ''}
    <input id="q" type="search" placeholder="Buscar edifício ou cliente…" style="margin-bottom:12px">
    <div id="lst">${obras.map(o => cardObra(o, vs)).join('') || '<div class="empty">Nenhum edifício cadastrado.<br>Toque em <b>+ Edifício</b> para começar.</div>'}</div>
    <button class="btn fab" id="nova">+ Edifício</button>`;
  bindGo(view);
  $('#q').oninput = e => { const q = e.target.value.toLowerCase(); $('#lst').innerHTML = obras.filter(o => (o.nome + ' ' + o.cliente).toLowerCase().includes(q)).map(o => cardObra(o, vs)).join('') || '<div class="empty">Nada encontrado.</div>'; bindGo(view); };
  $('#nova').onclick = () => obraSheet();
}
const cardObra = (o, vs) => { const mine = vs.filter(v => v.obraId === o.id); return `<div class="card tap" data-go="#/obra/${esc(o.id)}"><div class="row sp"><b>${esc(o.nome)}</b><span class="chip">${mine.length} vistoria(s)</span></div><div class="mut small">${esc(o.cliente || '')}${o.endereco ? ' · ' + esc(o.endereco) : ''}</div></div>`; };
function bindGo(root) { root.querySelectorAll('[data-go]').forEach(el => el.onclick = () => location.hash = el.dataset.go); }
function obraSheet(o) {
  const novo = !o; o = o || { id: DB.uid(), nome: '', cliente: '', endereco: '', contrato: '', art: '', criadoEm: Date.now() };
  const el = modal(`<h2>${novo ? 'Novo edifício' : 'Editar edifício'}</h2>
    ${fld('Nome do edifício *', 'nome', o, { ph: 'Ex.: Edifício-sede da unidade' })}${fld('Cliente / contratante', 'cliente', o)}${fld('Endereço do edifício', 'endereco', o)}
    <div class="grid2">${fld('Contrato / proposta', 'contrato', o)}${fld('ART / RRT', 'art', o)}</div>
    <div class="row" style="margin-top:14px"><button class="btn grow" id="ok">Salvar</button><button class="btn ghost" id="x">Cancelar</button></div>`);
  bindFields(el, o, () => { });
  el.querySelector('#x').onclick = closeModal;
  el.querySelector('#ok').onclick = async () => {
    if (!o.nome.trim()) return toast('Informe o nome do edifício'); await DB.put('obras', o); closeModal();
    if (novo) location.hash = '#/obra/' + o.id; else route();
  };
}

/* ---------- OBRA ---------- */
async function vObra(view, id) {
  const o = await DB.get('obras', id); if (!o) return location.hash = '#/';
  setTitle(o.nome, '#/'); setNav('obras');
  const vs = (await DB.by('vistorias', 'obraId', id)).sort((a, b) => (b.data + (b.hora || '')).localeCompare(a.data + (a.hora || '')));
  view.innerHTML = `
    <div class="card"><div class="mut small">CLIENTE</div><div>${esc(o.cliente || '—')}</div><div class="mut small" style="margin-top:6px">ENDEREÇO</div><div>${esc(o.endereco || '—')}</div>
    ${(o.contrato || o.art) ? `<div class="mut small" style="margin-top:6px">CONTRATO / ART</div><div>${esc([o.contrato, o.art].filter(Boolean).join(' · '))}</div>` : ''}
    <div class="row wrap" style="margin-top:10px"><button class="btn sec sm" id="eo">Editar edifício</button><button class="btn sec sm" id="xo">Exportar backup do edifício</button></div></div>
    <button class="btn block" id="nv">+ Nova vistoria</button>
    <h2>Vistorias / locais visitados</h2>
    ${vs.map(v => `<div class="card tap" data-go="#/vistoria/${esc(v.id)}"><div class="row sp"><b>${esc(v.local || 'Sem local')}</b>${stChip(v)}</div><div class="mut small">${esc(Rep.fData(v.data))} ${esc(v.hora || '')} · ${esc(v.tipo || '')} · ${Number(v.nFotos)||0} foto(s)${v.seq ? ' · VT-' + esc(pad(v.seq, 3)) + '/' + esc(v.ano) : ''}</div></div>`).join('') || '<div class="empty">Nenhuma vistoria neste edifício.</div>'}
    <div style="margin-top:20px"><button class="btn bad sm" id="do">Excluir edifício</button></div>`;
  bindGo(view);
  $('#eo').onclick = () => obraSheet(o);
  $('#xo').onclick = () => exportBackup(o.id);
  $('#do').onclick = async () => { if (await confirmar(`Excluir o edifício "${o.nome}", suas vistorias, fotos e ações declaradas locais? Emissões, snapshots e arquivos emitidos podem permanecer retidos conforme a política institucional ainda pendente. Não há como desfazer.`)) { await DB.delObra(o.id); location.hash = '#/'; } };
  $('#nv').onclick = async () => {
    const v = { id: DB.uid(), obraId: o.id, local: '', tipo: TIPOS[0], data: hoje(), hora: agora(), participantes: S.usuario || '', clima: '', objetivo: '', metodologia: METOD, documentos: '', descricao: '', constatacoes: [], conclusao: '', recomendacoes: '', status: 'rascunho', nFotos: 0, gps: null, criadoEm: Date.now(), updatedAt: Date.now() };
    await DB.put('vistorias', v); tab = 'dados'; location.hash = '#/vistoria/' + v.id;
    getPos().then(async p => { if (p) { const x = await DB.get('vistorias', v.id); if (x && !x.gps) { x.gps = p; await DB.put('vistorias', x); if (location.hash.includes(v.id) && tab === 'dados') route(); } } });
  };
}
const tipoNome = (t, curto) => ({ tecnico: 'Vistoria técnica', fotografico: curto ? 'Mem. fotográfico' : 'Memorial fotográfico', consolidado: 'Consolidado' }[t] || t);
const stChip = v => v.status === 'emitido' ? '<span class="chip ok">Emitido</span>' : '<span class="chip warn">Rascunho</span>';

/* ---------- VISTORIA ---------- */
async function vVistoria(view, id) {
  const v = await DB.get('vistorias', id); if (!v) return location.hash = '#/';
  const o = await DB.get('obras', v.obraId); const fotos = (await DB.by('fotos', 'vistoriaId', id)).sort(byTs);
  setTitle(v.local || 'Nova vistoria', '#/obra/' + o.id); setNav('obras');
  const TABS = [['dados', 'Dados'], ['fotos', `Fotos (${fotos.length})`], ['const', `Constatações (${(v.constatacoes || []).length})`], ['concl', 'Conclusão'], ['emitir', 'Emitir']];
  view.innerHTML = `<div class="seg">${TABS.map(([k, t]) => `<button data-t="${k}" class="${tab === k ? 'on' : ''}">${t}</button>`).join('')}</div><div id="tb"></div>`;
  view.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { tab = b.dataset.t; route(); });
  const tb = $('#tb'); const save = (p, val) => patchV(v.id, p, val);
  if (tab === 'dados') {
    tb.innerHTML = `<div class="card"><div class="mut small">EDIFÍCIO</div><b>${esc(o.nome)}</b>
      ${fld('Local visitado *', 'local', v, { ph: 'Ex.: Bloco B – 3º pavimento / Subsolo' })}
      ${fld('Tipo de vistoria', 'tipo', v, { list: 'dl-tipo' })}${datalist('dl-tipo', TIPOS)}
      <div class="grid2 keep">${fld('Data', 'data', v, { type: 'date' })}${fld('Hora', 'hora', v, { type: 'time' })}</div>
      ${fld('Participantes', 'participantes', v, { ph: 'Nomes e funções' })}
      ${fld('Condições climáticas', 'clima', v, { list: 'dl-clima' })}${datalist('dl-clima', CLIMAS)}
      ${fld('Objetivo da vistoria', 'objetivo', v, { area: 1, rows: 3 })}${fld('Metodologia', 'metodologia', v, { area: 1, rows: 3 })}
      ${fld('Documentos / projetos consultados', 'documentos', v, { area: 1, rows: 2 })}${fld('Descrição do local', 'descricao', v, { area: 1, rows: 4 })}
      <label>Localização (GPS) da vistoria</label><div class="row"><div class="grow small" id="gpsT">${v.gps ? `📍 ${v.gps.lat.toFixed(6)}, ${v.gps.lon.toFixed(6)}${v.gps.acc ? ' (±' + Math.round(v.gps.acc) + ' m)' : ''}` : 'Não registrada'}</div><button class="btn sec sm" id="gps">Usar minha localização</button></div></div>
      <button class="btn bad sm" id="dv">Excluir vistoria</button>`;
    bindFields(tb, v, async (p, val) => { await save(p, val); if (p === 'local') setTitle(v.local || 'Nova vistoria', '#/obra/' + o.id); });
    $('#gps').onclick = async () => { toast('Obtendo localização…'); const p = await getPos(); if (!p) return toast('Não foi possível obter o GPS. Verifique a permissão.', 4000); v.gps = p; await patchV(v.id, 'gps', p); route(); };
    $('#dv').onclick = async () => { if (await confirmar('Excluir esta vistoria, suas fotos e ações declaradas locais? Emissões, snapshots e arquivos emitidos podem permanecer retidos conforme a política institucional ainda pendente. Não há como desfazer.')) { await DB.delVistoria(v.id); location.hash = '#/obra/' + o.id; } };
  }
  if (tab === 'fotos') {
    tb.innerHTML = `<div class="row"><button class="btn grow" id="cam">${CGU.icon("camera")} Tirar foto</button><button class="btn sec grow" id="gal">${CGU.icon("image")} Da galeria</button></div>
      <p class="mut small">Fotos da câmera recebem data e hora do registro e GPS quando disponível. Fotos da galeria usam a data do arquivo e não recebem GPS${S.carimbo ? ', também gravadas na própria imagem' : ''}. Permita a localização quando o aparelho pedir.</p>
      <div class="photos">${fotos.map((f, i) => `<div class="ph" data-p="${esc(f.id)}"><img src="${urlOf(f)}" loading="lazy"><b>${pad(i + 1)}</b><span class="gps">${f.lat != null ? '📍' : '—'}</span></div>`).join('')}</div>
      ${fotos.length ? '' : '<div class="empty">Nenhuma foto ainda.</div>'}`;
    $('#cam').onclick = () => startCapture(v.id, 'cam'); $('#gal').onclick = () => startCapture(v.id, 'gal');
    tb.querySelectorAll('[data-p]').forEach(p => p.onclick = () => photoSheet(p.dataset.p, false));
  }
  if (tab === 'const') {
    const C = v.constatacoes || [];
    const actionRows = await DB.by('acoes','vistoriaId',v.id);
    tb.innerHTML = `<button class="btn block" id="nc">+ Nova constatação</button><p class="mut small">Registre cada achado com sua gravidade, recomendação e as fotos que o comprovam. Ações abaixo são declarações locais e não são verificadas.</p>
      ${C.map((c, i) => { const count=actionRows.filter(a=>a.constatacaoId===c.id).length; return `<div class="card tap" data-c="${esc(c.id)}"><div class="row sp"><b>${pad(i + 1)}. ${esc(c.titulo || 'Sem título')}</b><span class="chip ${esc(gravCls(c.gravidade))}">${esc(c.gravidade || '—')}</span></div><div class="mut small">${esc([c.ambiente, c.local].filter(Boolean).join(' · '))}${(c.fotoIds || []).length ? ' · ' + c.fotoIds.length + ' foto(s)' : ''}</div><div class="row" style="margin-top:8px"><button class="btn sec sm" data-actions="${esc(c.id)}">Ações declaradas (${count})</button></div></div>`; }).join('') || '<div class="empty">Nenhuma constatação.</div>'}`;
    $('#nc').onclick = () => constSheet(v, fotos);
    tb.querySelectorAll('[data-c]').forEach(e => e.onclick = () => constSheet(v, fotos, v.constatacoes.find(c => c.id === e.dataset.c)));
    tb.querySelectorAll('[data-actions]').forEach(e => e.onclick = event => { event.stopPropagation(); const c=C.find(x=>x.id===e.dataset.actions); if(c) actionsSheet(v,c); });
  }
  if (tab === 'concl') {
    tb.innerHTML = `<div class="card">${fld('Conclusão / parecer técnico', 'conclusao', v, { area: 1, rows: 6 })}${fld('Recomendações (uma por linha)', 'recomendacoes', v, { area: 1, rows: 6 })}</div>`;
    bindFields(tb, v, save);
  }
  if (tab === 'emitir') await vEmitir(tb, v, o, fotos);
}
async function recurrenceChoices(v, c) {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const validDate=value=>{if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const d=new Date(`${value}T00:00:00Z`);return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===value;};
  const currentDate = validDate(v.data) ? v.data : '';
  if (!currentDate) return { rows: [], truncated: false };
  const [emissions, snapshots, inspections, works] = await Promise.all([DB.all('emissoes'), DB.all('snapshots'), DB.all('vistorias'), DB.all('obras')]);
  const snapshotById = new Map(snapshots.map(s => [s.id, s])), inspectionById = new Map(inspections.map(x => [x.id, x])), workById = new Map(works.map(x => [x.id, x]));
  const byInspection = new Map();
  for (const e of emissions) if (e.vistoriaId !== v.id && inspectionById.has(e.vistoriaId)) { if (!byInspection.has(e.vistoriaId)) byInspection.set(e.vistoriaId, []); byInspection.get(e.vistoriaId).push(e); }
  const verified = [];
  for (const [vistoriaId, candidates] of [...byInspection].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) {
    candidates.sort((a,b) => (Number(b.rev)||0)-(Number(a.rev)||0) || (Number(b.data)||0)-(Number(a.data)||0) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    const first=candidates[0], rev=Number(first.rev)||0, timestamp=Number(first.data)||0, tied=candidates.filter(e => (Number(e.rev)||0)===rev && (Number(e.data)||0)===timestamp), checked=[];
    for (const emission of tied) { const snapshot=snapshotById.get(emission.snapshotId); let result; try { result=await SnapshotLib.verificarEmissao(emission,snapshot); } catch { result={estado:'divergente'}; } checked.push({snapshot,result}); }
    if (!checked.length || checked.some(x => x.result.estado!=='verificado' || !x.snapshot?.conteudo)) continue;
    const projection=x=>SnapshotLib.canonicalize({obra:x.snapshot.conteudo.obra,vistoria:x.snapshot.conteudo.vistoria,constatacoes:x.snapshot.conteudo.constatacoes,evidencias:x.snapshot.conteudo.evidencias});
    if (checked.some(x=>projection(x)!==projection(checked[0]))) continue;
    const content=checked[0].snapshot.conteudo, priorDate=content.vistoria?.data;
    if (!validDate(priorDate) || priorDate>=currentDate || content.obra?.id!==v.obraId) continue;
    verified.push({vistoriaId, content, priorDate});
  }
  verified.sort((a,b)=>b.priorDate.localeCompare(a.priorDate)||(a.vistoriaId<b.vistoriaId?-1:a.vistoriaId>b.vistoriaId?1:0));
  const byFinding=new Map();
  for (const item of verified) for (const finding of item.content.constatacoes||[]) {
    if (!uuid.test(finding?.id||'') || finding.id===c?.id || byFinding.has(finding.id)) continue;
    const work=workById.get(inspectionById.get(item.vistoriaId)?.obraId) || item.content.obra || {};
    byFinding.set(finding.id,{id:finding.id,label:`${item.priorDate} · ${work.nome||'Edifício'} · ${finding.titulo||finding.tipo||'Constatação anterior'}`});
  }
  const rows=[...byFinding.values()].sort((a,b)=>a.label<b.label?1:a.label>b.label?-1:a.id<b.id?-1:1), truncated=rows.length>300;
  return {rows:rows.slice(0,300),truncated};
}

async function constSheet(v, fotos, c) {
  const novo = !c; c = c || { id: DB.uid(), titulo: '', tipo: '', gravidade: 'Informativa', ambiente: '', local: '', descricao: '', recomendacao: '', fotoIds: [] };
  const recurrence = await recurrenceChoices(v,c), uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const preserved = c.recorrenciaDeId && uuid.test(c.recorrenciaDeId) && !recurrence.rows.some(x=>x.id===c.recorrenciaDeId) ? `<option value="${esc(c.recorrenciaDeId)}" selected>Vínculo preservado; constatação anterior fora da lista</option>` : '';
  const el = modal(`<h2>${novo ? 'Nova constatação' : 'Constatação'}</h2>
    <label>Tipo de constatação</label><select data-f="tipo" id="tp">${optG(TIPOS_CONST, c.tipo)}</select>
    ${fld('Título *', 'titulo', c, { ph: 'Ex.: Fissura em viga de transição' })}
    <label>Gravidade</label><select data-f="gravidade">${GRAVS.map(g => `<option ${g === c.gravidade ? 'selected' : ''}>${g}</option>`).join('')}</select>
    <label>Ambiente</label><select data-f="ambiente">${optG(AMBIENTES, c.ambiente)}</select>
    ${fld('Local / elemento (detalhe)', 'local', c, { ph: 'Ex.: Pilar P12 – 2º pav.' })}${fld('Descrição', 'descricao', c, { area: 1, rows: 4 })}${fld('Recomendação', 'recomendacao', c, { area: 1, rows: 3 })}
    <label for="recurrence-link">Vínculo explícito com constatação anterior (opcional)</label><select id="recurrence-link"><option value="">Sem vínculo declarado</option>${preserved}${recurrence.rows.map(x=>`<option value="${esc(x.id)}" ${c.recorrenciaDeId===x.id?'selected':''}>${esc(x.label)}</option>`).join('')}</select><p class="mut small">Selecione somente se a relação foi confirmada por uma pessoa. A lista oferece constatações verificadas anteriores do mesmo edifício; o aplicativo não deduz recorrência pelo texto. ${recurrence.truncated?'Lista limitada a 300 constatações verificadas. ':''}O vínculo será congelado em novas emissões.</p>
    <label>Fotos relacionadas (toque para marcar)</label><div class="photos" id="sp">${fotos.map((f, i) => `<div class="ph ${c.fotoIds.includes(f.id) ? 'sel' : ''}" data-id="${esc(f.id)}"><img src="${urlOf(f)}"><b>${pad(i + 1)}</b></div>`).join('') || '<span class="mut small">Tire fotos primeiro na aba Fotos.</span>'}</div>
    <div class="row" style="margin-top:14px"><button class="btn grow" id="ok">Salvar</button>${novo ? '' : '<button class="btn bad" id="dl">Excluir</button>'}<button class="btn ghost" id="x">Fechar</button></div>`);
  let tipoAnt = c.tipo;
  bindFields(el, c, () => { });
  el.querySelector('#recurrence-link').addEventListener('change',e=>{if(e.target.value)c.recorrenciaDeId=e.target.value;else delete c.recorrenciaDeId;});
  el.querySelector('#tp').addEventListener('change', e => { const t = e.target.value, ti = el.querySelector('[data-f=titulo]'); if (t && ti && (!ti.value.trim() || ti.value === tipoAnt)) { ti.value = t; c.titulo = t; } tipoAnt = t; });
  el.querySelectorAll('[data-id]').forEach(p => p.onclick = () => { const id = p.dataset.id; c.fotoIds = c.fotoIds.includes(id) ? c.fotoIds.filter(x => x !== id) : [...c.fotoIds, id]; p.classList.toggle('sel'); });
  el.querySelector('#x').onclick = closeModal;
  el.querySelector('#ok').onclick = async () => { if (!c.titulo.trim()) return toast('Informe o título'); if(c.recorrenciaDeId&&(!uuid.test(c.recorrenciaDeId)||c.recorrenciaDeId===c.id))return toast('O vínculo de recorrência deve apontar para outra constatação com ID válido.'); v.constatacoes = v.constatacoes || []; if (novo) v.constatacoes.push(c); await patchV(v.id, 'constatacoes', v.constatacoes); closeModal(); route(); };
  const d = el.querySelector('#dl'); if (d) d.onclick = async () => { if ((await DB.by('acoes','constatacaoId',c.id)).length) return toast('Exclua as ações declaradas vinculadas antes de excluir a constatação.'); if (!await confirmar('Excluir esta constatação?')) return; v.constatacoes = v.constatacoes.filter(x => x.id !== c.id); await patchV(v.id, 'constatacoes', v.constatacoes); closeModal(); route(); };
}

async function verifiedActionSnapshot(v,c) {
  const emissions=(await DB.by('emissoes','vistoriaId',v.id)).slice().sort((a,b)=>(Number(b.rev)||0)-(Number(a.rev)||0)||(Number(b.data)||0)-(Number(a.data)||0)||(String(a.tipo)<String(b.tipo)?-1:String(a.tipo)>String(b.tipo)?1:0)||(String(a.formato)<String(b.formato)?-1:String(a.formato)>String(b.formato)?1:0)||(String(a.id)<String(b.id)?-1:String(a.id)>String(b.id)?1:0));
  if(!emissions.length)return null;
  const latest=emissions[0],rev=Number(latest.rev)||0,emittedAt=Number(latest.data)||0,tied=emissions.filter(e=>(Number(e.rev)||0)===rev&&(Number(e.data)||0)===emittedAt),checked=[];
  for(const emission of tied){const snapshot=emission.snapshotId?await DB.get('snapshots',emission.snapshotId):null;let result;try{result=await SnapshotLib.verificarEmissao(emission,snapshot);}catch{result={estado:'divergente'};}checked.push({snapshot,result});}
  if(!checked.length||checked.some(x=>x.result.estado!=='verificado'||!x.snapshot?.conteudo))return null;
  const projection=x=>SnapshotLib.canonicalize({obra:x.snapshot.conteudo.obra,vistoria:x.snapshot.conteudo.vistoria,constatacoes:x.snapshot.conteudo.constatacoes,evidencias:x.snapshot.conteudo.evidencias});
  if(checked.some(x=>projection(x)!==projection(checked[0])))return null;
  const snapshot=checked[0].snapshot;
  return snapshot.conteudo.constatacoes.some(x=>x.id===c.id)?snapshot:null;
}
async function actionsSheet(v,c) {
  const actions=(await DB.by('acoes','constatacaoId',c.id)).filter(a=>a.vistoriaId===v.id).sort((a,b)=>(Number(b.atualizadoEm)||0)-(Number(a.atualizadoEm)||0)||(a.id<b.id?-1:a.id>b.id?1:0));
  const snapshot=await verifiedActionSnapshot(v,c);
  const el=modal(`<h2>Ações declaradas</h2><p><b>${esc(c.titulo||'Constatação')}</b></p><div class="warnbox">Declarações locais do usuário; não verificadas. Emitir um laudo não conclui nem encerra uma ação.</div>
    ${actions.length?`<ul class="small">${actions.map(a=>`<li><b>${esc(a.estado)}</b> · função: ${esc(a.responsavelFuncao)} · prazo ${esc(a.prazo)} · ${esc(a.observacao||'Sem observação')} <button class="btn sec sm" data-edit-action="${esc(a.id)}">Editar</button></li>`).join('')}</ul>`:'<p class="mut small">Nenhuma ação declarada para esta constatação.</p>'}
    ${snapshot?'<button class="btn block" id="new-action">+ Declarar ação neste snapshot</button>':'<p class="mut small">Para declarar ação, emita a constatação em um snapshot verificável. Ações não alteram snapshots existentes.</p>'}
    <button class="btn ghost block" id="close-actions" style="margin-top:8px">Fechar</button>`);
  el.querySelector('#close-actions').onclick=()=>{closeModal();route();};
  const create=el.querySelector('#new-action');if(create)create.onclick=()=>actionForm(v,c,snapshot,null);
  el.querySelectorAll('[data-edit-action]').forEach(button=>button.onclick=()=>{const action=actions.find(a=>a.id===button.dataset.editAction);if(action)actionForm(v,c,{id:action.snapshotId},action);});
}
function actionForm(v,c,snapshot,existing) {
  const el=modal(`<h2>${existing?'Editar ação declarada':'Nova ação declarada'}</h2><p class="warnbox">Ação local não verificada e independente do snapshot emitido. Responsável é informado por função, sem autenticação.</p>
    <label>Função responsável *</label><input id="action-owner" maxlength="120" value="${esc(existing?.responsavelFuncao||'')}" placeholder="Ex.: manutenção predial">
    <label>Prazo *</label><input id="action-deadline" type="date" value="${esc(existing?.prazo||'')}">
    <label>Estado declarado</label><select id="action-state">${[['aberta','Aberta'],['em-execucao','Em execução'],['concluida','Concluída'],['cancelada','Cancelada']].map(([value,label])=>`<option value="${value}" ${existing?.estado===value?'selected':''}>${label}</option>`).join('')}</select>
    <label>Observação (máximo 500 caracteres)</label><textarea id="action-note" maxlength="500" rows="3">${esc(existing?.observacao||'')}</textarea><p class="mut small">Não inclua nomes, documentos pessoais ou dados sensíveis. A observação fica no aparelho e no backup local.</p>
    <div class="row wrap"><button class="btn grow" id="save-action">Salvar ação</button>${existing?'<button class="btn bad sm" id="delete-action">Excluir ação</button>':''}<button class="btn ghost sm" id="cancel-action">Cancelar</button></div>`);
  el.querySelector('#cancel-action').onclick=()=>{closeModal();route();};
  el.querySelector('#save-action').onclick=async()=>{
    const estado=el.querySelector('#action-state').value,concluidaEm=estado==='concluida'?(existing?.concluidaEm||Date.now()):null;
    const action={id:existing?.id||DB.uid(),constatacaoId:c.id,vistoriaId:v.id,snapshotId:snapshot.id,responsavelFuncao:el.querySelector('#action-owner').value.trim(),prazo:el.querySelector('#action-deadline').value,estado,concluidaEm,observacao:el.querySelector('#action-note').value.trim()};
    try{await DB.putAcao(action,existing?.rowVersion||0);toast('Ação declarada salva; permanece não verificada.');closeModal();route();}
    catch(error){if(error.code==='ACAO_CONFLICT'&&existing){const latest=await DB.get('acoes',existing.id);if(latest){existing.rowVersion=latest.rowVersion;toast(`Ação alterada em outra tela. Versão atual: ${latest.estado}; função ${latest.responsavelFuncao}; prazo ${latest.prazo}; observação: ${(latest.observacao||'—').slice(0,120)}. Seu rascunho está preservado; revise e salve novamente para substituir.`,8000);}else if(await confirmar('A ação foi removida em outra tela. Deseja registrar seus campos preservados como uma nova ação?')){existing.id=DB.uid();existing.rowVersion=0;existing.criadoEm=null;existing.atualizadoEm=null;toast('Rascunho preservado como nova ação. Revise e pressione Salvar novamente.',6000);}else toast('A ação foi removida em outra tela. Seus campos permanecem no formulário.',6000);}else toast(error.message,5000);}
  };
  const remove=el.querySelector('#delete-action');if(remove)remove.onclick=async()=>{if(!await confirmar('Excluir esta declaração local? O snapshot emitido não será alterado.'))return;try{await DB.deleteAcao(existing.id,existing.rowVersion);toast('Ação removida. O snapshot permanece intacto.');closeModal();route();}catch(error){toast(error.message,5000);}};
}

/* ---------- EMISSÃO ---------- */
async function vEmitir(tb, v, o, fotos) {
  const ems = (await DB.by('emissoes', 'vistoriaId', v.id)).sort((a, b) => b.data - a.data);
  const sns = await DB.by('snapshots', 'vistoriaId', v.id), snEst = {};
  for (const e of ems) snEst[e.id] = await SnapshotLib.verificarEmissao(e, sns.find(s => s.id === e.snapshotId));
  const ars = await DB.all('arquivosEmitidos'), arEst = {};
  for (const e of ems) arEst[e.id] = e.snapshotId ? await SnapshotLib.verificarArquivo(e, sns.find(s => s.id === e.snapshotId), ars.find(a => a.emissaoId === e.id)) : null;
  const AR_TXT = { verificado: '✓ preservado, SHA-256 confere', ausente: '⚠ ausente neste aparelho (não verificado)', divergente: '⚠ divergente' };
  const SN_TXT = { verificado: '✓ Integridade confere (SHA-256); não indica autoria', legado: 'Sem snapshot verificável (emissão anterior)', ausente: '⚠ Snapshot ausente neste aparelho', divergente: '⚠ Snapshot divergente' };
  const semDesc = fotos.filter(f => !f.descricao).length;
  const chk = [];
  if (!v.local) chk.push('Informe o local visitado'); if (!fotos.length) chk.push('Nenhuma foto registrada');
  if (semDesc) chk.push(`${semDesc} foto(s) sem descrição`); if (!v.objetivo) chk.push('Objetivo não preenchido');
  if (!v.conclusao) chk.push('Conclusão não preenchida'); if (!S.rt.crea) chk.push('CREA do responsável técnico não informado (Ajustes)');
  const last = t => ems.find(e => e.tipo === t);
  const autoRev = t => !!last(t) && v.updatedAt > last(t).data;
  tb.innerHTML = `${chk.length ? `<div class="warnbox"><b>Antes de emitir:</b><br>• ${chk.map(esc).join('<br>• ')}</div>` : '<div class="okbox">Tudo pronto para emitir.</div>'}
    <div class="card"><div class="sw"><input type="checkbox" id="off"><label for="off">Emissão oficial (gera número, registra no painel)</label></div>
    <div class="mut small">Desmarcado (padrão) = rascunho com marca d'água, sem número e sem registro. Marque só ao emitir o documento final.</div>
    <div class="sw" id="rvw" ${(last('tecnico') || last('fotografico') || last('consolidado')) ? '' : 'hidden'}><input type="checkbox" id="nrev"><label for="nrev">Emitir como <b>nova revisão</b> (o conteúdo mudou desde a última emissão)</label></div></div>
    <div class="card"><b>Memorial de Vistoria Técnica</b> ${last('tecnico') ? `<span class="chip">Rev. ${pad(last('tecnico').rev)}</span>` : ''}<div class="mut small">Identificação, constatações com fotos, quadro-resumo, conclusão e recomendações.</div>
      <div class="row" style="margin-top:10px"><button class="btn grow" data-e="tecnico:docx">Word (.docx)</button><button class="btn grow" data-e="tecnico:pdf">PDF</button></div></div>
    <div class="card"><b>Memorial Fotográfico</b> ${last('fotografico') ? `<span class="chip">Rev. ${pad(last('fotografico').rev)}</span>` : ''}<div class="mut small">Todas as fotos com legenda, data, hora e coordenadas (2 por página).</div>
      <div class="row" style="margin-top:10px"><button class="btn grow" data-e="fotografico:docx">Word (.docx)</button><button class="btn grow" data-e="fotografico:pdf">PDF</button></div></div>
    <div class="card" style="border-color:var(--a)"><b>Relatório Consolidado</b> ${last('consolidado') ? `<span class="chip">Rev. ${pad(last('consolidado').rev)}</span>` : ''}<div class="mut small">Vistoria técnica e registro fotográfico em um único documento, com uma só capa e um só cabeçalho (numeração RC).</div>
      <div class="row" style="margin-top:10px"><button class="btn grow" data-e="consolidado:docx">Word (.docx)</button><button class="btn grow" data-e="consolidado:pdf">PDF</button></div></div>
    <h3>Histórico de emissões</h3>${ems.map(e => `<div class="card small"><b>${esc(e.numero)} · Rev. ${esc(pad(e.rev))}</b> <span class="chip mut">${esc(String(e.formato||'').toUpperCase())}</span><div class="mut">${esc(tipoNome(e.tipo))} · ${esc(Rep.fTs(e.data))}${e.usuario ? ' · ' + esc(e.usuario) : ''}</div><div class="mut small">${esc(SN_TXT[snEst[e.id].estado]||'Estado indisponível')}${e.snapshotHash ? ' · ' + esc(e.snapshotHash.slice(0, 12)) : ''}</div>${arEst[e.id] ? `<div class="mut small">Arquivo original: ${esc(AR_TXT[arEst[e.id].estado]||'Estado indisponível')}</div>${arEst[e.id].estado === 'verificado' ? `<button class="btn ghost" data-arq="${esc(e.id)}">Baixar original verificado</button>` : ''}` : ''}</div>`).join('') || '<div class="mut small">Nenhuma emissão registrada.</div>'}`;
  tb.querySelectorAll('[data-arq]').forEach(b => b.onclick = async () => {
    const e = ems.find(x => x.id === b.dataset.arq); const a = (await DB.all('arquivosEmitidos')).find(x => x.emissaoId === e.id);
    const r = await SnapshotLib.verificarArquivo(e, sns.find(s => s.id === e.snapshotId), a);
    if (r.estado !== 'verificado') return toast('Arquivo não verificado: ' + r.detalhe, 5000);
    baixar(a.blob, a.arquivo);
  });
  const nrev = $('#nrev'); if (nrev) nrev.checked = autoRev('tecnico') || autoRev('fotografico') || autoRev('consolidado');
  tb.querySelectorAll('[data-e]').forEach(b => b.onclick = async () => {
    const [tipo, fmt] = b.dataset.e.split(':'); b.disabled = true; const txt = b.textContent; b.textContent = 'Gerando…';
    try { await emitir(v.id, tipo, fmt, $('#off').checked, nrev && nrev.checked); } catch (e) { console.error(e); toast('Erro ao gerar: ' + e.message, 5000); }
    b.disabled = false; b.textContent = txt;
  });
}
async function emitir(vid, tipo, fmt, oficial, novaRev) {
  const v = await DB.get('vistorias', vid), o = await DB.get('obras', v.obraId);
  const fotos = (await DB.by('fotos', 'vistoriaId', vid)).sort(byTs);
  for (const f of fotos) f.bytes = new Uint8Array(await f.blob.arrayBuffer());
  let rev = 0, numero = null;
  if (oficial) {
    const r = await DB.reservarNumeracao(vid, new Date().getFullYear()); v.seq = r.seq; v.ano = r.ano;
    numero = { seq: v.seq, ano: v.ano };
    const ant = (await DB.by('emissoes', 'vistoriaId', vid)).filter(e => e.tipo === tipo);
    if (ant.length) rev = Math.max(...ant.map(e => e.rev)) + (novaRev ? 1 : 0);
  }
  /* Estado único: relatório e snapshot usam esta cópia (structuredClone antes de qualquer await adicional). */
  const C = structuredClone({ obra: o, vistoria: v, fotos, S });
  /* Oficial: congela o conteúdo emitido e calcula o SHA-256 ANTES de gerar/registrar a emissão. */
  let snap = null;
  if (oficial) {
    const conteudo = await SnapshotLib.capturar({ obra: C.obra, vistoria: C.vistoria, fotos: C.fotos, cfg: { empresa: C.S.empresa, rt: C.S.rt, usuario: C.S.usuario || '' }, emissao: { tipo, numero, rev }, appVersion: CGU.version });
    snap = await SnapshotLib.criar({ id: DB.uid(), emissaoId: DB.uid(), formato: fmt, conteudo, appVersion: CGU.version });
  }
  const ctx = { settings: C.S, obra: C.obra, vistoria: C.vistoria, fotos: C.fotos, numero, rev, draft: !oficial };
  const model = tipo === 'tecnico' ? Rep.buildTecnico(ctx) : tipo === 'consolidado' ? Rep.buildConsolidado(ctx) : Rep.buildFotografico(ctx);
  const blob = fmt === 'docx' ? await Rep.toDocx(model, C.S, logo) : await Rep.toPdf(model, C.S, logo);
  const pref = { tecnico: 'VT', fotografico: 'MF', consolidado: 'RC' }[tipo];
  const nome = oficial ? `${pref}-${pad(v.seq, 3)}-${v.ano}_Rev${pad(rev)}_${slug(o.nome)}_${slug(v.local)}.${fmt}` : `RASCUNHO_${pref}_${slug(o.nome)}_${slug(v.local)}.${fmt}`;
  if (oficial) {
    const arq = await SnapshotLib.criarArquivo({ id: DB.uid(), snapshot: snap, arquivo: nome, blob });
    await DB.registrarEmissao(snap, { id: snap.emissaoId, vistoriaId: v.id, obraId: o.id, tipo, formato: fmt, numero: model.meta.numero, rev, data: Date.now(), arquivo: nome, usuario: C.S.usuario || '', snapshotId: snap.id, snapshotHash: snap.hash, arquivoSha256: arq.sha256, arquivoId: arq.id }, arq);
    const x = await DB.get('vistorias', vid); if (x.status !== 'emitido') { x.status = 'emitido'; await DB.put('vistorias', x); }
  }
  const el = modal(`<h2>Arquivo pronto</h2><div class="card small"><b>${esc(nome)}</b><div class="mut">${(blob.size / 1024).toFixed(0)} KB${oficial ? ' · registrado no painel' : ' · rascunho (sem registro)'}</div></div>
    <div class="row wrap"><button class="btn grow" id="dl">Baixar</button><button class="btn sec grow" id="sh">Compartilhar</button></div><button class="btn ghost block" id="cl" style="margin-top:10px">Fechar</button>`, () => route());
  el.querySelector('#dl').onclick = () => baixar(blob, nome);
  el.querySelector('#sh').onclick = () => compartilhar(blob, nome);
  el.querySelector('#cl').onclick = closeModal;
}
function baixar(blob, nome) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nome; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 5000); }
async function compartilhar(blob, nome) {
  const file = new File([blob], nome, { type: blob.type });
  try { if (navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file], title: nome }); else toast('Este aparelho não compartilha arquivos: use Baixar.', 3500); } catch (e) { if (e.name !== 'AbortError') toast('Não foi possível compartilhar'); }
}

/* ---------- PAINEL ADMINISTRATIVO ---------- */
const filtro = { obra: '', status: '', q: '', de: '', ate: '', grupo: 'obra' };
let analyticsWindowMonths = 12;
async function sha(s) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); }
async function vPainel(view) {
  setTitle('Painel administrativo', ''); setNav('painel');
  if (S.pinHash && sessionStorage.getItem('cgu-adm') !== S.pinHash) {
    view.innerHTML = `<div class="pin card"><h2>Acesso restrito</h2><p class="mut small">Digite o PIN do painel</p><input id="pin" type="password" inputmode="numeric" maxlength="12" autofocus><button class="btn block" id="go" style="margin-top:12px">Entrar</button></div>`;
    $('#go').onclick = async () => { if (await sha($('#pin').value) === S.pinHash) { sessionStorage.setItem('cgu-adm', S.pinHash); route(); } else toast('PIN incorreto'); };
    $('#pin').onkeydown = e => { if (e.key === 'Enter') $('#go').click(); }; return;
  }
  const [obras, vs, ems, snaps, acoes] = await Promise.all([DB.all('obras'), DB.all('vistorias'), DB.all('emissoes'), DB.all('snapshots'), DB.all('acoes')]);
  const taxonomia = typeof Taxonomia !== 'undefined' ? Taxonomia : null;
  const sistemaPorTipo = Object.fromEntries((taxonomia?.TIPOS || []).map(item => [item.label, item.group]));
  const grupoPorAmbiente = Object.fromEntries((taxonomia?.AMBIENTES || []).map(item => [item.label, item.group]));
  let resumo = null;
  try {
    if (typeof Analytics !== 'undefined' && typeof Analytics.resumir === 'function') resumo = await Analytics.resumir({ obras, vistorias: vs, emissoes: ems, snapshots: snaps, snapshotLib: SnapshotLib, sistemaPorTipo, grupoPorAmbiente, taxonomia, asOf: hoje(), janelaMeses: analyticsWindowMonths });
  } catch (e) { console.error('Indicadores locais indisponíveis:', e); }
  const listaDimensao = xs => xs.length ? `<ul class="small">${xs.map(x => `<li>${esc(x.label)}: <b>${x.count}</b></li>`).join('')}</ul>` : '<p class="mut small">Sem dados verificáveis nesta dimensão.</p>';
  const om = Object.fromEntries(obras.map(o => [o.id, o]));
  const dentro = v => (!filtro.obra || v.obraId === filtro.obra) && (!filtro.status || v.status === filtro.status) && (!filtro.de || v.data >= filtro.de) && (!filtro.ate || v.data <= filtro.ate) && (!filtro.q || ((v.local || '') + ' ' + (om[v.obraId]?.nome || '')).toLowerCase().includes(filtro.q.toLowerCase()));
  const F = vs.filter(dentro).sort((a, b) => b.data.localeCompare(a.data));
  const ids = new Set(F.map(v => v.id)); const E = ems.filter(e => ids.has(e.vistoriaId)).sort((a, b) => b.data - a.data);
  const vm = Object.fromEntries(vs.map(v => [v.id, v]));
  const nFotos = F.reduce((a, v) => a + (v.nFotos || 0), 0);
  let actionSummary=null;
  try{if(resumo&&typeof Analytics?.summarizeActions==='function')actionSummary=Analytics.summarizeActions(resumo.migrationRecords,snaps,acoes,{asOf:hoje()});}catch(error){console.error('Resumo de ações locais indisponível:',error);}
  const grupos = {};
  F.forEach(v => { const k = filtro.grupo === 'obra' ? (om[v.obraId]?.nome || '—') : (v.local || 'Sem local'); (grupos[k] ||= []).push(v); });
  const analyticsSection = !resumo ? '<section class="card warnbox"><b>Indicadores locais indisponíveis.</b> A lista de vistorias continua disponível; atualize o aplicativo ou tente novamente.</section>' : `
    <section class="card" aria-labelledby="local-analytics-title"><h2 id="local-analytics-title">Indicadores dos relatórios neste aparelho</h2>
      <label for="analytics-window">Período da análise</label><select id="analytics-window"><option value="12" ${analyticsWindowMonths === 12 ? 'selected' : ''}>Últimos 12 meses</option><option value="24" ${analyticsWindowMonths === 24 ? 'selected' : ''}>Últimos 24 meses</option><option value="all" ${analyticsWindowMonths === null ? 'selected' : ''}>Todo o histórico</option></select><p class="mut small">Janela: ${esc(resumo.period.label)}. Vistorias sem data válida ficam fora das janelas limitadas. Taxonomia interna do app, não institucional.</p>
      <p class="warnbox">Visão local, não consolidada: os números cobrem somente este navegador e o inventário nele cadastrado. Snapshot verificado indica consistência interna, não autoria nem validação institucional, e não confere os bytes do PDF/DOCX. Os filtros de lista abaixo não alteram estes indicadores.</p>
      <div class="kpis"><div class="kpi"><span>EDIFÍCIOS COM SNAPSHOT VERIFICÁVEL NA JANELA</span><b>${Analytics.formatRatio(resumo.kpis.coverage)}</b><span>Período acima; inventário local cadastrado</span></div>
        <div class="kpi"><span>DENSIDADE ALTA/CRÍTICA</span><b>${Analytics.formatDensity(resumo.kpis.severeDensity)}</b><span>Constatações por vistoria verificável; razão, não percentual</span></div>
        <div class="kpi"><span>FORMALIZAÇÃO LOCAL</span><b>${Analytics.formatRatio(resumo.kpis.formalization)}</b><span>Vistorias com emissão / vistorias cadastradas</span></div>
        <div class="kpi"><span>INTEGRIDADE DO SNAPSHOT</span><b>${Analytics.formatRatio(resumo.kpis.snapshotIntegrity)}</b><span>Vistorias com snapshot verificado / vistorias com emissão</span></div>
        <div class="kpi"><span>CONSTATAÇÕES COM FOTO VINCULADA</span><b>${Analytics.formatRatio(resumo.kpis.photoAssociation)}</b><span>Constatações com foto existente / constatações verificáveis</span></div>
        <div class="kpi"><span>GPS DE INÍCIO DISPONÍVEL</span><b>${Analytics.formatRatio(resumo.kpis.gpsAvailability)}</b><span>Indicador descritivo; não compõe nota de qualidade</span></div>
        <div class="kpi"><span>VÍNCULOS EXPLÍCITOS DE RECORRÊNCIA DECLARADOS</span><b>${Analytics.formatRatio(resumo.kpis.recurrence)}</b><span>Constatações com vínculo selecionado por pessoa / constatações verificáveis; declaração local, sem inferência</span></div></div>
      <div class="grid2"><div><h3>Constatações por gravidade</h3>${listaDimensao(resumo.dimensions.severity)}<h3>Constatações por grupo do sistema (catálogo da interface)</h3>${listaDimensao(resumo.dimensions.systemGroup)}</div>
        <div><h3>Constatações por macroambiente (catálogo da interface)</h3>${listaDimensao(resumo.dimensions.environmentGroup)}<h3>Vistorias por mês</h3>${listaDimensao(resumo.dimensions.month)}</div></div>
      <div class="grid2"><div><h3>Lacunas cadastrais no inventário local</h3>${resumo.dataGaps.length ? `<ul class="small">${resumo.dataGaps.map(g => `<li>${esc(g.field)}: <b>${g.count}</b> · IDs: ${g.ids.map(id => `<code title="${esc(id)}">${esc(id.length > 15 ? id.slice(0, 8) + '…' + id.slice(-4) : id)}</code>`).join(', ')}${g.truncated ? ' · lista limitada aos 50 primeiros IDs' : ''}</li>`).join('')}</ul>` : '<p class="mut small">Nenhuma lacuna nos campos avaliados.</p>'}</div><div><h3>Candidatos a duplicata</h3>${!resumo.duplicateCandidatesAvailable ? '<p class="mut small">Indisponível neste contexto seguro; os demais indicadores seguem disponíveis.</p>' : resumo.duplicateCandidates.length ? `<p class="mut small">${resumo.duplicateCandidatesTotal} par(es); lista limitada a 200.</p><ul class="small">${resumo.duplicateCandidates.map(d => `<li><code title="${esc(d.vistoriaIdA)}">${esc(d.vistoriaIdA.slice(0, 8))}…</code> ↔ <code title="${esc(d.vistoriaIdB)}">${esc(d.vistoriaIdB.slice(0, 8))}…</code> · aviso, sem mescla</li>`).join('')}</ul>` : '<p class="mut small">Nenhum par candidato nesta janela.</p>'}</div></div>
      <div class="card"><b>Exportação local restrita</b><p class="mut small">Baixa apenas por ação explícita. O agregado não inclui texto livre, nomes, GPS ou fotos. O manifesto pode incluir IDs somente se a opção abaixo for marcada. Não compartilhe nem centralize sem aprovação de privacidade.</p><label><input type="checkbox" id="analytics-include-ids"> Incluir IDs estáveis no manifesto (desativado por padrão)</label><div class="row wrap"><button class="btn sec sm" id="analytics-export-aggregate">Baixar agregado analítico</button><button class="btn sec sm" id="analytics-export-manifest">Baixar manifesto de migração</button></div></div>
      <div class="warnbox"><b>Limites do indicador:</b> recorrência conta somente vínculos explícitos declarados por usuário (sem inferência automática); saneamento verificado não é calculado; risco não é calculado porque falta rubrica aprovada de probabilidade/impacto. ${resumo.counts.periodUnverifiedLatestEmissions} vistoria(s) da janela com emissão mais recente sem snapshot verificável ou com snapshots empatados divergentes foram excluídas das dimensões. ${resumo.stale.inspectionsEditedAfterEmission} vistoria(s) foram editadas após a emissão considerada; os indicadores refletem o conteúdo congelado na emissão.</div>
    </section>`;
  view.innerHTML = `
    <div class="kpis"><div class="kpi"><b>${new Set(F.map(v => v.obraId)).size}</b><span>EDIFÍCIOS</span></div><div class="kpi"><b>${F.length}</b><span>VISTORIAS</span></div><div class="kpi"><b>${F.filter(v => v.status === 'emitido').length}</b><span>EMITIDAS</span></div><div class="kpi"><b>${F.filter(v => v.status !== 'emitido').length}</b><span>EM RASCUNHO</span></div><div class="kpi"><b>${nFotos}</b><span>FOTOS</span></div><div class="kpi"><b>${E.length}</b><span>LINHAS DE EMISSÃO</span></div></div>
    ${analyticsSection}${!actionSummary ? '<section class="card warnbox"><b>Indicadores de ações indisponíveis.</b> A lista de vistorias continua disponível.</section>' : `<section class="card"><h3>Ações declaradas ligadas às constatações selecionadas verificáveis no período (${esc(resumo.period.label)})</h3><div class="kpi"><span>DECLARADAS COMO CONCLUÍDAS / DECLARADAS (CANCELADAS EXCLUÍDAS)</span><b>${actionSummary.completed} / ${actionSummary.declared}</b><span>${actionSummary.overdue} vencidas · ${actionSummary.aging30} abertas há mais de 30 dias · ${actionSummary.cancelled} canceladas</span></div><p class="mut small">Declarações locais, não verificadas; uma ação continua vinculada à constatação pelo ID estável mesmo quando ela aparece em nova revisão. Ações de constatações fora do período ou não selecionadas ficam fora. Emissão não confirma execução nem encerra ação. Não é indicador institucional nem de risco.</p><div class="kpi"><span>CONSTATAÇÕES ALTAS/CRÍTICAS SEM AÇÃO DECLARADA / TOTAL ELEGÍVEL</span><b>${actionSummary.highCriticalWithoutAction} / ${actionSummary.highCriticalTotal}</b></div></section>`}<div class="card"><div class="grid2"><div><label style="margin-top:0">Edifício</label><select data-f="obra"><option value="">Todos</option>${obras.map(o => `<option value="${esc(o.id)}" ${filtro.obra === o.id ? 'selected' : ''}>${esc(o.nome)}</option>`).join('')}</select></div>
      <div><label style="margin-top:0">Situação</label><select data-f="status"><option value="">Todas</option><option value="rascunho" ${filtro.status === 'rascunho' ? 'selected' : ''}>Rascunho</option><option value="emitido" ${filtro.status === 'emitido' ? 'selected' : ''}>Emitido</option></select></div>
      <div><label>De</label><input type="date" data-f="de" value="${esc(filtro.de)}"></div><div><label>Até</label><input type="date" data-f="ate" value="${esc(filtro.ate)}"></div></div>
      <label>Buscar local ou edifício</label><input data-f="q" type="search" value="${esc(filtro.q)}"></div>
    <div class="seg"><button data-g="obra" class="${filtro.grupo === 'obra' ? 'on' : ''}">Agrupar por edifício</button><button data-g="local" class="${filtro.grupo === 'local' ? 'on' : ''}">Agrupar por local visitado</button></div>
    ${Object.keys(grupos).sort().map(k => { const g = grupos[k]; const ge = E.filter(e => g.some(v => v.id === e.vistoriaId)); return `<h3>${esc(k)} <span class="mut small">· ${g.length} vistoria(s) · ${ge.length} emissão(ões)</span></h3><div class="tw"><table><tr><th>Nº</th><th>${filtro.grupo === 'obra' ? 'Local' : 'Edifício'}</th><th>Data</th><th>Situação</th><th>Fotos</th><th>Última emissão</th></tr>${g.map(v => { const le = E.find(e => e.vistoriaId === v.id); return `<tr data-go="#/vistoria/${esc(v.id)}" style="cursor:pointer"><td>${v.seq ? 'VT-' + esc(pad(v.seq, 3)) + '/' + esc(v.ano) : '—'}</td><td>${esc(filtro.grupo === 'obra' ? (v.local || '—') : (om[v.obraId]?.nome || '—'))}</td><td>${esc(Rep.fData(v.data))}</td><td>${stChip(v)}</td><td>${Number(v.nFotos)||0}</td><td>${le ? 'Rev. ' + esc(pad(le.rev)) + ' · ' + esc(Rep.fTs(le.data).slice(0, 10)) : '—'}</td></tr>`; }).join('')}</table></div>`; }).join('') || '<div class="empty">Nenhuma vistoria para os filtros.</div>'}
    <div class="row sp"><h2>Registro de emissões</h2><button class="btn sec sm" id="csv">Exportar CSV</button></div>
    <div class="tw"><table><tr><th>Data/hora</th><th>Documento</th><th>Rev.</th><th>Tipo</th><th>Fmt</th><th>Edifício · Local</th><th>Emitido por</th></tr>${E.slice(0, 80).map(e => `<tr><td>${esc(Rep.fTs(e.data))}</td><td>${esc(e.numero)}</td><td>${esc(pad(e.rev))}</td><td>${esc(tipoNome(e.tipo, true))}</td><td>${esc(String(e.formato||'').toUpperCase())}</td><td>${esc((om[e.obraId]?.nome || '') + ' · ' + (vm[e.vistoriaId]?.local || ''))}</td><td>${esc(e.usuario || '')}</td></tr>`).join('') || '<tr><td colspan="7" class="mut">Sem emissões.</td></tr>'}</table></div>`;
  bindGo(view);
  const periodSelect = view.querySelector('#analytics-window');
  if (periodSelect) periodSelect.onchange = () => { analyticsWindowMonths = periodSelect.value === 'all' ? null : Number(periodSelect.value); route(); };
  const downloadAnalytics = async manifest => {
    if (typeof AnalyticsExport === 'undefined') return toast('Exportador analítico indisponível. Atualize o aplicativo.');
    const includeIds = manifest && Boolean(view.querySelector('#analytics-include-ids')?.checked);
    const warning = `Este arquivo contém indicadores locais de classe restrita${includeIds ? ' e IDs que permitem vincular o manifesto a registros deste aparelho' : ''}. Ele não contém texto livre, fotos ou GPS. Não compartilhe nem centralize sem autorização de privacidade. Continuar?`;
    if (!await confirmar(warning)) return;
    try {
      const options = { SnapshotLib, incluirIds: includeIds };
      const result = manifest ? await AnalyticsExport.gerarManifesto(resumo, options) : await AnalyticsExport.gerarAgregado(resumo, options);
      const name = manifest ? 'manifesto-migracao-local.json' : 'indicadores-analiticos-locais.json';
      baixar(new Blob([result.json], { type: 'application/json' }), name);
    } catch (error) { console.error(error); toast('Não foi possível preparar a exportação analítica.'); }
  };
  const aggregateButton = view.querySelector('#analytics-export-aggregate'); if (aggregateButton) aggregateButton.onclick = () => downloadAnalytics(false);
  const manifestButton = view.querySelector('#analytics-export-manifest'); if (manifestButton) manifestButton.onclick = () => downloadAnalytics(true);
  view.querySelectorAll('[data-f]').forEach(el => el.onchange = () => { filtro[el.dataset.f] = el.value; route(); });
  view.querySelectorAll('[data-f="q"]').forEach(el => { el.onchange = null; el.onkeydown = e => { if (e.key === 'Enter') { filtro.q = el.value; route(); } }; el.onblur = () => { if (filtro.q !== el.value) { filtro.q = el.value; route(); } }; });
  view.querySelectorAll('[data-g]').forEach(b => b.onclick = () => { filtro.grupo = b.dataset.g; route(); });
  $('#csv').onclick = () => {
    const rows = [['Data/hora', 'Documento', 'Revisão', 'Tipo', 'Formato', 'Edifício', 'Local', 'Arquivo', 'Emitido por', 'Snapshot SHA-256'], ...E.map(e => [Rep.fTs(e.data), e.numero, pad(e.rev), e.tipo, e.formato, om[e.obraId]?.nome || '', vm[e.vistoriaId]?.local || '', e.arquivo, e.usuario || '', e.snapshotHash || 'sem snapshot'])];
    baixar(new Blob(['﻿' + rows.map(r => r.map(Backup.csvCell).join(';')).join('\r\n')], { type: 'text/csv' }), `emissoes_CGU_${hoje()}.csv`);
  };
}

/* ---------- AJUSTES / BACKUP ---------- */
async function vAjustes(view) {
  setTitle('Ajustes', ''); setNav('ajustes');
  view.innerHTML = `
    <div class="card"><h3 style="margin-top:0">Órgão / unidade (cabeçalho e rodapé dos documentos)</h3>${fld('Nome', 'empresa.nome', S)}${fld('CNPJ', 'empresa.cnpj', S)}${fld('Endereço', 'empresa.endereco', S)}<div class="grid2">${fld('Telefone', 'empresa.fone', S)}${fld('E-mail', 'empresa.email', S)}</div></div>
    <div class="card"><h3 style="margin-top:0">Responsável técnico (assinatura)</h3>${fld('Nome', 'rt.nome', S)}<div class="grid2">${fld('Título', 'rt.titulo', S, { ph: 'Ex.: Engenheiro Civil' })}${fld('CREA', 'rt.crea', S, { ph: 'Ex.: 12345/D-DF' })}</div></div>
    <div class="card"><h3 style="margin-top:0">Vistoriador (este aparelho)</h3>${fld('Seu nome (aparece no registro de emissões)', 'usuario', S)}
      <div class="sw"><input type="checkbox" data-f="carimbo" id="st" ${S.carimbo ? 'checked' : ''}><label for="st">Gravar data, hora e GPS na própria imagem</label></div>
      <label>Tamanho máximo das fotos</label><select data-f="maxpx"><option value="1280" ${S.maxpx == 1280 ? 'selected' : ''}>Leve (1280 px)</option><option value="1600" ${S.maxpx == 1600 ? 'selected' : ''}>Padrão (1600 px)</option><option value="2400" ${S.maxpx == 2400 ? 'selected' : ''}>Alta (2400 px)</option></select></div>
    <div class="card"><h3 style="margin-top:0">PIN do painel administrativo</h3><p class="mut small">Impede que outra pessoa abra o Painel neste aparelho. É uma barreira simples de uso, não criptografia dos dados.</p>
      <div class="row"><input id="pin1" type="password" inputmode="numeric" placeholder="Novo PIN (4 a 12 dígitos)" maxlength="12"><button class="btn sm" id="sp">${S.pinHash ? 'Trocar' : 'Definir'}</button></div>${S.pinHash ? '<button class="btn ghost sm" id="rp" style="margin-top:8px">Remover PIN</button>' : ''}</div>
    <div class="card"><h3 style="margin-top:0">Backup e consolidação</h3><p class="mut small">Os dados ficam só neste aparelho. Exporte o backup para guardar ou para reunir vistorias de vários celulares: ao importar, os registros são <b>mesclados</b>, sem apagar os existentes.</p>
      <div class="row wrap"><button class="btn sec grow" id="ex">Exportar tudo (.json)</button><button class="btn sec grow" id="im">Importar backup</button></div><div class="mut small" id="stg" style="margin-top:8px"></div></div>
    <div class="card" id="inst"><h3 style="margin-top:0">Instalar no celular</h3><p class="small">Android (Chrome): menu ⋮ → <b>Instalar app</b>.<br>iPhone (Safari): <b>Compartilhar</b> → <b>Adicionar à Tela de Início</b>.</p><button class="btn sm" id="ib" hidden>Instalar agora</button></div>
    <p class="mut small" style="text-align:center">CGU Vistorias v${CGU.version} · funciona sem internet após o primeiro acesso</p>`;
  bindFields(view, S, () => saveSettings());
  $('#sp').onclick = async () => { const p = $('#pin1').value; if (!/^\d{4,12}$/.test(p)) return toast('Use de 4 a 12 dígitos'); S.pinHash = await sha(p); sessionStorage.setItem('cgu-adm', S.pinHash); await saveSettings(); toast('PIN definido'); route(); };
  const rp = $('#rp'); if (rp) rp.onclick = async () => { S.pinHash = ''; await saveSettings(); route(); };
  $('#ex').onclick = () => exportBackup(); $('#im').onclick = () => $('#impIn').click();
  if (deferredInstall) { $('#ib').hidden = false; $('#ib').onclick = () => { deferredInstall.prompt(); }; }
  if (navigator.storage?.estimate) navigator.storage.estimate().then(e => { $('#stg').textContent = `Armazenamento usado: ${(e.usage / 1048576).toFixed(1)} MB`; });
}
const blobToData = b => new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(b); });
async function exportBackup(obraId) {
  if (!await confirmar('Este backup contém dados de vistoria, fotos, GPS, dados profissionais (como CREA) e ações locais declaradas, incluindo função responsável e observações. O arquivo JSON não é criptografado; guarde-o somente em local autorizado. Continuar?')) return;
  toast('Preparando backup…');
  let obras = await DB.all('obras'), vs = await DB.all('vistorias'), ems = await DB.all('emissoes');
  if (obraId) { obras = obras.filter(o => o.id === obraId); vs = vs.filter(v => v.obraId === obraId); ems = ems.filter(e => e.obraId === obraId); }
  const vids = new Set(vs.map(v => v.id)),allEmissionCount=ems.length; ems=Backup.selectEmissionsForVistorias(ems,vids); const omittedEmissions=allEmissionCount-ems.length; if(omittedEmissions&&!await confirmar(`${omittedEmissions} emissão(ões) de vistorias excluídas ficarão fora deste backup; snapshots e arquivos associados também não serão exportados e permanecem somente no navegador. Se limpar os dados do navegador, eles serão perdidos. Prosseguir?`))return; const eids = new Set(ems.map(e => e.id)); const seqs = {};
  for (const k of [new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1]) seqs[k] = await DB.getSetting('seq-' + k, 0);
  const fotos=[]; for(const f of await DB.all('fotos')) if(vids.has(f.vistoriaId)) fotos.push(await Backup.photoJson(f,blobToData));
  const snapshots=(await DB.all('snapshots')).filter(x=>eids.has(x.emissaoId));
  const arquivos=[]; for(const a of await DB.all('arquivosEmitidos')) if(eids.has(a.emissaoId)){const {blob,...rest}=a;arquivos.push({...rest,data:await blobToData(blob)});}
  const acoes=(await DB.all('acoes')).filter(x=>vids.has(x.vistoriaId));
  const d={app:'cgu-vistorias',v:1,appVersion:CGU.version,exportadoEm:Date.now(),seqs,obras,vistorias:vs,emissoes:ems,fotos};
  if(snapshots.length)d.snapshots=snapshots;if(arquivos.length)d.arquivosEmitidos=arquivos;if(acoes.length)d.acoes=acoes;
  const blob=new Blob([JSON.stringify(d)],{type:'application/json'});
  if(blob.size>Backup.limits.MAX_BACKUP_BYTES) return toast('Backup excede o limite de 512 MiB.',5000);
  baixar(blob, `CGU-Vistorias_backup_${hoje()}.json`);
}
$('#impIn').addEventListener('change', async e => {
  const file = e.target.files[0]; e.target.value = ''; if (!file) return;
  try {
    if(file.size>Backup.limits.MAX_BACKUP_BYTES)throw new Error('Backup excede o limite de 512 MiB. Nada foi importado.');
    toast('Validando backup…'); const d=JSON.parse(await file.text());
    const checked=await Backup.validate(d,file.size,SnapshotLib); const photos=d.fotos.map(f=>({...Backup.decodePhoto(f),contentSha256:checked.photoHashes.get(f.id)}));
    const artifacts=(d.arquivosEmitidos||[]).map(a=>{const bytes=Backup.artifactData(a.data,a.mime,a.bytes);return {...a,blob:new Blob([bytes],{type:a.mime})};});
    const snapshots=d.snapshots||[], snapById=new Map(snapshots.map(s=>[s.id,s])), artifactById=new Map(artifacts.map(a=>[a.id,a]));
    let semSnapshot=0,semArquivo=0;
    for(const em of d.emissoes){const sn=em.snapshotId&&snapById.get(em.snapshotId);const estadoSnapshot=sn?(await SnapshotLib.verificarEmissao(em,sn)).estado:(em.snapshotId?'ausente':'legado');if(estadoSnapshot==='ausente')semSnapshot++;const ar=em.arquivoId&&artifactById.get(em.arquivoId);const estadoArquivo=ar?(await SnapshotLib.verificarArquivo(em,sn,ar)).estado:'ausente';if(estadoArquivo==='ausente')semArquivo++;}
    const result=await DB.atomicImport({...checked.data,fotos:photos,arquivosEmitidos:artifacts,snapshots});
    const c=result.conflitos.length;
    toast(`Importação: ${result.novos} novos, ${result.duplicados} duplicados, ${c} conflitos locais preservados, ${semSnapshot} snapshots ausentes, ${semArquivo} arquivos ausentes.`,7000);
    if(c)modal(`<h2>Conflitos mantidos localmente</h2><p>Os itens locais não foram sobrescritos. Sem tombstones, itens apagados podem reaparecer na próxima importação.</p><ul>${result.conflitos.map(x=>`<li>${esc(x.store)} · ${esc(x.id)}</li>`).join('')}</ul><button class="btn block" id="cfclose">Fechar</button>`).querySelector('#cfclose').onclick=()=>{closeModal();route();};else route();
  } catch (err) { toast('Falha ao importar: ' + err.message, 5000); }
});

/* ---------- início ---------- */
let deferredInstall = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstall = e; });
(async () => {
  await DB.open(); await loadSettings(); await loadLogo();
  if (navigator.storage?.persist) navigator.storage.persist().then(ok=>{if(!ok)toast('O navegador não garantiu armazenamento persistente. Exporte backup regularmente.',6000);}).catch(()=>toast('Não foi possível confirmar armazenamento persistente. Exporte backup regularmente.',6000));
  document.querySelector('#version').textContent = `v${CGU.version} · ${CGU.updated}`;
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(() => { });
  route();
})();
