# Contrato — snapshot imutável por emissão (schema `cgu-emission-snapshot` v1)

Estado: implementado em `emission-snapshot.js`, `db.js` (IndexedDB v2) e `app.js` (função `emitir`). Todos os campos abaixo são **novos** em relação à v1.0.6; campos pré-existentes de `emissoes` não mudam.

## Quando é gerado
Somente em emissão **oficial** (rascunhos não geram registro nem snapshot). A ordem é: carregar vistoria/foto → atribuir `seq/ano` local → **capturar + canonicalizar + SHA-256** → montar o relatório → calcular SHA-256 do arquivo → gravar snapshot e emissão **na mesma transação** IndexedDB (ou ambos ou nenhum). Se `crypto.subtle` não existir (contexto sem HTTPS/localhost), a emissão oficial falha; não há emissão sem hash.

## Envelope (store `snapshots`, keyPath `id`)
| Campo | Tipo | Observação |
|---|---|---|
| id | UUID | chave; imutável (`add`, nunca `put`/`delete`) |
| schema | `"cgu-emission-snapshot"` | fixo |
| schemaVersion | `1` | fixo |
| canonicalizacao | `"cgu-c14n-1"` | ver abaixo |
| hashAlgoritmo | `"SHA-256"` | |
| hash | 64 hex minúsculos | SHA-256 dos bytes UTF-8 do JSON canônico de `conteudo` |
| criadoEm | epoch ms | fora do hash |
| appVersion | string | `CGU.version` na emissão |
| emissaoId | UUID | = `emissoes.id` |
| vistoriaId, obraId | UUID | devem coincidir com `conteudo` |
| tipo, formato, numero, rev | | redundância de consulta; `tipo`/`rev` conferidos com `conteudo.emissao` |
| conteudo | objeto | ver abaixo; limite 2 MiB (UTF-8 canônico) |

## `conteudo` (coberto pelo hash)
- `app.versao`
- `emissao`: `{tipo, numero:{seq,ano}, rev}` — `numero` é **local ao aparelho** (backend central ainda não existe)
- `obra`: registro de edifício sem alteração
- `vistoria`: campos da vistoria **exceto** `constatacoes` e `status` (status muda por causa da própria emissão; mantém o hash igual entre PDF e DOCX do mesmo conteúdo). `updatedAt` e `nFotos` ficam.
- `constatacoes[]`: cópia integral, na ordem do relatório
- `evidencias[]`: uma por foto, na ordem do relatório (`ts`): todos os metadados serializáveis (`id, ts, lat, lon, acc, descricao, origem, w, h, marks, notas, stampLines…`) + `sha256` e `bytes` do `blob` emitido, `baseSha256`/`baseBytes` se houver original, `temCropBackup`. **Nunca** inclui bytes de imagem, `blob`, `base`, `cropBackup`.
- `configuracao`: `empresa`, `rt`, `usuario` (campos impressos no relatório). Nunca `pinHash`.

Latitude/longitude/precisão entram porque o memorial fotográfico as imprime; o snapshot é dado restrito (mesma classe do backup), jamais usado em agregados.

## Canonicalização `cgu-c14n-1`
JSON sem espaços; chaves de objeto em ordem crescente (unidades de código UTF-16); arrays preservam ordem; propriedades `undefined` omitidas; `-0` vira `0`; `null` permitido; saída UTF-8. **Rejeita** (erro): NaN/±Infinity, bigint, função, símbolo, Date, Map/Set, typed arrays, Blob, objetos não simples, ciclos, profundidade > 32.

## Campos novos em `emissoes` (opcionais)
`snapshotId`, `snapshotHash` (cópia de `snapshot.hash`), `arquivoSha256` (SHA-256 dos bytes do PDF/DOCX gerado). **Ausentes ⇒ emissão legada**: exibida como "Sem snapshot verificável (emissão anterior)"; nenhum snapshot é fabricado retroativamente.

## Estados de verificação (`SnapshotLib.verificarEmissao`)
`legado` (sem snapshotId/snapshotHash), `ausente` (referenciado mas não presente no aparelho), `divergente` (ids/hash diferem ou o recálculo não confere), `verificado`.
`validar()` sozinho **não** prova autenticidade: um adversário com acesso ao armazenamento pode alterar conteúdo e recalcular `hash`. A defesa é o `snapshotHash` guardado na emissão (e, quando houver backend, no servidor); não há assinatura digital nesta versão.

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
- Mudar `CGU.version` exige atualizar `sw.js` (`brand.js?v=`); esta entrega não altera versões globais.
