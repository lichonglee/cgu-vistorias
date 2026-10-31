# Histórico de versões

## 1.10.4 · 30/10/2026

- Ações declaradas: salvar com a função responsável vazia passa a informar que o campo é obrigatório; o limite de 120 caracteres tem mensagem própria. Nenhuma regra de validação mudou.
- Se o armazenamento local do navegador não abrir, o aplicativo mostra um aviso com orientação em vez de uma tela vazia; as rotas não sobrescrevem esse aviso.
- Atualização do armazenamento bloqueada por outra aba aberta passa a mostrar o mesmo aviso; abas antigas liberam o banco quando uma versão nova o solicita e mostram um aviso fixo pedindo recarga, sem fechar a tela nem o formulário aberto, para que o texto ainda não salvo possa ser copiado; tentativas de salvar nessa aba informam que nada foi salvo. Em falha de armazenamento o service worker não é registrado nessa visita.
- Acessibilidade: rótulos dos formulários passam a nomear os campos e as fotos ganham texto alternativo (Dados, Conclusão, filtros do Painel, Ajustes e demais telas montadas por template); tabelas com rolagem horizontal recebem foco de teclado e nome de região; etiquetas verde e amarela ganham contraste de pelo menos 4,5:1.
- Fotos da câmera: se a primeira leitura de GPS falhar (no Android a câmera abre antes do pedido de permissão), o app tenta de novo antes de carimbar, salvo se a localização foi negada; a posição pode ser lida alguns segundos após a captura.
- Manual PDF regenerado a partir do manual HTML 1.10.4 (19 páginas); as capturas de tela seguem identificadas como ilustrativas de versões anteriores.
- Sem mudança no IndexedDB, snapshots, indicadores ou backup. Cache PWA versionado como 1.10.4.

## 1.10.3 · 30/10/2026

- Corrige a importação de backups com foto recortada ou ajustada uma única vez a partir do original: o backup deixava de ser aceito por inteiro. A validação passa a aceitar o estado de recorte na foto ou na cópia original e continua rejeitando cópia original em foto não editada.
- Sem mudança no IndexedDB, snapshots, indicadores ou formato do backup. Cache PWA versionado como 1.10.3. PDF do manual e ensaios em aparelho seguem pendentes.

## 1.10.2 · 30/10/2026

- Endurece a análise local: auto-vínculo de recorrência é comparado sem distinção entre maiúsculas e minúsculas; constatações sem ID continuam no denominador, mas não entram no numerador.
- Candidatos a duplicata exigem edifício atual presente no inventário deste aparelho; a ficha documenta os campos usados no hash e seus limites.
- Atualiza as definições para cgu-local-indicators-1.0.2; sem mudança no IndexedDB, snapshots ou backup. Cache PWA versionado como 1.10.2. PDF do manual e ensaios de navegador seguem pendentes.

## 1.10.1 · 30/10/2026

- Corrige o dicionário local para explicitar os limites dos vínculos de recorrência, as datas usadas nas janelas, a associação de fotos no próprio snapshot e o escopo dos pares candidatos a duplicata.
- A tabela documental passa a espelhar todas as definições do registro. Versão da regra: `cgu-local-indicators-1.0.1`.
- Inclui o protótipo sintético do painel gerencial aprovado para demonstração e testes de regressão dos chamados, drafts por perfil e carrossel. O artefato fica fora do PWA e não implementa autenticação institucional ou persistência central.
- Sem mudança no IndexedDB, snapshots ou backup. Cache PWA versionado como 1.10.1. PDF do manual continua pendente de regeneração e conferência.

## 1.10.0 · 30/10/2026

- Painel local passa a apresentar fichas recolhíveis de definição, numerador, denominador, unidade, período, fonte, exclusões e limites dos indicadores. As definições são locais e provisórias; não foram homologadas pelo Product/Data Owner.
- Resumo e exportação analítica incluem a versão da regra e IDs das fichas dos indicadores. O painel informa a data de referência (`asOf`). O registro e a tabela documental são verificados pelos testes.
- Sem mudança no IndexedDB v3, nos snapshots ou no backup. Cache PWA atualizado para 1.10.0; não publicar sem os gates de release já registrados.

## 1.9.0 · 30/10/2026

- Criar uma vistoria não solicita geolocalização automaticamente. O GPS inicial só é pedido após ação explícita em Usar minha localização; a captura de fotos mantém seu próprio fluxo de permissão.
- Nenhuma mudança no esquema IndexedDB v3, snapshots ou formato do backup. A mudança reduz a coleta involuntária de localização neste aparelho.
- Cache PWA atualizado para 1.9.0. Candidata local; PDF do manual, capturas antigas e gates institucionais seguem pendentes.

