# Catálogo de ícones

Chaves disponíveis para o campo `icon` dos nodes. Use exatamente a chave da coluna **key** (formato `fonte:identificador`). Se a chave não existir, o render ainda funciona (gera um badge genérico com a inicial do label e imprime um aviso) — mas prefira sempre uma chave real do catálogo abaixo.

## compute

| key | label | tipo |
|---|---|---|
| `aws:ec2` | Amazon EC2 | marca/serviço (cor própria) |
| `aws:ecs` | Amazon ECS Anywhere | marca/serviço (cor própria) |
| `aws:eks` | Amazon EKS Anywhere | marca/serviço (cor própria) |
| `aws:fargate` | AWS Fargate | marca/serviço (cor própria) |
| `aws:lambda` | AWS Lambda | marca/serviço (cor própria) |
| `aws:step-functions` | AWS Step Functions | marca/serviço (cor própria) |
| `azure:aks` | Azure Kubernetes Service | marca/serviço (cor própria) |
| `azure:functions` | Azure Function Apps | marca/serviço (cor própria) |
| `azure:vm` | Azure Virtual Machine | marca/serviço (cor própria) |
| `brand:docker` | Docker | marca/serviço (cor própria) |
| `brand:kubernetes` | Kubernetes | marca/serviço (cor própria) |
| `brand:nodejs` | Node.js | marca/serviço (cor própria) |
| `brand:python` | Python | marca/serviço (cor própria) |
| `gcp:cloud-functions` | Cloud Functions | marca/serviço (cor própria) |
| `gcp:cloud-run` | Cloud Run | marca/serviço (cor própria) |
| `gcp:compute-engine` | Compute Engine | marca/serviço (cor própria) |
| `gcp:gke` | Google Kubernetes Engine | marca/serviço (cor própria) |
| `generic:cron` | Job agendado | forma genérica (herda a cor da categoria) |
| `generic:function` | Função serverless | forma genérica (herda a cor da categoria) |
| `generic:server` | Servidor | forma genérica (herda a cor da categoria) |
| `generic:worker` | Worker / processo em background | forma genérica (herda a cor da categoria) |

## storage

| key | label | tipo |
|---|---|---|
| `aws:s3` | Amazon S3 | marca/serviço (cor própria) |
| `azure:blob` | Azure Blob Storage | marca/serviço (cor própria) |
| `azure:storage` | Azure Storage Accounts | marca/serviço (cor própria) |
| `gcp:cloud-storage` | Cloud Storage | marca/serviço (cor própria) |
| `generic:file` | Documento / arquivo | forma genérica (herda a cor da categoria) |
| `generic:storage` | Armazenamento de arquivos | forma genérica (herda a cor da categoria) |

## database

| key | label | tipo |
|---|---|---|
| `aws:dynamodb` | Amazon DynamoDB | marca/serviço (cor própria) |
| `aws:elasticache` | Amazon ElastiCache | marca/serviço (cor própria) |
| `aws:rds` | Amazon RDS | marca/serviço (cor própria) |
| `azure:cosmos-db` | Azure Cosmos DB | marca/serviço (cor própria) |
| `azure:sql-database` | Azure SQL Database | marca/serviço (cor própria) |
| `brand:elasticsearch` | Elasticsearch | marca/serviço (cor própria) |
| `brand:mongodb` | MongoDB | marca/serviço (cor própria) |
| `brand:mysql` | MySQL | marca/serviço (cor própria) |
| `brand:postgresql` | PostgreSQL | marca/serviço (cor própria) |
| `brand:redis` | Redis | marca/serviço (cor própria) |
| `gcp:bigquery` | BigQuery | marca/serviço (cor própria) |
| `gcp:cloud-sql` | Cloud SQL | marca/serviço (cor própria) |
| `generic:cache` | Cache | forma genérica (herda a cor da categoria) |
| `generic:database` | Banco de dados (genérico) | forma genérica (herda a cor da categoria) |

## messaging

| key | label | tipo |
|---|---|---|
| `aws:kinesis` | Amazon Kinesis | marca/serviço (cor própria) |
| `aws:sns` | Amazon SNS | marca/serviço (cor própria) |
| `aws:sqs` | Amazon SQS | marca/serviço (cor própria) |
| `azure:pubsub` | Azure Web PubSub | marca/serviço (cor própria) |
| `azure:service-bus` | Azure Service Bus | marca/serviço (cor própria) |
| `brand:kafka` | Apache Kafka | marca/serviço (cor própria) |
| `brand:rabbitmq` | RabbitMQ | marca/serviço (cor própria) |
| `gcp:pubsub` | Pub/Sub | marca/serviço (cor própria) |
| `generic:queue` | Fila de mensagens | forma genérica (herda a cor da categoria) |

