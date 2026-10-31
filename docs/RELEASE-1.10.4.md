# Candidata 1.10.4 — preparação de lançamento

Branch `codex/release-candidate-1.1.0`, 46 commits sobre `origin/main` 1.0.6 (c742fcb). **Não publicada**: sem push, tag, Pages ou alteração de `main`. A decisão de lançar é do responsável pelo produto.

## O que entra (desde 1.0.6)

- Emissão oficial com snapshot imutável, SHA-256 do conteúdo e do arquivo emitido, verificação na reabertura e download só do original verificado; numeração local atômica por vistoria/ano.
- Backup e importação validados (esquema, limites, imagens só `data:`, sem fetch externo, CSP), importação atômica com conflitos preservados, snapshots e arquivos emitidos no backup; backup de foto recortada uma vez a partir do original volta a ser aceito.
- Análise local: indicadores com fichas e regra versionada (`cgu-local-indicators-1.0.2`), vínculos explícitos de recorrência, candidatos a duplicata, ações corretivas declaradas (não verificadas), fila de acompanhamento paginada, comparação entre emissões.
- PWA: o cache versionado 1.10.4 substitui o anterior na atualização do service worker (verificado no navegador); aviso quando o armazenamento local não abre ou a atualização é bloqueada por outra aba; aba antiga preserva tela e rascunho e avisa “Não salvo…”.
- GPS da foto da câmera: nova leitura, espera pela resposta ao pedido de localização (até 30 s) e leitura até 15 s após a resposta; depois segue sem coordenadas com “Sem GPS” (decisões do usuário).
- Acessibilidade: rótulos ligados aos campos, tabelas roláveis com foco e nome, texto alternativo nas fotos, contraste das etiquetas ≥ 4,5:1.
- Manual HTML e PDF (20 páginas) da 1.10.4; capturas de tela identificadas como ilustrativas de versões anteriores.

## Verificação

- `FAKE_IDB npm test`: 144/144, 0 skip; `npm run check`: 6/6 (testes de distribuição).
- Fatias e correções submetidas foram revisadas em modo somente leitura pela Sentinela; correções recentes com teste de mutação.
- Navegador (Chrome headless e Maestri Portal, origem isolada, dados fictícios): backup/importação/Desfazer recorte, seletor de recorrência e roundtrip, ações declaradas, comparação de emissões, painel e paginação em 390×844, duas abas reais (bloqueio e versionchange), axe-core 4.10.2 com 0 violações em 14 telas e modais.
- Emulador Android 17 (Prisma): instalação do PWA e uso offline, câmera e GPS (permitir imediato, ~10 s e ~25 s após o pedido, negar), retrato, persistência, checklist no celular; registrado na seção Android de `docs/VALIDACAO-CANDIDATA.md`.
- Registro detalhado em `docs/VALIDACAO-CANDIDATA.md`.

## Decisões do usuário registradas

App instalado só em retrato; GPS da foto com resposta até 30 s e leitura até 15 s após a resposta; risco da foto em memória durante essa espera aceito e documentado; o critério de recuperação de sync foi fechado pela persistência local, porque esta versão não tem servidor; local-28 marcado por decisão, sem ensaio com leitor de tela.

## Limites e pendências antes de produção

- Ensaio em aparelho físico e com leitor de tela (TalkBack) não executado.
- A coordenada da foto é lida depois do disparo (até ~45 s no pior caso) e o carimbo usa o horário do arquivo; os dois instantes podem diferir.
- Numeração local sem unicidade entre aparelhos; integridade é consistência local, não assinatura nem autoria.
- Backup JSON sem cifra; PIN é barreira de interface, não autenticação.
- Retenção/descarte de snapshots e arquivos emitidos órfãos sem política (decisão do dono).
- Capturas do manual ainda de versões anteriores.
- Gates institucionais (S0–S4): contrato de dados, rubrica de risco, privacidade de agregados, metas, servidor com RBAC/IdP e hospedagem aprovada. Repositório privado não implica Pages privado (`docs/HOSPEDAGEM-E-PRIVACIDADE.md`).

## Para lançar (quando aprovado)

1. Revisar este documento e o CHANGELOG com o responsável.
2. Integrar a branch em `main` por PR revisado, sem force-push.
3. Rodar `npm test` e `npm run check` na `main`, publicar conforme a hospedagem aprovada e criar a tag `v1.10.4`.
4. Comunicar que o backup deve ser feito antes de atualizar (esquema IndexedDB v3).
