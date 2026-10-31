/* Versioned, local definitions for the indicators shown by this PWA. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.IndicatorRegistry = api;
})(typeof self !== 'undefined' ? self : this, function () {
  const RULE_VERSION = 'cgu-local-indicators-1.0.1';
  const localLimit = 'Definição local provisória, não aprovada pelo Product/Data Owner; não é uma medida de risco nem uma visão institucional consolidada.';
  const raw = [
    {
      "id": "local.coverage",
      "key": "kpi.coverage",
      "label": "Cobertura de edifícios na janela",
      "definition": "Edifícios cadastrados neste aparelho que têm ao menos um snapshot selecionado e verificável dentro do período.",
      "numerator": "Edifícios distintos com snapshot verificável na janela",
      "denominator": "Edifícios cadastrados neste aparelho",
      "unit": "razão de edifícios (numerador / denominador)",
      "window": "Data congelada quando há snapshot verificável; caso contrário, data atual editável da vistoria.",
      "source": "Inventário local atual e obraId atual da vistoria, mais vistorias, emissões e snapshots verificados.",
      "exclusions": "Vistorias sem data válida ficam fora de janelas limitadas. Edifícios sem snapshot verificável na janela não entram no numerador; o denominador inclui todo edifício cadastrado neste aparelho.",
      "limits": "Definição local provisória, não aprovada pelo Product/Data Owner; não é uma medida de risco nem uma visão institucional consolidada."
    },
    {
      "id": "local.severe-density",
      "key": "kpi.severeDensity",
      "label": "Densidade de constatações Altas/Críticas",
      "definition": "Quantidade de constatações Alta ou Crítica por vistoria com snapshot selecionado verificável.",
      "numerator": "Constatações com gravidade Alta ou Crítica",
      "denominator": "Vistorias com snapshot selecionado verificável",
      "unit": "razão de constatações por vistoria; pode exceder 1 e não é porcentagem",
      "window": "Janela selecionada; usa conteúdo congelado na emissão.",
      "source": "Constatações dos últimos snapshots locais verificáveis.",
      "exclusions": "Rascunhos, snapshots ausentes, divergentes ou ambíguos.",
      "limits": "Definição local provisória, não aprovada pelo Product/Data Owner; não é uma medida de risco nem uma visão institucional consolidada."
    },
    {
      "id": "local.recurrence",
      "key": "kpi.recurrence",
      "label": "Vínculos de recorrência declarados",
      "definition": "Constatações cujo recorrenciaDeId tem formato UUID válido e difere do próprio ID; o destino declarado não é conferido aqui.",
      "numerator": "Constatações com recorrenciaDeId em formato UUID válido e diferente do próprio id",
      "denominator": "Todas as constatações dos snapshots locais verificáveis, inclusive as sem vínculo e as de primeira emissão",
      "unit": "razão de declarações por constatação",
      "window": "Janela selecionada.",
      "source": "Vínculos explícitos presentes nos snapshots.",
      "exclusions": "O formato do UUID é verificado; o indicador não confirma se o destino existe, é anterior, pertence ao mesmo edifício ou está verificado. Não procura similaridade textual nem infere recorrência.",
      "limits": "Vínculo declarado; formato validado, destino não conferido por este indicador. Definição local provisória, não aprovada pelo Product/Data Owner; não é uma medida de risco nem uma visão institucional consolidada."
    },
    {
      "id": "local.remediation",
      "key": "kpi.remediation",
      "label": "Saneamento verificado",
      "definition": "Não calculado: uma emissão ou declaração de ação não comprova execução nem verificação.",
      "numerator": "Não disponível",
      "denominator": "Não disponível",
      "unit": "não calculado",
      "window": "Sem janela calculável.",
      "source": "Ações corretivas declaradas localmente.",
      "exclusions": "Nenhuma declaração é tratada como comprovação.",
      "limits": "Não há evidência verificada de execução; não é medida de risco nem de conformidade. Definição local provisória, não aprovada pelo Product/Data Owner; não é uma medida de risco nem uma visão institucional consolidada."
    },
    {
      "id": "local.formalization",
      "key": "kpi.formalization",
      "label": "Formalização local de vistorias",
      "definition": "Vistorias com ao menos uma linha de emissão em relação às vistorias cadastradas no período.",
      "numerator": "Vistorias distintas com emissão",
      "denominator": "Vistorias cadastradas na janela",
      "unit": "razão de vistorias",
      "window": "Data congelada da vistoria quando há snapshot verificável; caso contrário, data atual editável.",
      "source": "Vistorias e linhas de emissão locais.",
      "exclusions": "A contagem é por vistoria, não por PDF/DOCX nem por linha de relatório. Vistorias sem data válida ficam fora de janelas limitadas.",
      "limits": "Definição local provisória, não aprovada pelo Product/Data Owner; não é uma medida de risco nem uma visão institucional consolidada."
    },
    {
      "id": "local.snapshot-integrity",
      "key": "kpi.snapshotIntegrity",
      "label": "Integridade local de snapshots",
      "definition": "Vistorias com snapshot selecionado verificável em relação às vistorias com emissão.",
      "numerator": "Vistorias com snapshot selecionado verificável",
      "denominator": "Vistorias com emissão na janela",
      "unit": "razão de vistorias",
      "window": "Janela selecionada.",
      "source": "Resultado de verificarEmissao no IndexedDB local.",
      "exclusions": "Snapshots ausentes, divergentes, legados ou ambíguos não contam como verificados.",
      "limits": "Verificado significa consistência interna local; não prova autoria nem integridade externa. Definição local provisória, não aprovada pelo Product/Data Owner; não é uma medida de risco nem uma visão institucional consolidada."
    },
    {
      "id": "local.photo-association",
      "key": "kpi.photoAssociation",
      "label": "Constatações com foto associada",
      "definition": "Constatações que referenciam pelo menos uma evidência de foto presente no próprio snapshot selecionado.",
      "numerator": "Constatações com fotoId resolvendo para evidência existente no mesmo snapshot",
      "denominator": "Constatações dos snapshots locais verificáveis",
      "unit": "razão de constatações",
      "window": "Janela selecionada.",
      "source": "fotoIds da constatação comparados aos IDs das evidências do mesmo snapshot selecionado.",
      "exclusions": "Não usa hashes para resolver a associação; não avalia suficiência técnica nem conteúdo visual da foto.",
      "limits": "Associação não significa validação da evidência. Definição local provisória, não aprovada pelo Product/Data Owner; não é uma medida de risco nem uma visão institucional consolidada."
    },
    {
      "id": "local.gps-availability",
      "key": "kpi.gpsAvailability",
      "label": "GPS inicial disponível",
      "definition": "Snapshots com coordenadas iniciais válidas em relação aos snapshots verificáveis.",
      "numerator": "Snapshots com coordenadas iniciais válidas",
      "denominator": "Snapshots selecionados verificáveis",
      "unit": "razão de snapshots",
      "window": "Janela selecionada.",
      "source": "GPS inicial congelado no snapshot.",
      "exclusions": "Coordenadas inválidas não contam; GPS ausente não é tratado como falha de vistoria.",
      "limits": "Indicador descritivo e opcional; coleta inicial depende de ação explícita. Definição local provisória, não aprovada pelo Product/Data Owner; não é uma medida de risco nem uma visão institucional consolidada."
    },
    {
      "id": "local.edited-after-emission",
      "key": "status.editedAfterEmission",
      "label": "Vistorias editadas após emissão",
      "definition": "Vistorias cujo updatedAt local posterior à emissão indica que o estado atual difere temporalmente do conteúdo emitido.",
      "numerator": "Vistorias editadas após a emissão selecionada",
      "denominator": "Snapshots selecionados verificáveis",
      "unit": "contagem de vistorias (numerador / denominador)",
      "window": "Janela selecionada.",
      "source": "updatedAt atual e data da emissão local.",
      "exclusions": "Não compara campo por campo; o snapshot continua sendo a fonte congelada.",
      "limits": "Sinal de defasagem temporal, não juízo sobre a vistoria. Definição local provisória, não aprovada pelo Product/Data Owner; não é uma medida de risco nem uma visão institucional consolidada."
    },
    {
      "id": "local.unverified-emissions",
      "key": "status.unverifiedLatestEmissions",
      "label": "Últimas emissões sem snapshot verificável",
      "definition": "Vistorias na janela cuja emissão mais recente não pôde ser validada ou ficou ambígua.",
      "numerator": "Vistorias com última emissão não verificável",
      "denominator": "Vistorias com emissão na janela",
      "unit": "contagem de vistorias; exibida junto ao denominador",
      "window": "Janela selecionada.",
      "source": "Emissões e resultado de verificação de snapshot.",
      "exclusions": "Não retorna silenciosamente para revisão anterior.",
      "limits": "Definição local provisória, não aprovada pelo Product/Data Owner; não é uma medida de risco nem uma visão institucional consolidada."
    },
    {
      "id": "local.duplicate-candidates",
      "key": "status.duplicateCandidates",
      "label": "Pares candidatos a duplicata",
      "definition": "Pares locais de snapshots selecionados verificáveis que compartilham o edifício atual da vistoria, data e hash do conteúdo de constatações, mas têm IDs distintos.",
      "numerator": "Pares candidatos detectados; a lista mostra no máximo 200 e informa o total separado",
      "denominator": "Não se aplica",
      "unit": "contagem de pares",
      "window": "Janela selecionada.",
      "source": "Snapshots verificáveis selecionados, obraId atual e hash de conteúdo; exibição ordenada e limitada a 200 pares, com total separado.",
      "exclusions": "Registros vazios, sem data válida, com digest indisponível ou fora da seleção de snapshots verificáveis.",
      "limits": "Apenas alerta; nunca mescla nem confirma que os registros sejam duplicados. Definição local provisória, não aprovada pelo Product/Data Owner; não é uma medida de risco nem uma visão institucional consolidada."
    },
    {
      "id": "actions.completion",
      "key": "action.completion",
      "label": "Ações declaradas como concluídas",
      "definition": "Ações com estado declarado concluída em relação às ações declaradas não canceladas.",
      "numerator": "Ações locais declaradas concluídas",
      "denominator": "Ações locais em qualquer estado diferente de cancelada, inclusive estados legados desconhecidos",
      "unit": "razão de ações declaradas",
      "window": "Ações vinculadas às constatações selecionadas na janela.",
      "source": "Registros locais de ações associados pelo ID da constatação.",
      "exclusions": "Ações canceladas e ações de constatações fora do escopo selecionado.",
      "limits": "Ações com estado desconhecido podem permanecer no denominador; declarações do usuário não comprovam execução nem verificação. Definição local provisória, não aprovada pelo Product/Data Owner; não é uma medida de risco nem uma visão institucional consolidada."
    },
    {
      "id": "actions.active",
      "key": "action.active",
      "label": "Ações locais abertas ou em execução",
      "definition": "Contagem de ações declaradas nos estados aberta ou em execução, vinculadas às constatações selecionadas.",
      "numerator": "Ações com estado aberta ou em execução",
      "denominator": "Não se aplica",
      "unit": "contagem de ações",
      "window": "Ações vinculadas às constatações selecionadas na janela.",
      "source": "Estado declarado em registros locais de ações.",
      "exclusions": "Ações concluídas, canceladas e ações de constatações fora do escopo selecionado.",
      "limits": "Estado declarado localmente; não comprova andamento real. Definição local provisória, não aprovada pelo Product/Data Owner; não é uma medida de risco nem uma visão institucional consolidada."
    },
    {
      "id": "actions.overdue",
      "key": "action.overdue",
      "label": "Ações declaradas vencidas",
      "definition": "Ações abertas ou em execução cujo prazo ISO válido é anterior ao asOf local.",
      "numerator": "Ações ativas vencidas",
      "denominator": "Não se aplica",
      "unit": "contagem de ações",
      "window": "Prazo comparado à data asOf; ações limitadas aos snapshots selecionados.",
      "source": "Estado e prazo declarados localmente.",
      "exclusions": "Concluídas, canceladas, sem prazo válido ou com prazo igual a hoje.",
      "limits": "Prazo declarado, não prazo institucional verificado. Definição local provisória, não aprovada pelo Product/Data Owner; não é uma medida de risco nem uma visão institucional consolidada."
    },
    {
      "id": "actions.aging30",
      "key": "action.aging30",
      "label": "Ações abertas há mais de 30 dias",
      "definition": "Ações abertas ou em execução com criadoEm há mais de 30 dias em relação ao relógio local da consulta.",
      "numerator": "Ações ativas com idade superior a 30 dias pelo relógio local",
      "denominator": "Não se aplica",
      "unit": "contagem de ações",
      "window": "Relógio local now da consulta, independente do asOf; escopo de snapshots selecionados.",
      "source": "Estado e criadoEm declarados localmente.",
      "exclusions": "Concluídas, canceladas e datas de criação inválidas.",
      "limits": "Relógio do aparelho e data de criação podem não ser confiáveis; este contador pode divergir do vencimento calculado por asOf. Definição local provisória, não aprovada pelo Product/Data Owner; não é uma medida de risco nem uma visão institucional consolidada."
    },
    {
      "id": "actions.cancelled",
      "key": "action.cancelled",
      "label": "Ações declaradas canceladas",
      "definition": "Contagem de ações com estado local cancelada.",
      "numerator": "Ações canceladas",
      "denominator": "Não se aplica",
      "unit": "contagem de ações",
      "window": "Ações vinculadas às constatações selecionadas na janela.",
      "source": "Estado declarado localmente.",
      "exclusions": "Ações fora do escopo selecionado.",
      "limits": "Cancelamento é declaração local, não aprovação de governança. Definição local provisória, não aprovada pelo Product/Data Owner; não é uma medida de risco nem uma visão institucional consolidada."
    },
    {
      "id": "actions.high-critical-without-action",
      "key": "action.highCriticalWithoutAction",
      "label": "Constatações Altas/Críticas sem ação declarada",
      "definition": "Constatações Alta ou Crítica sem ação vinculada em estado diferente de cancelada.",
      "numerator": "Constatações Alta/Crítica sem ação não cancelada",
      "denominator": "Constatações Alta/Crítica elegíveis no snapshot",
      "unit": "contagem (numerador / denominador)",
      "window": "Janela selecionada.",
      "source": "Constatações e ações locais vinculadas por ID.",
      "exclusions": "Snapshots não verificáveis e ações canceladas.",
      "limits": "Ausência de ação não prova ausência de mitigação externa. Definição local provisória, não aprovada pelo Product/Data Owner; não é uma medida de risco nem uma visão institucional consolidada."
    },
    {
      "id": "followup.overdue",
      "key": "followup.vencida",
      "label": "Itens para acompanhamento: vencidos",
      "definition": "Linhas da fila correspondentes a ações abertas ou em execução com prazo vencido.",
      "numerator": "Itens com motivo vencida",
      "denominator": "Não se aplica",
      "unit": "contagem de linhas da fila",
      "window": "Mesma seleção de snapshots e data asOf dos indicadores de ação.",
      "source": "Fila local de acompanhamento.",
      "exclusions": "Ação concluída/cancelada e prazo inválido.",
      "limits": "A fila é somente leitura; não envia notificações. Definição local provisória, não aprovada pelo Product/Data Owner; não é uma medida de risco nem uma visão institucional consolidada."
    },
    {
      "id": "followup.aging30",
      "key": "followup.aberta_30d",
      "label": "Itens para acompanhamento: abertas há mais de 30 dias",
      "definition": "Linhas da fila para ações abertas ou em execução com mais de 30 dias.",
      "numerator": "Itens com motivo aberta_30d",
      "denominator": "Não se aplica",
      "unit": "contagem de linhas da fila",
      "window": "Relógio local now da consulta para idade; data asOf para vencimento; mesmo conjunto de snapshots selecionados.",
      "source": "Fila local de acompanhamento.",
      "exclusions": "Ação concluída/cancelada e criadoEm inválido.",
      "limits": "Um registro pode aparecer também em outro motivo da fila. Definição local provisória, não aprovada pelo Product/Data Owner; não é uma medida de risco nem uma visão institucional consolidada."
    },
    {
      "id": "followup.no-action",
      "key": "followup.sem_acao",
      "label": "Itens para acompanhamento: Altas/Críticas sem ação",
      "definition": "Linhas da fila para constatações Alta ou Crítica sem ação não cancelada.",
      "numerator": "Itens com motivo sem_acao",
      "denominator": "Não se aplica",
      "unit": "contagem de linhas da fila",
      "window": "Mesmo período e snapshots dos demais indicadores.",
      "source": "Fila local de acompanhamento.",
      "exclusions": "Snapshots não verificáveis e constatações fora da janela.",
      "limits": "Um registro pode aparecer também em outro motivo; não é classificação de prioridade institucional. Definição local provisória, não aprovada pelo Product/Data Owner; não é uma medida de risco nem uma visão institucional consolidada."
    }
  ];
  const indicators = Object.freeze(raw.map(item => Object.freeze({ ...item, ruleVersion: RULE_VERSION })));
  const byId = new Map(indicators.map(item => [item.id, item]));
  const byKey = new Map(indicators.map(item => [item.key, item]));
  const escDefault = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  function get(id) { return byId.get(id) || null; }
  function forKey(key) { return byKey.get(key) || null; }
  function idForKey(key) { return forKey(key)?.id || null; }
  function list() { return indicators.slice(); }
  function markdownTable() {
    const columns = ['id','key','label','definition','numerator','denominator','unit','window','source','exclusions','limits','ruleVersion'];
    const headers = ['ID','Chave','Indicador','Definição','Numerador','Denominador','Unidade','Janela','Fonte','Exclusões','Limites','Versão da regra'];
    const cell = value => String(value ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
    const lines = ['| ' + headers.join(' | ') + ' |', '| ' + columns.map(() => '---').join(' | ') + ' |'];
    for (const item of indicators) lines.push('| ' + columns.map(key => cell(item[key])).join(' | ') + ' |');
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
