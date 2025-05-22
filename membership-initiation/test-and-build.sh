#!/bin/bash

# Navigate to the frontend directory
cd frontend/dashboard

# Install dependencies first
echo "Installing dependencies..."
npm install

# Run the tests using npx to ensure we use the locally installed vitest
echo "Running frontend tests..."
npx vitest run

# Check if tests passed
if [ $? -eq 0 ]; then
  echo "✅ Tests passed! Building Docker containers..."
  cd ../..
  docker-compose build
  echo "✅ Build complete!"
  echo "Run 'docker-compose up' to start the containers."
else
  echo "❌ Tests failed! Please fix the issues before building."
  exit 1
fi