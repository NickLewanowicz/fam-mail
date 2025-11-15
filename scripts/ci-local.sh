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

if command -v docker &> /dev/null; then
    echo ""
    echo "🐳 Docker is available. Testing Docker build..."
    docker build -t fam-mail:local-test . > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "✅ Docker build successful!"
    else
        echo "❌ Docker build failed. Run 'docker build -t fam-mail:local-test .' for details"
        exit 1
    fi
else
    echo ""
    echo "ℹ️  Docker not available. Skipping Docker build test."
fi
