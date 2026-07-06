# Migration runner
# Usage: bash scripts/migrate.sh (from phases/p0/)

set -euo pipefail

echo "==> Applying database migrations..."
for migration in packages/shared/db/migrations/*.sql; do
  echo "==> Applying ${migration}"
  psql "$DATABASE_URL" -f "$migration"
done
echo "==> Migrations applied successfully."

if [ "${SEED:-false}" = "true" ]; then
  echo "==> Seeding database..."
  npx tsx packages/shared/db/seed.ts
  echo "==> Seed complete."
fi
