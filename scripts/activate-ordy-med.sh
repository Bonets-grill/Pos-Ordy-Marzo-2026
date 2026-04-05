#!/bin/bash
# ============================================================
# ORDY MED — Activation Script
# Run after creating Supabase + Anthropic + OpenAI accounts
# ============================================================

set -e

cd /Users/lifeonmotus

echo "==========================================="
echo "ORDY MED — Live Integrations Activation"
echo "==========================================="
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
  echo "Creating .env.local from template..."
  cp .env.live-integrations.example .env.local
  echo ""
  echo "⚠️  .env.local created. Fill in the values and re-run this script."
  echo ""
  echo "Required values:"
  echo "  - NEXT_PUBLIC_SUPABASE_URL"
  echo "  - NEXT_PUBLIC_SUPABASE_ANON_KEY"
  echo "  - SUPABASE_SERVICE_ROLE_KEY"
  echo "  - ANTHROPIC_API_KEY"
  echo "  - OPENAI_API_KEY"
  echo "  - NEXTAUTH_SECRET (generate with: openssl rand -base64 32)"
  echo ""
  exit 0
fi

# Validate env vars
echo "→ Validating .env.local..."
source .env.local

REQUIRED_VARS=("NEXT_PUBLIC_SUPABASE_URL" "NEXT_PUBLIC_SUPABASE_ANON_KEY" "SUPABASE_SERVICE_ROLE_KEY" "ANTHROPIC_API_KEY" "OPENAI_API_KEY")
MISSING=()
for v in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!v}" ] || [[ "${!v}" == *"YOUR_"* ]]; then
    MISSING+=("$v")
  fi
done

if [ ${#MISSING[@]} -gt 0 ]; then
  echo ""
  echo "❌ Missing or placeholder values in .env.local:"
  for m in "${MISSING[@]}"; do echo "   - $m"; done
  echo ""
  echo "Fill in .env.local and re-run this script."
  exit 1
fi

echo "✅ All env vars present"
echo ""

# Extract Supabase project ref from URL
SUPABASE_REF=$(echo "$NEXT_PUBLIC_SUPABASE_URL" | sed -E 's|https://([^.]+)\..*|\1|')
echo "→ Supabase project ref: $SUPABASE_REF"

# Apply migration
echo ""
echo "→ Applying database migration..."
if [ -f "supabase/migrations/20260405000000_ordy_med_schema.sql" ]; then
  # Use psql via Supabase connection string
  PGPASSWORD="" psql "postgresql://postgres.${SUPABASE_REF}:${SUPABASE_SERVICE_ROLE_KEY}@aws-0-us-east-1.pooler.supabase.com:6543/postgres" \
    -f supabase/migrations/20260405000000_ordy_med_schema.sql 2>&1 || {
      echo "⚠️  Direct psql failed. Try applying manually in Supabase Dashboard → SQL Editor"
      echo "    File: supabase/migrations/20260405000000_ordy_med_schema.sql"
    }
else
  echo "❌ Migration file not found"
  exit 1
fi

echo ""
echo "→ Running local tests to verify config..."
npx vitest run src/modules/live-integrations/ 2>&1 | tail -5

echo ""
echo "==========================================="
echo "✅ Local activation complete"
echo "==========================================="
echo ""
echo "Next steps:"
echo "  1. Test local: npm run dev"
echo "  2. Verify: curl http://localhost:3000/api/integrations-health"
echo "  3. Deploy: npm run push-env-to-vercel"
echo ""
