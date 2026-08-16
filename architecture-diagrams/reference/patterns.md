# Padrões prontos

Specs completas e testadas — use como ponto de partida e adapte nomes/serviços/edges para o caso real. Todas foram renderizadas e conferidas visualmente antes de entrar aqui.

## Web 3 camadas (browser → CDN → app → cache/db numa VPC)

Bom padrão default para "aplicação web típica". Mostra: node fora de qualquer group, group aninhado (VPC > Private Subnet), múltiplos edges com label.

```yaml
version: '1'
title: Arquitetura Web 3 Camadas
theme: clean-light
nodes:
  - id: user
    label: Usuário
    icon: generic:user
    category: external
  - id: cdn
    label: CloudFront
    sublabel: CDN
    icon: aws:cloudfront
    category: network
  - id: web
    label: Web Server
    sublabel: Node.js / Express
    icon: aws:lambda
    category: compute
    group: vpc
  - id: cache
    label: Redis
    sublabel: Cache de sessão
    icon: brand:redis
    category: database
    group: private
  - id: db
    label: PostgreSQL
    sublabel: Banco principal
    icon: aws:rds
    category: database
    group: private
groups:
  - id: vpc
    label: VPC
    style: vpc
  - id: private
    label: Private Subnet
    style: subnet
    parent: vpc
edges:
  - from: user
    to: cdn
    label: HTTPS
  - from: cdn
    to: web
    label: HTTPS
  - from: web
    to: cache
    label: TCP
  - from: web
    to: db
    label: SQL
```

## Microsserviços com fila de eventos

Bom para: múltiplos serviços independentes publicando/consumindo de um event bus. Mostra: group `style: boundary` (sem semântica de cloud, só agrupamento lógico), edges convergindo/divergindo, back-edge de consumo.

```yaml
version: '1'
title: Microsserviços com Fila de Eventos
theme: clean-light
nodes:
  - id: client
    label: Cliente
    icon: generic:browser
    category: external
  - id: gateway
    label: API Gateway
    icon: aws:api-gateway
    category: network
  - id: orders
    label: Orders Service
    sublabel: Node.js
    icon: brand:nodejs
    category: compute
    group: services
  - id: payments
    label: Payments Service
    sublabel: Python
    icon: brand:python
    category: compute
    group: services
  - id: kafka
    label: Kafka
    sublabel: Event bus
    icon: brand:kafka
    category: messaging
  - id: notifier
    label: Notification Worker
    icon: generic:worker
    category: compute
    group: services
  - id: ordersdb
    label: Orders DB
    icon: brand:postgresql
    category: database
  - id: paymentsdb
    label: Payments DB
    icon: brand:postgresql
    category: database
groups:
  - id: services
    label: Services
    style: boundary
edges:
  - from: client
    to: gateway
    label: HTTPS
  - from: gateway
    to: orders
  - from: gateway
    to: payments
  - from: orders
    to: ordersdb
  - from: payments
    to: paymentsdb
  - from: orders
    to: kafka
    label: order.created
  - from: payments
    to: kafka
    label: payment.completed
  - from: kafka
    to: notifier
    label: consume
```

## VPC multi-AZ com load balancer

Bom para: alta disponibilidade / redundância entre zonas de disponibilidade. Mostra: groups aninhados de dois níveis (VPC > AZ-A / AZ-B), edge `direction: none` + `style: dashed` para replicação (sem seta, sem direção implícita).

```yaml
version: '1'
title: VPC Multi-AZ com Load Balancer
theme: clean-light
nodes:
  - id: user
    label: Usuário
    icon: generic:user
    category: external
  - id: alb
    label: Application Load Balancer
    icon: aws:elb
    category: network
  - id: web1
    label: Web Server
    icon: aws:ec2
    category: compute
    group: az1
  - id: web2
    label: Web Server
    icon: aws:ec2
    category: compute
    group: az2
  - id: dbprimary
    label: RDS Primary
    icon: aws:rds
    category: database
    group: az1
  - id: dbstandby
    label: RDS Standby
    icon: aws:rds
    category: database
    group: az2
groups:
  - id: vpc
    label: VPC
    style: vpc
  - id: az1
    label: AZ-A
    style: az
    parent: vpc
  - id: az2
    label: AZ-B
    style: az
    parent: vpc
edges:
  - from: user
    to: alb
    label: HTTPS
  - from: alb
    to: web1
  - from: alb
    to: web2
  - from: web1
    to: dbprimary
  - from: web2
    to: dbprimary
  - from: dbprimary
    to: dbstandby
    label: replicação
    style: dashed
    direction: none
```

Nota: com duas caixas de AZ lado a lado de tamanhos diferentes, o roteador ortogonal do ELK às vezes passa uma linha rente ao chip de label de um group. Se isso acontecer no seu diagrama, uma forma simples de mitigar é dar labels mais curtos aos groups ou reduzir o número de edges cruzando a fronteira.

## Pipeline de dados (ingestão → storage → transformação → warehouse → dashboard)

Bom para: fluxos lineares de dados. Mostra: `theme: midnight-dark`, ícone de job agendado (`generic:cron`), mistura AWS (S3) + GCP (BigQuery) no mesmo diagrama — perfeitamente normal quando a arquitetura real é multi-cloud.

```yaml
version: '1'
title: Pipeline de Dados
theme: midnight-dark
nodes:
  - id: source
    label: App Events
    icon: generic:service
    category: external
  - id: raw
    label: S3 Raw
    icon: aws:s3
    category: storage
  - id: etl
    label: ETL Job
    sublabel: Scheduled
    icon: generic:cron
    category: compute
  - id: warehouse
    label: BigQuery
    icon: gcp:bigquery
    category: database
  - id: dashboard
    label: Grafana
    icon: brand:grafana
    category: generic
edges:
  - from: source
    to: raw
    label: eventos
  - from: raw
    to: etl
  - from: etl
    to: warehouse
    label: load
  - from: warehouse
    to: dashboard
    label: query
```
