# Guia da spec YAML

A spec descreve o diagrama em texto estruturado; o renderer cuida de layout, ícones e estilo. Formato: YAML (ou JSON equivalente).

## Estrutura geral

```yaml
version: '1'                 # obrigatório, sempre a string '1'
title: Título do diagrama    # opcional
theme: clean-light           # opcional: clean-light (padrão) | midnight-dark
direction: right             # opcional: right (padrão, fluxo esquerda→direita) | down (topo→base)
nodes: [ ... ]                # obrigatório, pelo menos 1
groups: [ ... ]                # opcional
edges: [ ... ]                # opcional
```

## `nodes`

Cada node é uma caixa/card no diagrama.

```yaml
nodes:
  - id: web                  # obrigatório, único (letras/números/-/_), namespace compartilhado com groups
    label: Web Server        # obrigatório, texto principal do card
    sublabel: Node.js         # opcional, texto secundário menor abaixo do label
    icon: aws:lambda          # opcional, chave do catálogo (ver icon-catalog.md). Omitir = card sem ícone.
    category: compute         # opcional, padrão "generic". Ver valores abaixo — define a cor do ícone/badge quando não há ícone de marca.
    shape: card                # opcional, padrão "card" (única opção suportada por enquanto)
    group: vpc                  # opcional, id de um group definido em `groups` — aninha o node visualmente dentro dele
```

`category` (afeta a cor do badge de ícones genéricos e do fallback quando o ícone não é encontrado):
`compute` `storage` `database` `network` `security` `messaging` `external` `generic`

## `groups`

Caixas delimitadoras (boundaries) que agrupam nodes visualmente — VPCs, subnets, zonas de disponibilidade, camadas lógicas, etc. Podem ser aninhados via `parent`.

```yaml
groups:
  - id: vpc
    label: VPC
    style: vpc          # vpc | subnet | az | boundary | generic (padrão) — cada um tem uma paleta própria
  - id: private
    label: Private Subnet
    style: subnet
    parent: vpc          # aninha "private" dentro de "vpc"
```

Um node entra em um group referenciando `group: <id>` no node (não o contrário — groups não listam seus nodes).

## `edges`

Conexões entre nodes.

```yaml
edges:
  - from: web            # obrigatório, id de um node existente
    to: db                # obrigatório, id de um node existente
    label: SQL              # opcional
    style: solid            # opcional: solid (padrão) | dashed
    direction: forward       # opcional: forward (padrão, seta em "to") | bidirectional | none
```

## Dicas de layout (evita ter que renderizar várias vezes)

- **Escolha `direction` pelo formato do grafo, não por padrão.** `right` funciona bem para fluxos lineares/estreitos (poucos nodes por "camada"). Quando um group tem 3+ nodes lado a lado recebendo várias edges de fora (ex: um API Gateway se conectando a vários serviços dentro de uma VPC), `direction: down` costuma dar um resultado mais limpo, porque empilha as camadas verticalmente em vez de forçar tudo numa faixa horizontal estreita.
- **Nunca modele duas edges separadas para o mesmo par de nodes** (ex: uma para "publish" e outra para "consome" entre o mesmo serviço e a mesma fila). Isso gera duas linhas quase sobrepostas com labels colidindo. Use uma única edge com `direction: bidirectional` e um label combinado (ex: `label: publish / consome`).
- Depois de renderizar, sempre olhe o PNG antes de entregar — se algum label de edge estiver cortado ou muito perto de um card, normalmente é sinal de excesso de edges cruzando o mesmo group; simplifique a spec (menos edges redundantes, ou troque a direção) em vez de tentar corrigir no SVG manualmente.

## Erros comuns e como o renderer reage

- **ids duplicados, edge apontando para node inexistente, group com parent inexistente ou ciclo de parents**: a validação falha (exit code 1) e imprime uma lista de erros específicos com o caminho exato do campo problemático (ex: `[edges.2.to] edge referencia node "db2", que não existe`). Corrija a spec e rode de novo.
- **`icon` com chave que não existe no catálogo**: NÃO falha. O renderer gera um badge genérico com a inicial do `label` e imprime um aviso no stderr sugerindo chaves parecidas, se houver. Sempre confira o aviso — se aparecer, prefira trocar para uma chave real do catálogo (`icon-catalog.md`) numa próxima geração.

## Exemplo completo

Ver `reference/patterns.md` para exemplos prontos (web 3 camadas, microsserviços com fila, VPC multi-AZ, pipeline de dados) que também servem de ponto de partida.
