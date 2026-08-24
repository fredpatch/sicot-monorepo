#!/bin/bash
set -e

COMPOSE_FILE=${COMPOSE_FILE:-docker-compose.staging.yml}
ENV_FILE=${ENV_FILE:-.env.staging}

[ -f "$ENV_FILE" ] || { echo "Missing $ENV_FILE."; exit 1; }

docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --wait postgres_staging
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" run --rm --no-deps api_staging npm run db:migrate
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --remove-orphans

echo "Staging deployed - http://localhost:4001"
