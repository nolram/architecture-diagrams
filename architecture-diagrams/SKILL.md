---
name: architecture-diagrams
description: Gera diagramas de arquitetura de software/infraestrutura ricos e visualmente profissionais (ícones reais de AWS/Azure/GCP/Kubernetes/marcas, cards com sombra, boundaries como VPC/subnet, layout automático) — muito mais elaborado que um diagrama Mermaid padrão. Use sempre que o usuário pedir um diagrama de arquitetura, diagrama de sistema, diagrama de infraestrutura/cloud, ou explicitamente pedir algo "mais bonito"/"mais profissional" que Mermaid para representar componentes de software e como eles se conectam.
---

# Architecture Diagrams

Renderer próprio (ELK.js para layout + ícones reais via `thesvg`/Iconify + SVG desenhado à mão com sombra/gradiente/cantos arredondados) que transforma uma spec YAML estruturada em um diagrama de arquitetura pronto para apresentação. Você (a IA) escreve a spec; o renderer cuida 100% do design.

## Fluxo de trabalho

1. **Escreva a spec YAML** descrevendo nodes (componentes), groups (boundaries como VPC/subnet/camada lógica) e edges (conexões). Regras completas em `reference/spec-guide.md` — leia antes da primeira vez que usar esta skill na conversa.
2. **Escolha ícones do catálogo** — não invente chaves. Busque rápido no terminal (mais prático que abrir `reference/icon-catalog.md` inteiro):
   ```bash
   bash <caminho-desta-skill>/scripts/render.sh icons postgres
   ```
   Se não achar uma marca específica (o catálogo curado tem ~195 entradas, não é exaustivo), use um ícone `generic:*` (ex: `generic:database`, `generic:server`, `generic:queue`) em vez de adivinhar uma chave.
3. Se o caso de uso for parecido com algo comum (app web, microsserviços com fila, VPC multi-AZ, pipeline de dados), comece a partir de um exemplo pronto em `reference/patterns.md` e adapte.
4. Salve a spec em um arquivo `.yaml` (pode ser em qualquer diretório de trabalho da tarefa atual).
5. Renderize:
   ```bash
   bash <caminho-desta-skill>/scripts/render.sh diagrama.yaml --png -o diagrama.svg
   ```
   Isso gera `diagrama.svg` e `diagrama.png` lado a lado. Use `--png` sempre que for necessário visualizar o resultado (ex: com a ferramenta de leitura de imagem) — SVG puro não é visualizado como imagem por todas as ferramentas. Use `--pdf` em vez de (ou além de) `--png` se o usuário quiser um arquivo pronto pra imprimir/anexar (a página do PDF sai do tamanho exato do diagrama).
6. **Leia a saída do comando antes de considerar a tarefa concluída:**
   - Se a spec for inválida, o comando falha (exit code 1) e imprime os erros exatos (campo + motivo). Corrija a spec e rode de novo — não adivinhe o que está errado, o erro já diz.
   - Avisos de ícone não encontrado aparecem em `Avisos:` no stderr mas **não** fazem o comando falhar (um badge genérico com a inicial do nome é usado no lugar). Se aparecer um aviso, troque a chave do ícone por uma real do catálogo e rode de novo antes de entregar o resultado.
7. Visualize o PNG gerado para conferir o resultado antes de apresentar ao usuário.

## Temas disponíveis

`clean-light` (padrão, fundo claro) e `midnight-dark` (fundo escuro) — escolha via campo `theme` na spec, conforme o contexto (ex: apresentação em slide escuro, ou documentação clara).

## Modo watch (uso humano, não para a IA)

`--watch` re-renderiza sozinho a cada save do arquivo de spec — útil se o usuário estiver editando a spec manualmente ao seu lado e quiser ver o resultado atualizar ao vivo. Não faz sentido usar `--watch` no fluxo normal da IA (que gera a spec de uma vez e roda uma renderização só).

## Primeira execução

Se `scripts/render.sh` falhar por `dist/cli.js` não existir, ele mesmo roda `npm install && npm run build` automaticamente na primeira vez — isso só acontece uma vez por checkout do projeto.
