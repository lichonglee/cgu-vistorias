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

As exportações `cgu-local-analytics-v1` e `cgu-migration-manifest-v1` exigem clique e confirmação. O agregado usa allowlist de campos e dimensões. O manifesto omite IDs por padrão; incluí-los exige marcar explicitamente a opção. Ambos recebem hash SHA-256 da serialização canônica, não assinatura/autoria. Arquivos são de classe restrita e não devem ser compartilhados ou centralizados sem aprovação de privacidade; não há limiar k aprovado.

Recorrência declarada conta somente constatações que carregam `recorrenciaDeId` explícito; o denominador são todas as constatações dos snapshots verificáveis na janela. O editor oferece para seleção vínculos de snapshots verificados anteriores do mesmo edifício e exige confirmação humana; o aplicativo não deduz reincidência pelo texto, similaridade, edifício ou data. Backup e snapshot validam formato UUID e impedem autorreferência, mas não provam que o destino exista, seja temporalmente anterior ou esteja no mesmo edifício; referências ausentes são permitidas e ciclos importados não são resolvidos. O KPI conta declarações, não reincidências tecnicamente verificadas. O vínculo é copiado e protegido pelo hash em novas emissões; snapshots históricos não mudam. O agregado exportável inclui apenas numerador e denominador, nunca o ID de destino. Saneamento **verificado** de apontamentos e pontuação/ordenação de risco não são calculados: não há comprovação de execução e falta rubrica aprovada de probabilidade e impacto. A área separada de ações mostra declarações locais associadas por `(vistoriaId, constatacaoId)` às constatações dos snapshots selecionados verificáveis dentro da janela analítica ativa. Se a mesma constatação mantiver seu ID em revisão posterior, a declaração anterior aparece vinculada ao indicador atual, embora continue apontando ao snapshot original. Exibe declaradas como concluídas/total declarado (canceladas excluídas) e constatações Alta/Crítica sem ação declarada/total elegível; esses números não provam saneamento. A exportação analítica e o manifesto não incluem registros de ações, responsáveis, prazos ou observações. A gravidade isolada não é tratada como risco.

O painel não expõe nomes, descrições, recomendações, coordenadas ou fotos nos agregados. A autorização continua sendo PIN local; não equivale a RBAC nem a isolamento por unidade no servidor. Sem PIN, o agregado local fica acessível a quem abrir a aplicação neste aparelho.

## Evolução para painel central

A consolidação exige serviço autenticado, IDs e taxonomia institucional, inventário autoritativo, autorização por unidade no servidor, regras de revisão/reconciliação, política aprovada de retenção e supressão de grupos pequenos. Aprovar também rubrica de risco com responsáveis técnicos. Nenhuma métrica local deve ser apresentada como carteira consolidada.
