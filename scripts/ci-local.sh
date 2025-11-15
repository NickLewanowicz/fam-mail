#!/bin/bash

set -e

echo "================================================"
echo "🧪 Running CI checks locally"
echo "================================================"

echo ""
echo "📦 Installing dependencies..."
pnpm install --frozen-lockfile

echo ""
echo "🔍 Linting backend..."
cd backend && pnpm lint && cd ..

echo ""
echo "🔍 Linting frontend..."
cd frontend && pnpm lint && cd ..

echo ""
echo "🧪 Testing backend..."
cd backend && pnpm test && cd ..

echo ""
echo "🧪 Testing frontend..."
cd frontend && pnpm test --run && cd ..

echo ""
echo "🏗️  Building backend..."
cd backend && pnpm build && cd ..

echo ""
echo "🏗️  Building frontend..."
cd frontend && pnpm build && cd ..

echo ""
echo "================================================"
echo "✅ All CI checks passed!"
echo "================================================"
