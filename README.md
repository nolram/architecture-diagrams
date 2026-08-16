# architecture-diagrams

[![Release](https://img.shields.io/github/v/release/nolram/architecture-diagrams?label=release)](https://github.com/nolram/architecture-diagrams/releases/latest) [![CI](https://github.com/nolram/architecture-diagrams/actions/workflows/ci.yml/badge.svg)](https://github.com/nolram/architecture-diagrams/actions/workflows/ci.yml)

Gera diagramas de arquitetura de software/infraestrutura **visualmente ricos e profissionais** a partir de uma spec YAML estruturada — pensado para ser usado por uma IA (ex: como uma Claude Skill), não desenhado à mão.

A motivação: diagramas gerados por IA hoje em dia costumam sair em Mermaid — funcionais, mas visualmente pobres (caixas simples, sem ícones, sem hierarquia visual). Este projeto troca a sintaxe do Mermaid por uma spec estruturada e um motor de renderização próprio, com ícones reais de marca (AWS/Azure/GCP/Kubernetes/tecnologias), cards com sombra e cantos arredondados, e boundaries aninhados (VPC/subnet/AZ), mantendo o layout 100% automático.

## Exemplos

| Web 3 camadas | VPC multi-AZ |
|---|---|
| ![Web 3 camadas](examples/web-3tier.png) | ![VPC multi-AZ](examples/vpc-multi-az.png) |

| Microsserviços com fila | Pipeline de dados (tema escuro) |
|---|---|
| ![Microsserviços](examples/microservices-queue.png) | ![Pipeline de dados](examples/data-pipeline.png) |

| Backend com fan-out (`direction: auto` escolhendo `down` sozinho) | Os 4 shapes de node (actor, cloud, card, database) |
|---|---|
| ![Backend e-commerce](examples/ecommerce-backend.png) | ![Shapes de node](examples/node-shapes.png) |

Specs completas desses exemplos em [`examples/`](examples/) e [`architecture-diagrams/reference/patterns.md`](architecture-diagrams/reference/patterns.md).

## Como funciona

```
spec YAML/JSON
  → validação (zod, erros acionáveis com o caminho exato do campo)
  → layout automático hierárquico (ELK.js — groups viram containers aninhados,
    edges roteadas por AABB do ancestral comum entre origem e destino)
  → composição SVG (cards com sombra/gradiente/cantos arredondados,
    ícones resolvidos via `thesvg` + `@iconify-json/mdi`, groups como boundaries com label)
  → export SVG (padrão) + PNG (via @resvg/resvg-js)
```

Stack: Node.js + TypeScript. Sem dependência de Mermaid, D2 ou Graphviz — o motor de layout (ELK.js) e a composição SVG são feitos diretamente, o que dá controle total sobre o resultado visual.

## Instalação

```bash
npm install
npm run build
```

## Testes

```bash
npm test           # suite de testes (node:test, via tsx — cobre spec/layout/icons/render)
npm run typecheck  # checa src/ e tests/
npm run validate:icons  # confere se todo ícone do catálogo ainda resolve nos pacotes instalados
```

Roda tudo isso (mais um smoke test renderizando `examples/`) em CI a cada push.

## Uso

```bash
node dist/cli.js diagrama.yaml --png -o diagrama.svg
# gera diagrama.svg e diagrama.png
```

Ou em modo dev (sem precisar buildar antes):

```bash
npx tsx src/cli.ts diagrama.yaml --png -o diagrama.svg
```

### Exemplo de spec

```yaml
version: '1'
title: Arquitetura Web 3 Camadas
theme: clean-light
nodes:
  - id: user
    label: Usuário
    icon: generic:user
    category: external
  - id: web
    label: Web Server
    sublabel: Node.js / Express
    icon: aws:lambda
    category: compute
    group: vpc
  - id: db
    label: PostgreSQL
    icon: aws:rds
    category: database
    group: vpc
groups:
  - id: vpc
    label: VPC
    style: vpc
edges:
  - from: user
    to: web
    label: HTTPS
  - from: web
    to: db
    label: SQL
```

Guia completo da spec, catálogo de ícones disponíveis e mais padrões prontos em [`architecture-diagrams/reference/`](architecture-diagrams/reference/).

## Uso como Claude Skill

O diretório [`architecture-diagrams/`](architecture-diagrams/) é uma [Claude Skill](https://www.anthropic.com/news/skills) autocontida: `SKILL.md` + guias de referência + um script de renderização, para que uma IA leia a documentação, escreva a spec e gere o diagrama sozinha.

Baixe o `.skill` já empacotado na [página de releases](https://github.com/nolram/architecture-diagrams/releases/latest) — cada release é gerado automaticamente pela pipeline (`.github/workflows/release.yml`) a partir do código-fonte, então o artefato nunca fica dessincronizado do conteúdo da skill. Para empacotar uma versão local manualmente:

```bash
npm run package:skill
```

## Estrutura do projeto

```
src/
  spec/     schema (zod) + parser YAML/JSON da spec
  icons/    catálogo curado de ícones + resolver (thesvg / mdi) com fallback
  layout/   integração com ELK.js (grafo hierárquico → posições absolutas)
  render/   design tokens (temas) + composição SVG (cards, groups, edges)
  export/   rasterização PNG
  cli.ts    CLI (`arch-diagram`)
examples/                    specs de exemplo já renderizadas
architecture-diagrams/       a Claude Skill (SKILL.md + reference/ + scripts/)
```
