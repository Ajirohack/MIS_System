#!/usr/bin/env bash
# filepath: /Users/macbook/Downloads/whyte_houx_final/build/developers/scalfolding-apps/SpaceNew/client/membership-initiation-system/membership-initiation/tools/run_cross_platform_tests.sh

#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo -e "${BLUE}=== SpaceNew Cross-Platform Integration Tests ===${NC}"
echo "Starting tests at $(date)"
echo

# 1. Run Typescript tests
echo -e "${YELLOW}=> Running CrossPlatformService tests...${NC}"
cd "$PROJECT_ROOT/shared"
echo "Installing dependencies..."
npm install --silent > /dev/null
echo "Running tests..."
npx jest tests/CrossPlatformConnectivityTest.ts --silent || { echo -e "${RED}CrossPlatformService tests failed${NC}"; exit 1; }
echo -e "${GREEN}✓ CrossPlatformService tests passed${NC}"
echo

# 2. Run Python Telegram bot tests
echo -e "${YELLOW}=> Running Telegram Bot integration tests...${NC}"
cd "$PROJECT_ROOT/../../telegram-bot"
echo "Installing dependencies..."
pip install -r requirements.txt > /dev/null 2>&1 || echo "No requirements.txt found, skipping pip install"
echo "Running tests..."
python -m unittest test_cross_platform_connectivity.py || { echo -e "${RED}Telegram Bot tests failed${NC}"; exit 1; }
echo -e "${GREEN}✓ Telegram Bot tests passed${NC}"
echo

# 3. Run browser extension tests (if available)
echo -e "${YELLOW}=> Running Browser Extension tests...${NC}"
cd "$PROJECT_ROOT/../../browser-extension"
if [ -f "package.json" ]; then
  echo "Installing dependencies..."
  npm install --silent > /dev/null
  echo "Running tests..."
  if [ -f "jest.config.js" ]; then
    npx jest || { echo -e "${RED}Browser Extension tests failed${NC}"; exit 1; }
    echo -e "${GREEN}✓ Browser Extension tests passed${NC}"
  else
    echo -e "${YELLOW}⚠ No Jest config found, skipping Browser Extension tests${NC}"
  fi
else
  echo -e "${YELLOW}⚠ No package.json found, skipping Browser Extension tests${NC}"
fi
echo

# 4. Run mem0.ai evaluation
echo -e "${YELLOW}=> Running mem0.ai Context Evaluation...${NC}"
cd "$PROJECT_ROOT/tools"
if [ -f "mem0_context_evaluation.ts" ]; then
  echo "Installing dependencies..."
  npm install --silent > /dev/null
  echo "Running evaluation..."
  if [ -z "$MEM0_API_KEY" ]; then
    echo -e "${YELLOW}⚠ MEM0_API_KEY not set, skipping mem0 evaluation${NC}"
  else
    npx ts-node mem0_context_evaluation.ts || { echo -e "${RED}mem0 evaluation failed${NC}"; exit 1; }
    echo -e "${GREEN}✓ mem0.ai evaluation completed${NC}"
  fi
else
  echo -e "${YELLOW}⚠ mem0_context_evaluation.ts not found, skipping evaluation${NC}"
fi
echo

# 5. Run end-to-end connectivity test
echo -e "${YELLOW}=> Running End-to-End connectivity test...${NC}"
echo "This test requires manual verification."
echo "Please follow steps in cross_platform_testing_guide.md"
echo -e "${YELLOW}⚠ End-to-End test requires manual verification${NC}"
echo

echo -e "${GREEN}=== All automated tests completed! ===${NC}"
echo "Completed at $(date)"
echo
echo "Next steps:"
echo "1. Review test reports in the test-data directory"
echo "2. Complete manual end-to-end testing using the testing guide"
echo "3. Update documentation with any findings"
