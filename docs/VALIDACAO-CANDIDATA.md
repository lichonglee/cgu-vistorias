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

## Terceira rodada — 22db43e (Prisma f703884): numeração local atômica

Cherry-pick de f703884 sobre b1284fc sem conflitos. `node --test`: 32 pass / 8 skip sem `FAKE_IDB` (os 8 testes de banco dependem de `fake-indexeddb`, instalado fora do repositório); 40 pass / 0 skip com `FAKE_IDB`.

Ensaio em navegador real na origem 8767, com `db.js` carregado da candidata e banco temporário próprio (`cgu-qa-conc-tmp`, removido ao final; o banco da fixture QA não foi tocado). Quatro conexões independentes, 24 vistorias:

- 24 reservas simultâneas (`Promise.all`) geraram sequências 1–24, sem lacuna nem duplicidade; contador do ano = 24.
- Nova rodada de 24 reservas sobre as mesmas vistorias devolveu os mesmos números e não consumiu sequência.
- 8 reservas simultâneas da mesma vistoria devolveram o mesmo número.
- Vistoria inexistente rejeita e o contador permanece 24.

Limite mantido: a numeração é local ao aparelho e não é única entre aparelhos. Fora do escopo desta rodada: PDF/DOCX ponta a ponta com a nova numeração e WebP no navegador.

## Backup com recorte e Desfazer recorte — 1.10.2 + 53502c4 (Compasso, 30/10/2026)

Origem isolada `127.0.0.1:8791` servindo esta candidata, com service worker e caches da origem limpos antes do ensaio; somente dados fictícios.

- Com o formato que `app.js` grava no primeiro recorte (cropBackup com `cortada`/`ajustada` indefinidos), a importação falhava inteira: “cropBackup sem estado de recorte/ajuste”. Nenhum registro era importado.
- Após a correção 53502c4: `exportBackup` real gerou o JSON com `cropBackup` em data URL; os registros foram excluídos; a importação pelo `#impIn` real criou 3 registros novos, sem conflitos; a foto voltou com o recorte 40×30 e o original 80×60 no `cropBackup`; o botão “↩ Desfazer recorte” restaurou o original 80×60 e removeu o `cropBackup`. A base terminou vazia.
- Limites: o recorte foi semeado no formato gravado pelo app, sem arrastar a seleção na tela; o arquivo foi entregue ao input por `DataTransfer`; Chromium desktop, sem aparelho Android.
- `FAKE_IDB npm test` 130/130, `npm run check` 6/6. Revisão Sentinela aprovada.

## Seletor de recorrência e roundtrip — 1.10.3 (Compasso, 30/10/2026)

Origem isolada `127.0.0.1:8791`, app 1.10.3, somente dados fictícios (edifícios A e B). Três emissões oficiais reais (`emitir`, VT/PDF) para A1 (01/09), AF (01/11) e B1 (01/09); vistoria atual A2 em 15/10.

- O editor de constatação de A2 ofereceu exatamente uma opção: “2026-09-01 · Edifício fictício QA A · A1 anterior”. Não ofereceu a vistoria posterior AF nem a de outro edifício B1. O rótulo está associado ao select (`label for`).
- Seleção humana salva: `recorrenciaDeId` gravado com o ID de A1.
- Com a linha de emissão de A1 adulterada (número trocado), A1 deixou de ser oferecida como verificada; o vínculo existente apareceu como “Vínculo preservado; constatação anterior fora da lista”, ainda selecionado. A adulteração foi revertida.
- Backup real (156 KB) → limpeza das sete stores → importação real: 15 novos, 0 conflitos, 0 snapshots ou arquivos ausentes; 3 emissões, 3 snapshots e 3 arquivos restaurados; vínculo preservado; A1 voltou a ser oferecida como verificada e AF/B1 seguiram excluídas. Base vazia ao final.
- Limites: viewport desktop; acessibilidade móvel, leitor de tela e console do navegador não foram exercitados nesta rodada.

## Smoke móvel por DOM — 1.10.3 (Compasso, 30/10/2026)

Portal 390×844 (viewport CSS 375 px) na origem isolada `127.0.0.1:8791`, dados fictícios. Duas emissões oficiais reais da mesma vistoria (Rev. 00 e Rev. 01 após editar a constatação).

- Aba Emitir: dois botões “Comparar com outra emissão” com `aria-label` descritivo. Modal de comparação abriu, listou a emissão B e “Comparar snapshots” gerou o resultado; sem rolagem horizontal da página (scrollWidth = clientWidth = 375).
- Painel: indicadores, 15 `details`, paginação “Exibindo 1–1 de 1”, avisos de limite; “Abrir constatação” abriu a leitura do snapshot Rev. 1 com foco dentro do modal. Página sem rolagem horizontal; as abas e as duas tabelas que excedem a largura ficam dentro de contêineres com `overflow-x: auto`.
- Nenhum erro de `window.onerror`, rejeição não tratada ou `console.error` durante o roteiro. Base limpa ao final.
- Limites: captura de tela indisponível (janela do portal minimizada), portanto sem conferência visual; paginação com uma página apenas; teclado/toque, leitor de tela e aparelho físico não exercitados; barras do painel não identificadas por seletor.

## Ações corretivas declaradas — 1.10.3 (Compasso, 30/10/2026)

Origem isolada `127.0.0.1:8791`, dados fictícios, em desktop e em 390×844.