## network

| key | label | tipo |
|---|---|---|
| `aws:api-gateway` | Amazon API Gateway | marca/serviço (cor própria) |
| `aws:cloudfront` | Amazon CloudFront | marca/serviço (cor própria) |
| `aws:elb` | Elastic Load Balancing | marca/serviço (cor própria) |
| `aws:route53` | Amazon Route 53 | marca/serviço (cor própria) |
| `aws:vpc` | Amazon VPC Lattice | marca/serviço (cor própria) |
| `azure:api-management` | Azure API Management | marca/serviço (cor própria) |
| `azure:load-balancer` | Azure Load Balancer | marca/serviço (cor própria) |
| `azure:virtual-network` | Azure Virtual Network | marca/serviço (cor própria) |
| `brand:cloudflare` | Cloudflare | marca/serviço (cor própria) |
| `brand:graphql` | GraphQL | marca/serviço (cor própria) |
| `brand:nginx` | NGINX | marca/serviço (cor própria) |
| `gcp:load-balancing` | Cloud Load Balancing | marca/serviço (cor própria) |
| `generic:api` | API | forma genérica (herda a cor da categoria) |
| `generic:dns` | DNS | forma genérica (herda a cor da categoria) |
| `generic:load-balancer` | Load balancer | forma genérica (herda a cor da categoria) |
| `generic:router` | Rede / roteador | forma genérica (herda a cor da categoria) |

## security

| key | label | tipo |
|---|---|---|
| `aws:cognito` | Amazon Cognito | marca/serviço (cor própria) |
| `aws:iam` | AWS IAM Identity Center | marca/serviço (cor própria) |
| `aws:secrets-manager` | AWS Secrets Manager | marca/serviço (cor própria) |
| `azure:key-vault` | Azure Key Vault | marca/serviço (cor própria) |
| `generic:firewall` | Firewall / segurança | forma genérica (herda a cor da categoria) |
| `generic:lock` | Autenticação / segredo | forma genérica (herda a cor da categoria) |

## generic

| key | label | tipo |
|---|---|---|
| `aws:cloudwatch` | Amazon CloudWatch | marca/serviço (cor própria) |
| `brand:aws` | AWS (genérico) | marca/serviço (cor própria) |
| `brand:gcp` | Google Cloud (genérico) | marca/serviço (cor própria) |
| `brand:grafana` | Grafana | marca/serviço (cor própria) |
| `brand:prometheus` | Prometheus | marca/serviço (cor própria) |
| `brand:terraform` | Terraform | marca/serviço (cor própria) |
| `generic:cloud` | Cloud | forma genérica (herda a cor da categoria) |
| `generic:layer` | Camada / módulo | forma genérica (herda a cor da categoria) |
| `generic:logs` | Logs | forma genérica (herda a cor da categoria) |
| `generic:monitoring` | Observabilidade / monitor | forma genérica (herda a cor da categoria) |
| `generic:service` | Serviço genérico | forma genérica (herda a cor da categoria) |

## external

| key | label | tipo |
|---|---|---|
| `brand:github` | GitHub | marca/serviço (cor própria) |
| `brand:gitlab` | GitLab | marca/serviço (cor própria) |
| `brand:nextjs` | Next.js | marca/serviço (cor própria) |
| `brand:react` | React | marca/serviço (cor própria) |
| `brand:stripe` | Stripe | marca/serviço (cor própria) |
| `brand:vercel` | Vercel | marca/serviço (cor própria) |
| `generic:browser` | Navegador / cliente web | forma genérica (herda a cor da categoria) |
| `generic:desktop` | App desktop | forma genérica (herda a cor da categoria) |
| `generic:mobile` | App mobile | forma genérica (herda a cor da categoria) |
| `generic:user` | Usuário / ator | forma genérica (herda a cor da categoria) |
| `generic:users` | Usuários | forma genérica (herda a cor da categoria) |

## Ícones de marca fora deste catálogo

O catálogo acima é curado (subconjunto relevante para arquitetura de software). O pacote `thesvg` embutido no projeto cobre mais de 6.500 marcas/serviços (AWS, Azure, GCP, linguagens, frameworks, bancos de dados, SaaS). Se precisar de uma marca que não está na tabela acima, é possível estender `src/icons/catalog.ts` adicionando uma entrada com `source: "thesvg"` e o slug correto (verificável em `node_modules/@thesvg/icons/dist/`) — não adivinhe o slug sem checar que o arquivo existe.
