# CGU Vistorias · v1.0.0

Aplicação web instalável (PWA) para organizar vistorias, registrar evidências e gerar relatórios em Word e PDF. Adaptada de [ALL Vistorias](https://github.com/lichonglee/all-vistorias), commit `f50d11a440ed3e8d3539bcefb7452ab953f14bab`, com o histórico Git preservado.

## Aplicação hospedada

**Publicação principal:** [Abrir CGU Vistorias no GitHub Pages](https://lichonglee.github.io/cgu-vistorias/) · [Manual online](https://lichonglee.github.io/cgu-vistorias/manual.html)

GitHub Pages ativado em 13/10/2026. O repositório é público, conforme autorização do proprietário. A origem da publicação é a raiz da branch `main`; novos pushes nessa branch atualizam o site automaticamente. O arquivo `.nojekyll` mantém a aplicação estática sem processamento de templates. A interface, o manifesto PWA e os arquivos offline usam caminhos relativos ao projeto.

Para atualizar: altere os arquivos, faça commit e push para `main`, e aguarde a execução `pages build and deployment` na aba Actions do GitHub. Os dados de vistoria continuam locais no navegador de cada usuário. GitHub Pages e Netlify têm origens diferentes; para levar registros de um endereço ao outro, exporte o backup JSON no endereço antigo e importe no novo.

### Hospedagem anterior no Netlify

[Abrir CGU Vistorias](https://cgu-vistorias.netlify.app/) · [Manual online](https://cgu-vistorias.netlify.app/manual)

Versão 1.0.0 implantada pelo Netlify Drop em 12/10/2026, na equipe `lichonglee`. Projeto Netlify: `82d06eab-eefd-4a00-a268-1785fa6b562b`. A visibilidade privada padrão da equipe foi mantida: é necessário acessar com uma conta Netlify da equipe. O site foi reivindicado na conta e não está sujeito à expiração do Drop temporário.

Para atualizar manualmente, abra o [painel do projeto](https://app.netlify.com/projects/cgu-vistorias/overview) e envie o ZIP com `index.html` na raiz. Não há integração automática com o GitHub nesta implantação. Após o upload, verifique o aplicativo e o download do manual. Os dados de vistoria continuam locais no navegador de cada usuário.

## Publicar e usar

Hospede esta pasta em HTTPS, preservando os caminhos. Não há dependências para instalar nem etapa de compilação. O repositório entrega o código; sua disponibilidade no GitHub não equivale à hospedagem. GitHub Pages em repositórios privados depende de plano compatível. Também pode ser usada hospedagem HTTPS autorizada pela equipe.

1. Abra o endereço com internet e aguarde o carregamento inicial.
2. Em **Ajustes**, configure unidade, responsável técnico e vistoriador.
3. Siga **Obras → Nova vistoria → Dados → Fotos → Constatações → Conclusão → Emitir**.
4. Instale pelo menu do Chrome/Android ou Compartilhar do Safari/iPhone, conforme a opção disponível.
5. Abra o manual e teste sem internet antes de sair a campo.
6. Exporte um backup ao terminar a jornada.

## Manual do usuário

- [Manual ilustrado HTML](manual.html), disponível pela aba Manual.
- [Manual PDF](docs/manual-usuario.pdf): 15 páginas e 12 telas reais com dados demonstrativos.

## Identidade visual

Referência: Manual de Identidade Visual da CGU, fevereiro de 2023 (`Manual2023.pdf` fornecido pelo usuário). Azul base `#002543`, azul de apoio `#49ABE1` e verde `#049B6F`. Selo digital e marca extraídos da página 15, sem redesenhar suas formas. Versão exibida após o selo; `brand.js` centraliza a identificação.

A interface usa Calibri e alternativas locais Carlito, Segoe UI e Arial. Humanst não foi redistribuída. O Word usa Calibri; o PDF dos relatórios usa Helvetica incorporada pela biblioteca. O manual PDF incorpora Calibri para manter sua apresentação. CNPJ, contatos e responsável foram deixados para configuração em Ajustes, sem valores supostos. A marca identifica a adaptação solicitada e não estabelece homologação institucional.

## Dados e limitações

Os dados ficam no IndexedDB `cgu-vistorias`, no aparelho e navegador utilizados. Não há servidor de dados, login institucional, sincronização em nuvem, criptografia ou assinatura digital.

**Exportar tudo (.json)** inclui obras, vistorias, fotos, marcações, emissões e sequências; perfil e PIN não são incluídos. **Importar backup** aceita CGU e ALL: mescla identificadores e prioriza a vistoria mais recente. Obras e fotos de mesmo identificador podem ser substituídas. Guarde uma cópia antes da consolidação.

A emissão oficial é um controle local de número e histórico; não representa aprovação institucional. A sequência é por aparelho e pode coincidir entre celulares. Defina um aparelho para a emissão final ou revise os números após consolidar.

O PIN restringe apenas Painel e pode ser alterado em Ajustes; não protege os registros. Fotos da câmera recebem GPS quando disponível; as da galeria usam a data do arquivo e não recebem coordenadas. A redução de resolução segue o limite configurado em Ajustes.

## Desenvolvimento

Sirva a raiz por HTTP em localhost, por exemplo `python -m http.server 8765`, e abra `http://localhost:8765`. Em lançamentos futuros, atualize `CGU.version` em `brand.js`, a identificação inicial em `index.html`, o manual e o histórico de versões. Inclua novos arquivos offline em `FILES` de `sw.js`. O cache é limitado ao escopo desta aplicação e não remove caches de outros projetos.

As bibliotecas de origem permanecem em `vendor/`. Consulte o [registro de validação](docs/VALIDACAO.md).
