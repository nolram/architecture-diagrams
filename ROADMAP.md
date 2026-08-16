# Roadmap

Prioridades definidas para levar o projeto além do v0.1.0 atual. A ordem segue dependência técnica (testes antes de mexer em layout/render, já que sem eles cada ajuste visual vira validação manual de novo) e impacto visível, não só "o que é mais fácil".

Sem datas fixas — cada fase vira uma tag (`v0.2.0`, `v0.3.0`, ...) quando os itens dela estiverem prontos, publicada automaticamente pela [pipeline de release](.github/workflows/release.yml).

## v0.2 — Robustez

Base para poder mexer no resto com segurança.

- [ ] **Teste de integridade do catálogo de ícones** — verificar em CI que todo slug em `src/icons/catalog.ts` ainda existe no pacote `thesvg` instalado. Protege contra o pacote mudar/remover slugs numa atualização e quebrar ícones silenciosamente (hoje isso só seria percebido visualmente).
- [ ] **Suite de testes automatizados** — cobertura real de `src/spec` (validação, mensagens de erro), `src/layout` (posições absolutas, aninhamento de groups) e `src/icons` (resolução + fallback). Hoje só existe o smoke test da CI (renderiza os exemplos e checa que não quebra) — não garante que o *resultado* está correto.
- [ ] **Reduzir colisão de labels de edge em grafos densos** — problema real observado no teste da skill: com várias edges cruzando o mesmo group, rótulos podem sobrepor cards ou outros rótulos. Investigar opções de espaçamento do ELK (`elk.spacing.edgeLabel`, `elk.spacing.edgeEdgeBetweenLayers`) antes de partir para solução própria.
- [ ] **Auto-detectar `direction`** — hoje a IA precisa escolher `right` vs `down` na spec e acertar de primeira (documentamos a heurística em `spec-guide.md`, mas o ideal é o renderer decidir sozinho a partir da forma do grafo: largura de camada, nº de nodes por group).

## v0.3 — Qualidade visual

- [ ] **Mais shapes de node** — hoje só existe `shape: card` (retangular). Adicionar cilindro (banco de dados), ator (pessoa/sistema externo) e nuvem (serviço externo/internet) — mais próximo do padrão visual AWS/Azure/GCP real.
- [ ] **Legenda automática** — gerar um bloco de legenda explicando as cores por `category` e por `style` de group quando o diagrama tiver muitos elementos distintos.
- [ ] **Expandir o catálogo de ícones** — o catálogo curado tem ~94 entradas hoje; crescer cobertura de serviços AWS/Azure/GCP comuns que ainda faltam.
- [ ] **Comando de busca de ícone no CLI** — `arch-diagram icons <termo>` para a IA (ou humano) encontrar a chave certa no terminal em vez de abrir `icon-catalog.md` inteiro. Fica natural de implementar junto da expansão do catálogo.

## v0.4 — Integração

- [ ] **Export para PDF** — via a mesma rasterização (`@resvg/resvg-js` já suporta o pipeline; avaliar se um passo extra de conversão SVG→PDF resolve ou se precisa de outra lib).
- [ ] **CLI `--watch`** — re-renderiza automaticamente ao salvar a spec, para iterar mais rápido durante o desenvolvimento do diagrama.
- [ ] **Ícone customizado** — permitir que a spec referencie um SVG local (`icon: file:./logo.svg`) para marcas fora do catálogo, com as devidas checagens de sanitização do SVG recebido.

## Backlog (maior escopo — reavaliar depois das fases acima)

- [ ] **MCP server** — camada fina por cima do mesmo motor de renderização, para funcionar em clientes de IA além do Claude Code. Cogitado desde o plano original do projeto; adiado porque é, na prática, um produto novo de distribuição, não um ajuste no que já existe.
- [ ] **Export para draw.io/Excalidraw** — saída editável manualmente (abordagem usada por ferramentas concorrentes como o diagrams.so). Formato de saída totalmente novo, escopo maior que os itens acima.
- [ ] **Acessibilidade do SVG** — `<title>`/`<desc>` para leitor de tela em cada node/edge, e checagem de contraste de cor nos temas.
