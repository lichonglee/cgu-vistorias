'use strict';
/**
 * Diagramas técnicos (SVG desenhado aqui): estrutura, relacionamentos (banco central) e segurança.
 * Fonte: supabase/schema-producao.sql, docs/INTEGRACAO-CENTRAL-PILOTO.md, docs/HARDENING-SEGURANCA.md e
 * docs/HOSPEDAGEM-E-PRIVACIDADE.md da branch codex/release-candidate-1.1.0 (v1.27.12), mais o relato do Compasso.
 * Lido por documento.js e navegavel.js. Gera estrutura.svg, relacionamentos.svg e seguranca.svg.
 */
const fs = require('fs');
const path = require('path');
const DIR = __dirname;
const NAVY = '#002543', AZUL = '#49ABE1', VERDE = '#049B6F', AMB = '#8A6A00';
const RESP = 'Responsável: Eng. DSc Li Chong Lee Bacelar de Castro';
const MARCA = 'data:image/png;base64,' + fs.readFileSync(path.join(DIR, '..', '..', 'assets', 'marca-cgu.png')).toString('base64');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const FONT = "Calibri, Carlito, 'Segoe UI', Arial, sans-serif";

function moldura(W, H, titulo, sub, corpo, nota) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="${FONT}">
<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M0 0L10 5L0 10z" fill="${NAVY}"/></marker>
<marker id="ag" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M0 0L10 5L0 10z" fill="${VERDE}"/></marker></defs>
<rect width="${W}" height="${H}" fill="#fff"/>
<text x="24" y="36" font-size="23" font-weight="700" fill="${NAVY}">${esc(titulo)}</text>
<text x="24" y="56" font-size="12.5" fill="#52697A">${esc(sub)}</text>
${corpo}
<text x="24" y="${H - 22}" font-size="11.5" fill="#52697A">${esc(nota)}</text>
<line x1="16" y1="${H - 12}" x2="${W - 16}" y2="${H - 12}" stroke="${NAVY}" stroke-width="1.5"/>
<image href="${MARCA}" x="${W - 120}" y="${H - 54}" width="96" height="40" preserveAspectRatio="xMaxYMid meet"/>
<text x="${W - 24}" y="${H - 2}" font-size="9" text-anchor="end" fill="${NAVY}">${RESP}</text>
</svg>`;
}
const texto = (x, y, t, o = {}) => `<text x="${x}" y="${y}" font-size="${o.s || 11.5}" ${o.b ? 'font-weight="700"' : ''} fill="${o.c || NAVY}" ${o.a ? `text-anchor="${o.a}"` : ''} ${o.i ? 'font-style="italic"' : ''}>${esc(t)}</text>`;
function caixa(x, y, w, titulo, linhas, o = {}) {
  const h = 26 + linhas.length * 15 + 8;
  return { h, svg: `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="7" fill="${o.fill || '#fff'}" stroke="${o.stroke || NAVY}" stroke-width="1.6"/>
