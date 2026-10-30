# Contrato — snapshot imutável por emissão (schema `cgu-emission-snapshot` v1)

Estado: implementado em `emission-snapshot.js`, `db.js` (IndexedDB v2) e `app.js` (função `emitir`). Todos os campos abaixo são **novos** em relação à v1.0.6; campos pré-existentes de `emissoes` não mudam.

## Estado único
`emitir` faz `structuredClone` de obra/vistoria/fotos/configuração **antes** de capturar o snapshot e de gerar o relatório; ambos usam exatamente essa cópia (editar a vistoria durante a geração não cria divergência). `DB.uid` agora tem fallback UUID v4 via `getRandomValues`.

## Quando é gerado
Somente em emissão **oficial** (rascunhos não geram registro nem snapshot). A ordem é: carregar vistoria/foto → atribuir `seq/ano` local → clonar estado → **capturar + canonicalizar + SHA-256** → montar o relatório → calcular SHA-256 do arquivo → gravar snapshot, **arquivo emitido** e emissão **na mesma transação** IndexedDB (tudo ou nada). Se `crypto.subtle` não existir (contexto sem HTTPS/localhost), a emissão oficial falha; não há emissão sem hash.

## Envelope (store `snapshots`, keyPath `id`)
| Campo | Tipo | Observação |
|---|---|---|
| id | UUID | chave; imutável (`add`, nunca `put`/`delete`). `emissaoId` também UUID; `vistoriaId`/`obraId` aceitam UUID **ou** id legado `[A-Za-z0-9_-]{8,64}` (gerado pelo fallback antigo de `DB.uid`) |
| schema | `"cgu-emission-snapshot"` | fixo |
| schemaVersion | `1` | fixo |
| canonicalizacao | `"cgu-c14n-1"` | ver abaixo |
| hashAlgoritmo | `"SHA-256"` | |
| hash | 64 hex minúsculos | SHA-256 do JSON canônico UTF-8 do envelope **inteiro** (todos os campos abaixo exceto o próprio `hash`) incluindo `conteudo` (`SnapshotLib.hashSnapshot`) |
| criadoEm | epoch ms | coberto pelo hash |
| appVersion | string | `CGU.version` na emissão |
| emissaoId | UUID | = `emissoes.id` |
| vistoriaId, obraId | UUID | devem coincidir com `conteudo` |
| tipo, formato, numero, rev | | redundância de consulta; `tipo`/`rev` conferidos com `conteudo.emissao` |
| conteudo | objeto | ver abaixo; limite 2 MiB (UTF-8 canônico) |

## `conteudo` (coberto pelo hash)
- `app.versao`
- `emissao`: `{tipo, numero:{seq,ano}, rev}` — `numero` é **local ao aparelho** (backend central ainda não existe)
- `obra`: registro de edifício sem alteração
- `vistoria`: campos da vistoria **exceto** `constatacoes` e `status` (status muda por causa da própria emissão). `updatedAt` e `nFotos` ficam.
- `constatacoes[]`: cópia integral, na ordem do relatório. Campo opcional `recorrenciaDeId` (UUID de outra constatação) é uma declaração explícita, não inferência automática. O editor oferece destinos de snapshots verificados anteriores do mesmo edifício, mas backup/importação não prova que o destino exista, seja anterior ou pertença ao mesmo edifício; referências ausentes são permitidas. A validação recusa ID inválido e autorreferência. O valor só aparece nos snapshots emitidos depois de declarado; os históricos permanecem imutáveis.
- `evidencias[]`: uma por foto, na ordem do relatório (`ts`): todos os metadados serializáveis (`id, ts, lat, lon, acc, descricao, origem, w, h, marks, notas, stampLines…`) + `sha256` e `bytes` do `blob` emitido, `baseSha256`/`baseBytes` se houver original, `temCropBackup`. **Nunca** inclui bytes de imagem, `blob`, `base`, `cropBackup`.
- `configuracao`: `empresa`, `rt`, `usuario` (campos impressos no relatório). Nunca `pinHash`.

Latitude/longitude/precisão entram porque o memorial fotográfico as imprime; o snapshot é dado restrito (mesma classe do backup), jamais usado em agregados.

## Canonicalização `cgu-c14n-1`
JSON sem espaços; chaves de objeto em ordem crescente (unidades de código UTF-16); arrays preservam ordem; propriedades `undefined` omitidas; `-0` vira `0`; `null` permitido; saída UTF-8. **Rejeita** (erro): NaN/±Infinity, bigint, função, símbolo, Date, Map/Set, typed arrays, Blob, objetos não simples, ciclos, profundidade > 32.

## Campos novos em `emissoes` (opcionais)
`snapshotId`, `snapshotHash` (cópia de `snapshot.hash`), `arquivoSha256` (SHA-256 dos bytes do PDF/DOCX gerado). **Ausentes ⇒ emissão legada**: exibida como "Sem snapshot verificável (emissão anterior)"; nenhum snapshot é fabricado retroativamente.

## Arquivo emitido preservado (store `arquivosEmitidos`, keyPath `id`, índices `emissaoId`, `snapshotId`)
Guarda o PDF/DOCX **exato** entregue ao usuário, pois o snapshot guarda hashes das fotos, não os bytes (Rev. antiga continua recuperável mesmo se fotos forem editadas/excluídas).

