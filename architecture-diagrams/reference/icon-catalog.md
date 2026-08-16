# Icon catalog

Keys available for a node's `icon` field. Use exactly the key from the **key** column (format `source:identifier`). If the key doesn't exist, the render still works (it generates a generic badge with the label's initial and prints a warning) -- but always prefer a real key from the catalog below.

Quick terminal search: `node dist/cli.js icons <term>` (see `SKILL.md`).

## compute

| key | label | type |
|---|---|---|
| `aws:batch` | AWS Batch | brand/service (own color) |
| `aws:ec2` | Amazon EC2 | brand/service (own color) |
| `aws:ecs` | Amazon ECS Anywhere | brand/service (own color) |
| `aws:eks` | Amazon EKS Anywhere | brand/service (own color) |
| `aws:elastic-beanstalk` | AWS Elastic Beanstalk | brand/service (own color) |
| `aws:emr` | Amazon EMR | brand/service (own color) |
| `aws:fargate` | AWS Fargate | brand/service (own color) |
| `aws:glue` | AWS Glue | brand/service (own color) |
| `aws:lambda` | AWS Lambda | brand/service (own color) |
| `aws:step-functions` | AWS Step Functions | brand/service (own color) |
| `azure:aks` | Azure Kubernetes Service | brand/service (own color) |
| `azure:data-factory` | Azure Data Factory | brand/service (own color) |
| `azure:functions` | Azure Function Apps | brand/service (own color) |
| `azure:vm` | Azure Virtual Machine | brand/service (own color) |
| `brand:csharp` | C# | brand/service (own color) |
| `brand:django` | Django | brand/service (own color) |
| `brand:docker` | Docker | brand/service (own color) |
| `brand:dotnet` | .NET | brand/service (own color) |
| `brand:fastapi` | FastAPI | brand/service (own color) |
| `brand:flask` | Flask | brand/service (own color) |
| `brand:go` | Go | brand/service (own color) |
| `brand:helm` | Helm | brand/service (own color) |
| `brand:java` | Java | brand/service (own color) |
| `brand:kubernetes` | Kubernetes | brand/service (own color) |
| `brand:linux` | Linux | brand/service (own color) |
| `brand:nodejs` | Node.js | brand/service (own color) |
| `brand:php` | PHP | brand/service (own color) |
| `brand:python` | Python | brand/service (own color) |
| `brand:ruby` | Ruby | brand/service (own color) |
| `brand:rust` | Rust | brand/service (own color) |
| `brand:spring` | Spring | brand/service (own color) |
| `brand:typescript` | TypeScript | brand/service (own color) |
| `brand:ubuntu` | Ubuntu | brand/service (own color) |
| `gcp:cloud-functions` | Cloud Functions | brand/service (own color) |
| `gcp:cloud-run` | Cloud Run | brand/service (own color) |
| `gcp:compute-engine` | Compute Engine | brand/service (own color) |
| `gcp:gke` | Google Kubernetes Engine | brand/service (own color) |
| `generic:automation` | Automation / pipeline | generic shape (inherits the category's color) |
| `generic:cron` | Scheduled job | generic shape (inherits the category's color) |
| `generic:function` | Serverless function | generic shape (inherits the category's color) |
| `generic:server` | Server | generic shape (inherits the category's color) |
| `generic:worker` | Worker / background process | generic shape (inherits the category's color) |

## storage

| key | label | type |
|---|---|---|
| `aws:backup` | AWS Backup | brand/service (own color) |
| `aws:ecr` | Amazon ECR | brand/service (own color) |
| `aws:s3` | Amazon S3 | brand/service (own color) |
| `azure:blob` | Azure Blob Storage | brand/service (own color) |
| `azure:container-registry` | Azure Container Registry | brand/service (own color) |
| `azure:storage` | Azure Storage Accounts | brand/service (own color) |
| `gcp:artifact-registry` | Artifact Registry | brand/service (own color) |
| `gcp:cloud-storage` | Cloud Storage | brand/service (own color) |
| `generic:archive` | Archival | generic shape (inherits the category's color) |
| `generic:backup` | Backup | generic shape (inherits the category's color) |
| `generic:file` | Document / file | generic shape (inherits the category's color) |
| `generic:package` | Artifact / build | generic shape (inherits the category's color) |
| `generic:storage` | File storage | generic shape (inherits the category's color) |

## database

| key | label | type |
|---|---|---|
| `aws:athena` | Amazon Athena | brand/service (own color) |
| `aws:dynamodb` | Amazon DynamoDB | brand/service (own color) |
| `aws:elasticache` | Amazon ElastiCache | brand/service (own color) |
| `aws:neptune` | Amazon Neptune | brand/service (own color) |
| `aws:rds` | Amazon RDS | brand/service (own color) |
| `aws:redshift` | Amazon Redshift | brand/service (own color) |
| `azure:cosmos-db` | Azure Cosmos DB | brand/service (own color) |
| `azure:sql-database` | Azure SQL Database | brand/service (own color) |
| `azure:synapse-analytics` | Azure Synapse Analytics | brand/service (own color) |
| `brand:cassandra` | Cassandra | brand/service (own color) |
| `brand:elasticsearch` | Elasticsearch | brand/service (own color) |
| `brand:mariadb` | MariaDB | brand/service (own color) |
| `brand:mongodb` | MongoDB | brand/service (own color) |
| `brand:mysql` | MySQL | brand/service (own color) |
| `brand:neo4j` | Neo4j | brand/service (own color) |
| `brand:postgresql` | PostgreSQL | brand/service (own color) |
| `brand:redis` | Redis | brand/service (own color) |
| `brand:sqlite` | SQLite | brand/service (own color) |
| `brand:supabase` | Supabase | brand/service (own color) |
| `gcp:bigquery` | BigQuery | brand/service (own color) |
| `gcp:cloud-spanner` | Cloud Spanner | brand/service (own color) |
| `gcp:cloud-sql` | Cloud SQL | brand/service (own color) |
| `gcp:firestore` | Firestore | brand/service (own color) |
| `gcp:memorystore` | Memorystore | brand/service (own color) |
| `generic:cache` | Cache | generic shape (inherits the category's color) |
| `generic:database` | Database (generic) | generic shape (inherits the category's color) |
| `generic:table` | Table / dataset | generic shape (inherits the category's color) |

## messaging

| key | label | type |
|---|---|---|
| `aws:eventbridge` | Amazon EventBridge | brand/service (own color) |
| `aws:kinesis` | Amazon Kinesis | brand/service (own color) |
| `aws:ses` | Amazon SES | brand/service (own color) |
| `aws:sns` | Amazon SNS | brand/service (own color) |
| `aws:sqs` | Amazon SQS | brand/service (own color) |
| `azure:event-hubs` | Azure Event Hubs | brand/service (own color) |
| `azure:pubsub` | Azure Web PubSub | brand/service (own color) |
| `azure:service-bus` | Azure Service Bus | brand/service (own color) |
| `brand:kafka` | Apache Kafka | brand/service (own color) |
| `brand:nats` | NATS | brand/service (own color) |
| `brand:rabbitmq` | RabbitMQ | brand/service (own color) |
| `gcp:cloud-tasks` | Cloud Tasks | brand/service (own color) |
| `gcp:pubsub` | Pub/Sub | brand/service (own color) |
| `generic:notification` | Notification | generic shape (inherits the category's color) |
| `generic:queue` | Message queue | generic shape (inherits the category's color) |

## network

| key | label | type |
|---|---|---|
| `aws:api-gateway` | Amazon API Gateway | brand/service (own color) |
| `aws:appsync` | AWS AppSync | brand/service (own color) |
| `aws:cloudfront` | Amazon CloudFront | brand/service (own color) |
| `aws:elb` | Elastic Load Balancing | brand/service (own color) |
| `aws:route53` | Amazon Route 53 | brand/service (own color) |
| `aws:vpc` | Amazon VPC Lattice | brand/service (own color) |
| `azure:api-management` | Azure API Management | brand/service (own color) |
| `azure:front-door` | Azure Front Door | brand/service (own color) |
| `azure:load-balancer` | Azure Load Balancer | brand/service (own color) |
| `azure:virtual-network` | Azure Virtual Network | brand/service (own color) |
| `brand:apache` | Apache HTTP Server | brand/service (own color) |
| `brand:cloudflare` | Cloudflare | brand/service (own color) |
| `brand:envoy` | Envoy | brand/service (own color) |
| `brand:graphql` | GraphQL | brand/service (own color) |
| `brand:istio` | Istio | brand/service (own color) |
| `brand:nginx` | NGINX | brand/service (own color) |
| `brand:traefik` | Traefik | brand/service (own color) |
| `gcp:cloud-cdn` | Cloud CDN | brand/service (own color) |
| `gcp:cloud-dns` | Cloud DNS | brand/service (own color) |
| `gcp:load-balancing` | Cloud Load Balancing | brand/service (own color) |
| `generic:api` | API | generic shape (inherits the category's color) |
| `generic:dns` | DNS | generic shape (inherits the category's color) |
| `generic:load-balancer` | Load balancer | generic shape (inherits the category's color) |
| `generic:router` | Network / router | generic shape (inherits the category's color) |
| `generic:topology` | Network topology | generic shape (inherits the category's color) |
| `generic:webhook` | Webhook | generic shape (inherits the category's color) |

## security

| key | label | type |
|---|---|---|
| `aws:acm` | AWS Certificate Manager | brand/service (own color) |
| `aws:cognito` | Amazon Cognito | brand/service (own color) |
| `aws:iam` | AWS IAM Identity Center | brand/service (own color) |
| `aws:secrets-manager` | AWS Secrets Manager | brand/service (own color) |
| `aws:shield` | AWS Shield | brand/service (own color) |
| `aws:waf` | AWS WAF | brand/service (own color) |
| `azure:key-vault` | Azure Key Vault | brand/service (own color) |
| `brand:auth0` | Auth0 | brand/service (own color) |
| `brand:okta` | Okta | brand/service (own color) |
| `gcp:iam` | Identity and Access Management | brand/service (own color) |
| `generic:certificate` | TLS certificate | generic shape (inherits the category's color) |
| `generic:firewall` | Firewall / security | generic shape (inherits the category's color) |
| `generic:key` | Access key | generic shape (inherits the category's color) |
| `generic:lock` | Authentication / secret | generic shape (inherits the category's color) |

## generic

| key | label | type |
|---|---|---|
| `aws:cloudformation` | AWS CloudFormation | brand/service (own color) |
| `aws:cloudwatch` | Amazon CloudWatch | brand/service (own color) |
| `aws:codebuild` | AWS CodeBuild | brand/service (own color) |
| `aws:codedeploy` | AWS CodeDeploy | brand/service (own color) |
| `aws:codepipeline` | AWS CodePipeline | brand/service (own color) |
| `aws:systems-manager` | AWS Systems Manager | brand/service (own color) |
| `aws:xray` | AWS X-Ray | brand/service (own color) |
| `azure:app-configuration` | Azure App Configuration | brand/service (own color) |
| `azure:devops` | Azure DevOps | brand/service (own color) |
| `azure:monitor` | Azure Monitor | brand/service (own color) |
| `brand:aws` | AWS (generic) | brand/service (own color) |
| `brand:circleci` | CircleCI | brand/service (own color) |
| `brand:datadog` | Datadog | brand/service (own color) |
| `brand:digitalocean` | DigitalOcean | brand/service (own color) |
| `brand:gcp` | Google Cloud (generic) | brand/service (own color) |
| `brand:github-actions` | GitHub Actions | brand/service (own color) |
| `brand:grafana` | Grafana | brand/service (own color) |
| `brand:jenkins` | Jenkins | brand/service (own color) |
| `brand:kibana` | Kibana | brand/service (own color) |
| `brand:logstash` | Logstash | brand/service (own color) |
| `brand:new-relic` | New Relic | brand/service (own color) |
| `brand:pagerduty` | PagerDuty | brand/service (own color) |
| `brand:prometheus` | Prometheus | brand/service (own color) |
| `brand:sentry` | Sentry | brand/service (own color) |
| `brand:splunk` | Splunk | brand/service (own color) |
| `brand:swagger` | Swagger / OpenAPI | brand/service (own color) |
| `brand:terraform` | Terraform | brand/service (own color) |
| `gcp:cloud-build` | Cloud Build | brand/service (own color) |
| `gcp:cloud-logging` | Cloud Logging | brand/service (own color) |
| `generic:analytics` | Analytics / metrics | generic shape (inherits the category's color) |
| `generic:cloud` | Cloud | generic shape (inherits the category's color) |
| `generic:layer` | Layer / module | generic shape (inherits the category's color) |
| `generic:logs` | Logs | generic shape (inherits the category's color) |
| `generic:monitoring` | Observability / monitoring | generic shape (inherits the category's color) |
| `generic:search` | Search / search index | generic shape (inherits the category's color) |
| `generic:service` | Generic service | generic shape (inherits the category's color) |
| `generic:sync` | Sync | generic shape (inherits the category's color) |

## external

| key | label | type |
|---|---|---|
| `brand:angular` | Angular | brand/service (own color) |
| `brand:confluence` | Confluence | brand/service (own color) |
| `brand:figma` | Figma | brand/service (own color) |
| `brand:github` | GitHub | brand/service (own color) |
| `brand:gitlab` | GitLab | brand/service (own color) |
| `brand:heroku` | Heroku | brand/service (own color) |
| `brand:jira` | Jira | brand/service (own color) |
| `brand:netlify` | Netlify | brand/service (own color) |
| `brand:nextjs` | Next.js | brand/service (own color) |
| `brand:react` | React | brand/service (own color) |
| `brand:slack` | Slack | brand/service (own color) |
| `brand:stripe` | Stripe | brand/service (own color) |
| `brand:svelte` | Svelte | brand/service (own color) |
| `brand:twilio` | Twilio | brand/service (own color) |
| `brand:vercel` | Vercel | brand/service (own color) |
| `brand:vue` | Vue.js | brand/service (own color) |
| `generic:browser` | Browser / web client | generic shape (inherits the category's color) |
| `generic:desktop` | Desktop app | generic shape (inherits the category's color) |
| `generic:mobile` | Mobile app | generic shape (inherits the category's color) |
| `generic:user` | User / actor | generic shape (inherits the category's color) |
| `generic:users` | Users | generic shape (inherits the category's color) |

## Brand icons outside this catalog

The catalog above is curated (a relevant subset for software architecture). The `thesvg` package bundled with the project covers over 6,500 brands/services (AWS, Azure, GCP, languages, frameworks, databases, SaaS). If you need a brand that isn't in the table above, you can extend `src/icons/catalog.ts` by adding an entry with `source: "thesvg"` and the correct slug (verifiable in `node_modules/@thesvg/icons/dist/`) -- don't guess the slug without checking that the file exists.
