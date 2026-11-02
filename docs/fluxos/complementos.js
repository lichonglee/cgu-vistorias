'use strict';
/**
 * Documentação complementar (SVG e tabelas) do CGU Vistorias: matriz de papéis, estados, sequências, privacidade,
 * implantação, mapa de telas, modelo local, dicionário de dados, KPIs e OKR, rastreabilidade de testes, guias por
 * perfil e glossário. Fontes: supabase/schema-producao.sql, db.js, vercel.json, tests/ e docs/ da branch
 * codex/release-candidate-1.1.0 (v1.27.12, lida em modo somente leitura) e o relato do Compasso.
 * Cada item: { id, titulo, tipo: 'svg' | 'html', svg() | html, nota }.
 */
const { H, SAIDA } = require('./tecnicos');
const { moldura, texto, caixa, NAVY, AZUL, VERDE, AMB, esc } = H;
const T = (x, y, t, o) => texto(x, y, t, o);

/* ===== 1. Matriz de papéis e permissões ===== */
const PAPEIS = ['vistoriador', 'gestor', 'operacional', 'chefia', 'admin_unidade', 'admin_plataforma'];
const MATRIZ = [
  ['Enviar snapshots e ações; arquivar e restaurar no aparelho', [1, 1, 0, 0, 1, 1]],
  ['Gravar e enviar vídeo da constatação', [1, 1, 0, 0, 1, 1]],
  ['Consultar vídeos', [1, 1, 1, 1, 1, 1]],
  ['Consultar relatórios e fotos arquivados', [1, 1, 0, 0, 1, 1]],
  ['Consultar o painel (visão geral, tabela, ficha)', [0, 1, 1, 1, 1, 1]],
  ['Ver a política de grupo mínimo', [0, 1, 0, 0, 1, 1]],
  ['Listar chamados', [0, 1, 1, 1, 1, 1]],
  ['Abrir chamado', [0, 1, 0, 1, 1, 1]],
  ['Registrar a baixa do chamado (texto e anexo)', [0, 0, 1, 0, 0, 0]],
  ['Receber ou aprovar a baixa', [0, 0, 0, 1, 0, 0]],
  ['Pedir vínculo de edifício local ao central', [1, 1, 0, 0, 1, 1]],
  ['Criar e editar edifícios; vincular pessoas; mapear', [0, 0, 0, 0, 1, 1]],
  ['Cadastrar, convidar, desativar e apagar pessoas', [0, 0, 0, 0, 1, 1]],
  ['Definir cotas de armazenamento', [0, 0, 0, 0, 1, 1]],
  ['Cadastro da unidade (organização e responsável técnico)', [0, 0, 0, 0, 1, 1]],
  ['Backup e limpeza em duas etapas', [0, 0, 0, 0, 1, 1]],
  ['OKR: criar e editar ciclos, objetivos e resultados-chave', [0, 0, 0, 0, 1, 1]],
  ['OKR: arquivar objetivos e resultados-chave', [0, 1, 0, 1, 1, 1]],
  ['Regra de risco: propor e aprovar (aprovador diferente do proponente)', [0, 0, 0, 0, 1, 1]],
  ['Regra de risco: aprovação simples e revogação', [0, 0, 0, 0, 0, 1]],
  ['Criar unidades', [0, 0, 0, 0, 0, 1]],
];
function matriz() {
  const W = 1320, x0 = 24, lw = 560, cw = 118, y0 = 96, rh = 27, H_ = y0 + 40 + MATRIZ.length * rh + 70;
  let s = `<rect x="${x0}" y="${y0}" width="${lw + cw * 6}" height="40" fill="${NAVY}"/>${T(x0 + 10, y0 + 25, 'Funcionalidade (chamada de servidor)', { b: 1, c: '#fff', s: 13 })}`;
  PAPEIS.forEach((p, i) => { s += T(x0 + lw + cw * i + cw / 2, y0 + 25, p, { b: 1, c: '#fff', s: 12, a: 'middle' }); });
  MATRIZ.forEach(([nome, f], r) => {
    const y = y0 + 40 + r * rh;
    s += `<rect x="${x0}" y="${y}" width="${lw + cw * 6}" height="${rh}" fill="${r % 2 ? '#F5FAFD' : '#fff'}" stroke="#C9DCE8" stroke-width=".6"/>${T(x0 + 10, y + 18, nome, { s: 12 })}`;
    f.forEach((v, i) => { const cx = x0 + lw + cw * i + cw / 2; s += v ? `<circle cx="${cx}" cy="${y + rh / 2}" r="7" fill="${VERDE}"/>` : T(cx, y + 18, '—', { a: 'middle', c: '#9AA9B5' }); });
  });
  return moldura(W, H_, 'MATRIZ DE PAPÉIS E PERMISSÕES · PLATAFORMA CENTRAL', 'Quem pode chamar cada função do servidor, por papel na unidade (● permitido, — negado).', s,
    'Extraída das condições de autorização das RPCs em schema-producao.sql (v1.27.12); admin_plataforma também passa por cgu_is_platform_admin(). Não inclui políticas RLS de leitura direta nem regras só do navegador.');
}