## 1.8.0 · 30/10/2026

- Remove a API interna obsoleta e não atômica DB.nextSeq; emissões continuam usando somente reservarNumeracao, serializada por transação no IndexedDB deste aparelho.
- Sem mudança de esquema IndexedDB v3, snapshots, backup ou dados persistidos. Teste negativo simula a antiga sequência get+set dentro do teste, sem expor o caminho inseguro pela API de produção.
- Cache PWA versionado como 1.8.0. A candidata local continua sem aceite de release; QA visual e gates institucionais permanecem pendentes.

## 1.7.0 · 30/10/2026

- Histórico de emissões permite comparar duas emissões verificadas da mesma vistoria com snapshots congelados. Constatações são relacionadas por ID; evidências são comparadas por SHA-256, sem depender dos IDs locais das fotos.
- Snapshots legados, ausentes ou divergentes e vínculos de edifício/vistoria diferentes tornam a comparação indisponível, sem resultado parcial. O resultado reconcilia os totais dos dois lados e é somente de leitura.
- Verificado significa consistência local do snapshot; não prova autoria nem valida os bytes do PDF/DOCX. Os detalhes podem conter dados técnicos restritos; não projetar em tela pública.
- Sem mudança no IndexedDB v3, esquema de snapshot, backup, rede ou dados persistidos. A versão PWA 1.7.0 cria um cache novo. QA visual em navegador/dispositivo e gates institucionais permanecem pendentes; esta candidata não está aprovada para publicação.

## 1.6.0 · 30/10/2026

- Painel local acrescenta fila paginada de acompanhamento, filtrável por ação vencida, aberta há mais de 30 dias e constatação Alta/Crítica sem ação declarada; cada item navega até a constatação.
- A fila reconcilia cada motivo com os contadores de ações e considera somente constatações do último snapshot verificável na janela. Ações concluídas/canceladas não aparecem como abertas/vencidas; cancelamento não equivale a ação declarada para o KPI de Alta/Crítica sem ação.
- A lista é somente leitura, sem exportação, notificação ou atribuição de responsabilidade. Dados de recorrência ausentes não são chamados de “não avaliados”; ausência de vínculo não prova que a avaliação ocorreu. Nenhum score de risco é calculado.
- Sem mudança no IndexedDB v3, snapshot, backup ou rede. O manual HTML descreve a fila; o PDF/capturas seguem pendentes de regeneração.
- Versão ainda candidata local; QA visual em navegador/dispositivo e gates institucionais continuam pendentes.

## 1.5.0 · 30/10/2026

- Painel local substitui listas dimensionais por barras proporcionais que mantêm rótulos e contagens acessíveis; aviso de integridade destaca emissões não verificáveis e edições posteriores, explicando que rascunhos não entram.
- Inclui aviso explícito de escopo monousuário: PIN local é barreira de interface, não autenticação institucional/RBAC.
- Sem mudança no IndexedDB v3, backup ou snapshots. A versão mantém vínculos explícitos de recorrência da 1.4.0; o downgrade para 1.3.0 segue incompatível quando o campo aparece no backup.
- Esta candidata segue sem aceite de release: PDF/manual, QA de navegador/dispositivo e gates institucionais continuam pendentes.

## 1.4.0 · 30/10/2026

- Campo opcional `recorrenciaDeId` permite declarar vínculo humano explícito entre constatações; sem inferência automática por texto, edifício ou data. Novas emissões congelam o vínculo no snapshot e o backup v1 valida UUID e rejeita autorreferência.
- O painel local apresenta vínculos explícitos / constatações verificáveis; o agregado exportado contém somente numerador e denominador, nunca os IDs relacionados.
- O IndexedDB permanece no esquema v3: não há nova store nem migração. Antes de atualizar, faça backup. A versão 1.3.0 rejeita o novo campo opcional se ele estiver em constatações no backup; após emissão com novos vínculos, downgrade e restauração na 1.3.0 não são compatíveis.
- Esta candidata ainda não é release: PDF e QA de navegador/dispositivo e gates institucionais permanecem pendentes.

## 1.3.0 · 30/10/2026

- Ações corretivas declaradas localmente por constatação de snapshot verificado, com função responsável, prazo, estado, data de conclusão e observação.
- Store `acoes` no IndexedDB v3 com `rowVersion` e rejeição de gravação obsoleta; conflitos de importação preservam a cópia local. O controle guarda a versão atual, não um histórico append-only.
- Painel mostra ações declaradas concluídas/abertas, vencimento e aging. Esses estados não são verificados; emissão de laudo não encerra ação.
- Backup JSON v1 aceita a lista opcional `acoes` com validação de esquema e vínculo ao snapshot. Dados de função/observação podem ser sensíveis; backup permanece sem criptografia.
- Emissões retidas de vistorias excluídas são omitidas do backup restaurável; a exportação avisa que snapshots/arquivos associados ficam somente no navegador e serão perdidos se os dados locais forem apagados.
- Antes de atualizar, faça backup. O código 1.2.0 não abre o IndexedDB v3 (VersionError) e não aceita a lista `acoes` se ela estiver presente no backup. Nenhuma alteração de snapshot ocorre ao editar/excluir ação.

