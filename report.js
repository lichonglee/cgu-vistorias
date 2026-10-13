/* CGU Vistorias — geração dos memoriais (Word e PDF) no padrão de identidade da Controladoria-Geral da União.
   Um único modelo de blocos alimenta os dois formatos. Roda 100% no aparelho. */
const Rep = (() => {
  const BLUE = '002543', DARK = '002543', INK = '002543', SOFT = 'EAF4FA', LINE = 'CEDFE9', MUTED = '5B6B88';
  const GRAV = { 'Informativa': '6B7A99', 'Baixa': '2E8B57', 'Média': 'B7791F', 'Alta': 'D2691E', 'Crítica': 'C0392B' };
  const pad = (n, l = 2) => String(n).padStart(l, '0');
  const fData = d => { if (!d) return '—'; const [y, m, dd] = d.split('-'); return `${dd}/${m}/${y}`; };
  const fTs = t => { const d = new Date(t); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`; };
  const fLoc = f => (f.lat == null ? 'Localização não disponível' :
    `Lat ${f.lat.toFixed(6)} / Lon ${f.lon.toFixed(6)}${f.acc ? ' (±' + Math.round(f.acc) + ' m)' : ''}`);
  const descF = f => (f.descricao || 'Sem descrição') + ((f.notas||[]).filter(n=>n.txt).length ? '  |  ' + f.notas.filter(n=>n.txt).map(n=>`(${n.n}) ${n.txt}`).join('; ') : '');
  const legenda = f => `${fTs(f.ts)} · ${fLoc(f)}`;
  const fotoInfo = 'As imagens foram capturadas pela câmera ou importadas da galeria. As legendas indicam a data registrada pelo aplicativo e a localização quando disponível. Nas imagens importadas, a data corresponde à data do arquivo informada pelo aparelho, sem atribuição de coordenadas GPS.';
  const orgInfo = (S, endereco = false) => [S.empresa.nome, S.empresa.cnpj && 'CNPJ ' + S.empresa.cnpj, endereco && S.empresa.endereco].filter(Boolean).join(' · ');
  const nn = n => pad(n);

  /* ---------- modelos ---------- */
  function head(ctx, titulo, prefixo) {
    const { vistoria: v, obra: o, rev, draft } = ctx;
    const numero = ctx.numero ? `${prefixo}-${pad(ctx.numero.seq, 3)}/${ctx.numero.ano}` : `${prefixo}-RASCUNHO`;
    return { numero, titulo, rev: pad(rev), draft, obra: o.nome, local: v.local };
  }

  function buildTecnico(ctx, cons) {
    const { settings: S, obra: o, vistoria: v, fotos } = ctx;
    const meta = cons ? head(ctx, 'RELATÓRIO CONSOLIDADO DE VISTORIA', 'RC') : head(ctx, 'MEMORIAL DE VISTORIA TÉCNICA', 'VT');
    const idx = {}; fotos.forEach((f, i) => idx[f.id] = i + 1);
    const B = [];
    B.push({ t: 'cover', title: meta.titulo, sub: v.tipo || 'Vistoria técnica', rows: [
      ['Documento nº', `${meta.numero}  ·  Revisão ${meta.rev}`],
      ['Edifício', o.nome], ['Cliente', o.cliente || '—'], ['Local visitado', v.local || '—'],
      ['Data da vistoria', `${fData(v.data)}${v.hora ? ' às ' + v.hora : ''}`],
      ...(cons ? [['Conteúdo', `Memorial de vistoria técnica e registro fotográfico (${fotos.length} foto${fotos.length === 1 ? '' : 's'})`]] : []),
      ['Responsável técnico', [S.rt.nome, S.rt.titulo, S.rt.crea && 'CREA ' + S.rt.crea].filter(Boolean).join(' · ') || '—'],
    ] });
    B.push({ t: 'h1', text: '1. IDENTIFICAÇÃO' });
    B.push({ t: 'kv', rows: [
      ['Edifício', o.nome], ['Cliente / contratante', o.cliente || '—'], ['Endereço do edifício', o.endereco || '—'],
      ['Contrato / ART / RRT', [o.contrato, o.art].filter(Boolean).join(' · ') || '—'],
      ['Local visitado', v.local || '—'], ['Tipo de vistoria', v.tipo || '—'],
      ['Data e hora', `${fData(v.data)}${v.hora ? ' às ' + v.hora : ''}`],
      ['Condições climáticas', v.clima || '—'], ['Participantes', v.participantes || '—'],
      ['Coordenadas (início da vistoria)', v.gps ? `${v.gps.lat.toFixed(6)}, ${v.gps.lon.toFixed(6)}${v.gps.acc ? ' (±' + Math.round(v.gps.acc) + ' m)' : ''}` : 'Não registrada'],
    ] });
    B.push({ t: 'h1', text: '2. OBJETIVO' });
    B.push({ t: 'p', text: v.objetivo || 'Não informado.' });
    B.push({ t: 'h1', text: '3. METODOLOGIA E DOCUMENTOS CONSULTADOS' });
    B.push({ t: 'p', text: v.metodologia || 'Inspeção visual realizada in loco, com registro fotográfico georreferenciado e datado.' });
    if (v.documentos) { B.push({ t: 'h2', text: 'Documentos e projetos consultados' }); B.push({ t: 'p', text: v.documentos }); }
    B.push({ t: 'h1', text: '4. DESCRIÇÃO DO LOCAL' });
    B.push({ t: 'p', text: v.descricao || 'Não informada.' });
    B.push({ t: 'h1', text: '5. CONSTATAÇÕES' });
    const C = v.constatacoes || [];
    if (!C.length) B.push({ t: 'p', text: 'Não foram registradas constatações específicas.' });
    C.forEach((c, i) => {
      B.push({ t: 'h2', text: `5.${i + 1}  ${c.titulo || 'Constatação'}`, tag: c.gravidade, tagColor: GRAV[c.gravidade] });
      if (c.local) B.push({ t: 'p', label: 'Local/elemento: ', text: c.local });
      if (c.descricao) B.push({ t: 'p', label: 'Descrição: ', text: c.descricao });
      if (c.recomendacao) B.push({ t: 'p', label: 'Recomendação: ', text: c.recomendacao });
      const ph = (c.fotoIds || []).map(id => fotos.find(f => f.id === id)).filter(Boolean);
      if (ph.length) B.push({ t: 'grid', items: ph.map(f => ({ f, cap1: `Foto ${nn(idx[f.id])} – ${descF(f)}`, cap2: legenda(f) })) });
    });
    if (C.length) {
      B.push({ t: 'h1', text: '6. QUADRO-RESUMO DAS CONSTATAÇÕES' });
      B.push({ t: 'table', head: ['Item', 'Constatação', 'Local/elemento', 'Gravidade', 'Fotos'], w: [0.07, 0.38, 0.22, 0.15, 0.18],
        rows: C.map((c, i) => [`5.${i + 1}`, c.titulo || '—', c.local || '—', { text: c.gravidade || '—', color: GRAV[c.gravidade] },
          (c.fotoIds || []).map(id => idx[id]).filter(Boolean).sort((a, b) => a - b).map(nn).join(', ') || '—']) });
    }
    B.push({ t: 'h1', text: `${C.length ? 7 : 6}. CONCLUSÃO` });
    B.push({ t: 'p', text: v.conclusao || 'Não informada.' });
    const rec = (v.recomendacoes || '').split('\n').map(s => s.trim()).filter(Boolean);
    B.push({ t: 'h1', text: `${C.length ? 8 : 7}. RECOMENDAÇÕES` });
    if (rec.length) B.push({ t: 'bullets', items: rec }); else B.push({ t: 'p', text: 'Sem recomendações adicionais.' });
    if (cons) {
      B.push({ t: 'pagebreak' });
      B.push({ t: 'h1', text: `${C.length ? 9 : 8}. REGISTRO FOTOGRÁFICO` });
      B.push({ t: 'p', text: fotoInfo, small: true });
      if (fotos.length) B.push({ t: 'photos', mh: 7.6, items: fotos.map((f, i) => ({ f, cap1: `Foto ${nn(i + 1)} – ${descF(f)}`, cap2: legenda(f) })) });
      else B.push({ t: 'p', text: 'Nenhuma foto registrada.' });
    } else {
      B.push({ t: 'p', text: `O registro fotográfico completo desta vistoria (${fotos.length} foto${fotos.length === 1 ? '' : 's'}) encontra-se no Memorial Fotográfico associado.`, small: true });
    }
    B.push({ t: 'sign', city: 'Brasília-DF', data: fData(v.data), rt: S.rt });
    return { blocks: B, meta };
  }
  function buildConsolidado(ctx) { return buildTecnico(ctx, true); }

  function buildFotografico(ctx) {
    const { settings: S, obra: o, vistoria: v, fotos } = ctx;
    const meta = head(ctx, 'MEMORIAL FOTOGRÁFICO', 'MF');
    const B = [];
    B.push({ t: 'cover', title: meta.titulo, sub: v.tipo || 'Vistoria técnica', rows: [
      ['Documento nº', `${meta.numero}  ·  Revisão ${meta.rev}`],
      ['Edifício', o.nome], ['Cliente', o.cliente || '—'], ['Local visitado', v.local || '—'],
      ['Data da vistoria', `${fData(v.data)}${v.hora ? ' às ' + v.hora : ''}`],
      ['Total de fotos', String(fotos.length)],
      ['Responsável técnico', [S.rt.nome, S.rt.titulo, S.rt.crea && 'CREA ' + S.rt.crea].filter(Boolean).join(' · ') || '—'],
    ] });
    B.push({ t: 'p', text: fotoInfo, small: true });
    B.push({ t: 'photos', items: fotos.map((f, i) => ({ f, cap1: `Foto ${nn(i + 1)} – ${descF(f)}`, cap2: legenda(f) })) });
    B.push({ t: 'sign', city: 'Brasília-DF', data: fData(v.data), rt: S.rt });
    return { blocks: B, meta };
  }

  /* ---------- tamanho de imagem dentro de caixa ---------- */
  function fit(f, maxW, maxH) { const r = Math.min(maxW / f.w, maxH / f.h); return { w: f.w * r, h: f.h * r }; }

  /* ================= WORD ================= */
  async function toDocx(model, S, logo) {
    const D = docx, { blocks, meta } = model;
    const FONT = 'Calibri', CM = 37.795;
    const A = D.AlignmentType;
    const run = (text, o = {}) => new D.TextRun({ text, font: FONT, size: o.size || 21, bold: o.bold, color: o.color || '222B3F', italics: o.italics, break: o.break });
    const lines = (text, o) => String(text).split('\n').map((l, i) => run(l, { ...o, break: i ? 1 : 0 }));
    const P = (children, o = {}) => new D.Paragraph({ children, alignment: o.align || A.LEFT, spacing: { before: o.before || 0, after: o.after ?? 120, line: o.line || 288, lineRule: D.LineRuleType.AUTO }, pageBreakBefore: o.pb, keepNext: o.keepNext, keepLines: o.keepLines, border: o.border, indent: o.indent, shading: o.shading });
    const border = c => ({ style: D.BorderStyle.SINGLE, size: 4, color: c || LINE });
    const allB = { top: border(), bottom: border(), left: border(), right: border() };
    const none = { style: D.BorderStyle.NONE, size: 0, color: 'FFFFFF' };
    const noB = { top: none, bottom: none, left: none, right: none };
    const W = 9638; // dxa úteis (A4, margens 2 cm)
    const cell = (children, w, o = {}) => new D.TableCell({ children, width: { size: w, type: D.WidthType.DXA }, borders: o.borders || allB, shading: o.fill ? { type: D.ShadingType.CLEAR, fill: o.fill, color: 'auto' } : undefined, margins: { top: 70, bottom: 70, left: 110, right: 110 }, verticalAlign: o.v });
    const img = (f, mw, mh) => { const s = fit(f, mw * CM, mh * CM); return new D.ImageRun({ type: 'jpg', data: f.bytes, transformation: { width: Math.round(s.w), height: Math.round(s.h) } }); };

    const out = [];
    let firstPhoto = true, photoCount = 0;
    for (const b of blocks) {
      if (b.t === 'cover') {
        out.push(P([new D.ImageRun({ type: 'png', data: logo.bytes, transformation: { width: Math.round(8.5 * CM), height: Math.round(8.5 * CM * logo.h / logo.w) } })], { align: A.CENTER, before: 600, after: 500 }));
        out.push(P([run(b.title, { size: 52, bold: true, color: DARK })], { align: A.CENTER, after: 80, line: 300 }));
        out.push(P([run(b.sub, { size: 26, color: BLUE })], { align: A.CENTER, after: 420 }));
        out.push(new D.Table({ width: { size: W, type: D.WidthType.DXA }, columnWidths: [2800, W - 2800], rows: b.rows.map(r => new D.TableRow({ children: [
          cell([P([run(r[0], { bold: true, color: 'FFFFFF', size: 20 })], { after: 0 })], 2800, { fill: DARK }),
          cell([P(lines(r[1], { size: 21 }), { after: 0 })], W - 2800, { fill: SOFT })] })) }));
        out.push(P([run('')], { after: 200 }));
        out.push(P([run(orgInfo(S), { size: 17, color: MUTED })], { align: A.CENTER, after: 0, before: 600 }));
        out.push(P([run(S.empresa.endereco, { size: 17, color: MUTED })], { align: A.CENTER, after: 0 }));
        out.push(P([run('')], { pb: true, after: 0 }));
      } else if (b.t === 'pagebreak') {
        out.push(P([run('')], { pb: true, after: 0 }));
      } else if (b.t === 'h1') {
        out.push(P([run(b.text, { bold: true, size: 25, color: DARK })], { before: 280, after: 140, keepNext: true, border: { bottom: { style: D.BorderStyle.SINGLE, size: 8, color: BLUE, space: 3 } } }));
      } else if (b.t === 'h2') {
        const ch = [run(b.text, { bold: true, size: 22, color: INK })];
        if (b.tag) ch.push(run('   [' + b.tag.toUpperCase() + ']', { bold: true, size: 18, color: b.tagColor || MUTED }));
        out.push(P(ch, { before: 200, after: 80, keepNext: true }));
      } else if (b.t === 'p') {
        const ch = []; if (b.label) ch.push(run(b.label, { bold: true, color: DARK }));
        ch.push(...lines(b.text, { size: b.small ? 18 : 21, color: b.small ? MUTED : undefined, italics: b.small }));
        out.push(P(ch, { align: b.small || b.label ? A.LEFT : A.JUSTIFIED }));
      } else if (b.t === 'bullets') {
        b.items.forEach(t => out.push(new D.Paragraph({ children: [run(t)], bullet: { level: 0 }, spacing: { after: 80, line: 288 } })));
      } else if (b.t === 'kv') {
        out.push(new D.Table({ width: { size: W, type: D.WidthType.DXA }, columnWidths: [3000, W - 3000], rows: b.rows.map(r => new D.TableRow({ cantSplit: true, children: [
          cell([P([run(r[0], { bold: true, color: DARK, size: 20 })], { after: 0 })], 3000, { fill: SOFT }),
          cell([P(lines(r[1], { size: 20 }), { after: 0 })], W - 3000)] })) }));
        out.push(P([run('')], { after: 60 }));
      } else if (b.t === 'table') {
        const cw = b.w.map(x => Math.round(x * W));
        out.push(new D.Table({ width: { size: W, type: D.WidthType.DXA }, columnWidths: cw, rows: [
          new D.TableRow({ tableHeader: true, children: b.head.map((h, i) => cell([P([run(h, { bold: true, color: 'FFFFFF', size: 19 })], { after: 0 })], cw[i], { fill: DARK })) }),
          ...b.rows.map((r, ri) => new D.TableRow({ cantSplit: true, children: r.map((c, i) => {
            const o = typeof c === 'object' ? c : { text: c };
            return cell([P([run(o.text, { size: 19, color: o.color, bold: !!o.color })], { after: 0 })], cw[i], { fill: ri % 2 ? 'F6F8FC' : undefined });
          }) }))] }));
        out.push(P([run('')], { after: 60 }));
      } else if (b.t === 'grid') {
        for (let i = 0; i < b.items.length; i += 2) {
          const row = b.items.slice(i, i + 2);
          out.push(new D.Table({ width: { size: W, type: D.WidthType.DXA }, columnWidths: [W / 2, W / 2], rows: [new D.TableRow({ cantSplit: true, children: [0, 1].map(k => {
            const it = row[k];
            if (!it) return cell([P([run('')], { after: 0 })], W / 2, { borders: noB });
            return cell([
              P([img(it.f, 7.9, 5.9)], { align: A.CENTER, after: 40, keepNext: true }),
              P([run(it.cap1, { bold: true, size: 17, color: INK })], { after: 0, keepNext: true, line: 250 }),
              P([run(it.cap2, { size: 15, color: MUTED })], { after: 80, line: 230 })], W / 2, { borders: noB });
          }) })] }));
        }
        out.push(P([run('')], { after: 60 }));
      } else if (b.t === 'photos') {
        b.items.forEach((it, i) => {
          const pb = i > 0 && i % 2 === 0;
          out.push(P([img(it.f, 15.5, b.mh || 8.8)], { align: A.CENTER, after: 60, pb, keepNext: true, before: i % 2 ? 300 : 0 }));
          out.push(P([run(it.cap1, { bold: true, size: 20, color: INK })], { align: A.CENTER, after: 20, keepNext: true }));
          out.push(P([run(it.cap2, { size: 17, color: MUTED })], { align: A.CENTER, after: 120 }));
        });
      } else if (b.t === 'sign') {
        out.push(P([run(`${b.city}, ${b.data}.`)], { before: 500, after: 700, keepNext: true }));
        out.push(P([run('_______________________________________')], { align: A.CENTER, after: 20, keepNext: true }));
        out.push(P([run(b.rt.nome || 'Responsável técnico', { bold: true })], { align: A.CENTER, after: 20, keepNext: true }));
        const l2 = [b.rt.titulo, b.rt.crea && 'CREA ' + b.rt.crea].filter(Boolean).join(' · ');
        if (l2) out.push(P([run(l2, { size: 19 })], { align: A.CENTER, after: 20, keepNext: true }));
        out.push(P([run(S.empresa.nome, { size: 19, color: BLUE })], { align: A.CENTER, after: 0 }));
      }
    }

    const logoRun = new D.ImageRun({ type: 'png', data: logo.bytes, transformation: { width: Math.round(2.6 * CM), height: Math.round(2.6 * CM * logo.h / logo.w) } });
    const rightTxt = `${meta.titulo} · ${meta.numero} · Rev. ${meta.rev}` + (meta.draft ? ' · RASCUNHO' : '');
    const header = new D.Header({ children: [new D.Table({ width: { size: W, type: D.WidthType.DXA }, columnWidths: [2900, W - 2900], rows: [new D.TableRow({ children: [
      cell([P([logoRun], { after: 0 })], 2900, { borders: { ...noB, bottom: { style: D.BorderStyle.SINGLE, size: 12, color: BLUE } } }),
      cell([P([run(rightTxt, { size: 16, color: meta.draft ? 'C0392B' : MUTED, bold: meta.draft }), run('', {}), ], { align: A.RIGHT, after: 0 }),
            P([run(`${meta.obra} — ${meta.local || ''}`, { size: 16, color: MUTED })], { align: A.RIGHT, after: 0 })], W - 2900, { borders: { ...noB, bottom: { style: D.BorderStyle.SINGLE, size: 12, color: BLUE } }, v: D.VerticalAlign.BOTTOM })] })] })] });
    const footer = new D.Footer({ children: [
      P([run(orgInfo(S, true), { size: 14, color: MUTED })], { align: A.CENTER, after: 0, border: { top: { style: D.BorderStyle.SINGLE, size: 6, color: LINE, space: 4 } } }),
      new D.Paragraph({ alignment: A.CENTER, children: [new D.TextRun({ children: ['Página ', D.PageNumber.CURRENT, ' de ', D.PageNumber.TOTAL_PAGES], font: FONT, size: 15, color: MUTED })] })] });
    const empty = new D.Header({ children: [new D.Paragraph('')] });
    const doc = new D.Document({
      creator: S.empresa.nome, title: `${meta.titulo} ${meta.numero}`, description: meta.obra,
      styles: { default: { document: { run: { font: FONT, size: 21 } } } },
      sections: [{ properties: { titlePage: true, page: { size: { width: 11906, height: 16838 }, margin: { top: 1900, bottom: 1250, left: 1134, right: 1134, header: 500, footer: 450 } } },
        headers: { default: header, first: empty }, footers: { default: footer, first: new D.Footer({ children: [new D.Paragraph('')] }) }, children: out }]
    });
    return D.Packer.toBlob(doc);
  }

  /* ================= PDF ================= */
  async function toPdf(model, S, logo) {
    const L = PDFLib, { blocks, meta } = model;
    const pdf = await L.PDFDocument.create();
    pdf.setTitle(`${meta.titulo} ${meta.numero}`); pdf.setAuthor(S.empresa.nome); pdf.setCreator('CGU Vistorias v' + CGU.version);
    const F = await pdf.embedFont(L.StandardFonts.Helvetica), FB = await pdf.embedFont(L.StandardFonts.HelveticaBold), FI = await pdf.embedFont(L.StandardFonts.HelveticaOblique);
    const logoImg = await pdf.embedPng(logo.bytes);
    const hex = h => L.rgb(parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255);
    const san = s => String(s ?? '').replace(/[^\n -~ -ÿ–—‘’“”•…€]/g, '?');
    const PW = 595.28, PH = 841.89, ML = 56.7, CW = PW - 2 * ML, TOP = PH - 92, BOT = 64, CM = 28.3465;
    const pages = []; let page, y, coverPage = null;
    const np = () => { page = pdf.addPage([PW, PH]); pages.push(page); y = TOP; };
    const need = h => { if (y - h < BOT) np(); };
    const wrap = (text, font, size, maxW) => {
      const out = [];
      for (const para of san(text).split('\n')) {
        let line = '';
        for (const word of para.split(/\s+/).filter(Boolean)) {
          let w = word;
          while (font.widthOfTextAtSize(w, size) > maxW) { // palavra maior que a linha
            let k = w.length; while (k > 1 && font.widthOfTextAtSize(w.slice(0, k), size) > maxW) k--;
            if (line) { out.push(line); line = ''; }
            out.push(w.slice(0, k)); w = w.slice(k);
          }
          const t = line ? line + ' ' + w : w;
          if (font.widthOfTextAtSize(t, size) <= maxW) line = t; else { out.push(line); line = w; }
        }
        out.push(line);
      }
      return out;
    };
    const drawLines = (lines, x, font, size, color, lh, justifyW) => {
      lines.forEach((ln, i) => {
        y -= lh;
        if (justifyW && i < lines.length - 1 && ln.includes(' ')) {
          const words = ln.split(' '), tw = words.reduce((a, w) => a + font.widthOfTextAtSize(w, size), 0);
          const gap = (justifyW - tw) / (words.length - 1); let cx = x;
          if (gap < size * 1.6) { words.forEach(w => { page.drawText(w, { x: cx, y, size, font, color }); cx += font.widthOfTextAtSize(w, size) + gap; }); return; }
        }
        page.drawText(ln, { x, y, size, font, color });
      });
    };
    const para = (text, o = {}) => {
      const size = o.size || 10.5, lh = size * 1.45, font = o.font || F, color = o.color || hex('222B3F');
      const lab = o.label ? san(o.label) : '';
      const labW = lab ? FB.widthOfTextAtSize(lab, size) : 0;
      let lines = wrap(text, font, size, CW - (o.indent || 0) - labW);
      if (lab) { // primeira linha ao lado do rótulo
        need(lh); y -= lh; page.drawText(lab, { x: ML + (o.indent || 0), y, size, font: FB, color: hex(DARK) });
        page.drawText(lines[0], { x: ML + (o.indent || 0) + labW, y, size, font, color }); lines = lines.slice(1); y += 0;
        if (lines.length) lines = wrap(lines.join(' '), font, size, CW - (o.indent || 0));
      }
      let i = 0;
      while (i < lines.length) {
        const room = Math.floor((y - BOT) / lh); if (room < 1) { np(); continue; }
        const chunk = lines.slice(i, i + room); i += chunk.length;
        drawLines(chunk, ML + (o.indent || 0), font, size, color, lh, o.justify && !o.small ? CW - (o.indent || 0) : 0);
      }
      y -= o.after ?? 6;
    };
    const h1 = text => { need(44); y -= 14; y -= 14; page.drawText(san(text), { x: ML, y, size: 12.5, font: FB, color: hex(DARK) }); y -= 5; page.drawLine({ start: { x: ML, y }, end: { x: ML + CW, y }, thickness: 1.1, color: hex(BLUE) }); y -= 4; };
    const h2 = (text, tag, tagColor) => { need(34); y -= 10; y -= 12; page.drawText(san(text), { x: ML, y, size: 11, font: FB, color: hex(INK) });
      if (tag) page.drawText('[' + san(tag).toUpperCase() + ']', { x: ML + FB.widthOfTextAtSize(san(text), 11) + 10, y, size: 8.5, font: FB, color: hex(tagColor || MUTED) }); y -= 4; };

    const rowH = (cells, widths, size, pad) => Math.max(...cells.map((c, i) => wrap(typeof c === 'object' ? c.text : c, FB, size, widths[i] - 2 * pad).length)) * size * 1.35 + 2 * pad;
    const drawRow = (cells, widths, o) => {
      const { size = 9.5, pad = 5, fills = [], bold = [], colors = [] } = o;
      const h = rowH(cells, widths, size, pad); need(h);
      let x = ML;
      cells.forEach((c, i) => {
        const txt = typeof c === 'object' ? c.text : c;
        page.drawRectangle({ x, y: y - h, width: widths[i], height: h, color: fills[i] ? hex(fills[i]) : undefined, borderColor: hex(LINE), borderWidth: 0.6 });
        const col = (typeof c === 'object' && c.color) ? hex(c.color) : (colors[i] ? hex(colors[i]) : hex('222B3F'));
        const font = bold[i] || (typeof c === 'object' && c.color) ? FB : F;
        let ty = y - pad;
        wrap(txt, font, size, widths[i] - 2 * pad).forEach(ln => { ty -= size * 1.35; page.drawText(ln, { x: x + pad, y: ty + size * 0.3, size, font, color: col }); });
        x += widths[i];
      });
      y -= h;
    };

    const photoBox = async (it, x, top, mw, mh, capSize) => {
      const im = await pdf.embedJpg(it.f.bytes); const s = fit(it.f, mw, mh);
      const ix = x + (mw - s.w) / 2;
      page.drawRectangle({ x: ix - 0.5, y: top - s.h - 0.5, width: s.w + 1, height: s.h + 1, borderColor: hex(LINE), borderWidth: 0.6 });
      page.drawImage(im, { x: ix, y: top - s.h, width: s.w, height: s.h });
      let ty = top - s.h - 4, used = s.h + 4;
      for (const ln of wrap(it.cap1, FB, capSize, mw)) { ty -= capSize * 1.3; page.drawText(ln, { x, y: ty, size: capSize, font: FB, color: hex(INK) }); used += capSize * 1.3; }
      for (const ln of wrap(it.cap2, F, capSize - 1.5, mw)) { ty -= (capSize - 1.5) * 1.3; page.drawText(ln, { x, y: ty, size: capSize - 1.5, font: F, color: hex(MUTED) }); used += (capSize - 1.5) * 1.3; }
      return used;
    };
    const capH = (it, mw, cs) => wrap(it.cap1, FB, cs, mw).length * cs * 1.3 + wrap(it.cap2, F, cs - 1.5, mw).length * (cs - 1.5) * 1.3 + 6;

    let first = true;
    for (const b of blocks) {
      if (b.t === 'cover') {
        np(); coverPage = page;
        const lw = 8.5 * CM, lh = lw * logo.h / logo.w;
        page.drawImage(logoImg, { x: (PW - lw) / 2, y: PH - 80 - lh, width: lw, height: lh });
        let cy = PH - 80 - lh - 56;
        const t = san(b.title), tw = FB.widthOfTextAtSize(t, 26); const ts = tw > CW ? 26 * CW / tw : 26;
        page.drawText(t, { x: (PW - FB.widthOfTextAtSize(t, ts)) / 2, y: cy, size: ts, font: FB, color: hex(DARK) }); cy -= 26;
        const sb = san(b.sub); page.drawText(sb, { x: (PW - F.widthOfTextAtSize(sb, 13)) / 2, y: cy, size: 13, font: F, color: hex(BLUE) }); cy -= 34;
        y = cy; const w0 = 140, widths = [w0, CW - w0];
        b.rows.forEach(r => drawRow([r[0], r[1]], widths, { size: 10, pad: 6, fills: [DARK, SOFT], bold: [true, false], colors: ['FFFFFF', null] }));
        const f1 = san(orgInfo(S)), f2 = san(S.empresa.endereco);
        page.drawText(f1, { x: (PW - F.widthOfTextAtSize(f1, 8.5)) / 2, y: 92, size: 8.5, font: F, color: hex(MUTED) });
        page.drawText(f2, { x: (PW - F.widthOfTextAtSize(f2, 8.5)) / 2, y: 80, size: 8.5, font: F, color: hex(MUTED) });
        np(); first = false;
      } else if (b.t === 'pagebreak') np();
      else if (b.t === 'h1') h1(b.text);
      else if (b.t === 'h2') h2(b.text, b.tag, b.tagColor);
      else if (b.t === 'p') para(b.text, { label: b.label, small: b.small, size: b.small ? 8.5 : 10.5, font: b.small ? FI : F, color: b.small ? hex(MUTED) : undefined, justify: !b.label });
      else if (b.t === 'bullets') b.items.forEach(t => { const lines = wrap(t, F, 10.5, CW - 16); need(lines.length * 15 + 4); y -= 15; page.drawText('•', { x: ML + 4, y, size: 10.5, font: FB, color: hex(BLUE) }); page.drawText(lines[0], { x: ML + 16, y, size: 10.5, font: F, color: hex('222B3F') }); drawLines(lines.slice(1), ML + 16, F, 10.5, hex('222B3F'), 15); y -= 3; });
      else if (b.t === 'kv') { b.rows.forEach(r => drawRow(r, [150, CW - 150], { size: 9.5, pad: 5, fills: [SOFT, null], bold: [true, false], colors: [DARK, null] })); y -= 8; }
      else if (b.t === 'table') {
        const widths = b.w.map(x => x * CW);
        const dh = () => drawRow(b.head, widths, { size: 9, pad: 5, fills: b.head.map(() => DARK), bold: b.head.map(() => true), colors: b.head.map(() => 'FFFFFF') });
        need(rowH(b.head, widths, 9, 5) + rowH(b.rows[0], widths, 9, 5)); dh();
        b.rows.forEach((r, ri) => { if (y - rowH(r, widths, 9, 5) < BOT) { np(); dh(); } drawRow(r, widths, { size: 9, pad: 5, fills: ri % 2 ? ['F6F8FC', 'F6F8FC', 'F6F8FC', 'F6F8FC', 'F6F8FC'] : [] }); });
        y -= 8;
      } else if (b.t === 'grid') {
        const gap = 14, mw = (CW - gap) / 2, mh = 150, cs = 8.5;
        for (let i = 0; i < b.items.length; i += 2) {
          const row = b.items.slice(i, i + 2);
          const hh = Math.max(...row.map(it => fit(it.f, mw, mh).h + capH(it, mw, cs)));
          need(hh + 10); y -= 4;
          let used = 0;
          for (let k = 0; k < row.length; k++) used = Math.max(used, await photoBox(row[k], ML + k * (mw + gap), y, mw, mh, cs));
          y -= used + 8;
        }
      } else if (b.t === 'photos') {
        const cs = 10;
        for (let i = 0; i < b.items.length; i++) {
          const it = b.items[i]; const mw = CW, mh = (b.mh || 8.6) * CM;
          const hh = fit(it.f, mw, mh).h + capH(it, mw, cs);
          if (i % 2 === 0 && i > 0) np(); else need(hh + 10);
          const used = await photoBox(it, ML, y, mw, mh, cs); y -= used + 22;
        }
      } else if (b.t === 'sign') {
        need(130); y -= 36; para(`${b.city}, ${b.data}.`, { after: 40 });
        y -= 20; page.drawLine({ start: { x: PW / 2 - 110, y }, end: { x: PW / 2 + 110, y }, thickness: 0.7, color: hex(INK) });
        const ctr = (s, f, sz, col) => { y -= sz * 1.5; const t = san(s); page.drawText(t, { x: (PW - f.widthOfTextAtSize(t, sz)) / 2, y, size: sz, font: f, color: col }); };
        ctr(b.rt.nome || 'Responsável técnico', FB, 10.5, hex('222B3F'));
        const l2 = [b.rt.titulo, b.rt.crea && 'CREA ' + b.rt.crea].filter(Boolean).join(' · '); if (l2) ctr(l2, F, 9.5, hex('222B3F'));
        ctr(S.empresa.nome, F, 9.5, hex(BLUE));
      }
    }
    // cabeçalho, rodapé e marca d'água (passada final: total de páginas conhecido)
    const total = pages.length;
    pages.forEach((pg, i) => {
      if (meta.draft) { const t = 'RASCUNHO'; pg.drawText(t, { x: 130, y: 230, size: 96, font: FB, color: L.rgb(0.93, 0.85, 0.85), rotate: L.degrees(45), opacity: 0.55 }); }
      if (pg !== coverPage) {
        const lh = 24, lw = lh * logo.w / logo.h;
        pg.drawImage(logoImg, { x: ML, y: PH - 38 - lh, width: lw, height: lh });
        const r1 = san(`${meta.titulo} · ${meta.numero} · Rev. ${meta.rev}` + (meta.draft ? ' · RASCUNHO' : '')), r2 = san(`${meta.obra} — ${meta.local || ''}`);
        pg.drawText(r1, { x: ML + CW - F.widthOfTextAtSize(r1, 8), y: PH - 44, size: 8, font: meta.draft ? FB : F, color: meta.draft ? hex('C0392B') : hex(MUTED) });
        let r2s = r2; while (r2s.length > 4 && F.widthOfTextAtSize(r2s, 8) > CW - lw - 20) r2s = r2s.slice(0, -2);
        pg.drawText(r2s === r2 ? r2 : r2s + '…', { x: ML + CW - F.widthOfTextAtSize(r2s === r2 ? r2 : r2s + '…', 8), y: PH - 55, size: 8, font: F, color: hex(MUTED) });
        pg.drawLine({ start: { x: ML, y: PH - 64 }, end: { x: ML + CW, y: PH - 64 }, thickness: 1.6, color: hex(BLUE) });
        const ft = san(orgInfo(S, true)), pn = `Página ${i + 1} de ${total}`;
        pg.drawLine({ start: { x: ML, y: 46 }, end: { x: ML + CW, y: 46 }, thickness: 0.6, color: hex(LINE) });
        pg.drawText(ft, { x: (PW - F.widthOfTextAtSize(ft, 7)) / 2, y: 36, size: 7, font: F, color: hex(MUTED) });
        pg.drawText(pn, { x: (PW - F.widthOfTextAtSize(pn, 7.5)) / 2, y: 25, size: 7.5, font: F, color: hex(MUTED) });
      }
    });
    return new Blob([await pdf.save()], { type: 'application/pdf' });
  }

  return { buildTecnico, buildFotografico, buildConsolidado, toDocx, toPdf, fTs, fLoc, fData, legenda, GRAV };
})();
