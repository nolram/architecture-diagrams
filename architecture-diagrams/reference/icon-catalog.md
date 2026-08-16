# Catálogo de ícones

Chaves disponíveis para o campo `icon` dos nodes. Use exatamente a chave da coluna **key** (formato `fonte:identificador`). Se a chave não existir, o render ainda funciona (gera um badge genérico com a inicial do label e imprime um aviso) — mas prefira sempre uma chave real do catálogo abaixo.

Busca rápida no terminal: `node dist/cli.js icons <termo>` (ver `SKILL.md`).

## compute

| key | label | tipo |
|---|---|---|
| `aws:batch` | AWS Batch | marca/serviço (cor própria) |
| `aws:ec2` | Amazon EC2 | marca/serviço (cor própria) |
| `aws:ecs` | Amazon ECS Anywhere | marca/serviço (cor própria) |
| `aws:eks` | Amazon EKS Anywhere | marca/serviço (cor própria) |
| `aws:elastic-beanstalk` | AWS Elastic Beanstalk | marca/serviço (cor própria) |
| `aws:emr` | Amazon EMR | marca/serviço (cor própria) |
| `aws:fargate` | AWS Fargate | marca/serviço (cor própria) |
| `aws:glue` | AWS Glue | marca/serviço (cor própria) |
| `aws:lambda` | AWS Lambda | marca/serviço (cor própria) |
| `aws:step-functions` | AWS Step Functions | marca/serviço (cor própria) |
| `azure:aks` | Azure Kubernetes Service | marca/serviço (cor própria) |
| `azure:data-factory` | Azure Data Factory | marca/serviço (cor própria) |
| `azure:functions` | Azure Function Apps | marca/serviço (cor própria) |
| `azure:vm` | Azure Virtual Machine | marca/serviço (cor própria) |
| `brand:csharp` | C# | marca/serviço (cor própria) |
| `brand:django` | Django | marca/serviço (cor própria) |
| `brand:docker` | Docker | marca/serviço (cor própria) |
| `brand:dotnet` | .NET | marca/serviço (cor própria) |
| `brand:fastapi` | FastAPI | marca/serviço (cor própria) |
| `brand:flask` | Flask | marca/serviço (cor própria) |
| `brand:go` | Go | marca/serviço (cor própria) |
| `brand:helm` | Helm | marca/serviço (cor própria) |
| `brand:java` | Java | marca/serviço (cor própria) |
| `brand:kubernetes` | Kubernetes | marca/serviço (cor própria) |
| `brand:linux` | Linux | marca/serviço (cor própria) |
| `brand:nodejs` | Node.js | marca/serviço (cor própria) |
| `brand:php` | PHP | marca/serviço (cor própria) |
| `brand:python` | Python | marca/serviço (cor própria) |
| `brand:ruby` | Ruby | marca/serviço (cor própria) |
| `brand:rust` | Rust | marca/serviço (cor própria) |
| `brand:spring` | Spring | marca/serviço (cor própria) |
| `brand:typescript` | TypeScript | marca/serviço (cor própria) |
| `brand:ubuntu` | Ubuntu | marca/serviço (cor própria) |
| `gcp:cloud-functions` | Cloud Functions | marca/serviço (cor própria) |
| `gcp:cloud-run` | Cloud Run | marca/serviço (cor própria) |
| `gcp:compute-engine` | Compute Engine | marca/serviço (cor própria) |
| `gcp:gke` | Google Kubernetes Engine | marca/serviço (cor própria) |
| `generic:automation` | Automação / pipeline | forma genérica (herda a cor da categoria) |
| `generic:cron` | Job agendado | forma genérica (herda a cor da categoria) |
| `generic:function` | Função serverless | forma genérica (herda a cor da categoria) |
| `generic:server` | Servidor | forma genérica (herda a cor da categoria) |
| `generic:worker` | Worker / processo em background | forma genérica (herda a cor da categoria) |

## storage

