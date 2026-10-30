# Evidências do hardening de backup e integridade

Branch local: `codex/security-hardening` (derivada de `origin/main`, v1.0.6).

## Importação e backups

- O envelope legado v1 continua válido; `snapshots` e `arquivosEmitidos` são arrays opcionais.
- A importação verifica tamanho do arquivo antes de `file.text()`, analisa o JSON, valida whitelist, tipos, referências, limites, fotos, crops, snapshots e artefatos, e só então chama uma transação IndexedDB de escrita.
- A transação cobre os stores do backup; adições são atômicas. IDs colidentes ficam locais e aparecem como conflitos. Registros ausentes no backup não são apagados (não há tombstones).
- Imagens aceitam apenas data URLs base64 JPEG/PNG/WebP, com assinatura e limites conferidos diretamente nos bytes; nunca fazem `fetch` da entrada. PDF/DOCX têm validador separado, MIME enumerado, magic bytes, tamanho e SHA-256 recalculado.
- IDs legados de obras/vistorias/fotos/constatações aceitam `^[A-Za-z0-9_-]{8,64}$`, além de UUID, para preservar dados da v1. IDs de snapshots e arquivos oficiais são UUID. O fallback fica documentado no validador e nos testes.
- `cropBackup` serializa `blob` e `base` como data URLs e os reconstrói como Blob. Os campos de marcação, notas, carimbo e dimensões também são validados.
- Estados calculados de verificação de snapshot/arquivo não são aceitos no envelope nem persistidos junto da emissão; são recalculados na tela.
- O backup alerta que pode conter fotos, GPS e CREA, não inclui nomes de edifício/pessoa no nome do arquivo e informa que o JSON não é cifrado.

## Política do navegador

`index.html` declara CSP same-origin: `default-src 'self'`, `script-src 'self'`, `img-src 'self' blob: data:`, `connect-src 'self' data: blob:`, `object-src 'none'`, `base-uri 'none'`, `form-action 'none'`, `worker-src 'self'` e `manifest-src 'self'`. Não há script ou handler inline. `style-src 'self' 'unsafe-inline'` permanece porque o app v1 usa atributos `style` em várias telas. Não foi adicionado `unsafe-eval`. O service worker importa a versão v1.0.6 e pré-cacheia `backup.js`.

## Testes executados

```text
node --test tests/backup.security.test.cjs tests/emission-snapshot.test.js
35 pass, 0 fail, 0 skipped
```

Inclui negativos para ID com aspas, campo extra e `__proto__`, envelope v2/lista ausente, coleção excessiva, vistoria órfã, updatedAt com tipo errado, URLs externas sem chamada de rede, SVG/HTML, base64 e magic bytes inválidos, limite de blob, MIME/tamanho/digest PDF inválidos, snapshot adulterado, crop malformado e fórmulas CSV. O roundtrip verifica bytes da evidência, original de crop, snapshot e PDF emitido.

Também passaram `node --check` em `app.js`, `db.js`, `backup.js` e `emission-snapshot.js`, e `git diff --check`.

## Limites da evidência e riscos restantes

- CSP foi verificada estaticamente em Node; ainda requer smoke test em navegador real para registrar violações de console e confirmar câmera, SW e geração/download PDF/DOCX sob a política.
- Os testes de Node exercitam validação e roundtrip puro, não executam IndexedDB de navegador; a atomicidade está implementada numa transação única e ainda deve receber teste de falha/abort em navegador.
- Colisões são preservadas localmente e relatadas; ainda não há fluxo interativo de escolha manter/substituir/duplicar. Fotos sem digest anterior são tratadas conservadoramente como conflito.
- O backup continua em texto JSON sem criptografia. O aviso de classificação reduz erro operacional, mas não substitui cifra/armazenamento autorizado.
- PIN do painel continua sendo barreira local de interface, não autenticação de usuário nem controle de acesso multiusuário.
