variable "gcp_project_id" {
  type        = string
  description = "GCP Project ID for SBOS HealthOS deployment"
  default     = "sbos-healthos-prod"
}

variable "gcp_region" {
  type        = string
  description = "GCP Cloud Region"
  default     = "us-central1"
}

variable "db_password" {
  type        = string
  description = "Cloud SQL PostgreSQL root password"
  sensitive   = true
  default     = "SBOS_SuperSecure_Postgres_2026!"
}
