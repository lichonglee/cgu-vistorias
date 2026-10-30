# Indicadores locais do CGU Vistorias

## Escopo, período e seleção

`analytics.js` calcula agregações locais para conferência de registros guardados neste aparelho. Não é uma visão da carteira institucional da CGU, não sincroniza dados e não deve embasar comparação entre unidades.

A seleção é uma heurística local: para cada vistoria, prioriza o maior número de revisão; em empate, usa a data/hora gravada no aparelho. Todos os candidatos empatados em revisão e data precisam ter snapshot verificável e projeção analítica idêntica; caso contrário, a vistoria é excluída e indicada como lacuna ambígua/divergente. A regra compara revisão mesmo entre tipos de relatório; como a aplicação ainda não define uma cronologia analítica comum entre tipos, esta é uma limitação conhecida. Revisões podem ser específicas por tipo, relógios podem estar incorretos e backups podem vir de aparelhos diferentes. Portanto, “selecionado” não prova que seja a versão cronologicamente mais recente no mundo real. A seleção não retorna silenciosamente a uma revisão menor quando a selecionada falha.

A análise permite 12 meses, 24 meses ou todo o histórico até uma data `asOf`. Nas janelas limitadas, filtra pela data válida da vistoria representada pelo snapshot, com início no primeiro dia do mês inicial e fim inclusivo; datas ausentes/inválidas são contadas e excluídas. Todo o histórico inclui datas ausentes, exibidas como “Data ausente”. A cobertura da janela é edifícios do inventário local atual com snapshot selecionado verificável no período / todos os edifícios cadastrados localmente; o denominador não é temporal.

O selo local “verificado” significa consistência interna do snapshot no IndexedDB, não autoria, validação institucional ou conferência dos bytes do PDF/DOCX emitido. Os artefatos têm verificação separada no histórico de emissões.

## Indicadores e denominadores

- **Cobertura local na janela:** edifícios do inventário local atual com snapshot selecionado verificável na janela / edifícios cadastrados neste aparelho. O denominador não é temporal e não distingue edifícios ativos.
- **Densidade de altas/críticas:** constatações Alta ou Crítica / vistorias com snapshot selecionado verificável. É uma razão (pode superar 1), não uma porcentagem.
- **Formalização local:** vistorias cadastradas com ao menos uma linha de emissão / total de vistorias cadastradas. Cada vistoria conta uma vez; `emissionRows` é quantidade de linhas de emissão, não de relatórios únicos.
- **Integridade de snapshot:** vistorias com emissão cujo snapshot selecionado foi verificado localmente / vistorias cadastradas com emissão.
- **Associação de fotos:** constatações com pelo menos um `fotoId` que resolve para evidência existente no snapshot / constatações dos snapshots selecionados verificáveis.
- **Disponibilidade de GPS:** snapshots selecionados verificáveis com coordenadas iniciais válidas / snapshots selecionados verificáveis. É descritivo, não uma nota de qualidade.
- **Edição posterior:** quantidade de vistorias cujo `updatedAt` local é posterior à emissão selecionada / snapshots selecionados verificáveis.

A dimensão mensal conta vistorias. Gravidade, sistema e macroambiente contam constatações. Gravidade inválida ou ausente vai para “Sem classificação”. `taxonomia.js` atribui códigos internos estáveis por correspondência exata aos textos atuais, sem gravá-los no banco ou nos snapshots; não são códigos de taxonomia institucional. Valores não mapeados recebem rótulos fixos e não são reproduzidos no painel. A tela também exibe candidatos a duplicata (apenas aviso por edifício/data/hash de conteúdo, sem mescla) e lacunas cadastrais com IDs locais.

O painel representa distribuições como barras horizontais proporcionais ao maior valor de cada dimensão; rótulos e contagens exatas permanecem visíveis e acessíveis, inclusive para categorias com contagem zero. Um aviso de integridade destaca vistorias com snapshot ausente/divergente/ambíguo e vistorias editadas depois da emissão; dimensões e indicadores usam o conteúdo congelado na emissão selecionada. Rascunhos e alterações posteriores só entram quando uma nova emissão verificável é gerada. O cartão de escopo esclarece que o PIN é somente uma barreira de interface, sem autenticação institucional ou RBAC.

