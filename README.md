# CGU Vistorias · v1.0.5

Aplicação web instalável (PWA) para organizar vistorias, registrar evidências e gerar relatórios em Word e PDF com a identidade visual da Controladoria-Geral da União.

## Aplicação hospedada

**Publicação principal:** [Abrir CGU Vistorias no GitHub Pages](https://lichonglee.github.io/cgu-vistorias/) · [Manual online](https://lichonglee.github.io/cgu-vistorias/manual.html)

GitHub Pages ativado em 13/10/2026. O repositório é público, conforme autorização do proprietário. A origem da publicação é a raiz da branch `main`; novos pushes nessa branch atualizam o site automaticamente. O arquivo `.nojekyll` mantém a aplicação estática sem processamento de templates. A interface, o manifesto PWA e os arquivos offline usam caminhos relativos ao projeto.

Para atualizar: altere os arquivos, faça commit e push para `main`, e aguarde a execução `pages build and deployment` na aba Actions do GitHub. Os dados de vistoria continuam locais no navegador de cada usuário. Para transferir registros entre endereços, importe um backup JSON exportado no endereço anterior.

A hospedagem anterior no Netlify foi excluída em 13/10/2026, conforme solicitação do proprietário. A publicação atual é somente pelo GitHub Pages.

## Publicar e usar

Hospede esta pasta em HTTPS, preservando os caminhos. Não há dependências para instalar nem etapa de compilação. O repositório entrega o código; sua disponibilidade no GitHub não equivale à hospedagem. GitHub Pages em repositórios privados depende de plano compatível. Também pode ser usada hospedagem HTTPS autorizada pela equipe.

1. Abra o endereço com internet e aguarde o carregamento inicial.
2. Em **Ajustes**, configure unidade, responsável técnico e vistoriador.
3. Siga **Edifícios → Novo edifício → Nova vistoria → Dados → Fotos → Constatações → Conclusão → Emitir**.
4. Instale pelo menu do Chrome/Android ou Compartilhar do Safari/iPhone, conforme a opção disponível.
5. Abra o manual e teste sem internet antes de sair a campo.
6. Exporte um backup ao terminar a jornada.

## Manual do usuário

- [Manual ilustrado HTML](manual.html), disponível pela aba Manual.
- [Manual PDF](docs/manual-usuario.pdf): 15 páginas e 12 telas reais com dados demonstrativos.
- [Diagramas UML e BPMN](docs/diagramas.html): estrutura e fluxo de funcionamento da ferramenta, com fontes editáveis.

## Identidade visual

Referência: Manual de Identidade Visual da CGU, fevereiro de 2023 (`Manual2023.pdf` fornecido pelo usuário). Azul base `#002543`, azul de apoio `#49ABE1` e verde `#049B6F`. Selo digital e marca extraídos da página 15, sem redesenhar suas formas. Versão exibida após o selo; `brand.js` centraliza a identificação.

A interface usa Calibri e alternativas locais Carlito, Segoe UI e Arial. Humanst não foi redistribuída. O Word usa Calibri; o PDF dos relatórios usa Helvetica incorporada pela biblioteca. O manual PDF incorpora Calibri para manter sua apresentação. CNPJ e endereço da sede são preenchidos a partir de [documento oficial da CGU](https://repositorio.cgu.gov.br/bitstream/1/94975/1/CT_07_2025.pdf): `26.664.015/0001-48` e SAUS, Quadra 5, Bloco A, Lotes 9 e 10, Edifício MultiBrasil, Brasília/DF, CEP 70070-050. Contatos da unidade e responsável técnico continuam configuráveis em Ajustes. A marca identifica a adaptação solicitada e não estabelece homologação institucional.

## Dados e limitações

Os dados ficam no IndexedDB `cgu-vistorias`, no aparelho e navegador utilizados. Não há servidor de dados, login institucional, sincronização em nuvem, criptografia ou assinatura digital.

**Exportar tudo (.json)** inclui edifícios, vistorias, fotos, marcações, emissões e sequências; perfil e PIN não são incluídos. **Importar backup** aceita arquivos compatíveis com o formato de registros versão 1: mescla identificadores e prioriza a vistoria mais recente. Edifícios e fotos de mesmo identificador podem ser substituídas. Guarde uma cópia antes da consolidação.

A emissão oficial é um controle local de número e histórico; não representa aprovação institucional. A sequência é por aparelho e pode coincidir entre celulares. Defina um aparelho para a emissão final ou revise os números após consolidar.

O PIN restringe apenas Painel e pode ser alterado em Ajustes; não protege os registros. Fotos da câmera recebem GPS quando disponível; as da galeria usam a data do arquivo e não recebem coordenadas. A redução de resolução segue o limite configurado em Ajustes.

## Desenvolvimento

Sirva a raiz por HTTP em localhost, por exemplo `python -m http.server 8765`, e abra `http://localhost:8765`. Em lançamentos futuros, atualize `CGU.version` em `brand.js`, a identificação inicial em `index.html`, o manual e o histórico de versões. Inclua novos arquivos offline em `FILES` de `sw.js`. O cache é limitado ao escopo desta aplicação e não remove caches de outros projetos.

As bibliotecas de origem permanecem em `vendor/`. Consulte o [registro de validação](docs/VALIDACAO.md).