| key | label | tipo |
|---|---|---|
| `aws:backup` | AWS Backup | marca/serviço (cor própria) |
| `aws:ecr` | Amazon ECR | marca/serviço (cor própria) |
| `aws:s3` | Amazon S3 | marca/serviço (cor própria) |
| `azure:blob` | Azure Blob Storage | marca/serviço (cor própria) |
| `azure:container-registry` | Azure Container Registry | marca/serviço (cor própria) |
| `azure:storage` | Azure Storage Accounts | marca/serviço (cor própria) |
| `gcp:artifact-registry` | Artifact Registry | marca/serviço (cor própria) |
| `gcp:cloud-storage` | Cloud Storage | marca/serviço (cor própria) |
| `generic:archive` | Arquivamento | forma genérica (herda a cor da categoria) |
| `generic:backup` | Backup | forma genérica (herda a cor da categoria) |
| `generic:file` | Documento / arquivo | forma genérica (herda a cor da categoria) |
| `generic:package` | Artefato / build | forma genérica (herda a cor da categoria) |
| `generic:storage` | Armazenamento de arquivos | forma genérica (herda a cor da categoria) |

## database

| key | label | tipo |
|---|---|---|
| `aws:athena` | Amazon Athena | marca/serviço (cor própria) |
| `aws:dynamodb` | Amazon DynamoDB | marca/serviço (cor própria) |
| `aws:elasticache` | Amazon ElastiCache | marca/serviço (cor própria) |
| `aws:neptune` | Amazon Neptune | marca/serviço (cor própria) |
| `aws:rds` | Amazon RDS | marca/serviço (cor própria) |
| `aws:redshift` | Amazon Redshift | marca/serviço (cor própria) |
| `azure:cosmos-db` | Azure Cosmos DB | marca/serviço (cor própria) |
| `azure:sql-database` | Azure SQL Database | marca/serviço (cor própria) |
| `azure:synapse-analytics` | Azure Synapse Analytics | marca/serviço (cor própria) |
| `brand:cassandra` | Cassandra | marca/serviço (cor própria) |
| `brand:elasticsearch` | Elasticsearch | marca/serviço (cor própria) |
| `brand:mariadb` | MariaDB | marca/serviço (cor própria) |
| `brand:mongodb` | MongoDB | marca/serviço (cor própria) |
| `brand:mysql` | MySQL | marca/serviço (cor própria) |
| `brand:neo4j` | Neo4j | marca/serviço (cor própria) |
| `brand:postgresql` | PostgreSQL | marca/serviço (cor própria) |
| `brand:redis` | Redis | marca/serviço (cor própria) |
| `brand:sqlite` | SQLite | marca/serviço (cor própria) |
| `brand:supabase` | Supabase | marca/serviço (cor própria) |
| `gcp:bigquery` | BigQuery | marca/serviço (cor própria) |
| `gcp:cloud-spanner` | Cloud Spanner | marca/serviço (cor própria) |
| `gcp:cloud-sql` | Cloud SQL | marca/serviço (cor própria) |
| `gcp:firestore` | Firestore | marca/serviço (cor própria) |
| `gcp:memorystore` | Memorystore | marca/serviço (cor própria) |
| `generic:cache` | Cache | forma genérica (herda a cor da categoria) |
| `generic:database` | Banco de dados (genérico) | forma genérica (herda a cor da categoria) |
| `generic:table` | Tabela / dataset | forma genérica (herda a cor da categoria) |

## messaging

| key | label | tipo |
|---|---|---|
| `aws:eventbridge` | Amazon EventBridge | marca/serviço (cor própria) |
| `aws:kinesis` | Amazon Kinesis | marca/serviço (cor própria) |
| `aws:ses` | Amazon SES | marca/serviço (cor própria) |
| `aws:sns` | Amazon SNS | marca/serviço (cor própria) |
| `aws:sqs` | Amazon SQS | marca/serviço (cor própria) |
| `azure:event-hubs` | Azure Event Hubs | marca/serviço (cor própria) |
| `azure:pubsub` | Azure Web PubSub | marca/serviço (cor própria) |
| `azure:service-bus` | Azure Service Bus | marca/serviço (cor própria) |
| `brand:kafka` | Apache Kafka | marca/serviço (cor própria) |
| `brand:nats` | NATS | marca/serviço (cor própria) |
| `brand:rabbitmq` | RabbitMQ | marca/serviço (cor própria) |
| `gcp:cloud-tasks` | Cloud Tasks | marca/serviço (cor própria) |
| `gcp:pubsub` | Pub/Sub | marca/serviço (cor própria) |
| `generic:notification` | Notificação | forma genérica (herda a cor da categoria) |
| `generic:queue` | Fila de mensagens | forma genérica (herda a cor da categoria) |

## network

