# Example variable values for the SBOS HealthOS GCP deployment.
# Copy to a gitignored file (e.g. prod.tfvars) and fill in real values:
#   terraform plan  -var-file=prod.tfvars
#   terraform apply -var-file=prod.tfvars
#
# Do NOT put the real db_password here — this file is committed. Supply it via
# TF_VAR_db_password in the environment, or a gitignored *.tfvars file.

gcp_project_id = "sbos-healthos-prod"
gcp_region     = "us-central1"

# db_password: set via `export TF_VAR_db_password=...` or an untracked tfvars.
# db_password = "REPLACE_ME_VIA_ENV_OR_UNTRACKED_TFVARS"
