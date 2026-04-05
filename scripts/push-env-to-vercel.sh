#!/bin/bash
# ============================================================
# Push .env.local values to Vercel production
# ============================================================

set -e
cd /Users/lifeonmotus

if [ ! -f .env.local ]; then
  echo "❌ .env.local not found"
  exit 1
fi

source .env.local

VARS=(
  "NEXT_PUBLIC_SUPABASE_URL"
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  "SUPABASE_SERVICE_ROLE_KEY"
  "ANTHROPIC_API_KEY"
  "OPENAI_API_KEY"
  "NEXTAUTH_SECRET"
  "NEXTAUTH_URL"
)

echo "→ Pushing env vars to Vercel production..."
for v in "${VARS[@]}"; do
  if [ -n "${!v}" ]; then
    echo "  - $v"
    echo "${!v}" | vercel env add "$v" production --force 2>&1 | tail -2
  fi
done

echo ""
echo "→ Triggering production redeploy..."
vercel --prod --yes 2>&1 | tail -5

echo ""
echo "✅ Deploy triggered. Verify at: https://drkernai.com/api/integrations-health"
