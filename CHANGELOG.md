# Histórico de versões

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