- Constatação sem emissão: sem botão de nova ação e com a orientação para emitir em snapshot verificável.
- Após emissão oficial real: aviso “Declarações locais do usuário; não verificadas”; formulário com função, prazo, estado (aberta, em execução, concluída, cancelada) e observação. Salvar vazio foi recusado sem gravar nada.
- Ação salva com estado “em execução”, função, prazo e `snapshotId`; mensagem “permanece não verificada”. Observação com `<img src=x onerror=...>` apareceu como texto na lista e no painel, sem elemento injetado.
- Painel: seção de ações declaradas com 0/1 concluídas e rótulo de não verificadas. Em 390×844, sem rolagem horizontal da página. Nenhum erro de console. Base limpa ao final.
- Observação de UX: ao salvar com a função vazia, a mensagem dizia “Função responsável inválida (máximo 120 caracteres)”, sem citar que o campo é obrigatório. Corrigido na 1.10.4 (ver seção seguinte).
- Limites: sem captura visual, teclado/toque, leitor de tela ou aparelho físico.

## Mensagem de função responsável — 1.10.4 (Compasso, 30/10/2026)

- `validateAction` mantém a mesma regra e separa as mensagens: “Informe a função responsável.” para vazio ou só espaços; “Função responsável excede 120 caracteres.” acima do limite. Teste cobre vazio, espaços e 121 caracteres, sem gravação.
- Navegador na origem isolada 8791: cache único `cgu-vistorias-/-1.10.4`; função só com espaços exibiu “Informe a função responsável.” e nada foi gravado; ação válida salva. Base limpa ao final.
- `FAKE_IDB npm test` 131/131, `npm run check` 6/6. Revisão Sentinela aprovada.

## Capturas visuais móveis — 1.10.4 (Compasso, 30/10/2026)

Chrome headless via DevTools Protocol, emulação móvel 390×844 com toque, perfil novo; origem isolada `127.0.0.1:8791`; dados fictícios (duas emissões oficiais da mesma vistoria, Rev. 00 e Rev. 01). 12 capturas guardadas fora da distribuição em `work/qa-artifacts/compasso-1.10.4-mobile/` e conferidas visualmente.

- Histórico de emissões: cartões Rev. 01 e Rev. 00 com integridade e arquivo original verificados e botão “Comparar com outra emissão”.
- Comparação: modal com aviso, referência A, select B, “Comparar snapshots”; resultado “0 acrescentada(s), 0 removida(s), 1 alterada(s), 1 igual(is)”, detalhe do título alterado e evidências por SHA-256. Sem rolagem horizontal.
- Painel: cartões de totais, indicadores com “Como é calculado”, barras das dimensões e de vistorias por mês, avisos de limites, lacunas cadastrais, exportação restrita, ações declaradas, filtros e agrupamentos; leitura do snapshot “Infiltração fictícia” (Crítica) com “Abrir registro atual”. scrollWidth = 390 em todas as telas.
- Nenhuma exceção ou mensagem de erro/aviso no console. Base limpa ao final.
- O aviso “O navegador não garantiu armazenamento persistente” aparece sobre o conteúdo durante alguns segundos no perfil headless; é o comportamento previsto do app quando `navigator.storage.persist()` é negado.
- Observação de ambiente: com o perfil num caminho longo, o Chrome headless não abriu o IndexedDB (“Internal error opening backing store”) e o app ficou com a tela de Edifícios vazia, sem mensagem, e o Painel registrou erro de `S` nulo. Falha de ambiente, mas mostra que o app não informa ao usuário quando o IndexedDB não abre.
- Limites: emulação de navegador, não aparelho físico; sem leitor de tela; paginação com uma página.

## Falha ao abrir o armazenamento local — 1.10.4 (Compasso, 30/10/2026)

- 15c5a6a: se `DB.open`/`loadSettings` falham, a inicialização mostra aviso estático com orientação e as rotas não o sobrescrevem. Antes: rejeição não tratada, tela de Edifícios vazia e erro de `S` nulo no Painel. Chrome headless 390×844 com IndexedDB indisponível (“Internal error opening backing store”): aviso visível, Painel sem sobrescrever, sem exceções; perfil normal: Edifícios e Painel normais.
- 1167fc5: atualização de esquema bloqueada por aba antiga rejeita com `BlockedError` (mesmo aviso) em vez de ficar pendente; a conexão aberta fecha em `versionchange` e a aba antiga mostra “O aplicativo foi atualizado em outra aba… Recarregue”. `tests/db-open.test.js` cobre os dois casos e falha com o `db.js` anterior (mutação reproduzida por Compasso e por Sentinela).
- `FAKE_IDB npm test` 134/134, `npm run check` 6/6. Revisões Sentinela aprovadas.
- Pendências apontadas na revisão (baixas): na aba antiga, o aviso de `versionchange` substitui a tela e campos ainda não salvos se perdem; um modal aberto pode ficar sobre o aviso; o listener do app e o `dispatchEvent` não têm teste automatizado; após `BlockedError` a requisição pode concluir mais tarde e a página segue no aviso até recarregar; em falha o service worker não é registrado nessa visita. Ensaio manual com duas abas reais segue pendente.
- O conteúdo de `app.js`/`db.js` mudou depois dos primeiros ensaios com cache 1.10.4 na origem isolada 8791; como a 1.10.4 não foi lançada, origens de QA com esse cache devem limpar caches antes de novo ensaio.
