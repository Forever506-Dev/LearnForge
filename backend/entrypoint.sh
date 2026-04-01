#!/bin/bash
set -e

# Run Alembic migrations only if migration files exist
if [ -d "alembic/versions" ] && [ "$(ls -A alembic/versions/*.py 2>/dev/null)" ]; then
  echo "🔄 Running Alembic migrations..."
  alembic upgrade head
else
  echo "⚠️  No Alembic migrations found — tables will be created by app lifespan."
fi

echo "🌱 Seeding content..."
python -m scripts.seed_content

echo "🧪 Seeding lab templates..."
python -m scripts.seed_labs

echo "🚀 Starting API server..."
exec "$@"
