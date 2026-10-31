# Integridade das bibliotecas copiadas

`INTEGRITY.json` registra os bytes e o SHA-256 dos arquivos existentes no commit-base c742fcb (app 1.0.6). Os testes verificam alterações em relação a essa referência. Esses hashes não comprovam a autenticidade da origem nem ausência de vulnerabilidades.

As versões exatas dos pacotes de origem e seus arquivos completos de licença ainda precisam ser confirmados. A identificação pelo nome da biblioteca não basta para afirmar uma versão: o inventário mantém esse campo como `null` até confirmação.

Toda atualização de vendor exige revisão da origem, versão, licença e vulnerabilidades, seguida da atualização deliberada do manifesto e validação dos relatórios PDF/DOCX. Não regenerar os hashes automaticamente no CI: isso aceitaria uma alteração indevida sem revisão.