| Campo | Observação |
|---|---|
| id | UUID |
| emissaoId, snapshotId | UUID; devem coincidir com a emissão e o snapshot |
| arquivo | nome do arquivo emitido |
| mime | `application/pdf` ou `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, coerente com `snapshot.formato` |
| blob | bytes; assinatura `%PDF-` ou `PK` conferida |
| sha256, bytes | SHA-256 e tamanho; `sha256` deve ser igual a `emissoes.arquivoSha256`; limite 50 MiB |

`SnapshotLib.verificarArquivo(emissao, snapshot, arquivo)`: `ausente` (sem registro: **nunca** tratado como verificado), `divergente`, `verificado`. A UI só oferece "Baixar original verificado" quando verificado. `emissoes` ganha `arquivoId` (opcional). Backup: array **opcional** `arquivosEmitidos` (blob como data URL base64, sem fetch); a importação deve recalcular SHA-256 dos bytes, comparar com `sha256` e `emissao.arquivoSha256`, aplicar mime/magic/limite, e tratar mesmo id com sha diferente como conflito.

## Estados de verificação (`SnapshotLib.verificarEmissao`)
`legado` (sem snapshotId/snapshotHash), `ausente` (referenciado mas não presente no aparelho), `divergente` (ids/hash diferem ou o recálculo não confere), `verificado`.
**O que isso garante e o que não garante.** O selo "verificado" significa consistência interna: o conteúdo bate com o hash, e o hash bate com o registrado na emissão **no mesmo IndexedDB**. Quem consegue alterar o armazenamento do navegador pode alterar snapshot, emissão e arquivo juntos e recalcular tudo; então isto detecta corrupção, edição acidental e inconsistência entre registros, **não** adulteração por quem tem acesso direto ao aparelho, nem indica autoria. Não há assinatura digital, ancoragem externa nem imutabilidade contra acesso direto; `add()` só impede sobrescrita pela própria aplicação. Autenticidade forte exige ancorar o hash fora do aparelho (backend/assinatura), dependência futura.

## Regras para importação/mesclagem (implementadas por Farol; helpers prontos)
- `SnapshotLib.validar(snap)` antes de gravar: UUIDs, schema/versão, enums, hash `^[0-9a-f]{64}$`, **recálculo do hash** (rejeitar se divergir), `sha256` por evidência, limite por snapshot.
- `SnapshotLib.compararExistente(existente, recebido)`: `novo` | `duplicata` (mesmo id e hash, idempotente) | `conflito` (mesmo id, hash diferente: reportar, nunca sobrescrever).
- Backup deve tratar `snapshots` como array **opcional**; envelope de backup v1 permanece. Limites sugeridos: 2 MiB por snapshot e teto agregado definido por Farol (5.000 × 2 MiB não é aceitável); na prática um snapshot típico tem dezenas de KB.
- Ao importar emissão com `snapshotId`, o snapshot deve vir junto ou a emissão fica `ausente` (visível), nunca aceita como verificada.

## Limitações conhecidas
- Excluir vistoria/edifício não apaga emissões nem snapshots (comportamento pré-existente para emissões; snapshots seguem a mesma regra). Não há política de retenção.
- Migração IndexedDB v1→v2 é aditiva (cria `snapshots`); não foi exercitada em navegador real nesta entrega (ver registro de testes).
- Numeração permanece local ao aparelho; dois aparelhos podem emitir o mesmo VT-nnn/aaaa, com snapshots distintos.
- Sem assinatura/ancoragem externa do hash; sem cifragem em repouso.
- O hash do arquivo (`arquivoSha256`) não é reproduzível ao regenerar o PDF/DOCX (metadados com data); serve para conferir o arquivo efetivamente baixado.
- Excluir vistoria/edifício deixa snapshots e arquivos emitidos (cópia com GPS e relatório completo): decisão de retenção/descarte pendente [DONO].
- Arquivos emitidos podem ser grandes (PDF com fotos); sem política de limpeza.
- Mudar `CGU.version` exige atualizar `sw.js` (`brand.js?v=`); esta entrega não altera versões globais.

## Rodada final: metadados da linha e numeração local

- `verificarEmissao` compara também `vistoriaId`, `obraId`, `tipo`, `formato`, `rev` e `numero` da linha em `emissoes` com o envelope autenticado do snapshot. `numero` da emissão é o texto impresso (`VT|MF|RC-nnn/aaaa`, prefixo coerente com `tipo`); no snapshot é `{seq, ano}`. Qualquer divergência ⇒ `divergente` (a linha de `emissoes` não é coberta pelo hash, então precisa ser conferida contra ele).
- `verificarArquivo` confere ainda `arquivoId` (se presente), `arquivo` (nome registrado), extensão e `formato` da emissão vs snapshot, além de mime/assinatura/sha256.
- **Numeração local atômica:** `DB.reservarNumeracao(vistoriaId, ano)` roda numa única transação `readwrite` sobre `['vistorias','settings']`: devolve o `seq/ano` já gravados na vistoria ou reserva o próximo do contador `seq-<ano>` e grava a vistoria na mesma transação. `emitir` usa só esse helper. Isso serializa abas do mesmo aparelho; **a numeração continua sem unicidade entre aparelhos** (dois aparelhos podem emitir o mesmo VT-nnn/aaaa) até existir reserva central. `DB.nextSeq` permanece (get+set separados, não atômico) apenas por compatibilidade e não é usado na emissão.
- Testes de banco usam `fake-indexeddb` fora do repositório (`FAKE_IDB=<caminho>`); sem ele são pulados. Não substituem o teste em navegador real.
