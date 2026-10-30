# Validação local da candidata

Registro de trabalho em 29/10/2026, versão do registro 1.0.1. Resultados intermediários; não representam homologação ou aceite de produção.

## Base e isolamento

Base `origin/main` c742fcbb44bcc24936169c1529fddde98545550d (1.0.6), confirmada por consulta remota. Branch de integração `codex/release-candidate-1.1.0`, separada de main. Navegador no portal “CGU Vistorias — Candidata QA”, origem exclusiva `http://127.0.0.1:8767/`. Fixtures são fictícias; nenhum backup real importado.

## Primeira rodada — snapshots af20ab2 + correção de imagens

- `node --test`: 20 testes aprovados, zero falhas (14 snapshot, 4 distribuição, 2 formatos de imagem).
- Criado banco IndexedDB **v1** na página auxiliar `tests/browser-fixture.html`, com 1 edifício, 1 vistoria, 1 foto PNG e 1 emissão legada; aberto o aplicativo candidato com IndexedDB **v2**. Os quatro registros permaneceram e o novo store de snapshots iniciou vazio.
- A emissão legada ficou explicitamente `legado`, sem inventar conteúdo histórico.
- O primeiro teste com foto PNG falhou: `SOI not found in JPEG`. A investigação confirmou JPEG fixo em `report.js`. Corrigido o despacho pelos bytes JPEG/PNG e incluída conversão de WebP somente para o relatório, preservando a evidência de origem.
- Após a correção, gerados os 6 arquivos (VT/MF/RC × PDF/DOCX) com a foto PNG fictícia. Tamanhos: PDFs 37.235, 34.032 e 38.646 bytes; DOCXs 50.366, 48.717 e 50.645 bytes. Assinaturas `%PDF-` e `PK` conferidas.
- Seis snapshots persistidos e verificados pela biblioteca no navegador. Conteúdo equivalente entre os dois formatos de cada tipo; edição posterior de uma constatação não alterou o snapshot anterior.

## Pendências desta rodada

O commit af20ab2 não preservava os bytes do arquivo emitido. Foi solicitado e recebido complemento de Prisma (03c11b7), ainda sujeito a integração, revisão e nova rodada de navegador. O hash final inclui o envelope, portanto hashes de formatos diferentes podem diferir; a comparação de conteúdo entre formatos deve usar `hashConteudo`, não o hash do envelope.

Refazer migração v1→v2 com o conjunto final de stores, recuperar o arquivo original após editar/excluir foto, conferir transações sob erro e import/export de snapshots/arquivos quando Farol concluir. Exercitar WebP no navegador e reabertura de PDF/DOCX além da assinatura. Não foram exercitados aparelho físico, câmera/GPS reais, compartilhamento nativo, abertura em Microsoft Word, isolamento multiunidade de backend nem restauração de serviço central.

## Segunda rodada — 57c483b (Prisma 03c11b7) + imagens 738d736

Preparada novamente a origem exclusiva de QA com uma fixture v1 conhecida; somente o banco fictício anterior dessa origem foi removido, após conferir o identificador do edifício. Aberta a candidata e realizada migração para v2, agora com `snapshots` e `arquivosEmitidos`.

- Gerados novamente os seis formatos com PNG. PDFs reabertos por `PDFLib.PDFDocument.load`: VT com 3 páginas, MF com 2, RC com 4. Zero erro de incorporação de imagem.
- DOCXs extraídos para `work/qa-artifacts` (fora da distribuição), reabertos como ZIP pelo .NET. Cada pacote contém 33 entradas e 2 imagens PNG, com `[Content_Types].xml`, `word/document.xml` e `word/styles.xml`. XML principal lido com DTD proibido. Não representa abertura no Microsoft Word.
- Seis emissões novas, seis snapshots e seis arquivos emitidos persistidos; verificação de todos os snapshots e dos bytes dos arquivos passou.
- `hashConteudo` coincide entre PDF/DOCX do mesmo tipo; hash do envelope pode diferir legitimamente por formato e identidade da emissão.
- Edição posterior de constatação não alterou o snapshot. Exclusão temporária da foto fictícia não afetou a verificação do artefato histórico; a fixture de foto foi reposta para os próximos ensaios.
- Tentativa de `registrarEmissao` com snapshot já existente causou erro e rollback: nenhuma emissão ou arquivo parcial foi gravado.
- Emissão legada manteve estado `legado` explícito.

As rotinas reproduzíveis estão em `scripts/browser-qa`. Os resultados sintéticos da rodada constam em `docs/qa/round2.json`. Importação/exportação segura ainda não foi integrada. Revisão de coerência dos metadados da emissão e reserva de numeração concorrente foi solicitada ao Prisma e deve ter outra rodada de navegador.