## 1.2.0 · 30/10/2026

- Painel analítico local com janela de 12/24 meses ou histórico completo, período explícito e denominadores consistentes com a data congelada em cada snapshot verificável.
- Taxonomia interna versionada por códigos para os 46 tipos e 34 ambientes atuais; não é institucional e não altera os registros emitidos.
- Painel sinaliza candidatos a duplicata sem mesclar dados e lacunas cadastrais locais.
- Exportações minimizadas e determinísticas do agregado e manifesto, com hash SHA-256 canônico; IDs permanecem desativados por padrão e exigem ação explícita.
- Nenhuma API, sincronização, risco calculado ou consolidação multiunidade foi adicionada. A taxonomia e os indicadores são locais; os arquivos de exportação têm classe restrita.

## 1.1.0 · 30/10/2026

- Emissões passam a preservar snapshots e arquivos PDF/DOCX com verificação de integridade local; numeração por vistoria é reservada atomicamente no aparelho.
- Backup JSON recebe validação estrita, limites, conferência de bytes e importação atômica; CSP e proteção de conteúdo são reforçadas.
- Painel local agrega dimensões de constatações a partir de snapshots verificáveis, com denominadores, razão de densidade e limitações explícitas. Não é consolidação institucional nem calcula risco.
- O IndexedDB evolui para o esquema v2. Faça um backup antes de atualizar: o código 1.0.6 não abre o banco migrado (VersionError); rollback exige restauração de um backup compatível.
- O código 1.0.6 também não restaura snapshots nem arquivos emitidos do backup 1.1.0; o plano de rollback precisa preservar essa evidência. Cada implantação deve atualizar `CGU.version` para criar uma nova geração de cache.
- Excluir uma vistoria/edifício pode deixar emissões, snapshots e arquivos emitidos retidos. Política de retenção e descarte ainda deve ser definida pelo responsável institucional.
- Esta candidata ainda requer QA final em dispositivos reais, regeneração/conferência do manual PDF e decisões institucionais antes de qualquer publicação.

## 1.0.6 · 22/10/2026

- Edição de fotos com recorte personalizado, ajuste para caber inteira e desfazer, preservando carimbo, marcações e legendas anteriores.
- Manual HTML atualizado para refletir a versão publicada.


## 1.0.5 · 17/10/2026

- Recorte da foto para caber inteira na meia folha (fotos em dupla), em pé ou deitada, com zoom e escolha entre Memorial fotográfico e Relatório consolidado.
- O carimbo de data, hora e local é redesenhado após o recorte.
- Manual atualizado.

## 1.0.4 · 17/10/2026

- Nova constatação com listas suspensas: tipo de constatação (manutenção predial, agrupado por sistema) e ambiente (áreas comuns de edificações institucionais).
- Tipo e ambiente aparecem no memorial e no quadro-resumo.

## 1.0.3 · 13/10/2026

- Renomeia a área de Obras para Edifícios na interface, no Painel e nos relatórios.
- Atualiza o manual do usuário e os arquivos da versão 1.0.3.

## 1.0.2 · 13/10/2026

- Ajustes CGU completos com telefone, e-mail, responsável técnico, título e CREA informados pela equipe.
- Preenchimento automático dos novos campos em perfis CGU existentes, preservando valores personalizados.
- Manual HTML e PDF atualizados para a versão 1.0.2.

## 1.0.1 · 13/10/2026

- Cadastro institucional com CNPJ e endereço da sede verificados em fonte oficial.
- Preenchimento dos campos vazios em instalações existentes, preservando dados personalizados.
- Documentação e manual com identificação exclusiva da CGU.
- Importação baseada no formato de registros e atualização do cache offline.

## 1.0.0 · 12/10/2026

- Identidade CGU: cores, selo, marca, ícones e versão após o selo.
- Identificação CGU em Word/PDF, CSV, backups e metadados.
- Banco e cache próprios; importação de backups compatíveis.
- Manual HTML e PDF com 15 páginas e 12 telas.
- Correção da descrição de procedência das fotos nos relatórios.
- Correção de elementos ocultos exibidos por regras de layout.
- Cache limitado à aplicação, sem excluir caches de outros sistemas.
