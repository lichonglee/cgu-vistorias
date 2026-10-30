/* Versioned, local definitions for the indicators shown by this PWA. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.IndicatorRegistry = api;
})(typeof self !== 'undefined' ? self : this, function () {
  const RULE_VERSION = 'cgu-local-indicators-1.0.0';
  const localLimit = 'Definição local provisória, não aprovada pelo Product/Data Owner; não é uma medida de risco nem uma visão institucional consolidada.';
  const raw = [
    { id: 'local.coverage', key: 'kpi.coverage', label: 'Cobertura de edifícios na janela', definition: 'Edifícios cadastrados neste aparelho que têm ao menos um snapshot selecionado e verificável dentro do período.', numerator: 'Edifícios distintos com snapshot verificável na janela', denominator: 'Edifícios cadastrados neste aparelho', unit: 'razão de edifícios (numerador / denominador)', window: 'Janela selecionada; considera a data congelada da vistoria.', source: 'Inventário local, vistorias, emissões e snapshots verificados.', exclusions: 'Edifícios sem snapshot verificável na janela não entram no numerador; o denominador inclui todo edifício cadastrado.', limits: localLimit },
    { id: 'local.severe-density', key: 'kpi.severeDensity', label: 'Densidade de constatações Altas/Críticas', definition: 'Quantidade de constatações Alta ou Crítica por vistoria com snapshot selecionado verificável.', numerator: 'Constatações com gravidade Alta ou Crítica', denominator: 'Vistorias com snapshot selecionado verificável', unit: 'razão de constatações por vistoria; pode exceder 1 e não é porcentagem', window: 'Janela selecionada; usa conteúdo congelado na emissão.', source: 'Constatações dos últimos snapshots locais verificáveis.', exclusions: 'Rascunhos, snapshots ausentes, divergentes ou ambíguos.', limits: localLimit },
    { id: 'local.recurrence', key: 'kpi.recurrence', label: 'Vínculos de recorrência declarados', definition: 'Constatações com vínculo explícito de recorrência registrado por uma pessoa.', numerator: 'Constatações com recorrenciaDeId válido', denominator: 'Constatações dos snapshots locais verificáveis', unit: 'razão de declarações por constatação', window: 'Janela selecionada.', source: 'Vínculos explícitos presentes nos snapshots.', exclusions: 'Não procura similaridade textual nem infere recorrência por edifício ou data.', limits: 'Declaração local não verificada; o destino do vínculo pode estar ausente. ' + localLimit },
    { id: 'local.remediation', key: 'kpi.remediation', label: 'Saneamento verificado', definition: 'Não calculado: uma emissão ou declaração de ação não comprova execução nem verificação.', numerator: 'Não disponível', denominator: 'Não disponível', unit: 'não calculado', window: 'Sem janela calculável.', source: 'Ações corretivas declaradas localmente.', exclusions: 'Nenhuma declaração é tratada como comprovação.', limits: 'Não há evidência verificada de execução; não é medida de risco nem de conformidade.' },
    { id: 'local.formalization', key: 'kpi.formalization', label: 'Formalização local de vistorias', definition: 'Vistorias com ao menos uma linha de emissão em relação às vistorias cadastradas no período.', numerator: 'Vistorias distintas com emissão', denominator: 'Vistorias cadastradas na janela', unit: 'razão de vistorias', window: 'Janela selecionada pela data congelada da vistoria.', source: 'Vistorias e linhas de emissão locais.', exclusions: 'A contagem é por vistoria, não por PDF/DOCX nem por linha de relatório.', limits: localLimit },
    { id: 'local.snapshot-integrity', key: 'kpi.snapshotIntegrity', label: 'Integridade local de snapshots', definition: 'Vistorias com snapshot selecionado verificável em relação às vistorias com emissão.', numerator: 'Vistorias com snapshot selecionado verificável', denominator: 'Vistorias com emissão na janela', unit: 'razão de vistorias', window: 'Janela selecionada.', source: 'Resultado de verificarEmissao no IndexedDB local.', exclusions: 'Snapshots ausentes, divergentes, legados ou ambíguos não contam como verificados.', limits: 'Verificado significa consistência interna local; não prova autoria nem integridade externa. ' + localLimit },
    { id: 'local.photo-association', key: 'kpi.photoAssociation', label: 'Constatações com foto associada', definition: 'Constatações que referenciam pelo menos uma evidência de foto presente no snapshot.', numerator: 'Constatações com fotoId resolvendo para evidência existente', denominator: 'Constatações dos snapshots locais verificáveis', unit: 'razão de constatações', window: 'Janela selecionada.', source: 'Associações fotoId e hashes de evidências dos snapshots.', exclusions: 'Não avalia suficiência técnica nem conteúdo visual da foto.', limits: 'Associação não significa validação da evidência. ' + localLimit },
    { id: 'local.gps-availability', key: 'kpi.gpsAvailability', label: 'GPS inicial disponível', definition: 'Snapshots com coordenadas iniciais válidas em relação aos snapshots verificáveis.', numerator: 'Snapshots com coordenadas iniciais válidas', denominator: 'Snapshots selecionados verificáveis', unit: 'razão de snapshots', window: 'Janela selecionada.', source: 'GPS inicial congelado no snapshot.', exclusions: 'Coordenadas inválidas não contam; GPS ausente não é tratado como falha de vistoria.', limits: 'Indicador descritivo e opcional; coleta inicial depende de ação explícita. ' + localLimit },
    { id: 'local.edited-after-emission', key: 'status.editedAfterEmission', label: 'Vistorias editadas após emissão', definition: 'Vistorias cujo updatedAt local posterior à emissão indica que o estado atual difere temporalmente do conteúdo emitido.', numerator: 'Vistorias editadas após a emissão selecionada', denominator: 'Snapshots selecionados verificáveis', unit: 'contagem de vistorias (numerador / denominador)', window: 'Janela selecionada.', source: 'updatedAt atual e data da emissão local.', exclusions: 'Não compara campo por campo; o snapshot continua sendo a fonte congelada.', limits: 'Sinal de defasagem temporal, não juízo sobre a vistoria. ' + localLimit },
    { id: 'local.unverified-emissions', key: 'status.unverifiedLatestEmissions', label: 'Últimas emissões sem snapshot verificável', definition: 'Vistorias na janela cuja emissão mais recente não pôde ser validada ou ficou ambígua.', numerator: 'Vistorias com última emissão não verificável', denominator: 'Vistorias com emissão na janela', unit: 'contagem de vistorias; exibida junto ao denominador', window: 'Janela selecionada.', source: 'Emissões e resultado de verificação de snapshot.', exclusions: 'Não retorna silenciosamente para revisão anterior.', limits: localLimit },
    { id: 'local.duplicate-candidates', key: 'status.duplicateCandidates', label: 'Pares candidatos a duplicata', definition: 'Pares locais que compartilham edifício, data e hash do conteúdo de constatações, mas têm IDs distintos.', numerator: 'Pares candidatos detectados', denominator: 'Não se aplica', unit: 'contagem de pares', window: 'Janela selecionada.', source: 'Hash de conteúdo local e IDs de vistoria.', exclusions: 'Registros vazios, sem data válida ou com digest indisponível.', limits: 'Apenas alerta; nunca mescla nem confirma que os registros sejam duplicados. ' + localLimit },
    { id: 'actions.completion', key: 'action.completion', label: 'Ações declaradas como concluídas', definition: 'Ações com estado declarado concluída em relação às ações declaradas não canceladas.', numerator: 'Ações locais declaradas concluídas', denominator: 'Ações locais declaradas, exceto canceladas', unit: 'razão de ações declaradas', window: 'Ações vinculadas às constatações selecionadas na janela.', source: 'Registros locais de ações associados pelo ID da constatação.', exclusions: 'Ações canceladas e ações de constatações fora do escopo selecionado.', limits: 'Declarações do usuário; não comprova execução nem verificação. ' + localLimit },
    { id: 'actions.active', key: 'action.active', label: 'Ações locais abertas ou em execução', definition: 'Contagem de ações declaradas nos estados aberta ou em execução, vinculadas às constatações selecionadas.', numerator: 'Ações com estado aberta ou em execução', denominator: 'Não se aplica', unit: 'contagem de ações', window: 'Ações vinculadas às constatações selecionadas na janela.', source: 'Estado declarado em registros locais de ações.', exclusions: 'Ações concluídas, canceladas e ações de constatações fora do escopo selecionado.', limits: 'Estado declarado localmente; não comprova andamento real. ' + localLimit },
    { id: 'actions.overdue', key: 'action.overdue', label: 'Ações declaradas vencidas', definition: 'Ações abertas ou em execução cujo prazo ISO válido é anterior ao asOf local.', numerator: 'Ações ativas vencidas', denominator: 'Não se aplica', unit: 'contagem de ações', window: 'Prazo comparado à data asOf; ações limitadas aos snapshots selecionados.', source: 'Estado e prazo declarados localmente.', exclusions: 'Concluídas, canceladas, sem prazo válido ou com prazo igual a hoje.', limits: 'Prazo declarado, não prazo institucional verificado. ' + localLimit },
    { id: 'actions.aging30', key: 'action.aging30', label: 'Ações abertas há mais de 30 dias', definition: 'Ações abertas ou em execução com criadoEm há mais de 30 dias em relação ao relógio local.', numerator: 'Ações ativas com idade superior a 30 dias', denominator: 'Não se aplica', unit: 'contagem de ações', window: 'Relógio local da consulta; escopo de snapshots selecionados.', source: 'Estado e criadoEm declarados localmente.', exclusions: 'Concluídas, canceladas e datas de criação inválidas.', limits: 'Relógio do aparelho e data de criação podem não ser confiáveis. ' + localLimit },
    { id: 'actions.cancelled', key: 'action.cancelled', label: 'Ações declaradas canceladas', definition: 'Contagem de ações com estado local cancelada.', numerator: 'Ações canceladas', denominator: 'Não se aplica', unit: 'contagem de ações', window: 'Ações vinculadas às constatações selecionadas na janela.', source: 'Estado declarado localmente.', exclusions: 'Ações fora do escopo selecionado.', limits: 'Cancelamento é declaração local, não aprovação de governança. ' + localLimit },
    { id: 'actions.high-critical-without-action', key: 'action.highCriticalWithoutAction', label: 'Constatações Altas/Críticas sem ação declarada', definition: 'Constatações Alta ou Crítica sem ação vinculada em estado diferente de cancelada.', numerator: 'Constatações Alta/Crítica sem ação não cancelada', denominator: 'Constatações Alta/Crítica elegíveis no snapshot', unit: 'contagem (numerador / denominador)', window: 'Janela selecionada.', source: 'Constatações e ações locais vinculadas por ID.', exclusions: 'Snapshots não verificáveis e ações canceladas.', limits: 'Ausência de ação não prova ausência de mitigação externa. ' + localLimit },
    { id: 'followup.overdue', key: 'followup.vencida', label: 'Itens para acompanhamento: vencidos', definition: 'Linhas da fila correspondentes a ações abertas ou em execução com prazo vencido.', numerator: 'Itens com motivo vencida', denominator: 'Não se aplica', unit: 'contagem de linhas da fila', window: 'Mesma seleção de snapshots e data asOf dos indicadores de ação.', source: 'Fila local de acompanhamento.', exclusions: 'Ação concluída/cancelada e prazo inválido.', limits: 'A fila é somente leitura; não envia notificações. ' + localLimit },
    { id: 'followup.aging30', key: 'followup.aberta_30d', label: 'Itens para acompanhamento: abertas há mais de 30 dias', definition: 'Linhas da fila para ações abertas ou em execução com mais de 30 dias.', numerator: 'Itens com motivo aberta_30d', denominator: 'Não se aplica', unit: 'contagem de linhas da fila', window: 'Mesmo asOf e conjunto de snapshots selecionados.', source: 'Fila local de acompanhamento.', exclusions: 'Ação concluída/cancelada e criadoEm inválido.', limits: 'Um registro pode aparecer também em outro motivo da fila. ' + localLimit },
    { id: 'followup.no-action', key: 'followup.sem_acao', label: 'Itens para acompanhamento: Altas/Críticas sem ação', definition: 'Linhas da fila para constatações Alta ou Crítica sem ação não cancelada.', numerator: 'Itens com motivo sem_acao', denominator: 'Não se aplica', unit: 'contagem de linhas da fila', window: 'Mesmo período e snapshots dos demais indicadores.', source: 'Fila local de acompanhamento.', exclusions: 'Snapshots não verificáveis e constatações fora da janela.', limits: 'Um registro pode aparecer também em outro motivo; não é classificação de prioridade institucional. ' + localLimit }
  ];
  const overrides = {
    'local.coverage': {
      source: 'Inventário local atual e obraId atual da vistoria, mais vistorias, emissões e snapshots verificados.',
      exclusions: 'Edifícios sem snapshot verificável na janela não entram no numerador; o denominador inclui todo edifício cadastrado. Vistorias sem data válida ficam fora de janelas limitadas.'
    },
    'local.formalization': {
      window: 'Data congelada da vistoria quando há snapshot verificável; caso contrário, data atual editável.',
      exclusions: 'A contagem é por vistoria, não por PDF/DOCX nem por linha de relatório. Vistorias sem data válida ficam fora de janelas limitadas.'
    },
    'local.recurrence': {
      numerator: 'Constatações com recorrenciaDeId em formato UUID válido e diferente do próprio ID',
      denominator: 'Todas as constatações dos snapshots locais verificáveis',
      exclusions: 'Não procura similaridade textual nem infere recorrência por edifício ou data.',
      limits: 'Declaração local não verificada; o indicador não confere se o destino existe, é anterior, pertence ao mesmo edifício ou foi verificado. O denominador inclui constatações sem destino elegível e pode diluir a proporção observada. ' + localLimit
    },
    'local.remediation': { limits: 'Não há evidência verificada de execução; não é medida de risco nem de conformidade. ' + localLimit },
    'local.photo-association': {
      definition: 'Constatações que referenciam pelo menos uma evidência de foto presente no próprio snapshot selecionado.',
      numerator: 'Constatações com fotoId resolvendo para evidência existente no mesmo snapshot',
      source: 'Associações entre fotoIds e IDs das evidências do mesmo snapshot.',
      exclusions: 'Não usa hashes para resolver a associação; não avalia suficiência técnica nem conteúdo visual da foto.'
    },
    'local.duplicate-candidates': {
      definition: 'Pares locais de snapshots selecionados verificáveis que compartilham o edifício atual da vistoria, data e hash do conteúdo de constatações, mas têm IDs distintos.',
      numerator: 'Pares candidatos detectados; a lista mostra no máximo 200 e informa o total separado',
      source: 'Hash de conteúdo local, obraId atual da vistoria e IDs de vistoria.'
    },
    'actions.completion': {
      denominator: 'Ações locais cujo estado não é cancelada',
      limits: 'Ações com estado desconhecido podem permanecer no denominador; declarações do usuário não comprovam execução nem verificação. ' + localLimit
    },
    'actions.aging30': {
      definition: 'Ações abertas ou em execução com criadoEm há mais de 30 dias em relação ao relógio local da consulta.',
      numerator: 'Ações ativas com idade superior a 30 dias pelo relógio local',
      window: 'Relógio local now da consulta, independente do asOf; escopo de snapshots selecionados.',
      limits: 'Relógio do aparelho e data de criação podem não ser confiáveis; este contador pode divergir do vencimento calculado por asOf. ' + localLimit
    },
    'followup.aging30': {
      window: 'Mesmo conjunto de snapshots selecionados; idade calculada pelo relógio local now, independente do asOf.'
    }
  };
  const indicators = Object.freeze(raw.map(item => Object.freeze({ ...item, ...(overrides[item.id] || {}), ruleVersion: RULE_VERSION })));
  const byId = new Map(indicators.map(item => [item.id, item]));
  const byKey = new Map(indicators.map(item => [item.key, item]));
  const escDefault = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  function get(id) { return byId.get(id) || null; }
  function forKey(key) { return byKey.get(key) || null; }
  function idForKey(key) { return forKey(key)?.id || null; }
  function list() { return indicators.slice(); }
  function markdownTable() {
    const lines = ['| ID | Indicador | Unidade |', '| --- | --- | --- |'];
    for (const item of indicators) lines.push(`| ${item.id} | ${item.label} | ${item.unit} |`);
    return lines.join('\n');
  }
  function renderDetails(id, periodLabel = '', escapeHtml = escDefault) {
    const item = get(id);
    const escape = typeof escapeHtml === 'function' ? escapeHtml : escDefault;
    if (!item) return '<details class="indicator-method"><summary>Como é calculado</summary><p>Ficha local indisponível.</p></details>';
    const rows = [
      ['Definição local provisória', item.definition],
      ['Numerador', item.numerator],
      ['Denominador', item.denominator],
      ['Unidade', item.unit],
      ['Janela da análise', periodLabel || 'Não informada'],
      ['Janela ou critério da ficha', item.window],
      ['Fonte', item.source],
      ['Exclusões', item.exclusions],
      ['Limites', item.limits],
      ['Versão da regra', item.ruleVersion]
    ];
    return `<details class="indicator-method"><summary>Como é calculado — ${escape(item.label)}</summary><dl>${rows.map(([label, value]) => `<dt>${escape(label)}</dt><dd>${escape(value)}</dd>`).join('')}</dl></details>`;
  }
  return Object.freeze({ RULE_VERSION, list, get, forKey, idForKey, markdownTable, renderDetails });
});
