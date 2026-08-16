export type IconCategory =
  | "compute"
  | "storage"
  | "database"
  | "network"
  | "security"
  | "messaging"
  | "external"
  | "generic";

export interface CatalogEntry {
  /** chave amigável usada na spec, ex: "aws:lambda" */
  key: string;
  label: string;
  category: IconCategory;
  /** "thesvg" = ícone de marca/serviço com cor própria; "mdi" = forma genérica, herda a cor do tema */
  source: "thesvg" | "mdi";
  /** slug do thesvg (ex: "aws-aws-lambda") ou nome do ícone mdi (ex: "database") */
  ref: string;
}

// Curado a partir dos pacotes `thesvg` (AWS/Azure/GCP/marcas, offline) e
// `@iconify-json/mdi` (formas genéricas). Todas as refs abaixo foram
// verificadas contra os pacotes instalados antes de entrar no catálogo.
export const ICON_CATALOG: CatalogEntry[] = [
  // ---- AWS ----
  { key: "aws:lambda", label: "AWS Lambda", category: "compute", source: "thesvg", ref: "aws-aws-lambda" },
  { key: "aws:ec2", label: "Amazon EC2", category: "compute", source: "thesvg", ref: "aws-amazon-ec2" },
  { key: "aws:ecs", label: "Amazon ECS Anywhere", category: "compute", source: "thesvg", ref: "aws-amazon-ecs-anywhere" },
  { key: "aws:eks", label: "Amazon EKS Anywhere", category: "compute", source: "thesvg", ref: "aws-amazon-eks-anywhere" },
  { key: "aws:fargate", label: "AWS Fargate", category: "compute", source: "thesvg", ref: "aws-aws-fargate" },
  { key: "aws:s3", label: "Amazon S3", category: "storage", source: "thesvg", ref: "aws-amazon-simple-storage-service" },
  { key: "aws:rds", label: "Amazon RDS", category: "database", source: "thesvg", ref: "aws-amazon-rds" },
  { key: "aws:dynamodb", label: "Amazon DynamoDB", category: "database", source: "thesvg", ref: "aws-amazon-dynamodb" },
  { key: "aws:elasticache", label: "Amazon ElastiCache", category: "database", source: "thesvg", ref: "aws-amazon-elasticache" },
  { key: "aws:sqs", label: "Amazon SQS", category: "messaging", source: "thesvg", ref: "aws-amazon-simple-queue-service" },
  { key: "aws:sns", label: "Amazon SNS", category: "messaging", source: "thesvg", ref: "aws-amazon-simple-notification-service" },
  { key: "aws:kinesis", label: "Amazon Kinesis", category: "messaging", source: "thesvg", ref: "aws-amazon-kinesis" },
  { key: "aws:api-gateway", label: "Amazon API Gateway", category: "network", source: "thesvg", ref: "aws-amazon-api-gateway" },
  { key: "aws:cloudfront", label: "Amazon CloudFront", category: "network", source: "thesvg", ref: "aws-amazon-cloudfront" },
  { key: "aws:route53", label: "Amazon Route 53", category: "network", source: "thesvg", ref: "aws-amazon-route-53" },
  { key: "aws:elb", label: "Elastic Load Balancing", category: "network", source: "thesvg", ref: "aws-elastic-load-balancing" },
  { key: "aws:vpc", label: "Amazon VPC Lattice", category: "network", source: "thesvg", ref: "aws-amazon-vpc-lattice" },
  { key: "aws:iam", label: "AWS IAM Identity Center", category: "security", source: "thesvg", ref: "aws-aws-iam-identity-center" },
  { key: "aws:cognito", label: "Amazon Cognito", category: "security", source: "thesvg", ref: "aws-amazon-cognito" },
  { key: "aws:secrets-manager", label: "AWS Secrets Manager", category: "security", source: "thesvg", ref: "aws-aws-secrets-manager" },
  { key: "aws:step-functions", label: "AWS Step Functions", category: "compute", source: "thesvg", ref: "aws-aws-step-functions" },
  { key: "aws:cloudwatch", label: "Amazon CloudWatch", category: "generic", source: "thesvg", ref: "aws-amazon-cloudwatch" },
  { key: "aws:cloudformation", label: "AWS CloudFormation", category: "generic", source: "thesvg", ref: "aws-aws-cloudformation" },
  { key: "aws:codepipeline", label: "AWS CodePipeline", category: "generic", source: "thesvg", ref: "aws-aws-codepipeline" },
  { key: "aws:codebuild", label: "AWS CodeBuild", category: "generic", source: "thesvg", ref: "aws-aws-codebuild" },
  { key: "aws:codedeploy", label: "AWS CodeDeploy", category: "generic", source: "thesvg", ref: "aws-aws-codedeploy" },
  { key: "aws:redshift", label: "Amazon Redshift", category: "database", source: "thesvg", ref: "aws-amazon-redshift" },
  { key: "aws:athena", label: "Amazon Athena", category: "database", source: "thesvg", ref: "aws-amazon-athena" },
  { key: "aws:glue", label: "AWS Glue", category: "compute", source: "thesvg", ref: "aws-aws-glue" },
  { key: "aws:emr", label: "Amazon EMR", category: "compute", source: "thesvg", ref: "aws-amazon-emr" },
  { key: "aws:batch", label: "AWS Batch", category: "compute", source: "thesvg", ref: "aws-aws-batch" },
  { key: "aws:appsync", label: "AWS AppSync", category: "network", source: "thesvg", ref: "aws-aws-appsync" },
  { key: "aws:eventbridge", label: "Amazon EventBridge", category: "messaging", source: "thesvg", ref: "aws-amazon-eventbridge" },
  { key: "aws:xray", label: "AWS X-Ray", category: "generic", source: "thesvg", ref: "aws-aws-x-ray" },
  { key: "aws:ecr", label: "Amazon ECR", category: "storage", source: "thesvg", ref: "aws-amazon-elastic-container-registry" },
  { key: "aws:systems-manager", label: "AWS Systems Manager", category: "generic", source: "thesvg", ref: "aws-aws-systems-manager" },
  { key: "aws:neptune", label: "Amazon Neptune", category: "database", source: "thesvg", ref: "aws-amazon-neptune" },
  { key: "aws:backup", label: "AWS Backup", category: "storage", source: "thesvg", ref: "aws-aws-backup" },
  { key: "aws:ses", label: "Amazon SES", category: "messaging", source: "thesvg", ref: "aws-amazon-simple-email-service" },
  { key: "aws:elastic-beanstalk", label: "AWS Elastic Beanstalk", category: "compute", source: "thesvg", ref: "aws-aws-elastic-beanstalk" },
  { key: "aws:acm", label: "AWS Certificate Manager", category: "security", source: "thesvg", ref: "aws-aws-certificate-manager" },
  { key: "aws:waf", label: "AWS WAF", category: "security", source: "thesvg", ref: "aws-aws-waf" },
  { key: "aws:shield", label: "AWS Shield", category: "security", source: "thesvg", ref: "aws-aws-shield" },

  // ---- Azure ----
  { key: "azure:functions", label: "Azure Function Apps", category: "compute", source: "thesvg", ref: "azure-function-apps" },
  { key: "azure:vm", label: "Azure Virtual Machine", category: "compute", source: "thesvg", ref: "azure-virtual-machine" },
  { key: "azure:aks", label: "Azure Kubernetes Service", category: "compute", source: "thesvg", ref: "azure-kubernetes-services" },
  { key: "azure:storage", label: "Azure Storage Accounts", category: "storage", source: "thesvg", ref: "azure-storage-accounts" },
  { key: "azure:blob", label: "Azure Blob Storage", category: "storage", source: "thesvg", ref: "azure-blob" },
  { key: "azure:sql-database", label: "Azure SQL Database", category: "database", source: "thesvg", ref: "azure-sql-database" },
  { key: "azure:cosmos-db", label: "Azure Cosmos DB", category: "database", source: "thesvg", ref: "azure-azure-cosmos-db" },
  { key: "azure:service-bus", label: "Azure Service Bus", category: "messaging", source: "thesvg", ref: "azure-azure-service-bus" },
  { key: "azure:pubsub", label: "Azure Web PubSub", category: "messaging", source: "thesvg", ref: "azure-pubsub" },
  { key: "azure:api-management", label: "Azure API Management", category: "network", source: "thesvg", ref: "azure-api-management-services" },
  { key: "azure:load-balancer", label: "Azure Load Balancer", category: "network", source: "thesvg", ref: "azure-load-balancers" },
  { key: "azure:virtual-network", label: "Azure Virtual Network", category: "network", source: "thesvg", ref: "azure-virtual-networks" },
  { key: "azure:key-vault", label: "Azure Key Vault", category: "security", source: "thesvg", ref: "azure-key-vaults" },
  { key: "azure:devops", label: "Azure DevOps", category: "generic", source: "thesvg", ref: "azure-azure-devops" },
  { key: "azure:container-registry", label: "Azure Container Registry", category: "storage", source: "thesvg", ref: "azure-container-registries" },
  { key: "azure:event-hubs", label: "Azure Event Hubs", category: "messaging", source: "thesvg", ref: "azure-event-hubs" },
  { key: "azure:monitor", label: "Azure Monitor", category: "generic", source: "thesvg", ref: "azure-monitor" },
  { key: "azure:synapse-analytics", label: "Azure Synapse Analytics", category: "database", source: "thesvg", ref: "azure-azure-synapse-analytics" },
  { key: "azure:front-door", label: "Azure Front Door", category: "network", source: "thesvg", ref: "azure-front-door-and-cdn-profiles" },
  { key: "azure:app-configuration", label: "Azure App Configuration", category: "generic", source: "thesvg", ref: "azure-app-configuration" },
  { key: "azure:data-factory", label: "Azure Data Factory", category: "compute", source: "thesvg", ref: "azure-data-factories" },

  // ---- GCP ----
  { key: "gcp:compute-engine", label: "Compute Engine", category: "compute", source: "thesvg", ref: "gcp-compute-engine" },
  { key: "gcp:cloud-functions", label: "Cloud Functions", category: "compute", source: "thesvg", ref: "gcp-cloud-functions" },
  { key: "gcp:cloud-run", label: "Cloud Run", category: "compute", source: "thesvg", ref: "gcp-cloud-run" },
  { key: "gcp:gke", label: "Google Kubernetes Engine", category: "compute", source: "thesvg", ref: "gcp-google-kubernetes-engine" },
  { key: "gcp:cloud-storage", label: "Cloud Storage", category: "storage", source: "thesvg", ref: "gcp-cloud-storage" },
  { key: "gcp:cloud-sql", label: "Cloud SQL", category: "database", source: "thesvg", ref: "gcp-cloud-sql" },
  { key: "gcp:bigquery", label: "BigQuery", category: "database", source: "thesvg", ref: "gcp-bigquery" },
  { key: "gcp:pubsub", label: "Pub/Sub", category: "messaging", source: "thesvg", ref: "gcp-pubsub" },
  { key: "gcp:load-balancing", label: "Cloud Load Balancing", category: "network", source: "thesvg", ref: "gcp-cloud-load-balancing" },
  { key: "gcp:cloud-spanner", label: "Cloud Spanner", category: "database", source: "thesvg", ref: "gcp-cloud-spanner" },
  { key: "gcp:firestore", label: "Firestore", category: "database", source: "thesvg", ref: "gcp-firestore" },
  { key: "gcp:memorystore", label: "Memorystore", category: "database", source: "thesvg", ref: "gcp-memorystore" },
  { key: "gcp:cloud-build", label: "Cloud Build", category: "generic", source: "thesvg", ref: "gcp-cloud-build" },
  { key: "gcp:cloud-dns", label: "Cloud DNS", category: "network", source: "thesvg", ref: "gcp-cloud-dns" },
  { key: "gcp:cloud-cdn", label: "Cloud CDN", category: "network", source: "thesvg", ref: "gcp-cloud-cdn" },
  { key: "gcp:iam", label: "Identity and Access Management", category: "security", source: "thesvg", ref: "gcp-identity-and-access-management" },
  { key: "gcp:cloud-logging", label: "Cloud Logging", category: "generic", source: "thesvg", ref: "gcp-cloud-logging" },
  { key: "gcp:artifact-registry", label: "Artifact Registry", category: "storage", source: "thesvg", ref: "gcp-artifact-registry" },
  { key: "gcp:cloud-tasks", label: "Cloud Tasks", category: "messaging", source: "thesvg", ref: "gcp-cloud-tasks" },

  // ---- Marcas / tecnologias genéricas ----
  { key: "brand:kubernetes", label: "Kubernetes", category: "compute", source: "thesvg", ref: "kubernetes" },
  { key: "brand:docker", label: "Docker", category: "compute", source: "thesvg", ref: "docker" },
  { key: "brand:postgresql", label: "PostgreSQL", category: "database", source: "thesvg", ref: "postgresql" },
  { key: "brand:mysql", label: "MySQL", category: "database", source: "thesvg", ref: "mysql" },
  { key: "brand:redis", label: "Redis", category: "database", source: "thesvg", ref: "redis" },
  { key: "brand:mongodb", label: "MongoDB", category: "database", source: "thesvg", ref: "mongodb" },
  { key: "brand:elasticsearch", label: "Elasticsearch", category: "database", source: "thesvg", ref: "elasticsearch" },
  { key: "brand:kafka", label: "Apache Kafka", category: "messaging", source: "thesvg", ref: "kafka" },
  { key: "brand:rabbitmq", label: "RabbitMQ", category: "messaging", source: "thesvg", ref: "rabbitmq" },
  { key: "brand:nginx", label: "NGINX", category: "network", source: "thesvg", ref: "nginx" },
  { key: "brand:graphql", label: "GraphQL", category: "network", source: "thesvg", ref: "graphql" },
  { key: "brand:grafana", label: "Grafana", category: "generic", source: "thesvg", ref: "grafana" },
  { key: "brand:prometheus", label: "Prometheus", category: "generic", source: "thesvg", ref: "prometheus" },
  { key: "brand:github", label: "GitHub", category: "external", source: "thesvg", ref: "github" },
  { key: "brand:gitlab", label: "GitLab", category: "external", source: "thesvg", ref: "gitlab" },
  { key: "brand:terraform", label: "Terraform", category: "generic", source: "thesvg", ref: "terraform" },
  { key: "brand:nodejs", label: "Node.js", category: "compute", source: "thesvg", ref: "nodedotjs" },
  { key: "brand:react", label: "React", category: "external", source: "thesvg", ref: "react" },
  { key: "brand:nextjs", label: "Next.js", category: "external", source: "thesvg", ref: "nextdotjs" },
  { key: "brand:python", label: "Python", category: "compute", source: "thesvg", ref: "python" },
  { key: "brand:stripe", label: "Stripe", category: "external", source: "thesvg", ref: "stripe" },
  { key: "brand:cloudflare", label: "Cloudflare", category: "network", source: "thesvg", ref: "cloudflare" },
  { key: "brand:vercel", label: "Vercel", category: "external", source: "thesvg", ref: "vercel" },
  { key: "brand:aws", label: "AWS (genérico)", category: "generic", source: "thesvg", ref: "amazon-web-services" },
  { key: "brand:gcp", label: "Google Cloud (genérico)", category: "generic", source: "thesvg", ref: "googlecloud" },
  { key: "brand:vue", label: "Vue.js", category: "external", source: "thesvg", ref: "vuedotjs" },
  { key: "brand:angular", label: "Angular", category: "external", source: "thesvg", ref: "angular" },
  { key: "brand:svelte", label: "Svelte", category: "external", source: "thesvg", ref: "svelte" },
  { key: "brand:django", label: "Django", category: "compute", source: "thesvg", ref: "django" },
  { key: "brand:flask", label: "Flask", category: "compute", source: "thesvg", ref: "flask" },
  { key: "brand:fastapi", label: "FastAPI", category: "compute", source: "thesvg", ref: "fastapi" },
  { key: "brand:spring", label: "Spring", category: "compute", source: "thesvg", ref: "spring" },
  { key: "brand:dotnet", label: ".NET", category: "compute", source: "thesvg", ref: "dotnet" },
  { key: "brand:mariadb", label: "MariaDB", category: "database", source: "thesvg", ref: "mariadb" },
  { key: "brand:sqlite", label: "SQLite", category: "database", source: "thesvg", ref: "sqlite" },
  { key: "brand:cassandra", label: "Cassandra", category: "database", source: "thesvg", ref: "cassandra" },
  { key: "brand:neo4j", label: "Neo4j", category: "database", source: "thesvg", ref: "neo4j" },
  { key: "brand:apache", label: "Apache HTTP Server", category: "network", source: "thesvg", ref: "apache" },
  { key: "brand:traefik", label: "Traefik", category: "network", source: "thesvg", ref: "traefik" },
  { key: "brand:envoy", label: "Envoy", category: "network", source: "thesvg", ref: "envoy" },
  { key: "brand:nats", label: "NATS", category: "messaging", source: "thesvg", ref: "nats" },
  { key: "brand:jenkins", label: "Jenkins", category: "generic", source: "thesvg", ref: "jenkins" },
  { key: "brand:circleci", label: "CircleCI", category: "generic", source: "thesvg", ref: "circleci" },
  { key: "brand:github-actions", label: "GitHub Actions", category: "generic", source: "thesvg", ref: "github-actions" },
  { key: "brand:datadog", label: "Datadog", category: "generic", source: "thesvg", ref: "datadog" },
  { key: "brand:new-relic", label: "New Relic", category: "generic", source: "thesvg", ref: "new-relic" },
  { key: "brand:sentry", label: "Sentry", category: "generic", source: "thesvg", ref: "sentry" },
  { key: "brand:pagerduty", label: "PagerDuty", category: "generic", source: "thesvg", ref: "pagerduty" },
  { key: "brand:splunk", label: "Splunk", category: "generic", source: "thesvg", ref: "splunk" },
  { key: "brand:slack", label: "Slack", category: "external", source: "thesvg", ref: "slack" },
  { key: "brand:twilio", label: "Twilio", category: "external", source: "thesvg", ref: "twilio" },
  { key: "brand:auth0", label: "Auth0", category: "security", source: "thesvg", ref: "auth0" },
  { key: "brand:okta", label: "Okta", category: "security", source: "thesvg", ref: "okta" },
  { key: "brand:helm", label: "Helm", category: "compute", source: "thesvg", ref: "helm" },
  { key: "brand:istio", label: "Istio", category: "network", source: "thesvg", ref: "istio" },
  { key: "brand:logstash", label: "Logstash", category: "generic", source: "thesvg", ref: "logstash" },
  { key: "brand:kibana", label: "Kibana", category: "generic", source: "thesvg", ref: "kibana" },
  { key: "brand:jira", label: "Jira", category: "external", source: "thesvg", ref: "jira" },
  { key: "brand:confluence", label: "Confluence", category: "external", source: "thesvg", ref: "confluence" },
  { key: "brand:figma", label: "Figma", category: "external", source: "thesvg", ref: "figma" },
  { key: "brand:linux", label: "Linux", category: "compute", source: "thesvg", ref: "linux" },
  { key: "brand:ubuntu", label: "Ubuntu", category: "compute", source: "thesvg", ref: "ubuntu" },
  { key: "brand:rust", label: "Rust", category: "compute", source: "thesvg", ref: "rust" },
  { key: "brand:java", label: "Java", category: "compute", source: "thesvg", ref: "openjdk" },
  { key: "brand:go", label: "Go", category: "compute", source: "thesvg", ref: "go" },
  { key: "brand:typescript", label: "TypeScript", category: "compute", source: "thesvg", ref: "typescript" },
  { key: "brand:php", label: "PHP", category: "compute", source: "thesvg", ref: "php" },
  { key: "brand:ruby", label: "Ruby", category: "compute", source: "thesvg", ref: "ruby" },
  { key: "brand:csharp", label: "C#", category: "compute", source: "thesvg", ref: "csharp" },
  { key: "brand:supabase", label: "Supabase", category: "database", source: "thesvg", ref: "supabase" },
  { key: "brand:netlify", label: "Netlify", category: "external", source: "thesvg", ref: "netlify" },
  { key: "brand:heroku", label: "Heroku", category: "external", source: "thesvg", ref: "heroku" },
  { key: "brand:digitalocean", label: "DigitalOcean", category: "generic", source: "thesvg", ref: "digitalocean" },
  { key: "brand:swagger", label: "Swagger / OpenAPI", category: "generic", source: "thesvg", ref: "swagger" },

  // ---- Formas genéricas (mdi, herdam a cor da categoria no tema) ----
  { key: "generic:database", label: "Banco de dados (genérico)", category: "database", source: "mdi", ref: "database" },
  { key: "generic:cache", label: "Cache", category: "database", source: "mdi", ref: "cached" },
  { key: "generic:server", label: "Servidor", category: "compute", source: "mdi", ref: "server" },
  { key: "generic:function", label: "Função serverless", category: "compute", source: "mdi", ref: "function-variant" },
  { key: "generic:cron", label: "Job agendado", category: "compute", source: "mdi", ref: "timer-outline" },
  { key: "generic:worker", label: "Worker / processo em background", category: "compute", source: "mdi", ref: "cog-outline" },
  { key: "generic:queue", label: "Fila de mensagens", category: "messaging", source: "mdi", ref: "message-processing-outline" },
  { key: "generic:api", label: "API", category: "network", source: "mdi", ref: "api" },
  { key: "generic:load-balancer", label: "Load balancer", category: "network", source: "mdi", ref: "swap-horizontal" },
  { key: "generic:dns", label: "DNS", category: "network", source: "mdi", ref: "dns-outline" },
  { key: "generic:router", label: "Rede / roteador", category: "network", source: "mdi", ref: "router-wireless" },
  { key: "generic:cloud", label: "Cloud", category: "generic", source: "mdi", ref: "cloud-outline" },
  { key: "generic:firewall", label: "Firewall / segurança", category: "security", source: "mdi", ref: "shield-lock-outline" },
  { key: "generic:lock", label: "Autenticação / segredo", category: "security", source: "mdi", ref: "lock-outline" },
  { key: "generic:user", label: "Usuário / ator", category: "external", source: "mdi", ref: "account" },
  { key: "generic:users", label: "Usuários", category: "external", source: "mdi", ref: "account-group" },
  { key: "generic:browser", label: "Navegador / cliente web", category: "external", source: "mdi", ref: "web" },
  { key: "generic:mobile", label: "App mobile", category: "external", source: "mdi", ref: "cellphone" },
  { key: "generic:desktop", label: "App desktop", category: "external", source: "mdi", ref: "desktop-classic" },
  { key: "generic:storage", label: "Armazenamento de arquivos", category: "storage", source: "mdi", ref: "folder-outline" },
  { key: "generic:file", label: "Documento / arquivo", category: "storage", source: "mdi", ref: "file-document-outline" },
  { key: "generic:monitoring", label: "Observabilidade / monitor", category: "generic", source: "mdi", ref: "monitor" },
  { key: "generic:logs", label: "Logs", category: "generic", source: "mdi", ref: "eye-outline" },
  { key: "generic:service", label: "Serviço genérico", category: "generic", source: "mdi", ref: "cube-outline" },
  { key: "generic:layer", label: "Camada / módulo", category: "generic", source: "mdi", ref: "layers-outline" },
  { key: "generic:webhook", label: "Webhook", category: "network", source: "mdi", ref: "webhook" },
  { key: "generic:notification", label: "Notificação", category: "messaging", source: "mdi", ref: "bell-outline" },
  { key: "generic:search", label: "Busca / índice de pesquisa", category: "generic", source: "mdi", ref: "magnify" },
  { key: "generic:analytics", label: "Analytics / métricas", category: "generic", source: "mdi", ref: "chart-line" },
  { key: "generic:sync", label: "Sincronização", category: "generic", source: "mdi", ref: "cloud-sync-outline" },
  { key: "generic:backup", label: "Backup", category: "storage", source: "mdi", ref: "backup-restore" },
  { key: "generic:package", label: "Artefato / build", category: "storage", source: "mdi", ref: "package-variant-closed" },
  { key: "generic:certificate", label: "Certificado TLS", category: "security", source: "mdi", ref: "certificate-outline" },
  { key: "generic:topology", label: "Topologia de rede", category: "network", source: "mdi", ref: "sitemap-outline" },
  { key: "generic:automation", label: "Automação / pipeline", category: "compute", source: "mdi", ref: "cog-sync-outline" },
  { key: "generic:table", label: "Tabela / dataset", category: "database", source: "mdi", ref: "table-large" },
  { key: "generic:archive", label: "Arquivamento", category: "storage", source: "mdi", ref: "file-cabinet" },
  { key: "generic:key", label: "Chave de acesso", category: "security", source: "mdi", ref: "key-outline" },
];

const catalogByKey = new Map(ICON_CATALOG.map((entry) => [entry.key, entry]));

export function getCatalogEntry(key: string): CatalogEntry | undefined {
  return catalogByKey.get(key);
}

export function findSimilarKeys(key: string, limit = 3): string[] {
  const [, wanted = key] = key.split(":");
  return ICON_CATALOG.filter((e) => e.key.includes(wanted) || e.label.toLowerCase().includes(wanted.toLowerCase()))
    .slice(0, limit)
    .map((e) => e.key);
}

/** busca livre usada pelo `arch-diagram icons <termo>` — bate contra key, label e category */
export function searchCatalog(query: string): CatalogEntry[] {
  const needle = query.toLowerCase();
  return ICON_CATALOG.filter(
    (e) => e.key.toLowerCase().includes(needle) || e.label.toLowerCase().includes(needle) || e.category.toLowerCase().includes(needle),
  );
}
