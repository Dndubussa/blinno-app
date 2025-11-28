#!/bin/bash
set -e

echo "Installing backend dependencies..."
cd backend
npm install
echo "Building backend TypeScript..."
npm run build
cd ..

echo "Installing frontend dependencies..."
npm install
echo "Building frontend..."
npm run build

echo "Build complete!"

