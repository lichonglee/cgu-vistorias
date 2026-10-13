# Validação da versão 1.0.0

Executada em 12/10/2026, com Edge/Chromium, servidor local HTTP e dados fictícios.

## Resultados

- Cadastro de obra e vistoria pela interface; campos editados e persistidos.
- Foto de galeria, legenda, marcação numerada e descrição do ponto salvas.
- Constatação associada à foto, gravidade e recomendação persistidas.
- Conclusão e recomendações salvas; avisos de emissão revisados.
- Emissão registrada de relatório consolidado em PDF e DOCX pela interface.
- Geração final dos seis formatos: VT, MF e RC em PDF e DOCX. PDFs reabertos e renderizados; estrutura ZIP dos três DOCX íntegra.
- Exportação de CSV e JSON. Backup contém identificação CGU, foto e duas emissões; reimportação sem erro.
- Interface verificada em larguras de 360, 430 e 1440 pixels; sem transbordamento horizontal a 360 pixels.
- Manual HTML com 12 telas e versão correta; PDF com 15 páginas, renderizado e revisado visualmente.
- Service worker instalado com 30 arquivos em cache. Navegador colocado offline: aplicativo, obra importada, Painel, manual HTML, PDF e tela de backup acessíveis.
- Cache de outra aplicação preservado.
- Nenhum erro JavaScript de página nos fluxos exercitados.
- Sintaxe JavaScript e `git diff --check` verificados.

## Limites da verificação

A câmera física, permissões de GPS no celular, menu nativo de instalação, compartilhamento com aplicativos externos e abertura dos DOCX no Microsoft Word não foram exercitados. A verificação do navegador confirma os fluxos locais e a estrutura dos documentos, sem representar homologação institucional. Os registros demonstrativos aparecem apenas nas telas do manual, não são carregados como dados iniciais no aplicativo.
