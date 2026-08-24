#!/bin/bash
set -e

echo "Deploying production..."

COMPOSE_FILE=${COMPOSE_FILE:-docker-compose.prod.yml}
ENV_FILE=${ENV_FILE:-.env.prod}

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing $ENV_FILE. Create it on the VPS before deploying."
  exit 1
fi

echo "Pulling prebuilt images..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" pull api client ocr translate libretranslate nginx postgres

echo "Starting database..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --wait postgres

echo "Running database migrations..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" run --rm --no-deps api npm run db:migrate

echo "Restarting application services..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --remove-orphans

echo "Cleaning dangling images..."
docker image prune -f

echo "Production deployed - $(date)"