<path d="M${x} ${y + 22}H${x + w}" stroke="${o.stroke || NAVY}" stroke-width="1"/>
${texto(x + 8, y + 16, titulo, { b: 1, s: 12.5, c: o.tc || NAVY })}${linhas.map((l, i) => texto(x + 8, y + 38 + i * 15, l, { s: 11 })).join('')}` };
}

/* ---------------- 1. ESTRUTURA ---------------- */
function estrutura() {
  const W = 1320, H = 800;
  let s = '';
  const zona = (x, w, titulo, cor) => `<rect x="${x}" y="72" width="${w}" height="${H - 130}" rx="14" fill="${cor}" stroke="${NAVY}" stroke-width="2" stroke-dasharray="8 5"/>${texto(x + 14, 96, titulo, { b: 1, s: 14 })}`;
  s += zona(20, 440, 'DISPOSITIVO · PWA instalável (offline)', '#F4FAFE');
  s += zona(500, 330, 'VERCEL · mesma origem (HTTPS)', '#F7FBFD');
  s += zona(870, 430, 'SUPABASE · plataforma central', '#F1FAF6');
  const col1 = [
    ['Interface', ['index.html · app.js', 'Edifícios, Dados, Fotos, Constatações,', 'Conclusão, Emitir, Painel local, Ajustes']],
    ['Persistência local', ['db.js · IndexedDB (cgu-vistorias)', 'obras, vistorias, fotos, emissões,', 'snapshots, sequências']],
    ['Relatórios', ['report.js · docx · pdf-lib', 'Memorial VT, Memorial Fotográfico, RC']],
    ['Backup e importação', ['backup.js · JSON v1/v2', 'validação por whitelist, magic bytes, SHA-256']],
    ['Snapshots e analítico local', ['emission-snapshot.js · analytics local', 'ações corretivas, reincidência']],
    ['Offline', ['sw.js · cache versionado dos arquivos']],
    ['Sincronização', ['central-session.js · central-gate.js', 'central-sync.js · central-contract.js']],
  ];
  let y = 112;
  const pos1 = {};
  col1.forEach(([t, l]) => { const c = caixa(40, y, 400, t, l, { fill: '#fff' }); pos1[t] = y + c.h / 2; s += c.svg; y += c.h + 11; });
  const col2 = [
    ['Páginas estáticas', ['index.html (campo), painel.html,', 'central.html, manuais (HTML e PDF)']],
    ['Funções api/', ['config, saúde, unidades autorizadas,', 'ingestão de snapshots e painel']],
    ['server/central-api.cjs', ['valida origem e sessão, allowlist do contrato,', 'limites (2 MB, 8 snapshots), RPC com o JWT', 'do usuário; nunca usa service_role']],
    ['vercel.json', ['cabeçalhos HTTP, frame-ancestors \'none\'']],
  ];
  y = 130;
  const pos2 = {};
  col2.forEach(([t, l]) => { const c = caixa(520, y, 290, t, l, { fill: '#fff' }); pos2[t] = y + c.h / 2; s += c.svg; y += c.h + 18; });
  s += `<rect x="520" y="${y + 6}" width="290" height="70" rx="7" fill="#FFF9E0" stroke="${AMB}" stroke-width="1.3" stroke-dasharray="5 3"/>${texto(528, y + 24, 'GitHub Pages (demonstração)', { b: 1, c: AMB })}${texto(528, y + 41, 'frontend estático e dados sintéticos;', { s: 11 })}${texto(528, y + 56, 'não fornece /api nem isolamento por unidade', { s: 11 })}`;
  const col3 = [
    ['Auth', ['PKCE · e-mail e senha (usuários)', 'GitHub (administradores) · OIDC/SAML', 'sem autoinscrição · vencimento de acesso', 'login direto do navegador (PKCE)']],
    ['PostgreSQL', ['tabelas cgu_* (ver relacionamentos)', 'RLS em todas as tabelas', 'RPCs SECURITY DEFINER (search_path vazio)', 'políticas: papéis por unidade, mínimo de grupo']],
    ['Storage · bucket cgu-relatorios', ['relatórios PDF/DOCX, fotos e originais,', 'vídeos (≤ 50 MB), anexos de baixa (≤ 5 MB)', 'pasta por unidade']],
  ];
  y = 130;
  const pos3 = {};
  col3.forEach(([t, l]) => { const c = caixa(890, y, 390, t, l, { fill: '#fff', stroke: VERDE }); pos3[t] = y + c.h / 2; s += c.svg; y += c.h + 22; });
  s += `<rect x="890" y="${y}" width="390" height="92" rx="7" fill="#fff" stroke="${VERDE}" stroke-width="1.6"/>${texto(898, y + 16, 'Perfis (papéis por unidade)', { b: 1, s: 12.5 })}${texto(898, y + 36, 'vistoriador · gestor · operacional · chefia', { s: 11 })}${texto(898, y + 51, 'admin_unidade · admin_plataforma', { s: 11 })}${texto(898, y + 69, 'Edge: Operacional e Chefia usam só o painel', { s: 11, c: AMB })}`;
  const seta = (x1, y1, x2, y2, t, g) => `<path d="M${x1} ${y1}L${x2} ${y2}" stroke="${g ? VERDE : NAVY}" stroke-width="2" fill="none" marker-end="url(#${g ? 'ag' : 'ah'})"/>${t ? texto((x1 + x2) / 2, (y1 + y2) / 2 - 6, t, { s: 10.5, a: 'middle', i: 1, c: g ? VERDE : NAVY }) : ''}`;
  s += seta(440, pos1['Sincronização'], 520, pos2['Funções api/'], 'HTTPS + JWT');
  s += seta(810, pos2['server/central-api.cjs'], 890, pos3['PostgreSQL'], 'RPC com o JWT', 1);
  s += seta(440, pos1['Interface'], 520, pos2['Páginas estáticas'], 'carrega');
  s += seta(810, pos2['server/central-api.cjs'] + 10, 890, pos3['Storage · bucket cgu-relatorios'], 'arquivos', 1);
  return moldura(W, H, 'DIAGRAMA DE ESTRUTURA · CGU VISTORIAS', 'Componentes do aplicativo de campo (v1.0.5) e da plataforma central, com a Central e o Painel (v1.27.12).',
    s, 'Fontes: INTEGRACAO-CENTRAL-PILOTO.md, HARDENING-SEGURANCA.md e schema-producao.sql (branch codex/release-candidate-1.1.0). A captura de campo continua offline em IndexedDB.');
}

/* ---------------- 2. RELACIONAMENTOS ---------------- */
function relacionamentos() {
  const W = 1480, H = 800, BW = 262, X = [20, 306, 592, 878, 1164];
  const T = {
    users: [0, 'auth.users', ['PK id']],
    prof: [0, 'cgu_user_profiles', ['PK/FK user_id → users', 'email · full_name · active', 'validated_by → users']],
    inv: [0, 'cgu_invites', ['PK email, unit_id', 'role · access_until', 'invited_by → users']],
    mem: [0, 'cgu_unit_memberships', ['PK/FK unit_id, user_id', 'role · active · expires_at']],
    quo: [0, 'cgu_user_quotas', ['PK/FK unit_id, user_id', 'quota_bytes · updated_by']],
    aud: [0, 'cgu_admin_audit', ['PK id', 'actor_id, target_user_id → users', 'action · role']],
    units: [1, 'cgu_units', ['PK id', 'code · name · active']],
    uprof: [1, 'cgu_unit_profile', ['PK/FK unit_id', 'org_* · rt_name · rt_crea']],
    pol: [1, 'cgu_dashboard_policy', ['PK policy_key', 'minimum_inspections', 'approved_by · approval_reference']],
    bkp: [1, 'cgu_backup_log', ['PK id · FK unit_id', 'kind · scope · reports/photos/videos', 'bytes · created_by']],
    sync: [1, 'cgu_sync_audit', ['PK id · FK unit_id', 'user_id · received · inserted', 'duplicates']],
    bld: [2, 'cgu_buildings', ['PK unit_id, building_id', 'name · client · address', 'contract · art · active']],
    ali: [2, 'cgu_building_aliases', ['PK unit_id, local_building_id', 'FK (unit_id, building_id)', 'active · local_name']],
    req: [2, 'cgu_building_requests', ['PK unit_id, local_building_id', 'requested_by → users', 'resolved_at']],
    bu: [2, 'cgu_building_users', ['PK unit_id, building_id, user_id', 'assigned_by → users']],
    snap: [3, 'cgu_snapshots', ['PK unit_id, snapshot_id', 'FK (unit_id, building_id)', 'source_snapshot_hash · revisão']],
    fnd: [3, 'cgu_findings', ['PK unit_id, snapshot_id, finding_id', 'severity · system_code', 'environment_code · has_evidence']],
    act: [3, 'cgu_actions', ['PK unit_id, action_id', 'finding_id · snapshot_id (lógicos)', 'state · due_date · responsible_role']],
    rep: [3, 'cgu_reports', ['PK unit_id, emission_id', 'FK (unit_id, building_id)', 'file_path · file_sha256 · number']],
    rph: [3, 'cgu_report_photos', ['PK unit_id, emission_id, photo_id', 'FK (unit_id, emission_id)', 'sha256 · path · original_path']],
    vid: [3, 'cgu_videos', ['PK unit_id, video_id', 'inspection_id · finding_id · building_id', 'sha256 · path · bytes · duration_s']],
    tic: [4, 'cgu_tickets', ['PK unit_id, ticket_id', 'finding_id (lógico) · status', 'baixa_* · decision_* · baixa_file_sha256']],
    tev: [4, 'cgu_ticket_events', ['PK id', 'FK (unit_id, ticket_id)', 'actor_id → users · event']],
    cyc: [4, 'cgu_okr_cycles', ['PK cycle_id · FK unit_id', 'label · starts_on · ends_on · status']],
    obj: [4, 'cgu_okr_objectives', ['PK objective_id · FK cycle_id', 'unit_id · code · title', 'archived_at']],
    kr: [4, 'cgu_okr_key_results', ['PK kr_id · FK objective_id', 'FK kpi_code · target_value', 'baseline_value · archived_at']],
    kpi: [4, 'cgu_okr_kpis', ['PK kpi_code', 'label · unit · default_direction']],
    rsk: [4, 'cgu_risk_rule_versions', ['PK rule_id · FK unit_id', 'version · rule_text · status', 'proposed_by / approved_by → users']],
  };
  const ordem = [
    ['users', 'prof', 'inv', 'mem', 'quo', 'aud'],
    ['units', 'uprof', 'pol', 'bkp', 'sync'],
    ['bld', 'ali', 'req', 'bu'],
    ['snap', 'fnd', 'act', 'rep', 'rph', 'vid'],
    ['tic', 'tev', 'cyc', 'obj', 'kr', 'kpi', 'rsk'],
  ];
  const caixas = {};
  let s = '';
  const cores = ['#EAF4FA', '#F1FAF6', '#FFF9E0', '#EAF4FA', '#F1FAF6'];
  const tit = ['IDENTIDADE E ACESSO', 'UNIDADE E GOVERNANÇA', 'EDIFÍCIOS', 'REGISTROS DE VISTORIA', 'CHAMADOS · OKR · RISCO'];
  ordem.forEach((col, c) => {
    s += `<rect x="${X[c] - 8}" y="68" width="${BW + 16}" height="${H - 130}" rx="10" fill="${cores[c]}" opacity=".55"/>${texto(X[c], 86, tit[c], { b: 1, s: 11.5, c: '#52697A' })}`;
    let y = 98;
    col.forEach((k) => {
      const [, nome, ls] = T[k], b = caixa(X[c], y, BW, nome, ls, { fill: '#fff' });
      caixas[k] = { x: X[c], y, w: BW, h: b.h, c };
      s += b.svg; y += b.h + 12;
    });
  });
  const rel = (a, b, o = {}) => {
    const A = caixas[a], B = caixas[b];
    let d, x1, y1, x2, y2;
    if (A.c === B.c) { // mesma coluna: contorna pela margem esquerda
      const k = (rel.n[A.c] = (rel.n[A.c] || 0) + 1); x1 = A.x - 3 - k * 2.2; y1 = A.y + A.h / 2; y2 = B.y + B.h / 2;
      d = `M${A.x} ${y1}H${x1}V${y2}H${B.x}`; x2 = B.x;
    } else if (A.c > B.c) { x1 = A.x; y1 = A.y + A.h / 2; x2 = B.x + BW; y2 = B.y + B.h / 2; const mx = (x1 + x2) / 2; d = `M${x1} ${y1}H${mx}V${y2}H${x2}`; }
    else { x1 = A.x + BW; y1 = A.y + A.h / 2; x2 = B.x; y2 = B.y + B.h / 2; const mx = (x1 + x2) / 2; d = `M${x1} ${y1}H${mx}V${y2}H${x2}`; }
    return `<path d="${d}" stroke="${o.l ? AMB : NAVY}" stroke-width="1.5" fill="none" ${o.l ? 'stroke-dasharray="5 3"' : ''} marker-end="url(#ah)"/>`;
  };
  rel.n = {};
  [['prof', 'users'], ['mem', 'users'], ['quo', 'users'], ['aud', 'users'], ['mem', 'units'], ['inv', 'units'], ['quo', 'units'],
   ['uprof', 'units'], ['bkp', 'units'], ['sync', 'units'], ['bld', 'units'], ['ali', 'bld'], ['bu', 'bld'], ['snap', 'bld'], ['rep', 'bld'],
   ['fnd', 'snap'], ['rph', 'rep'], ['tev', 'tic'], ['obj', 'cyc'], ['kr', 'obj'], ['kr', 'kpi']].forEach(([a, b]) => { s += rel(a, b); });
  [['act', 'fnd'], ['tic', 'fnd']].forEach(([a, b]) => { s += rel(a, b, { l: 1 }); });
  const lg = H - 52;
  s += `<path d="M24 ${lg}H64" stroke="${NAVY}" stroke-width="1.5" marker-end="url(#ah)"/>${texto(70, lg + 4, 'chave estrangeira (filho → pai)', { s: 11 })}<path d="M270 ${lg}H310" stroke="${AMB}" stroke-width="1.5" stroke-dasharray="5 3" marker-end="url(#ah)"/>${texto(316, lg + 4, 'referência lógica (sem FK)', { s: 11 })}`;
  return moldura(W, H, 'DIAGRAMA DE RELACIONAMENTOS · BANCO CENTRAL (SUPABASE)', '28 tabelas cgu_* do schema de produção (v1.27.12). Chaves e relações principais; campos omitidos nas caixas.',
    s, 'Todas as tabelas, exceto cgu_units, cgu_okr_kpis, cgu_okr_key_results, cgu_settings, cgu_user_profiles e cgu_dashboard_policy, têm unit_id → cgu_units; colunas *_by apontam para auth.users. cgu_settings (chave/valor) foi omitida.');
}

/* ---------------- 3. SEGURANÇA ---------------- */
function seguranca() {
  const W = 1320, H = 700;
  let s = '';
  const zona = (x, w, titulo, linhas, cor, stroke) => {
    s += `<rect x="${x}" y="76" width="${w}" height="410" rx="14" fill="${cor}" stroke="${stroke}" stroke-width="2" stroke-dasharray="8 5"/>${texto(x + 14, 100, titulo, { b: 1, s: 14 })}`;
    let y = 118;
    linhas.forEach(([t, ls]) => { const b = caixa(x + 12, y, w - 24, t, ls, { stroke }); s += b.svg; y += b.h + 10; });
  };
  zona(20, 330, 'APARELHO · navegador / PWA', [
    ['CSP same-origin', ['default-src, script-src \'self\'; sem script inline', 'object-src, base-uri, form-action: none']],
    ['Importação de backup', ['whitelist, tipos, limites, referências', 'magic bytes e SHA-256 · transação atômica', 'sem fetch de URLs da entrada']],
    ['Dados locais', ['IndexedDB · offline até 30 dias', 'sessão em sessionStorage (sai e limpa)']],
    ['Limites conhecidos', ['backup JSON sem cifra (aviso ao usuário)', 'PIN do Painel: só barreira de interface']],
  ], '#F4FAFE', NAVY);
  zona(380, 300, 'BORDA · Vercel (HTTPS)', [
    ['Cabeçalhos HTTP', ['frame-ancestors \'none\'', 'API apenas na mesma origem']],
    ['central-api.cjs', ['valida origem e sessão (Auth)', 'allowlist do contrato e limites:', '2 MB · 8 snapshots · 5.000 constatações']],
    ['Sem segredos no cliente', ['nenhum service_role no código', 'logs sem payload nem token', 'variáveis só no ambiente aprovado']],
  ], '#F7FBFD', NAVY);
  zona(710, 280, 'IDENTIDADE · Supabase Auth', [
    ['Login', ['PKCE · e-mail e senha (usuários)', 'GitHub (administradores)', 'e-mail conferido após o retorno']],
    ['Controle de acesso', ['sem autoinscrição', 'papel e unidade por membership', 'vencimento e desativação de acesso']],
  ], '#F1FAF6', VERDE);
  zona(1020, 280, 'DADOS · Postgres + Storage', [
    ['RLS e RPCs', ['escrita direta bloqueada (anon/auth)', 'SECURITY DEFINER, search_path vazio', 'confere auth.uid() e membership']],
    ['Integridade', ['ingestão idempotente e auditada', 'mesmo ID com hash diferente: 409', 'SHA-256 em relatórios e anexos']],
    ['Privacidade', ['mínimo de grupo (cgu_dashboard_policy)', 'supressão por recorte; só agregados']],
    ['Operação', ['backup antes de limpar (24 h)', 'limpeza em duas etapas · logs de auditoria']],
  ], '#F1FAF6', VERDE);
  const seta = (x1, x2, y, t) => `<path d="M${x1} ${y}H${x2}" stroke="${NAVY}" stroke-width="2.2" marker-end="url(#ah)"/>${texto((x1 + x2) / 2, y - 6, t, { s: 10.5, a: 'middle', i: 1 })}`;
  s += seta(350, 380, 250, 'HTTPS') + seta(680, 710, 250, 'JWT') + seta(990, 1020, 250, 'RPC');
  s += `<rect x="20" y="500" width="1280" height="120" rx="10" fill="#FFF9E0" stroke="${AMB}" stroke-width="1.5"/>${texto(34, 522, 'RISCOS REMANESCENTES E DECISÕES PENDENTES (relato do Compasso, v1.27.12)', { b: 1, s: 13, c: AMB })}`;
  ['Limite de taxa (rate limit) ainda não implementado · subtração de janelas (inferência por filtros) pendente de análise da Sentinela.',
    'Proteção de senhas vazadas indisponível no plano Supabase atual · k mínimo = 1 é decisão do dono dos dados para o piloto.',
    'Metas de OKR e limiares de risco ainda “a definir”; prazo e vencimento no painel são declarados pelo aparelho, não oficiais.',
    'Backup JSON sem criptografia e PIN local não substituem autenticação institucional; GitHub Pages não isola dados por unidade.'].forEach((t, i) => { s += texto(34, 544 + i * 17, '• ' + t, { s: 11.5, c: '#4A3A00' }); });
  return moldura(W, H, 'DIAGRAMA DE SEGURANÇA · CAMADAS E CONTROLES', 'Controles por camada, do aparelho ao banco. Verde: servidor sob autorização; azul: cliente e borda.',
    s, 'Fontes: HARDENING-SEGURANCA.md, HOSPEDAGEM-E-PRIVACIDADE.md, INTEGRACAO-CENTRAL-PILOTO.md e relato do Compasso. Descreve controles documentados; não é atestado de conformidade.');
}

const SAIDA = { estrutura, relacionamentos, seguranca };
module.exports = { SAIDA, TITULOS: { estrutura: 'Diagrama de estrutura', relacionamentos: 'Diagrama de relacionamentos (banco central)', seguranca: 'Diagrama de segurança' } };

if (require.main === module) {
  Object.entries(SAIDA).forEach(([k, f]) => { fs.writeFileSync(path.join(DIR, k + '.svg'), f()); console.log(k + '.svg'); });
}
module.exports.H = { moldura, texto, caixa, NAVY, AZUL, VERDE, AMB, esc, FONT, MARCA, RESP };
