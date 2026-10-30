# Contrato de ações corretivas locais

## Escopo e estado

As ações ficam no IndexedDB deste aparelho, no store `acoes` do esquema v3. Uma ação aponta para `vistoriaId`, `constatacaoId` e `snapshotId` imutáveis; a importação só aceita a ação quando a constatação existe no snapshot correspondente à vistoria. O snapshot e a emissão não são alterados por criar, editar ou excluir uma ação.

Campos: `id` UUID, IDs de vínculo, `responsavelFuncao` (texto até 120 caracteres), `prazo` (data ISO), `estado` (`aberta`, `em-execucao`, `concluida`, `cancelada`), `concluidaEm`, `observacao` (até 500 caracteres), `criadoEm`, `atualizadoEm` e `rowVersion` inteiro positivo. A aplicação orienta informar função, não nome, e não inserir dados pessoais/sensíveis na observação.

`rowVersion` usa controle otimista: cada gravação carrega a versão lida. A transação incrementa a versão; gravação concorrente obsoleta é rejeitada com conflito e deve ser recarregada, em vez de sobrescrever silenciosamente. A mesma transação confirma a existência da vistoria e do snapshot e a presença da constatação no snapshot. Importação aceita ação idêntica como duplicata; conflito de mesmo ID preserva a cópia local.

## Interpretação e exclusão

Todos os estados são declarações do usuário, não comprovantes de execução. Um relatório emitido nunca encerra uma ação. O painel local mostra ações associadas por `(vistoriaId, constatacaoId)` às constatações dos snapshots selecionados verificáveis na janela analítica ativa. Se a mesma constatação conserva seu ID numa nova revisão, a declaração anterior continua associada no indicador; o registro da ação continua apontando ao snapshot original. Ações de constatações fora do período, ou removidas/renumeradas, ficam fora. Exibe declaradas como concluídas / declaradas (canceladas excluídas) e constatações Alta/Crítica sem ação declarada / total Alta/Crítica elegível. São contagens declaradas, não saneamento verificado; não comparam unidades e não calculam risco. Aging usa o relógio local e `criadoEm`; não há histórico append-only de alterações e reabrir uma ação limpa `concluidaEm`.

Excluir uma ação remove somente seu registro local; o snapshot permanece intacto. Excluir vistoria também exclui suas ações e fotos locais; emissões, snapshots e arquivos emitidos podem permanecer conforme a política de retenção ainda pendente. O exportador de backup omite emissões sem vistoria correspondente para que o arquivo continue restaurável; snapshots e arquivos dessas emissões excluídas ficam somente no navegador e serão perdidos se os dados locais forem apagados. A confirmação do backup avisa quando isso ocorrer. O destino dessas evidências depende da decisão institucional de retenção.

## Backup e limites

O envelope JSON v1 pode conter a lista opcional `acoes`. Cada registro é validado por allowlist, tipos, estado, versão e vínculo com constatação/snapshot. Backups v1 antigos sem `acoes` continuam aceitos. Reimportação idêntica é idempotente; conflito mantém o registro local. O backup continua sem criptografia e pode conter função responsável e observação: classifique e guarde em local autorizado.

A compatibilidade de rollback precisa ser considerada antes de atualização: o esquema passa de IndexedDB v2 para v3 e código anterior pode falhar com `VersionError`; versões anteriores também podem não reconhecer backups que contenham ações. Importação mantém a ação local se houver conflito, sem comparar qual `rowVersion` é mais recente; o usuário deve resolver a divergência manualmente. Ações exigem que o backup contenha o snapshot correspondente.
