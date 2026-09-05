# Enable required APIs
# Firestore-first architecture: this Terraform provisions ONLY the approved
# boundaries (Spanner global catalog, Cloud Run tool server, Agent Engine staging).
# Cloud SQL, Redis/Memorystore and Data Connect are legacy experiments and MUST NOT
# be provisioned without a documented requirement and migration plan.
resource "google_project_service" "services" {
  for_each = toset([
    "run.googleapis.com",
    "vpcaccess.googleapis.com",
    "secretmanager.googleapis.com",
    "artifactregistry.googleapis.com",
    "compute.googleapis.com",
    "servicenetworking.googleapis.com",
    "spanner.googleapis.com",
    "aiplatform.googleapis.com" # Vertex AI for Genkit and Agent Engine
  ])
  project            = var.project_id
  service            = each.key
  disable_on_destroy = false
}

# Network setup for approved private-access boundaries
resource "google_compute_network" "main" {
  name                    = "spresso-network"
  auto_create_subnetworks = true
  depends_on              = [google_project_service.services]
}

resource "google_compute_global_address" "private_ip_address" {
  name          = "spresso-private-ip"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.main.id
}

resource "google_service_networking_connection" "private_vpc_connection" {
  network                 = google_compute_network.main.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip_address.name]
}

# VPC Serverless Connector for Cloud Functions/Agent Engine
resource "google_vpc_access_connector" "connector" {
  name          = "spresso-vpc-con"
  region        = var.region
  network       = google_compute_network.main.name
  ip_cidr_range = "10.8.0.0/28"
  depends_on    = [google_project_service.services]
}

# Secret Manager Secrets
resource "google_secret_manager_secret" "secrets" {
  for_each = toset([
    "GEMINI_API_KEY",
    "PARALLEL_API_KEY",
    "SERPAPI_API_KEY",
    "APIFY_API_TOKEN",
    "STRIPE_SECRET_KEY",
    "STRIPE_PUBLISHABLE_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "META_APP_ID",
    "META_CLIENT_TOKEN",
    "CLOUDFLARE_ACCOUNT_ID",
    "CLOUDFLARE_API_TOKEN",
    "CDP_API_KEY_ID",
    "CDP_API_KEY_SECRET",
    "CDP_WALLET_SECRET",
    "SPRESSO_TOKEN_CONTRACT_ADDRESS",
    "SPRESSO_TOKEN_SYMBOL",
    "SPRESSO_TOKEN_DECIMALS"
  ])
  secret_id = each.key
  replication {
    auto {}
  }
  depends_on = [google_project_service.services]

  lifecycle {
    prevent_destroy = true
  }
}

# Cloud Spanner
resource "google_spanner_instance" "global_catalog" {
  config       = "regional-${var.region}"
  display_name = "Spresso Global Catalog"
  name         = "spresso-catalog"
  num_nodes    = 1
  depends_on   = [google_project_service.services]
}

resource "google_spanner_database" "catalog_db" {
  instance   = google_spanner_instance.global_catalog.name
  name       = "catalog_db"
  depends_on = [google_spanner_instance.global_catalog]
}

# ----------------------------------------------------------------------
# VERTEX AI AGENT ENGINE RESOURCES
# ----------------------------------------------------------------------

# Cloud Storage Bucket for Agent Engine Staging
resource "google_storage_bucket" "agent_engine_staging" {
  name                        = "${var.project_id}-agent-engine-staging"
  location                    = var.region
  uniform_bucket_level_access = true
  force_destroy               = false
}

# Service Account for Agent Engine
resource "google_service_account" "agent_engine_sa" {
  account_id   = "spresso-agent-engine-sa"
  display_name = "Spresso Agent Engine Service Account"
}

resource "google_project_iam_member" "sa_secret_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.agent_engine_sa.email}"
}

resource "google_project_iam_member" "sa_spanner_user" {
  project = var.project_id
  role    = "roles/spanner.databaseUser"
  member  = "serviceAccount:${google_service_account.agent_engine_sa.email}"
}

# ----------------------------------------------------------------------
# TOOL SERVER (CLOUD RUN)
# ----------------------------------------------------------------------

resource "google_service_account" "tool_server_sa" {
  account_id   = "spresso-tool-server-sa"
  display_name = "Spresso Tool Server Service Account"
}

resource "google_project_iam_member" "tool_server_secret_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.tool_server_sa.email}"
}

resource "google_cloud_run_v2_service" "tool_server" {
  name     = "spresso-tool-server"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = google_service_account.tool_server_sa.email
    containers {
      image = var.tool_server_image
      env {
        name  = "GOOGLE_CLOUD_PROJECT"
        value = var.project_id
      }
      dynamic "env" {
        for_each = toset([
          "GEMINI_API_KEY",
          "APIFY_API_TOKEN",
          "STRIPE_SECRET_KEY",
          "STRIPE_WEBHOOK_SECRET",
          "CLOUDFLARE_ACCOUNT_ID",
          "CLOUDFLARE_API_TOKEN",
        ])
        content {
          name = env.value
          value_source {
            secret_key_ref {
              secret  = google_secret_manager_secret.secrets[env.value].secret_id
              version = "latest"
            }
          }
        }
      }
    }

    scaling {
      min_instance_count = 1
      max_instance_count = 20
    }
  }
  depends_on = [google_project_service.services]
}
