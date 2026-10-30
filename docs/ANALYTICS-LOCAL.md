# Indicadores locais do CGU Vistorias

## Escopo e seleção

`analytics.js` calcula agregações locais para conferência de registros guardados neste aparelho. Não é uma visão da carteira institucional da CGU, não sincroniza dados e não deve embasar comparação entre unidades.

A seleção é uma heurística local: para cada vistoria, prioriza o maior número de revisão; em empate, usa a data/hora gravada no aparelho. Todos os candidatos empatados em revisão e data precisam ter snapshot verificável e projeção analítica idêntica; caso contrário, a vistoria é excluída e indicada como lacuna ambígua/divergente. A regra compara revisão mesmo entre tipos de relatório; como a aplicação ainda não define uma cronologia analítica comum entre tipos, esta é uma limitação conhecida. Revisões podem ser específicas por tipo, relógios podem estar incorretos e backups podem vir de aparelhos diferentes. Portanto, “selecionado” não prova que seja a versão cronologicamente mais recente no mundo real. A seleção não retorna silenciosamente a uma revisão menor quando a selecionada falha.

O selo local “verificado” significa consistência interna do snapshot no IndexedDB, não autoria, validação institucional ou conferência dos bytes do PDF/DOCX emitido. Os artefatos têm verificação separada no histórico de emissões.

## Indicadores e denominadores

- **Cobertura histórica local:** edifícios do inventário local atual vinculados a uma vistoria cujo snapshot selecionado é verificável / edifícios cadastrados neste aparelho. Não há janela temporal nem distinção de edifícios ativos.
- **Densidade de altas/críticas:** constatações Alta ou Crítica / vistorias com snapshot selecionado verificável. É uma razão (pode superar 1), não uma porcentagem.
- **Formalização local:** vistorias cadastradas com ao menos uma linha de emissão / total de vistorias cadastradas. Cada vistoria conta uma vez; `emissionRows` é quantidade de linhas de emissão, não de relatórios únicos.
- **Integridade de snapshot:** vistorias com emissão cujo snapshot selecionado foi verificado localmente / vistorias cadastradas com emissão.
- **Associação de fotos:** constatações com pelo menos um `fotoId` que resolve para evidência existente no snapshot / constatações dos snapshots selecionados verificáveis.
- **Disponibilidade de GPS:** snapshots selecionados verificáveis com coordenadas iniciais válidas / snapshots selecionados verificáveis. É descritivo, não uma nota de qualidade.
- **Edição posterior:** quantidade de vistorias cujo `updatedAt` local é posterior à emissão selecionada / snapshots selecionados verificáveis.

A dimensão mensal conta vistorias. Gravidade, sistema e macroambiente contam constatações. Gravidade inválida ou ausente vai para “Sem classificação”. Sistema e ambiente são agrupamentos derivados das opções textuais da interface, não códigos de taxonomia institucional; valores não mapeados recebem rótulos fixos e não são reproduzidos no painel.

Recorrência, saneamento de apontamentos e pontuação/ordenação de risco não são calculados: faltam vínculos estruturados e rubrica aprovada de probabilidade e impacto. A gravidade isolada não é tratada como risco.

O painel não expõe nomes, descrições, recomendações, coordenadas ou fotos nos agregados. A autorização continua sendo PIN local; não equivale a RBAC nem a isolamento por unidade no servidor. Sem PIN, o agregado local fica acessível a quem abrir a aplicação neste aparelho.

## Evolução para painel central

A consolidação exige serviço autenticado, IDs e taxonomia institucional, inventário autoritativo, autorização por unidade no servidor, regras de revisão/reconciliação, política aprovada de retenção e supressão de grupos pequenos. Aprovar também rubrica de risco com responsáveis técnicos. Nenhuma métrica local deve ser apresentada como carteira consolidada.