| key | label | tipo |
|---|---|---|
| `aws:api-gateway` | Amazon API Gateway | marca/serviço (cor própria) |
| `aws:appsync` | AWS AppSync | marca/serviço (cor própria) |
| `aws:cloudfront` | Amazon CloudFront | marca/serviço (cor própria) |
| `aws:elb` | Elastic Load Balancing | marca/serviço (cor própria) |
| `aws:route53` | Amazon Route 53 | marca/serviço (cor própria) |
| `aws:vpc` | Amazon VPC Lattice | marca/serviço (cor própria) |
| `azure:api-management` | Azure API Management | marca/serviço (cor própria) |
| `azure:front-door` | Azure Front Door | marca/serviço (cor própria) |
| `azure:load-balancer` | Azure Load Balancer | marca/serviço (cor própria) |
| `azure:virtual-network` | Azure Virtual Network | marca/serviço (cor própria) |
| `brand:apache` | Apache HTTP Server | marca/serviço (cor própria) |
| `brand:cloudflare` | Cloudflare | marca/serviço (cor própria) |
| `brand:envoy` | Envoy | marca/serviço (cor própria) |
| `brand:graphql` | GraphQL | marca/serviço (cor própria) |
| `brand:istio` | Istio | marca/serviço (cor própria) |
| `brand:nginx` | NGINX | marca/serviço (cor própria) |
| `brand:traefik` | Traefik | marca/serviço (cor própria) |
| `gcp:cloud-cdn` | Cloud CDN | marca/serviço (cor própria) |
| `gcp:cloud-dns` | Cloud DNS | marca/serviço (cor própria) |
| `gcp:load-balancing` | Cloud Load Balancing | marca/serviço (cor própria) |
| `generic:api` | API | forma genérica (herda a cor da categoria) |
| `generic:dns` | DNS | forma genérica (herda a cor da categoria) |
| `generic:load-balancer` | Load balancer | forma genérica (herda a cor da categoria) |
| `generic:router` | Rede / roteador | forma genérica (herda a cor da categoria) |
| `generic:topology` | Topologia de rede | forma genérica (herda a cor da categoria) |
| `generic:webhook` | Webhook | forma genérica (herda a cor da categoria) |

## security

| key | label | tipo |
|---|---|---|
| `aws:acm` | AWS Certificate Manager | marca/serviço (cor própria) |
| `aws:cognito` | Amazon Cognito | marca/serviço (cor própria) |
| `aws:iam` | AWS IAM Identity Center | marca/serviço (cor própria) |
| `aws:secrets-manager` | AWS Secrets Manager | marca/serviço (cor própria) |
| `aws:shield` | AWS Shield | marca/serviço (cor própria) |
| `aws:waf` | AWS WAF | marca/serviço (cor própria) |
| `azure:key-vault` | Azure Key Vault | marca/serviço (cor própria) |
| `brand:auth0` | Auth0 | marca/serviço (cor própria) |
| `brand:okta` | Okta | marca/serviço (cor própria) |
| `gcp:iam` | Identity and Access Management | marca/serviço (cor própria) |
| `generic:certificate` | Certificado TLS | forma genérica (herda a cor da categoria) |
| `generic:firewall` | Firewall / segurança | forma genérica (herda a cor da categoria) |
| `generic:key` | Chave de acesso | forma genérica (herda a cor da categoria) |
| `generic:lock` | Autenticação / segredo | forma genérica (herda a cor da categoria) |

## generic

