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