/* ===== 2. Diagramas de estados ===== */
function estados() {
  const W = 1320, Hh = 790;
  let s = '';
  const est = (x, y, w, t, o = {}) => `<rect x="${x}" y="${y}" width="${w}" height="40" rx="20" fill="${o.f || '#EAF4FA'}" stroke="${o.s || NAVY}" stroke-width="${o.fim ? 3.5 : 1.8}"/>${T(x + w / 2, y + 25, t, { a: 'middle', b: 1, s: 12 })}`;
  const ini = (x, y) => `<circle cx="${x}" cy="${y}" r="7" fill="${NAVY}"/>`;
  const seta = (x1, y1, x2, y2, t, tx, ty) => `<path d="M${x1} ${y1}L${x2} ${y2}" stroke="${NAVY}" stroke-width="1.6" fill="none" marker-end="url(#ah)"/>${t ? T(tx !== undefined ? tx : (x1 + x2) / 2, ty !== undefined ? ty : (y1 + y2) / 2 - 6, t, { s: 10.5, a: 'middle', i: 1 }) : ''}`;
  const painel = (x, y, w, h, t) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="#F7FBFD" stroke="#C9DCE8" stroke-width="1.5"/>${T(x + 14, y + 22, t, { b: 1, s: 13 })}`;
  /* a) vistoria local */
  s += painel(20, 76, 630, 190, 'VISTORIA (aplicativo de campo)');
  s += ini(50, 170) + seta(57, 170, 90, 170) + est(90, 150, 130, 'Rascunho') + seta(220, 170, 290, 170, 'emitir oficial', 255, 160) + est(290, 150, 130, 'Oficial', { f: '#DDF3EC', s: VERDE }) + seta(420, 170, 480, 170, 'nova revisão', 450, 160) + est(480, 150, 150, 'Oficial · revisão N+1');
  s += T(34, 232, 'Emitir sem marcar “Emissão oficial” gera arquivo de rascunho, sem registro no Painel. A nova revisão mantém o número da vistoria.', { s: 10.5, c: '#52697A' });
  /* b) chamado */
  s += painel(670, 76, 630, 190, 'CHAMADO (cgu_tickets)');
  s += ini(700, 170) + seta(707, 170, 735, 170) + est(735, 150, 110, 'aberto') + seta(845, 170, 905, 170, 'baixa', 875, 160) + est(905, 150, 170, 'baixa_registrada', { f: '#FFF1C9', s: AMB }) + seta(1075, 170, 1135, 170, 'decisão', 1105, 160) + est(1135, 150, 150, 'encerrado', { fim: 1 });
  s += T(684, 232, 'Decisão da Chefia: recebimento ou aprovação (texto de até 500 caracteres). Eventos gravados: aberto, baixa, recebimento, aprovação.', { s: 10.5, c: '#52697A' });
  /* c) regra de risco */
  s += painel(20, 286, 630, 250, 'REGRA DE RISCO (cgu_risk_rule_versions)');
  s += ini(50, 400) + seta(57, 400, 85, 400) + est(85, 380, 120, 'proposta');
  s += seta(205, 392, 300, 336, 'aprovar', 250, 350) + est(300, 316, 130, 'aprovada', { f: '#DDF3EC', s: VERDE });
  s += seta(205, 400, 300, 400, 'aprovação simples', 252, 393) + est(300, 380, 170, 'aprovada_simples', { f: '#DDF3EC', s: VERDE });
  s += seta(205, 408, 300, 464, 'rejeitar', 250, 452) + est(300, 444, 130, 'rejeitada', { fim: 1 });
  s += seta(430, 336, 505, 400, 'revogar', 482, 354) + seta(470, 400, 505, 400) + est(505, 380, 130, 'revogada', { fim: 1 });
  s += T(34, 516, 'Aprovação exige aprovador diferente do proponente e referência; aprovação simples e revogação: admin da plataforma.', { s: 10.5, c: '#52697A' });
  /* d) ação corretiva */
  s += painel(670, 286, 630, 250, 'AÇÃO CORRETIVA (cgu_actions)');
  s += ini(700, 400) + seta(707, 400, 735, 400) + est(735, 380, 110, 'aberta') + seta(845, 400, 915, 400, 'iniciar', 880, 392) + est(915, 380, 140, 'em-execucao') + seta(1055, 400, 1115, 400, 'concluir', 1085, 392) + est(1115, 380, 150, 'concluida', { f: '#DDF3EC', s: VERDE, fim: 1 });
  s += seta(790, 420, 790, 470) + seta(985, 420, 985, 470) + est(735, 470, 340, 'cancelada', { fim: 1 }).replace('width="340"', 'width="340"');
  s += T(684, 528, 'Vencimento e prazo são declarados pelo aparelho (due_date), não oficiais.', { s: 10.5, c: '#52697A' });
  /* e) ciclo OKR */
  s += painel(20, 556, 630, 150, 'CICLO DE OKR (cgu_okr_cycles)');
  s += ini(50, 646) + seta(57, 646, 90, 646) + est(90, 626, 130, 'rascunho') + seta(220, 646, 300, 646, 'ativar', 260, 638) + est(300, 626, 130, 'ativo', { f: '#DDF3EC', s: VERDE }) + seta(430, 646, 500, 646, 'encerrar', 465, 638) + est(500, 626, 130, 'encerrado', { fim: 1 });
  /* f) emissão e snapshot */
  s += painel(670, 556, 630, 150, 'ENVIO À CENTRAL (snapshot)');
  s += ini(700, 646) + seta(707, 646, 735, 646) + est(735, 626, 120, 'verificado') + seta(855, 646, 925, 646, 'enviar', 890, 638) + est(925, 626, 130, 'recebido') + seta(1055, 646, 1115, 646, 'repetição', 1085, 638) + est(1115, 626, 150, 'duplicata / 409');
  s += T(684, 692, 'Mesmo ID e mesmo hash: duplicata. Mesmo ID com hash diferente: conflito 409, sem sobrescrever o original.', { s: 10.5, c: '#52697A' });
  return moldura(W, Hh, 'DIAGRAMAS DE ESTADOS', 'Ciclos de vida de vistoria, chamado, regra de risco, ação corretiva, ciclo de OKR e envio de snapshots.', s,
    'Estados extraídos das restrições CHECK de schema-producao.sql (v1.27.12) e do manual do usuário; transições conforme as RPCs de cada entidade.');
}

/* ===== 3. Sequências ===== */
function seq(titulo, sub, partes, msgs, nota) {
  const W = 1320, n = partes.length, pw = 190, gap = (W - 48 - pw) / (n - 1), px = (i) => 24 + pw / 2 + i * gap, y0 = 78;
  const hh = y0 + 60 + msgs.length * 40 + 60;
  let s = '';
  partes.forEach((p, i) => { s += `<rect x="${px(i) - pw / 2}" y="${y0}" width="${pw}" height="36" rx="7" fill="${p[1] || '#EAF4FA'}" stroke="${NAVY}" stroke-width="1.6"/>${T(px(i), y0 + 23, p[0], { a: 'middle', b: 1, s: 12 })}<path d="M${px(i)} ${y0 + 36}V${hh - 50}" stroke="#9AA9B5" stroke-width="1.2" stroke-dasharray="5 4"/>`; });
  msgs.forEach(([a, b, t, nt], k) => {
    const y = y0 + 70 + k * 40, x1 = px(a), x2 = px(b);
    s += `<text x="${(x1 + x2) / 2}" y="${y - 6}" font-size="11" fill="${NAVY}" text-anchor="middle">${esc((k + 1) + '. ' + t)}</text>`;
    s += a === b ? `<path d="M${x1} ${y}h40v14h-40" stroke="${NAVY}" stroke-width="1.5" fill="none" marker-end="url(#ah)"/>` : `<path d="M${x1} ${y}H${x2}" stroke="${nt ? VERDE : NAVY}" stroke-width="1.6" fill="none" ${nt === 'ret' ? 'stroke-dasharray="6 3"' : ''} marker-end="url(#ah)"/>`;
  });
  return moldura(W, hh, titulo, sub, s, nota);
}
const SEQ = {
  login: () => seq('SEQUÊNCIA · LOGIN E CONTROLE DE ACESSO', 'Login por e-mail e senha ou GitHub (administradores), com PKCE, e abertura do ambiente conforme o papel.',
    [['Usuário'], ['Navegador (PWA / Central)'], ['Supabase Auth', '#F1FAF6'], ['Postgres (RPC + RLS)', '#F1FAF6']],
    [[0, 1, 'abre o aplicativo, o painel ou a Central'], [1, 2, 'login (e-mail e senha) ou OAuth GitHub, com desafio PKCE'], [2, 1, 'código de retorno; troca por sessão e JWT', 'ret'], [1, 1, 'guarda a sessão em sessionStorage'],
      [1, 3, 'RPC cgu_my_units com o JWT do usuário'], [3, 3, 'confere membership ativo, vencimento e papel'], [3, 1, 'unidades e papéis permitidos', 'ret'], [1, 0, 'abre o ambiente do papel (campo, painel ou Central)', 'ret']],
    'Administradores entram com GitHub e o e-mail é conferido após o retorno. Operacional e Chefia que abrem o aplicativo de campo veem o aviso “Este perfil usa o painel”.'),
  sync: () => seq('SEQUÊNCIA · SINCRONIZAR E ARQUIVAR', 'Envio de snapshots verificados e ações, com ingestão idempotente e confirmação de arquivamento.',
    [['Vistoriador'], ['PWA + IndexedDB'], ['Vercel api/ (sync)'], ['Postgres (RPC)', '#F1FAF6'], ['Storage cgu-relatorios', '#F1FAF6']],
    [[0, 1, 'escolhe a unidade e os snapshots (até 8 por lote)'], [1, 2, 'POST /api/sync com o JWT'], [2, 2, 'valida origem, sessão, allowlist e limites (2 MB)'], [2, 3, 'RPC ingest_cgu_snapshots com o JWT do usuário'],
      [3, 3, 'confere membership; idempotência (duplicata ou 409)'], [3, 2, 'recebidos, inseridos, duplicados', 'ret'], [1, 3, 'sync_cgu_actions: ações corretivas'], [1, 4, 'relatórios PDF/DOCX, fotos, originais e vídeos (envio explícito)'],
      [1, 3, 'cgu_confirm_archive: confirma o arquivamento'], [3, 1, 'status atualizado; restauração paginada por cgu_restore_page', 'ret']],
    'Fonte: INTEGRACAO-CENTRAL-PILOTO.md e RPCs de schema-producao.sql. O papel exigido é vistoriador, gestor ou admin. Logs da API não incluem payload nem token.'),
  chamado: () => seq('SEQUÊNCIA · CHAMADO, BAIXA E APROVAÇÃO', 'Do sinal de risco no painel ao encerramento, com anexo verificado por SHA-256.',
    [['Gestor ou Chefia'], ['Operacional'], ['Chefia'], ['Painel (navegador)'], ['Postgres (RPC)', '#F1FAF6']],
    [[0, 3, 'abre o chamado a partir do sinal de risco'], [3, 4, 'cgu_open_tickets (gestor, chefia ou admin)'], [4, 4, 'cria cgu_tickets em “aberto” e o evento “aberto”'],
      [1, 3, 'registra a baixa: texto e anexo opcional (≤ 5 MB)'], [3, 4, 'cgu_ticket_submit_baixa (só operacional), com SHA-256 do anexo'], [4, 4, 'status “baixa_registrada” e evento “baixa”'],
      [2, 3, 'recebe ou aprova a baixa, com justificativa'], [3, 4, 'cgu_ticket_decide (só chefia)'], [4, 4, 'status “encerrado”; eventos “recebimento” ou “aprovação”'], [4, 3, 'histórico completo mantido', 'ret']],
    'Fonte: schema-producao.sql (cgu_tickets, cgu_ticket_events) e relato do Compasso. O Gestor abre e lê o anexo da baixa.'),
};

/* ===== 4. Fluxo de dados e privacidade ===== */
function dfd() {
  const W = 1320, Hh = 760;
  let s = '';
  const zona = (x, w, t, cor, st) => `<rect x="${x}" y="76" width="${w}" height="530" rx="14" fill="${cor}" stroke="${st}" stroke-width="2" stroke-dasharray="8 5"/>${T(x + 14, 100, t, { b: 1, s: 14 })}`;
  s += zona(20, 400, 'APARELHO (local)', '#F4FAFE', NAVY) + zona(490, 340, 'CANAL DE ENVIO (explícito)', '#FFF9E0', AMB) + zona(900, 400, 'CENTRAL (Supabase)', '#F1FAF6', VERDE);
  let y = 116; const cl = [], cm = [], cc = [];
  [['Só no aparelho', ['título, descrição, local livre e recomendação', 'das constatações (fora do snapshot analítico)', 'perfil e PIN (fora do backup)']], ['Registros locais', ['edifícios, vistorias, fotos, GPS, marcações,', 'emissões, ações corretivas, snapshots']], ['Backup JSON', ['inclui fotos, GPS e CREA; sem cifra;', 'guardar em local autorizado']]].forEach(([t, l]) => { const b = caixa(40, y, 360, t, l, {}); s += b.svg; cl.push(y + b.h / 2); y += b.h + 14; });
  y = 116;
  [['Snapshot analítico', ['IDs, datas, revisão, gravidade, códigos de', 'sistema e ambiente, flags de evidência e', 'recorrência (até 8 por lote)']], ['Ações corretivas', ['estado, prazo declarado, papel responsável']], ['Relatórios, fotos e vídeos', ['PDF/DOCX, fotos e originais, vídeos (≤ 50 MB)', 'só com envio explícito do vistoriador']], ['Anexo de baixa', ['JPG, PNG, WebP ou PDF até 5 MB, SHA-256']]].forEach(([t, l]) => { const b = caixa(510, y, 300, t, l, { stroke: AMB }); s += b.svg; cm.push(y + b.h / 2); y += b.h + 14; });
  y = 116;
  [['Tabelas analíticas', ['cgu_snapshots, cgu_findings, cgu_actions', 'visíveis só por RPC autorizada por unidade']], ['Repositório de arquivos', ['bucket cgu-relatorios, pasta por unidade', 'acesso por papel (vistoriador, gestor, admin)']], ['Painel gerencial', ['somente agregados; mínimo de grupo', '(cgu_dashboard_policy) e supressão por recorte']], ['Auditoria', ['cgu_sync_audit · cgu_admin_audit · cgu_backup_log', 'eventos de chamado']]].forEach(([t, l]) => { const b = caixa(920, y, 360, t, l, { stroke: VERDE }); s += b.svg; cc.push(y + b.h / 2); y += b.h + 14; });
  s += `<path d="M400 ${cl[1]}H500" stroke="${NAVY}" stroke-width="2" marker-end="url(#ah)"/>${T(450, cl[1] - 8, 'só o que é enviado', { s: 10, a: 'middle', i: 1 })}`;
  [[0, 0], [1, 0], [2, 1], [3, 1]].forEach(([i, j]) => { s += `<path d="M810 ${cm[i]}L920 ${cc[j] + (i % 2 ? 8 : -8)}" stroke="${VERDE}" stroke-width="2" marker-end="url(#ag)"/>`; });
  s += `<path d="M1290 ${cc[0]}V${cc[2]}" stroke="${VERDE}" stroke-width="2" marker-end="url(#ag)"/>`;
  s += `<rect x="20" y="620" width="1280" height="86" rx="10" fill="#fff" stroke="${AMB}" stroke-width="1.4"/>${T(34, 642, 'DECISÕES E LIMITES DE PRIVACIDADE', { b: 1, c: AMB, s: 13 })}${T(34, 662, '• O valor de k (mínimo de grupo) é decisão do dono dos dados; k = 1 foi decidido para o piloto. O painel não mostra grupos menores que o mínimo cadastrado.', { s: 11.5 })}${T(34, 679, '• IDs de vistoria são locais: a mesma vistoria lançada em dois aparelhos pode ser contada duas vezes; não há reconciliação automática.', { s: 11.5 })}${T(34, 696, '• A consistência SHA-256 prova integridade do conteúdo, não autoria. Prazo e vencimento no painel são declarados pelo aparelho.', { s: 11.5 })}`;
  return moldura(W, Hh, 'FLUXO DE DADOS E PRIVACIDADE', 'O que fica no aparelho, o que sai somente por envio explícito e o que a Central mostra.', s,
    'Fontes: INTEGRACAO-CENTRAL-PILOTO.md, HARDENING-SEGURANCA.md e relato do Compasso. Não constitui parecer jurídico nem análise de conformidade à LGPD.');
}

/* ===== 5. Implantação e ambientes ===== */
function implantacao() {
  const W = 1320, Hh = 760;
  let s = '';
  const nó = (x, y, w, t, l, o) => { const b = caixa(x, y, w, t, l, o || {}); s += b.svg; return b.h; };
  nó(24, 100, 270, 'Navegador do usuário', ['PWA instalada (Android, iPhone, desktop)', 'IndexedDB · service worker versionado', 'câmera e GPS (Permissions-Policy: self)', 'login direto no Auth (CSP connect-src)']);
  nó(380, 100, 300, 'GitHub Pages · branch main', ['frontend estático da v1.0.x', 'demonstração com dados sintéticos', 'sem /api, sem isolamento por unidade'], { stroke: AMB, fill: '#FFF9E0' });
  nó(380, 250, 300, 'Vercel · piloto (v1.27.x)', ['mesma origem: páginas + api/ (config,', 'health, units, sync, dashboard, admin-users)', 'vercel.json: CSP, X-Frame-Options DENY,', 'nosniff, Referrer-Policy no-referrer']);
  nó(780, 100, 330, 'Supabase · projeto do piloto', ['Auth (PKCE, OIDC/SAML, GitHub)', 'Postgres: schema-producao.sql (28 tabelas cgu_*)', '26 migrations · RLS · RPCs SECURITY DEFINER', 'Storage: bucket cgu-relatorios'], { stroke: VERDE, fill: '#F1FAF6' });
  nó(780, 300, 330, 'Variáveis de ambiente (Vercel)', ['CENTRAL_SYNC_ENABLED (desligada por padrão)', 'SUPABASE_URL · SUPABASE_PUBLISHABLE_KEY', 'identidade: um entre OIDC, SSO id ou domínio', 'nunca service_role; segredos fora do repositório'], { stroke: VERDE });
  const seta = (x1, y1, x2, y2, t) => `<path d="M${x1} ${y1}L${x2} ${y2}" stroke="${NAVY}" stroke-width="1.8" fill="none" marker-end="url(#ah)"/>${t ? T((x1 + x2) / 2, (y1 + y2) / 2 - 6, t, { s: 10.5, a: 'middle', i: 1 }) : ''}`;
  s += seta(294, 150, 380, 150, 'HTTPS') + seta(294, 190, 380, 310, 'HTTPS') + seta(680, 330, 780, 190, 'RPC com JWT') + seta(294, 130, 780, 130, '') ;
  s = s.replace(seta(294, 130, 780, 130, ''), '');
  s += `<rect x="24" y="480" width="1272" height="220" rx="12" fill="#F7FBFD" stroke="#C9DCE8" stroke-width="1.5"/>${T(38, 504, 'AMBIENTES', { b: 1, s: 14 })}`;
  [['Demonstração', 'dados sintéticos; GitHub Pages ou painel em modo Demonstração; sem login'], ['Piloto', 'Vercel + Supabase com unidades e papéis reais; sincronização ligada só após aprovação'], ['Simulação', 'unidade SIMUL-01 com dados fictícios; limpeza por supabase/simulacao/limpar-simulado.sql'], ['Desenvolvimento / QA', 'portal local de QA com origem exclusiva; migrations testadas antes do remoto']].forEach(([a, b], i) => {
    s += `<rect x="${40 + i * 312}" y="520" width="296" height="90" rx="8" fill="#fff" stroke="${NAVY}" stroke-width="1.3"/>${T(50 + i * 312, 542, a, { b: 1, s: 12.5 })}${[...b.matchAll(/.{1,44}(\s|$)/g)].map((m, k) => T(50 + i * 312, 560 + k * 15, m[0].trim(), { s: 10.8 })).join('')}`;
  });
  s += T(38, 640, 'Versionamento: o aplicativo consulta a versão do servidor, salva antes de atualizar e usa cache versionado (paridade de versão testada). Rollback: reimplantar o deploy anterior; migrations são aplicadas somente após aprovação operacional.', { s: 11.5 });
  s += T(38, 658, 'Publicação atual do campo: GitHub Pages (main). O repositório da candidata (codex/release-candidate-1.1.0) é privado; Pages privado depende do plano da conta.', { s: 11.5 });
  return moldura(W, Hh, 'DIAGRAMA DE IMPLANTAÇÃO E AMBIENTES', 'Onde cada parte roda, como se conectam e quais ambientes existem.', s,
    'Fontes: vercel.json, INTEGRACAO-CENTRAL-PILOTO.md, HOSPEDAGEM-E-PRIVACIDADE.md e relato do Compasso (v1.27.12). Identificadores de projeto e chaves não são reproduzidos.');
}

/* ===== 6. Mapa de telas ===== */
function telas() {
  const W = 1320, Hh = 790;
  let s = '';
  const col = (x, w, titulo, cor, st, grupos) => {
    s += `<rect x="${x}" y="76" width="${w}" height="${Hh - 150}" rx="14" fill="${cor}" stroke="${st}" stroke-width="2" stroke-dasharray="8 5"/>${T(x + 14, 100, titulo, { b: 1, s: 14 })}`;
    let y = 114;
    grupos.forEach(([t, ls]) => { const b = caixa(x + 12, y, w - 24, t, ls, { stroke: st }); s += b.svg; y += b.h + 10; });
  };
  col(20, 420, 'APLICATIVO DE CAMPO (index.html)', '#F4FAFE', NAVY, [
    ['Edifícios', ['lista e busca · + Edifício · cartão do edifício', 'Continuar vistoria · exportar backup do edifício']],
    ['Vistoria (abas)', ['Dados · Fotos · Constatações · Conclusão · Emitir']],
    ['Foto (janela)', ['Descrição · Recortar · Marcar foto · Excluir', 'Vídeo da constatação (envio ao repositório)']],
    ['Painel (local)', ['indicadores, filtros, agrupar, CSV', 'protegido por PIN opcional']],
    ['Ajustes', ['perfil, responsável técnico, carimbo, PIN,', 'backup e consolidação (exportar/importar)']],
    ['Manual', ['abre offline; manual.html']],
  ]);
  col(460, 420, 'CENTRAL (central.html)', '#F1FAF6', VERDE, [
    ['Início', ['resumo da unidade e do repositório']],
    ['Relatórios, fotos e vídeos', ['consulta e download · tela Vídeos']],
    ['Pessoas', ['cadastro e convite, papel, vencimento,', 'senha temporária, desativar, apagar']],
    ['Edifícios', ['dados, vínculo de pessoas, mapeamento local → central']],
    ['Cadastro da unidade', ['organização e responsável técnico']],
    ['Unidades e Mapa geral · Armazenamento', ['cotas por pessoa e unidade']],
    ['Backup e limpeza · Objetivos (OKR) · Governança de risco', ['limpeza em duas etapas · ciclos e KRs · regra versionada']],
  ]);
  col(900, 400, 'PAINEL GERENCIAL (painel.html)', '#EAF4FA', NAVY, [
    ['Modos de dados', ['Demonstração (sintéticos)', 'Dados reais do piloto (após login; leitura)']],
    ['Visão geral', ['filtros: unidade, período, sistema, gravidade,', 'ambiente, população · KPIs e gráficos', 'tabela de constatações com prazo e vencimento']],
    ['Ficha da edificação', ['detalhe por edificação']],
    ['Alertas e chamados', ['abrir chamado · baixa com anexo · decisão']],
    ['Exibição', ['TV · PC · Mobile']],
  ]);
  return moldura(W, Hh, 'MAPA DE TELAS E NAVEGAÇÃO', 'Telas do aplicativo de campo, da Central e do Painel gerencial.', s,
    'Fontes: manual.html (campo) e relato do Compasso sobre manual-central e manual-painel (v1.27.12). A estrutura exata das abas deve ser conferida nesses manuais.');
}

/* ===== 7. Modelo de dados local (IndexedDB) ===== */
function modeloLocal() {
  const W = 1320, Hh = 640;
  let s = '';
  const B = {};
  const st = (k, x, y, w, t, ls, o) => { const b = caixa(x, y, w, t, ls, o || {}); B[k] = { x, y, w, h: b.h }; s += b.svg; };
  st('obras', 30, 100, 250, 'obras', ['PK id', 'nome · cliente · endereço', 'contrato · ART/RRT']);
  st('vist', 380, 100, 300, 'vistorias', ['PK id · índice obraId', 'tipo · data · status (rascunho/oficial)', 'GPS · objetivo · metodologia', 'conclusão · recomendações', 'constatacoes[] (lista embutida)']);
  st('fotos', 790, 100, 280, 'fotos', ['PK id · índice vistoriaId', 'blob · origem (câmera/galeria)', 'data/hora · lat/lon · descrição', 'marcações · recorte · contentSha256']);
  st('acoes', 790, 290, 280, 'acoes', ['PK id · índices vistoriaId,', 'constatacaoId, snapshotId', 'estado · prazo · responsável']);
  st('emis', 380, 330, 300, 'emissoes', ['PK id · índice vistoriaId', 'tipo VT/MF/RC · formato DOCX/PDF', 'número · revisão · oficial/rascunho']);
  st('snap', 380, 480, 300, 'snapshots', ['PK id · índices vistoriaId, emissaoId', 'projeção imutável verificável (SHA-256)']);
  st('arq', 30, 330, 290, 'arquivosEmitidos', ['PK id · índices emissaoId, snapshotId', 'bytes do arquivo emitido (PDF/DOCX)']);
  st('set', 1130, 100, 160, 'settings', ['PK key', 'perfil, PIN,', 'sequências']);
  const lig = (a, b, t) => {
    const A = B[a], C = B[b];
    const x1 = A.x + A.w, y1 = A.y + A.h / 2, x2 = C.x, y2 = C.y + C.h / 2;
    return `<path d="M${x1} ${y1}H${(x1 + x2) / 2}V${y2}H${x2}" stroke="${NAVY}" stroke-width="1.6" fill="none" marker-end="url(#ah)"/>${T((x1 + x2) / 2, Math.min(y1, y2) - 6, t, { s: 10.5, a: 'middle', i: 1 })}`;
  };
  s += lig('obras', 'vist', '1 · N') + lig('vist', 'fotos', '1 · N');
  s += `<path d="M530 ${B.vist.y + B.vist.h}V${B.emis.y}" stroke="${NAVY}" stroke-width="1.6" marker-end="url(#ah)"/>${T(540, 305, '1 · N', { s: 10.5, i: 1 })}<path d="M530 ${B.emis.y + B.emis.h}V${B.snap.y}" stroke="${NAVY}" stroke-width="1.6" marker-end="url(#ah)"/>${T(540, 460, '1 · 1 por emissão', { s: 10.5, i: 1 })}`;
  s += `<path d="M380 ${B.emis.y + 40}H320" stroke="${NAVY}" stroke-width="1.6" marker-end="url(#ah)"/>${T(330, B.emis.y + 34, '1 · N', { s: 10.5, i: 1 })}`;
  s += `<path d="M680 ${B.vist.y + 90}H735V${B.acoes.y + 40}H790" stroke="${NAVY}" stroke-width="1.6" fill="none" marker-end="url(#ah)"/>${T(735, B.vist.y + 84, '1 · N', { s: 10.5, a: 'middle', i: 1 })}`;
  s += `<rect x="790" y="460" width="500" height="120" rx="10" fill="#FFF9E0" stroke="${AMB}" stroke-width="1.3"/>${T(802, 482, 'Notas', { b: 1, c: AMB })}${T(802, 502, '• Constatação é lista embutida na vistoria; fotos ligam a ela por fotoIds.', { s: 11 })}${T(802, 519, '• IDs legados aceitam ^[A-Za-z0-9_-]{8,64}$ ou UUID; snapshots e arquivos usam UUID.', { s: 11 })}${T(802, 536, '• Importar backup não apaga registros ausentes (sem tombstones).', { s: 11 })}${T(802, 553, '• Migração v1 → v2 preserva edifícios, vistorias, fotos e emissões legadas.', { s: 11 })}`;
  return moldura(W, Hh, 'MODELO DE DADOS LOCAL · INDEXEDDB (cgu-vistorias)', 'Stores e índices do aplicativo de campo na candidata v1.27 (db.js). Evolui o UML da v1.0.5.',
    s, 'Fonte: db.js e HARDENING-SEGURANCA.md (branch codex/release-candidate-1.1.0). Os campos mostrados são os principais, não a lista completa.');
}

/* ===== tabelas HTML ===== */
const tab = (cab, linhas, larg) => `<table><thead><tr>${cab.map((c, i) => `<th${larg && larg[i] ? ` style="width:${larg[i]}"` : ''}>${esc(c)}</th>`).join('')}</tr></thead><tbody>${linhas.map((l) => `<tr>${l.map((c, i) => `<td${i === 0 ? ' class="k"' : ''}>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;

const DADOS_A = [
  ['cgu_units', 'Unidades (órgãos) da plataforma', 'PK id'],
  ['cgu_unit_profile', 'Dados da organização e do responsável técnico usados nos laudos', 'PK/FK unit_id'],
  ['cgu_user_profiles', 'Perfil da pessoa (e-mail, nome, ativo, validação)', 'PK/FK user_id'],
  ['cgu_unit_memberships', 'Papel da pessoa em cada unidade, ativo e vencimento', 'PK unit_id + user_id'],
  ['cgu_invites', 'Convites pendentes com papel e prazo de acesso', 'PK email + unit_id'],
  ['cgu_user_quotas', 'Cota de armazenamento por pessoa e unidade', 'PK unit_id + user_id'],
  ['cgu_admin_audit', 'Trilha de ações administrativas sobre usuários', 'PK id'],
  ['cgu_sync_audit', 'Trilha dos lotes de sincronização (recebidos, inseridos, duplicados)', 'PK id'],
  ['cgu_backup_log', 'Registro de backups e limpezas (escopo, contagens, bytes)', 'PK id'],
  ['cgu_dashboard_policy', 'Política de privacidade do painel: mínimo de vistorias por grupo, com aprovação', 'PK policy_key'],
  ['cgu_buildings', 'Edifícios centrais (nome, cliente, endereço, contrato, ART)', 'PK unit_id + building_id'],
  ['cgu_building_aliases', 'Liga o ID local do edifício ao edifício central', 'PK unit_id + local_building_id'],
  ['cgu_building_requests', 'Pedidos de vínculo de edifícios locais', 'PK unit_id + local_building_id'],
  ['cgu_building_users', 'Pessoas vinculadas a cada edifício', 'PK unit_id + building_id + user_id'],
];
const DADOS_B = [
  ['cgu_snapshots', 'Projeção imutável de cada emissão, com hash de origem e revisão', 'PK unit_id + snapshot_id'],
  ['cgu_findings', 'Constatações do snapshot: gravidade, códigos de sistema e ambiente, flags', 'PK unit_id + snapshot_id + finding_id'],
  ['cgu_actions', 'Ações corretivas: estado, prazo, responsável', 'PK unit_id + action_id'],
  ['cgu_reports', 'Relatórios PDF/DOCX arquivados (caminho, SHA-256, número, revisão)', 'PK unit_id + emission_id'],
  ['cgu_report_photos', 'Fotos de cada relatório, com original e SHA-256', 'PK unit_id + emission_id + photo_id'],
  ['cgu_videos', 'Vídeos de campo por constatação (legenda, duração, SHA-256)', 'PK unit_id + video_id'],
  ['cgu_tickets', 'Chamados: baixa, decisão e anexo verificado', 'PK unit_id + ticket_id'],
  ['cgu_ticket_events', 'Eventos do chamado: aberto, baixa, recebimento, aprovação', 'PK id'],
  ['cgu_okr_cycles', 'Ciclos de OKR (rascunho, ativo, encerrado)', 'PK cycle_id'],
  ['cgu_okr_objectives', 'Objetivos do ciclo, com dono e arquivamento', 'PK objective_id'],
  ['cgu_okr_key_results', 'Resultados-chave ligados a um KPI, com meta e linha de base', 'PK kr_id'],
  ['cgu_okr_kpis', 'Catálogo dos 10 KPIs do painel', 'PK kpi_code'],
  ['cgu_risk_rule_versions', 'Regra de risco versionada: proposta, aprovação, rejeição, revogação', 'PK rule_id'],
  ['cgu_settings', 'Parâmetros chave/valor do servidor', 'PK key'],
];
const KPIS = [
  ['cobertura', 'Cobertura do inventário', 'percentual', 'subir'], ['vistorias', 'Vistorias', 'contagem', 'subir'], ['constatacoes', 'Constatações', 'contagem', 'descer'],
  ['alta_critica', 'Constatações Alta/Crítica', 'contagem', 'descer'], ['qualidade', 'Qualidade dos dados (vistorias completas)', 'percentual', 'subir'], ['reincidencia', 'Reincidência', 'percentual', 'descer'],
  ['acoes_verificadas', 'Ações verificadas', 'percentual', 'subir'], ['formalizacao', 'Formalização de laudos', 'percentual', 'subir'], ['acoes_vencidas', 'Ações vencidas', 'percentual', 'descer'],
  ['prazo_tratamento', 'Prazo médio de tratamento de ação (dias)', 'contagem', 'descer'],
];
const TESTES = [
  ['Backup e importação', 'backup.test.cjs · backup.security.test.cjs', 'envelope, whitelist, tipos, limites, magic bytes, SHA-256, fórmulas CSV'],
  ['Snapshots de emissão', 'emission-snapshot.test.js · snapshot-diff.test.js', 'projeção imutável, verificação, diferenças entre revisões'],
  ['Banco local e numeração', 'db-open.test.js · db-numeracao.test.js · app-init.test.cjs', 'abertura e migração do IndexedDB, sequência de emissão, inicialização'],
  ['Analítico local e indicadores', 'analytics.test.js · analytics-export.test.js · indicator-registry.test.js', 'KPIs locais, exportação, registro de indicadores'],
  ['Ações corretivas', 'acoes.test.js', 'estado, prazo e vínculo com constatações'],
  ['Taxonomia local', 'taxonomia.test.js', '46 tipos de constatação e 34 ambientes (códigos SIS e AMB)'],
  ['Integração central e sessão', 'central-integration.test.cjs · session-link.test.cjs · schema-producao.test.cjs', 'contrato, sessão, schema de produção'],
  ['Pessoas, edifícios e unidade', 'admin-users.test.cjs · assigned-buildings.test.cjs · unit-profile.test.cjs', 'gestão de usuários, edifícios atribuídos, cadastro da unidade'],
  ['OKR e governança de risco', 'governance.test.cjs', 'ciclos, objetivos, regra de risco versionada'],
  ['Vídeos', 'videos.test.cjs · tests/browser/app-videos.cjs', 'captura, legenda e envio de vídeo'],
  ['Relatórios com imagem', 'report-image.test.cjs', 'JPEG, PNG e WebP em PDF e DOCX'],
  ['Painel e Central (navegador)', 'tests/browser/painel-simulado.cjs · painel-lacunas.cjs · central-simulado.cjs', 'painel e Central com dados simulados (SIMUL-01)'],
  ['Manuais e telas', 'manuais.test.cjs · tests/browser/manuais-simulado.cjs · capturar-telas.cjs', 'manuais HTML/PDF e capturas de telas'],
  ['Acessibilidade e GPS', 'a11y.test.cjs · geo-retry.test.cjs', 'requisitos de acessibilidade, nova tentativa de GPS'],
  ['Distribuição e demonstração', 'distribution.test.cjs · demo-carousel.test.cjs · simulacao.test.cjs', 'arquivos distribuídos, demonstração, dados simulados'],
];
const GUIAS = [
  ['Vistoriador', 'Campo e envio', 'Usa o aplicativo de campo: cadastra edifícios, registra fotos, vídeos e constatações, emite relatórios, sincroniza com a Central e restaura registros. Pode pedir vínculo de edifício local ao central.', 'Não acessa painel gerencial nem Central.'],
  ['Gestor', 'Leitura gerencial e abertura de chamados', 'Consulta o painel e os relatórios, fotos e vídeos arquivados; abre chamados e lê anexos de baixa; arquiva objetivos de OKR; envia dados e vê a política de grupo mínimo.', 'Não registra baixa, não decide chamado nem administra pessoas.'],
  ['Operacional', 'Painel e baixa', 'Consulta o painel e lista chamados; registra a baixa do chamado com texto e anexo (até 5 MB).', 'Não usa o aplicativo de campo (vê o aviso “Este perfil usa o painel”).'],
  ['Chefia (chefe de serviço)', 'Decisão sobre baixas', 'Consulta o painel, abre chamados e recebe ou aprova a baixa registrada pelo operacional; arquiva objetivos de OKR.', 'Não usa o aplicativo de campo.'],
  ['Administrador da unidade', 'Operação da Central', 'Gere pessoas, edifícios, cadastro da unidade, cotas, backup e limpeza, OKR e regra de risco da própria unidade.', 'A limpeza exige backup recente e dupla confirmação.'],
  ['Administrador da plataforma', 'Todas as unidades', 'Tem o alcance do administrador da unidade em todas as unidades e ainda cria unidades, concede aprovação simples e revoga regras de risco.', 'Entra com GitHub; o e-mail é conferido após o retorno.'],
];
const GLOSSARIO = [
  ['Snapshot', 'Projeção imutável e verificável de uma emissão, enviada à Central sem textos livres.'],
  ['Emissão oficial', 'Emissão com número sequencial e registro no Painel; controle interno, não aprovação institucional.'],
  ['Revisão', 'Nova emissão do mesmo conteúdo alterado, mantendo o número da vistoria.'],
  ['Constatação', 'Achado da vistoria, com tipo, ambiente, gravidade, descrição, recomendação e fotos.'],
  ['Gravidade', 'Informativa, Baixa, Média, Alta, Crítica ou Sem classificação; escolhida pelo usuário.'],
  ['Unidade', 'Órgão ou departamento que agrupa pessoas, edifícios e registros na Central.'],
  ['Papel', 'Função da pessoa na unidade: vistoriador, gestor, operacional, chefia, admin_unidade ou admin_plataforma.'],
  ['RLS', 'Row Level Security: política do banco que restringe linhas por usuário e unidade.'],
  ['RPC', 'Função do banco chamada pela aplicação; as de escrita usam SECURITY DEFINER com verificação de papel.'],
  ['PKCE', 'Fluxo OAuth com desafio de código, sem segredo no navegador.'],
  ['JWT', 'Token de sessão do usuário, usado nas chamadas à API e às RPCs.'],
  ['Mínimo de grupo (k)', 'Número mínimo de vistorias para exibir um recorte do painel; grupos menores são suprimidos.'],
  ['Baixa', 'Registro do operacional de que o chamado foi tratado, com texto e anexo opcional.'],
  ['Recebimento / Aprovação', 'Decisões da chefia sobre a baixa: receber ou aprovar.'],
  ['KPI · OKR · KR', 'Indicador do painel · Objetivos e Resultados-Chave · Resultado-Chave (meta ligada a um KPI).'],
  ['Alias de edifício', 'Ligação entre o ID local do edifício e o edifício central.'],
  ['Cota', 'Limite de armazenamento por pessoa na unidade.'],
  ['Prazo declarado', 'Data de vencimento informada no aparelho; não é prazo oficial.'],
  ['SIMUL-01', 'Unidade de simulação com dados fictícios para testes.'],
  ['PWA · IndexedDB · Service Worker', 'Aplicativo instalável · banco local do navegador · cache e funcionamento offline.'],
];

const ITENS = [
  { id: 'matriz', titulo: 'Matriz de papéis e permissões', tipo: 'svg', svg: matriz },
  { id: 'estados', titulo: 'Diagramas de estados', tipo: 'svg', svg: estados },
  { id: 'seq-login', titulo: 'Sequência · login e acesso', tipo: 'svg', svg: SEQ.login },
  { id: 'seq-sync', titulo: 'Sequência · sincronizar e arquivar', tipo: 'svg', svg: SEQ.sync },
  { id: 'seq-chamado', titulo: 'Sequência · chamado, baixa e aprovação', tipo: 'svg', svg: SEQ.chamado },
  { id: 'dfd', titulo: 'Fluxo de dados e privacidade', tipo: 'svg', svg: dfd },
  { id: 'implantacao', titulo: 'Implantação e ambientes', tipo: 'svg', svg: implantacao },
  { id: 'telas', titulo: 'Mapa de telas e navegação', tipo: 'svg', svg: telas },
  { id: 'modelo-local', titulo: 'Modelo de dados local (IndexedDB)', tipo: 'svg', svg: modeloLocal },
  { id: 'dados-1', titulo: 'Dicionário de dados · identidade, unidade e edifícios', tipo: 'html', html: tab(['Tabela', 'Finalidade', 'Chave'], DADOS_A, ['24%', '52%', '24%']), nota: 'Fonte: schema-producao.sql (v1.27.12). Colunas completas no arquivo de schema.' },
  { id: 'dados-2', titulo: 'Dicionário de dados · registros, chamados, OKR e risco', tipo: 'html', html: tab(['Tabela', 'Finalidade', 'Chave'], DADOS_B, ['24%', '52%', '24%']), nota: 'Fonte: schema-producao.sql (v1.27.12). Todas, exceto as de catálogo e a de parâmetros, têm unit_id.' },
  { id: 'kpis', titulo: 'Catálogo de KPIs e estrutura do OKR', tipo: 'html', html: tab(['Código', 'Indicador', 'Unidade', 'Direção padrão'], KPIS, ['20%', '48%', '16%', '16%'])
    + '<p style="margin-top:3mm"><b>Resultado-chave (KR):</b> código, título, KPI ligado, direção (subir, descer, no mínimo, no máximo), meta, linha de base e período. <b>Ciclo:</b> rascunho, ativo ou encerrado. Há objetivos pré-cadastrados; as <b>metas numéricas continuam “a definir”</b> pelo dono dos dados: o sistema não as inventa.</p>', nota: 'Fonte: migrations 20261031002100 e 20261101000400 e relato do Compasso. As fórmulas de cálculo estão em manual-painel.html.' },
  { id: 'testes', titulo: 'Rastreabilidade: funcionalidade × testes', tipo: 'html', html: tab(['Funcionalidade', 'Arquivos de teste', 'Cobertura (pelo nome e finalidade)'], TESTES, ['22%', '40%', '38%']), nota: 'Cobertura inferida pelos nomes dos arquivos em tests/ da branch; os testes não foram executados para este documento. Resultados e evidências estão em VALIDACAO.md e VALIDACAO-CANDIDATA.md.' },
  { id: 'guias', titulo: 'Guias rápidos por perfil', tipo: 'html', html: tab(['Perfil', 'Foco', 'O que faz', 'Limites'], GUIAS, ['16%', '16%', '44%', '24%']), nota: 'Derivado da matriz de papéis (RPCs de schema-producao.sql) e do relato do Compasso; os manuais da Central e do Painel são a referência de uso.' },
  { id: 'glossario', titulo: 'Glossário', tipo: 'html', html: tab(['Termo', 'Significado'], GLOSSARIO, ['26%', '74%']), nota: '' },
];

module.exports = { ITENS, SAIDA };
if (require.main === module) {
  const fs = require('fs'), path = require('path');
  ITENS.filter((i) => i.tipo === 'svg').forEach((i) => { fs.writeFileSync(path.join(__dirname, i.id + '.svg'), i.svg()); console.log(i.id + '.svg'); });
}
