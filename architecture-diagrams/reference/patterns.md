# Ready-made patterns

Complete, tested specs -- use as a starting point and adapt names/services/edges to the real use case. All of them were rendered and visually checked before being added here.

## The 4 node shapes together

Quick reference for when to use each `shape`: `actor` for the user (no card, icon + label underneath), `cloud` for the internet/public network, `card` (default) for any generic service, `database` (cylinder) for the database.

```yaml
version: '1'
title: Node Shapes
theme: clean-light
nodes:
  - id: user
    label: User
    shape: actor
    icon: generic:user
    category: external
  - id: internet
    label: Internet
    sublabel: Public DNS
    shape: cloud
    icon: generic:cloud
    category: external
  - id: api
    label: API Service
    sublabel: Node.js
    shape: card
    icon: brand:nodejs
    category: compute
  - id: db
    label: PostgreSQL
    sublabel: Main database
    shape: database
    icon: brand:postgresql
    category: database
edges:
  - from: user
    to: internet
    label: HTTPS
  - from: internet
    to: api
    label: HTTPS
  - from: api
    to: db
    label: SQL
```

## 3-tier web (browser → CDN → app → cache/db inside a VPC)

Good default pattern for a "typical web application". Shows: a node outside any group, a nested group (VPC > Private Subnet), multiple labeled edges.

```yaml
version: '1'
title: 3-Tier Web Architecture
theme: clean-light
nodes:
  - id: user
    label: User
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
    sublabel: Session cache
    icon: brand:redis
    category: database
    group: private
  - id: db
    label: PostgreSQL
    sublabel: Main database
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

## Microservices with an event queue

Good for: multiple independent services publishing/consuming from an event bus. Shows: a `style: boundary` group (no cloud semantics, just logical grouping), converging/diverging edges, a back-edge for consumption.

```yaml
version: '1'
title: Microservices with Event Queue
theme: clean-light
nodes:
  - id: client
    label: Client
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

## Multi-AZ VPC with load balancer

Good for: high availability / redundancy across availability zones. Shows: two-level nested groups (VPC > AZ-A / AZ-B), a `direction: none` + `style: dashed` edge for replication (no arrowhead, no implied direction).

```yaml
version: '1'
title: Multi-AZ VPC with Load Balancer
theme: clean-light
nodes:
  - id: user
    label: User
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
    label: replication
    style: dashed
    direction: none
```

## Data pipeline (ingestion → storage → transformation → warehouse → dashboard)

Good for: linear data flows. Shows: `theme: midnight-dark`, a scheduled-job icon (`generic:cron`), mixing AWS (S3) + GCP (BigQuery) in the same diagram -- perfectly normal when the real architecture is multi-cloud.

```yaml
version: '1'
title: Data Pipeline
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
    label: events
  - from: raw
    to: etl
  - from: etl
    to: warehouse
    label: load
  - from: warehouse
    to: dashboard
    label: query
```

## Backend with API Gateway fan-out (e-commerce)

Good for: a central node connecting to several services (here, an API Gateway talking to 3 services inside a VPC). Shows `direction: auto` picking `down` on its own because of the gateway's fan-out (3 outgoing connections), and a `bidirectional` + `dashed` edge to represent async publish/consume as a single stroke instead of two overlapping edges.

```yaml
version: '1'
title: E-commerce Backend Architecture
theme: clean-light
nodes:
  - id: client
    label: Web Client
    sublabel: Browser / SPA
    icon: generic:browser
    category: external
  - id: gateway
    label: API Gateway
    sublabel: Routing, authN, rate limiting
    icon: aws:api-gateway
    category: network
  - id: orders
    label: Orders Service
    sublabel: Order management
    icon: generic:service
    category: compute
    group: vpc
  - id: payments
    label: Payments Service
    sublabel: Payment processing
    icon: generic:service
    category: compute
    group: vpc
  - id: redis
    label: Redis
    sublabel: Session cache
    icon: brand:redis
    category: database
    group: vpc
  - id: queue
    label: Message Queue
    sublabel: Async payments
    icon: generic:queue
    category: messaging
    group: vpc
  - id: postgres
    label: PostgreSQL
    sublabel: Main database
    icon: brand:postgresql
    category: database
    group: vpc
groups:
  - id: vpc
    label: VPC — Private Network
    style: vpc
edges:
  - from: client
    to: gateway
    label: HTTPS / REST
  - from: gateway
    to: orders
    label: REST
  - from: gateway
    to: payments
    label: REST
  - from: gateway
    to: redis
    label: session R/W
  - from: orders
    to: postgres
    label: order data
  - from: payments
    to: postgres
    label: payment data
  - from: payments
    to: queue
    label: publish / consume (async)
    style: dashed
    direction: bidirectional
```