As exportações `cgu-local-analytics-v1` e `cgu-migration-manifest-v1` exigem clique e confirmação. O agregado usa allowlist de campos e dimensões. O manifesto omite IDs por padrão; incluí-los exige marcar explicitamente a opção. Ambos recebem hash SHA-256 da serialização canônica, não assinatura/autoria. Arquivos são de classe restrita e não devem ser compartilhados ou centralizados sem aprovação de privacidade; não há limiar k aprovado. A versão `cgu-local-analytics-v1` exporta somente os oito KPIs permitidos, com seus IDs de ficha, além das contagens e dimensões autorizadas pelo contrato; fichas de estado, ações e fila de acompanhamento permanecem locais e não são incluídas nessa exportação.

Recorrência declarada conta somente constatações que carregam `recorrenciaDeId` explícito; o denominador são todas as constatações dos snapshots verificáveis na janela. O editor oferece para seleção vínculos de snapshots verificados anteriores do mesmo edifício e exige confirmação humana; o aplicativo não deduz reincidência pelo texto, similaridade, edifício ou data. Backup e snapshot validam formato UUID e impedem autorreferência, mas não provam que o destino exista, seja temporalmente anterior ou esteja no mesmo edifício; referências ausentes são permitidas e ciclos importados não são resolvidos. O KPI conta declarações, não reincidências tecnicamente verificadas. O vínculo é copiado e protegido pelo hash em novas emissões; snapshots históricos não mudam. O agregado exportável inclui apenas numerador e denominador, nunca o ID de destino. Saneamento **verificado** de apontamentos e pontuação/ordenação de risco não são calculados: não há comprovação de execução e falta rubrica aprovada de probabilidade e impacto. A área separada de ações mostra declarações locais associadas por `(vistoriaId, constatacaoId)` às constatações dos snapshots selecionados verificáveis dentro da janela analítica ativa. Se a mesma constatação mantiver seu ID em revisão posterior, a declaração anterior aparece vinculada ao indicador atual, embora continue apontando ao snapshot original. Exibe declaradas como concluídas/total declarado (canceladas excluídas) e constatações Alta/Crítica sem ação declarada/total elegível; esses números não provam saneamento. A exportação analítica e o manifesto não incluem registros de ações, responsáveis, prazos ou observações. A gravidade isolada não é tratada como risco.

O painel não expõe nomes, descrições, recomendações, coordenadas ou fotos nos agregados. A autorização continua sendo PIN local; não equivale a RBAC nem a isolamento por unidade no servidor. Sem PIN, o agregado local fica acessível a quem abrir a aplicação neste aparelho.

## Evolução para painel central

A consolidação exige serviço autenticado, IDs e taxonomia institucional, inventário autoritativo, autorização por unidade no servidor, regras de revisão/reconciliação, política aprovada de retenção e supressão de grupos pequenos. Aprovar também rubrica de risco com responsáveis técnicos. Nenhuma métrica local deve ser apresentada como carteira consolidada.


## Fila local de acompanhamento

A área de ações declaradas locais oferece uma fila paginada e filtrável por três motivos: ação aberta vencida, ação aberta há mais de 30 dias e constatação Alta/Crítica sem ação não cancelada. Cada linha referencia título e edifício do snapshot local, IDs da vistoria/constatação para navegação, motivo e prazo declarado quando aplicável. A lista usa as mesmas `migrationRecords` selecionadas pelo resumo: apenas o último snapshot verificável por vistoria dentro da janela; rascunhos, emissões ausentes/divergentes e snapshots substituídos ficam de fora. Um mesmo registro pode aparecer em motivos diferentes, e a soma de cada motivo reconcilia com seu contador.

