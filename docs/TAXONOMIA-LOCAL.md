# Taxonomia local do aplicativo

Versão `cgu-app-taxonomia-1`. Os códigos `SIS.*` e `AMB.*` são derivados dos catálogos atualmente exibidos pelo aplicativo e servem apenas para análise local. **Não são códigos institucionais nem uma taxonomia aprovada pela CGU.**

O módulo `taxonomia.js` não grava códigos no IndexedDB nem altera snapshots existentes. Valores fora dos catálogos retornam `null`; a análise deve agrupá-los em um rótulo fixo de “sem correspondência”, sem exibir o texto recebido. Alterações de catálogo exigem revisão, atualização explícita da versão e do hash de snapshot testado em `tests/taxonomia.test.js`.

Catálogo congelado nesta revisão: 46 tipos de constatação e 34 ambientes. A cobertura é limitada ao texto exato das opções atuais da interface.
