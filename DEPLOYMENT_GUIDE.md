# SBOS HealthOS Production Deployment Guide
**Version:** 3.4.0-enterprise  

---

## 1. Prerequisites & Environment Setup

Ensure the following tools and environment variables are configured in your deployment target:

- **Node.js:** v20.x LTS or higher
- **PostgreSQL Database:** v15.x with `uuid-ossp` and `pgcrypto` extensions enabled
- **Container Engine:** Docker or Google Cloud Run
- **Terraform:** v1.5.0+ (if provisioning GCP infrastructure)

### Required Environment Variables (`.env`)
```env
PORT=3000
NODE_ENV=production
DATABASE_URL=postgresql://sbos_user:password@localhost:5432/sbos_healthos
GEMINI_API_KEY=your_google_gemini_api_key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
STRIPE_SECRET_KEY=sk_live_...
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
```

---

## 2. Quick Automated Deployment Execution

Execute the production deployment script to run type checks, bundle production assets, and initialize database migrations:

```bash
# 1. Install Production Dependencies
npm ci

# 2. Run Deployment Script
bash ./scripts/deploy.sh
```

---

## 3. Terraform Infrastructure Provisioning

To provision Google Cloud SQL PostgreSQL and Cloud Run container services automatically:

```bash
cd terraform
terraform init
terraform plan -var="gcp_project_id=sbos-healthos-prod"
terraform apply -auto-approve
```

---

## 4. Docker Container Build & Run

To containerize and launch SBOS HealthOS:

```bash
# Build Docker Image
docker build -t sbos-healthos:v3.4.0 .

# Launch Container Binding to Port 3000
docker run -d -p 3000:3000 --env-file .env sbos-healthos:v3.4.0
```

---

## 5. Verification & Health Monitoring

Verify successful deployment by pinging the automated health check and documentation endpoints:

- **Health Check:** `http://0.0.0.0:3000/api/health`
- **OpenAPI v3 Docs:** `http://0.0.0.0:3000/api/docs/openapi.json`
- **GraphQL Endpoint:** `http://0.0.0.0:3000/api/graphql`