| key | label | tipo |
|---|---|---|
| `aws:cloudformation` | AWS CloudFormation | marca/serviço (cor própria) |
| `aws:cloudwatch` | Amazon CloudWatch | marca/serviço (cor própria) |
| `aws:codebuild` | AWS CodeBuild | marca/serviço (cor própria) |
| `aws:codedeploy` | AWS CodeDeploy | marca/serviço (cor própria) |
| `aws:codepipeline` | AWS CodePipeline | marca/serviço (cor própria) |
| `aws:systems-manager` | AWS Systems Manager | marca/serviço (cor própria) |
| `aws:xray` | AWS X-Ray | marca/serviço (cor própria) |
| `azure:app-configuration` | Azure App Configuration | marca/serviço (cor própria) |
| `azure:devops` | Azure DevOps | marca/serviço (cor própria) |
| `azure:monitor` | Azure Monitor | marca/serviço (cor própria) |
| `brand:aws` | AWS (genérico) | marca/serviço (cor própria) |
| `brand:circleci` | CircleCI | marca/serviço (cor própria) |
| `brand:datadog` | Datadog | marca/serviço (cor própria) |
| `brand:digitalocean` | DigitalOcean | marca/serviço (cor própria) |
| `brand:gcp` | Google Cloud (genérico) | marca/serviço (cor própria) |
| `brand:github-actions` | GitHub Actions | marca/serviço (cor própria) |
| `brand:grafana` | Grafana | marca/serviço (cor própria) |
| `brand:jenkins` | Jenkins | marca/serviço (cor própria) |
| `brand:kibana` | Kibana | marca/serviço (cor própria) |
| `brand:logstash` | Logstash | marca/serviço (cor própria) |
| `brand:new-relic` | New Relic | marca/serviço (cor própria) |
| `brand:pagerduty` | PagerDuty | marca/serviço (cor própria) |
| `brand:prometheus` | Prometheus | marca/serviço (cor própria) |
| `brand:sentry` | Sentry | marca/serviço (cor própria) |
| `brand:splunk` | Splunk | marca/serviço (cor própria) |
| `brand:swagger` | Swagger / OpenAPI | marca/serviço (cor própria) |
| `brand:terraform` | Terraform | marca/serviço (cor própria) |
| `gcp:cloud-build` | Cloud Build | marca/serviço (cor própria) |
| `gcp:cloud-logging` | Cloud Logging | marca/serviço (cor própria) |
| `generic:analytics` | Analytics / métricas | forma genérica (herda a cor da categoria) |
| `generic:cloud` | Cloud | forma genérica (herda a cor da categoria) |
| `generic:layer` | Camada / módulo | forma genérica (herda a cor da categoria) |
| `generic:logs` | Logs | forma genérica (herda a cor da categoria) |
| `generic:monitoring` | Observabilidade / monitor | forma genérica (herda a cor da categoria) |
| `generic:search` | Busca / índice de pesquisa | forma genérica (herda a cor da categoria) |
| `generic:service` | Serviço genérico | forma genérica (herda a cor da categoria) |
| `generic:sync` | Sincronização | forma genérica (herda a cor da categoria) |

## external

| key | label | tipo |
|---|---|---|
| `brand:angular` | Angular | marca/serviço (cor própria) |
| `brand:confluence` | Confluence | marca/serviço (cor própria) |
| `brand:figma` | Figma | marca/serviço (cor própria) |
| `brand:github` | GitHub | marca/serviço (cor própria) |
| `brand:gitlab` | GitLab | marca/serviço (cor própria) |
| `brand:heroku` | Heroku | marca/serviço (cor própria) |
| `brand:jira` | Jira | marca/serviço (cor própria) |
| `brand:netlify` | Netlify | marca/serviço (cor própria) |
| `brand:nextjs` | Next.js | marca/serviço (cor própria) |
| `brand:react` | React | marca/serviço (cor própria) |
| `brand:slack` | Slack | marca/serviço (cor própria) |
| `brand:stripe` | Stripe | marca/serviço (cor própria) |
| `brand:svelte` | Svelte | marca/serviço (cor própria) |
| `brand:twilio` | Twilio | marca/serviço (cor própria) |
| `brand:vercel` | Vercel | marca/serviço (cor própria) |
| `brand:vue` | Vue.js | marca/serviço (cor própria) |
| `generic:browser` | Navegador / cliente web | forma genérica (herda a cor da categoria) |
| `generic:desktop` | App desktop | forma genérica (herda a cor da categoria) |
| `generic:mobile` | App mobile | forma genérica (herda a cor da categoria) |
| `generic:user` | Usuário / ator | forma genérica (herda a cor da categoria) |
| `generic:users` | Usuários | forma genérica (herda a cor da categoria) |

## Ícones de marca fora deste catálogo

O catálogo acima é curado (subconjunto relevante para arquitetura de software). O pacote `thesvg` embutido no projeto cobre mais de 6.500 marcas/serviços (AWS, Azure, GCP, linguagens, frameworks, bancos de dados, SaaS). Se precisar de uma marca que não está na tabela acima, é possível estender `src/icons/catalog.ts` adicionando uma entrada com `source: "thesvg"` e o slug correto (verificável em `node_modules/@thesvg/icons/dist/`) — não adivinhe o slug sem checar que o arquivo existe.
