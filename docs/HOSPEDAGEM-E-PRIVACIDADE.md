# Repositório privado e acesso ao aplicativo

Decisão técnica de referência, versão 1.0.0, consultada em 29/10/2026. A visibilidade do repositório não foi alterada nesta rodada.

## Pode ficar privado?

Sim: o código pode ser mantido em repositório privado, sujeito ao acesso administrativo e às regras da conta/organização. Isso restringe acesso ao código-fonte no GitHub; o acesso à aplicação publicada precisa de uma decisão própria.

- GitHub Pages funciona em repositórios privados nos planos GitHub Pro, Team e Enterprise; em GitHub Free a mudança para privado despublica o Pages existente. O plano e as configurações da conta deste repositório ainda não foram confirmados.
- Um site Pages originado de repositório privado permanece publicamente acessível por padrão. A publicação privada com controle de acesso é um recurso para sites de projeto de organizações GitHub Enterprise Cloud, com condições próprias para Enterprise Managed Users.
- Tornar privado não retira cópias já clonadas nem torna privados os forks públicos anteriores.
- Se houver domínio personalizado, revisar publicação e DNS antes da mudança de visibilidade para evitar domínio abandonado.

## Decisão recomendada para o produto

Manter o código em organização/conta aprovada com acesso restrito aos colaboradores. Publicar o frontend e a API em ambiente HTTPS aprovado, com identidade institucional, autorização no servidor por papel/unidade e armazenamento de evidências conforme política de dados. O painel gerencial central e as fotos exigem essa autorização independentemente da privacidade do código.

O Pages pode atender à demonstração com dados sintéticos e à distribuição de código estático público quando aprovada. Não fornece a API, o isolamento por unidade ou o fluxo de autorização de fotos do produto central.

Não executar uma mudança de visibilidade antes de identificar o plano, a configuração de publicação, os administradores, o domínio e o caminho de continuidade do app já instalado. Registrar rollback e validar atualização/offline na origem que for mantida.

## Fonte e escopo

- [GitHub — visibilidade do repositório e efeitos de torná-lo privado](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/managing-repository-settings/setting-repository-visibility)
- [GitHub — planos e disponibilidade do Pages](https://docs.github.com/en/pages/getting-started-with-github-pages)
- [GitHub — visibilidade privada e controle de acesso de sites Pages](https://docs.github.com/en/enterprise-cloud@latest/pages/getting-started-with-github-pages/changing-the-visibility-of-your-github-pages-site)
- [GitHub — criação de site e acesso público por padrão](https://docs.github.com/en/enterprise-cloud@latest/pages/getting-started-with-github-pages/creating-a-github-pages-site)

Estas conclusões descrevem os recursos documentados pelo provedor; não confirmam contratação de plano, IdP, hospedagem ou autorização institucional para o APP-CGU-VISTORIAS.