A lista é somente leitura e não exporta conteúdo, não registra visualizações e não cria obrigações. Título e edifício podem conter dados restritos e permanecem no aparelho; a interface escapa conteúdo antes de renderizar. Ausência de `recorrenciaDeId` não é classificada como “não avaliada”, pois o esquema não registra essa decisão. Nenhum score de risco é calculado.

## Comparar emissões

No histórico de uma vistoria, a comparação local aceita duas emissões cujos snapshots estejam verificados no momento da consulta. O comparador exige o mesmo ID de edifício e de vistoria; snapshots legados, ausentes, divergentes, malformados ou de outro vínculo resultam em indisponibilidade, sem comparação parcial. Isso restringe o uso a revisões/emissões do mesmo registro de vistoria.

Constatações são relacionadas pelo ID estável. Campos diferentes são apresentados como declarações congeladas em cada snapshot; a ordem das constatações e os IDs locais das fotos não criam diferenças: uma mudança em `fotoIds` não altera a classificação da constatação; as evidências aparecem separadamente pelo hash. A tela carrega 100 itens por categoria e permite revelar mais em lotes, e expande os campos das constatações iguais somente quando solicitado. A direção da leitura é a emissão de referência escolhida → a emissão B selecionada, cuja lista é ordenada por data e revisão. Evidências são comparadas como multiconjunto pelo SHA-256 dos bytes, preservando a quantidade quando o mesmo conteúdo aparece mais de uma vez. Os totais de constatações conciliam separadamente os dois lados (removidas + alteradas + iguais na referência; acrescentadas + alteradas + iguais na comparação).

A comparação não escreve no IndexedDB, não modifica snapshots e não acessa a rede. “Verificado” indica consistência local do snapshot e não prova autoria nem valida o arquivo PDF/DOCX. Os detalhes podem incluir texto técnico restrito; não usar em tela pública/TV sem autorização apropriada.


## Dicionário local de indicadores

As fichas abaixo são definições locais provisórias, não aprovadas pelo Product/Data Owner. A referência da regra está identificada no resumo e na exportação. O registro descreve as regras implementadas, inclusive limites de escopo; não constitui homologação institucional.

<!-- INDICATOR-REGISTRY:START -->
| ID | Indicador | Unidade |
| --- | --- | --- |
| local.coverage | Cobertura de edifícios na janela | razão de edifícios (numerador / denominador) |
| local.severe-density | Densidade de constatações Altas/Críticas | razão de constatações por vistoria; pode exceder 1 e não é porcentagem |
| local.recurrence | Vínculos de recorrência declarados | razão de declarações por constatação |
| local.remediation | Saneamento verificado | não calculado |
| local.formalization | Formalização local de vistorias | razão de vistorias |
| local.snapshot-integrity | Integridade local de snapshots | razão de vistorias |
| local.photo-association | Constatações com foto associada | razão de constatações |
| local.gps-availability | GPS inicial disponível | razão de snapshots |
| local.edited-after-emission | Vistorias editadas após emissão | contagem de vistorias (numerador / denominador) |
| local.unverified-emissions | Últimas emissões sem snapshot verificável | contagem de vistorias; exibida junto ao denominador |
| local.duplicate-candidates | Pares candidatos a duplicata | contagem de pares |
| actions.completion | Ações declaradas como concluídas | razão de ações declaradas |
| actions.active | Ações locais abertas ou em execução | contagem de ações |
| actions.overdue | Ações declaradas vencidas | contagem de ações |
| actions.aging30 | Ações abertas há mais de 30 dias | contagem de ações |
| actions.cancelled | Ações declaradas canceladas | contagem de ações |
| actions.high-critical-without-action | Constatações Altas/Críticas sem ação declarada | contagem (numerador / denominador) |
| followup.overdue | Itens para acompanhamento: vencidos | contagem de linhas da fila |
| followup.aging30 | Itens para acompanhamento: abertas há mais de 30 dias | contagem de linhas da fila |
| followup.no-action | Itens para acompanhamento: Altas/Críticas sem ação | contagem de linhas da fila |
<!-- INDICATOR-REGISTRY:END -->
