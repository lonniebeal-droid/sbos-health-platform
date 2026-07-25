terraform {
  required_version = ">= 1.5.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.gcp_project_id
  region  = var.gcp_region
}

# 1. Cloud SQL PostgreSQL Database Instance
resource "google_sql_database_instance" "sbos_postgres" {
  name             = "sbos-healthos-db"
  database_version = "POSTGRES_15"
  region           = var.gcp_region

  settings {
    tier = "db-f1-micro"
    backup_configuration {
      enabled    = true
      start_time = "03:00"
    }
    ip_configuration {
      ipv4_enabled    = true
      require_ssl     = true
    }
  }
}

resource "google_sql_database" "sbos_database" {
  name     = "sbos_healthos"
  instance = google_sql_database_instance.sbos_postgres.name
}

# 2. Cloud Run Multi-Tenant Application Container Service
resource "google_cloud_run_v2_service" "sbos_app" {
  name     = "sbos-healthos-app"
  location = var.gcp_region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    containers {
      image = "gcr.io/${var.gcp_project_id}/sbos-healthos:v3.4.0"
      
      resources {
        limits = {
          cpu    = "2000m"
          memory = "2Gi"
        }
      }

      env {
        name  = "NODE_ENV"
        value = "production"
      }
      env {
        name  = "DATABASE_URL"
        value = "postgresql://${google_sql_database_instance.sbos_postgres.name}:${var.db_password}@${google_sql_database_instance.sbos_postgres.public_ip_address}:5432/sbos_healthos"
      }
    }
  }
}

# Allow Unauthenticated Public Ingress to Port 3000
resource "google_cloud_run_v2_service_iam_member" "public_access" {
  location = google_cloud_run_v2_service.sbos_app.location
  name     = google_cloud_run_v2_service.sbos_app.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
