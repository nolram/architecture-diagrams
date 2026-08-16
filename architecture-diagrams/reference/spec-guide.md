# Guia da spec YAML

A spec descreve o diagrama em texto estruturado; o renderer cuida de layout, ícones e estilo. Formato: YAML (ou JSON equivalente).

## Estrutura geral

```yaml
version: '1'                 # obrigatório, sempre a string '1'
title: Título do diagrama    # opcional
theme: clean-light           # opcional: clean-light (padrão) | midnight-dark
direction: auto               # opcional: auto (padrão) | right (esquerda→direita) | down (topo→base)
nodes: [ ... ]                # obrigatório, pelo menos 1
groups: [ ... ]                # opcional
edges: [ ... ]                # opcional
```

Uma legenda explicando as cores de `category` e de `style` de group aparece automaticamente embaixo do diagrama quando há variedade suficiente pra valer a pena (2+ styles de group distintos ou 3+ categories distintas). Não precisa configurar nada — e não desenhe sua própria legenda manualmente como um node, o renderer já cuida disso.

## `nodes`

Cada node é uma caixa/card no diagrama.

```yaml
nodes:
  - id: web                  # obrigatório, único (letras/números/-/_), namespace compartilhado com groups
    label: Web Server        # obrigatório, texto principal do card
    sublabel: Node.js         # opcional, texto secundário menor abaixo do label
    icon: aws:lambda          # opcional, chave do catálogo (ver icon-catalog.md). Omitir = card sem ícone.
    category: compute         # opcional, padrão "generic". Ver valores abaixo — define a cor do ícone/badge quando não há ícone de marca.
    shape: card                # opcional, padrão "card". Ver valores abaixo.
    group: vpc                  # opcional, id de um group definido em `groups` — aninha o node visualmente dentro dele
```

`category` (afeta a cor do badge de ícones genéricos e do fallback quando o ícone não é encontrado):
`compute` `storage` `database` `network` `security` `messaging` `external` `generic`

`shape`:
- `card` (padrão) — retângulo arredondado com ícone à esquerda, label/sublabel à direita. Serve pra praticamente qualquer serviço/componente.
- `database` — cilindro (tampas elípticas no topo e na base). Use para bancos de dados, data warehouses, qualquer coisa que semanticamente seja "um banco".
- `actor` — sem card/retângulo: só o ícone num badge circular com o label centralizado embaixo. Use para pessoas, usuários, ou sistemas externos que só aparecem como ponto de entrada/saída do diagrama (não como um serviço "encaixotado").
- `cloud` — silhueta de nuvem. Use para representar "a internet"/rede pública, ou um serviço externo de terceiros fora do seu controle.

### Ícone customizado (`file:`)

Se o serviço não estiver no catálogo (verifique com `arch-diagram icons <termo>` antes de desistir), a spec pode apontar pra um arquivo `.svg` local em vez de uma chave do catálogo:

```yaml
icon: file:./assets/logo.svg   # caminho relativo ao diretório do arquivo de spec, não ao cwd
```

Regras:
- Só `.svg`, resolvido relativo ao diretório onde a spec `.yaml` está salva (não ao diretório de onde o comando é rodado).
- O arquivo é validado antes de embutir: precisa ter menos de 200KB, conter uma tag `<svg>...</svg>` válida, e **não pode** conter `<script>`, handlers de evento (`on*=`), `javascript:`, `<foreignObject>`, `<iframe>`/`<embed>`/`<object>`. Se qualquer um desses aparecer, o arquivo inteiro é recusado (sem tentativa de sanitização parcial) e o node cai no badge de fallback — igual a uma chave de catálogo não encontrada, com o motivo específico no aviso.
- O `viewBox` original do arquivo é preservado; a cor não é alterada (diferente dos ícones `generic:*`, que herdam a cor da categoria).

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

- **Deixe `direction` em `auto` (padrão) na maioria dos casos.** O renderer escolhe `right` ou `down` sozinho olhando o maior fan-out/fan-in do grafo (ex: um node que se conecta a 3+ outros nodes) — é exatamente o tipo de decisão que antes exigia tentativa e erro. Só defina `direction` explicitamente se quiser forçar uma orientação específica por preferência visual; nesse caso o valor explícito sempre prevalece sobre a heurística.
- **Nunca modele duas edges separadas para o mesmo par de nodes** (ex: uma para "publish" e outra para "consome" entre o mesmo serviço e a mesma fila). Isso gera duas linhas quase sobrepostas com labels colidindo. Use uma única edge com `direction: bidirectional` e um label combinado (ex: `label: publish / consome`).
- Depois de renderizar, sempre olhe o PNG antes de entregar — se algum label de edge estiver cortado ou muito perto de um card, normalmente é sinal de excesso de edges redundantes cruzando o mesmo group; simplifique a spec em vez de tentar corrigir no SVG manualmente.

## Erros comuns e como o renderer reage

- **ids duplicados, edge apontando para node inexistente, group com parent inexistente ou ciclo de parents**: a validação falha (exit code 1) e imprime uma lista de erros específicos com o caminho exato do campo problemático (ex: `[edges.2.to] edge referencia node "db2", que não existe`). Corrija a spec e rode de novo.
- **`icon` com chave que não existe no catálogo, ou `file:...` apontando pra um SVG ausente/inseguro/inválido**: NÃO falha. O renderer gera um badge genérico com a inicial do `label` e imprime um aviso no stderr com o motivo específico. Sempre confira o aviso — se aparecer, corrija a chave/caminho numa próxima geração.

## Exemplo completo

Ver `reference/patterns.md` para exemplos prontos (os 4 shapes de node juntos, web 3 camadas, microsserviços com fila, VPC multi-AZ, pipeline de dados, backend com fan-out) que também servem de ponto de partida.
