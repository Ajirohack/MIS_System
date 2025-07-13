#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo "Starting health check for all services..."

# Check Backend
echo -e "${YELLOW}Checking Backend...${NC}"
BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3101/health)
if [ "$BACKEND_STATUS" -eq 200 ]; then
  echo -e "${GREEN}✓ Backend is healthy${NC}"
  curl -s http://localhost:3101/health | jq .
else
  echo -e "${RED}✗ Backend is not healthy - Status: $BACKEND_STATUS${NC}"
fi

# Check Frontend
echo -e "${YELLOW}Checking Frontend...${NC}"
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000)
if [ "$FRONTEND_STATUS" -eq 200 ]; then
  echo -e "${GREEN}✓ Frontend is healthy${NC}"
else
  echo -e "${RED}✗ Frontend is not healthy - Status: $FRONTEND_STATUS${NC}"
fi

# Supabase connectivity is verified via backend
echo -e "${YELLOW}Checking Supabase via backend health...${NC}"
SUPA_STATUS=$(curl -s http://localhost:3101/health | jq -r '.checks.database.status')
if [ "$SUPA_STATUS" = "connected" ]; then
  echo -e "${GREEN}✓ Supabase connection is healthy${NC}"
else
  echo -e "${RED}✗ Supabase connection failed${NC}"
fi
