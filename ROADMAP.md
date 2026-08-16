# Roadmap

Prioridades definidas para levar o projeto além do v0.1.0 atual. A ordem segue dependência técnica (testes antes de mexer em layout/render, já que sem eles cada ajuste visual vira validação manual de novo) e impacto visível, não só "o que é mais fácil".

Sem datas fixas — cada fase vira uma tag (`v0.2.0`, `v0.3.0`, ...) quando os itens dela estiverem prontos, publicada automaticamente pela [pipeline de release](.github/workflows/release.yml).

## v0.2 — Robustez

Base para poder mexer no resto com segurança.

- [x] **Teste de integridade do catálogo de ícones** — `npm run validate:icons` (`scripts/validate-icon-catalog.mts`), rodando em CI e na pipeline de release. Verifica que todo slug em `src/icons/catalog.ts` ainda resolve de verdade contra `thesvg`/`@iconify-json/mdi`. Também corrigiu um bug real descoberto no processo: `resolveIcon` deixava o `import()` do thesvg lançar exceção não tratada quando um slug não existia, derrubando o render inteiro em vez de cair no fallback gracioso — agora está sob `try/catch` como os outros casos de ícone ausente.
- [x] **Suite de testes automatizados** — `npm test` (`node:test` via `tsx`, sem dependência nova). 23 testes cobrindo `src/spec` (validação e mensagens de erro), `src/layout` (contenção geométrica de groups aninhados, orientação por `direction`), `src/icons` (resolução thesvg/mdi/fallback) e `src/render/compose` (SVG final, escaping de texto, degradação com ícone ausente). `npm run typecheck` agora também checa `tests/` via `tsconfig.tests.json`.
- [x] **Reduzir colisão de labels de edge em grafos densos** — causa raiz: o ELK nunca recebia largura/altura do label, então não reservava espaço pra ele no roteamento (por isso os pills que desenhamos depois, com tamanho calculado à parte, colidiam). Agora `build-graph.ts` informa o tamanho real de cada label ao ELK (`estimateEdgeLabelSize`, compartilhado com o renderer) e `elk.spacing.edgeLabel` dá uma folga extra; `render/edges.ts` desenha o pill exatamente no box que o ELK reservou (canto superior-esquerdo + tamanho), em vez de recalcular e centralizar por conta própria. Teste de regressão geométrica em `tests/layout.test.ts` (verificado falhando sem a correção antes de commitar).
- [x] **Auto-detectar `direction`** — `direction` agora aceita `auto` (novo padrão) além de `right`/`down`. Heurística em `src/layout/direction.ts`: olha o maior fan-out/fan-in isolado do grafo (out-degree e in-degree contados separadamente, não somados) — se algum node tem 3+ conexões de saída ou de entrada, escolhe `down`; senão `right`. Direction explícita na spec sempre prevalece. Validado contra os 4 exemplos já existentes (todos permanecem `right`, sem regressão) e contra o caso real do fan-out do e-commerce (agora `examples/ecommerce-backend.yaml`), que passa a escolher `down` sozinho sem a IA precisar saber da heurística.

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
