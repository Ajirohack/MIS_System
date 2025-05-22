#!/bin/bash
set -e

echo "Setting up Supabase containers..."

# Create network if it doesn't exist
docker network create space_network 2>/dev/null || true

# Start Supabase DB
docker run -d --name supabase-db \
  --network space_network \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  supabase/postgres:15.1.0.90

echo "Waiting for database to start..."
sleep 5

# Start Supabase REST
docker run -d --name supabase-rest \
  --network space_network \
  -e PGRST_DB_URI=postgres://postgres:postgres@supabase-db:5432/postgres \
  -e PGRST_DB_SCHEMA=public \
  -e PGRST_DB_ANON_ROLE=anon \
  -e PGRST_JWT_SECRET=supersecretjwt \
  -p 3001:3000 \
  postgrest/postgrest:v11.2.0

echo "Supabase setup complete!"
