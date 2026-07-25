#!/usr/bin/env bash
#
# SBOS HealthOS — release preflight.
#
# This script VERIFIES a release candidate locally; it does not deploy to any
# cloud (that needs GCP/Supabase credentials — see "Next steps" at the end).
# It runs the same checks CI runs, plus a real container smoke test, so a green
# run here means the image that would ship actually boots and serves.
set -euo pipefail

cd "$(dirname "$0")/.."

echo "===================================================="
echo "SBOS HealthOS — Release Preflight (verify only)"
echo "===================================================="

# Step 1 — typecheck.
echo "[1/5] Typechecking (tsc --noEmit)..."
npm run lint

# Step 2 — production build (vite frontend + esbuild server bundle).
echo "[2/5] Building production assets (dist/)..."
npm run build

# Step 3 — database migrations: reported honestly, NOT applied here.
echo "[3/5] Database migrations (informational — not applied)..."
if ls supabase/migrations/*.sql >/dev/null 2>&1; then
  echo "      Migrations present:"
  ls -1 supabase/migrations/*.sql | sed 's/^/        - /'
  echo "      Apply against a target DB with:  supabase db push"
else
  echo "      No supabase/migrations/*.sql found."
fi

# Step 4 — build the production image and smoke-test the running container.
echo "[4/5] Container build + smoke test..."
if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  IMAGE="sbos-health:preflight"
  NAME="sbos-preflight-$$"

  # Pick a free host port so we never accidentally probe an unrelated server
  # already bound to a common port (the container always listens on 3000).
  port_free() { ! lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1; }
  HOST_PORT=""
  for p in ${PREFLIGHT_PORT:-} 3010 3021 3032 3043 3999; do
    [ -n "$p" ] || continue
    if port_free "$p"; then HOST_PORT="$p"; break; fi
  done
  if [ -z "$HOST_PORT" ]; then
    echo "      No free host port found — set PREFLIGHT_PORT to an open port." >&2
    exit 1
  fi
  echo "      Using host port $HOST_PORT -> container 3000."

  docker build -t "$IMAGE" .
  docker run -d --name "$NAME" -p "$HOST_PORT:3000" "$IMAGE" >/dev/null
  cleanup() { docker rm -f "$NAME" >/dev/null 2>&1 || true; }
  trap cleanup EXIT

  base="http://localhost:$HOST_PORT"
  for _ in $(seq 1 40); do
    curl -sf "$base/api/health" >/dev/null 2>&1 && break
    sleep 1
  done

  check() { # url expected
    code=$(curl -s -o /dev/null -w '%{http_code}' "$1")
    echo "        GET $1 -> $code (expected $2)"
    test "$code" = "$2"
  }
  check "$base/api/health" 200
  check "$base/api/docs/openapi.json" 200
  check "$base/" 200
  check "$base/api/appointments" 404
  echo "      Container runtime contract OK."
else
  echo "      Docker not available — skipping container smoke test."
  echo "      (Verified in CI on every push; see .github/workflows/ci.yml.)"
fi

# Step 5 — honest next steps (require credentials / human decisions).
echo "[5/5] Preflight complete. Deploy is a separate, credentialed step:"
echo "      - Provision infra:  cd terraform && terraform apply -var-file=prod.tfvars"
echo "      - Push image + deploy to your target (e.g. Cloud Run)."
echo "      - Set runtime secrets: GEMINI_API_KEY, DATABASE_URL / Supabase keys."
echo "      Local endpoints when running the image:"
echo "        Health : http://localhost:3000/api/health"
echo "        OpenAPI: http://localhost:3000/api/docs/openapi.json"
