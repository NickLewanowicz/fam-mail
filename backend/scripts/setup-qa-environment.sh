#!/bin/bash
# backend/scripts/setup-qa-environment.sh
# 
# Complete setup script for QA testing environment
# 
# Usage: ./scripts/setup-qa-environment.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(dirname "$BACKEND_DIR")"

echo "=============================================="
echo "  FamMail QA Environment Setup"
echo "=============================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
echo "Checking prerequisites..."
echo ""

# Check for bun
if command -v bun &> /dev/null; then
    BUN_VERSION=$(bun --version)
    print_success "Bun installed: v$BUN_VERSION"
else
    print_error "Bun not found. Please install from: https://bun.sh"
    exit 1
fi

# Check for Node.js (alternative to bun)
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_status "Node.js also available: $NODE_VERSION"
fi

echo ""

# Step 1: Create screenshot directories
print_status "Creating screenshot directories..."
mkdir -p "$PROJECT_ROOT/qa-screenshots"/{A-health,B-auth,C-drafts,D-postcards,E-scheduling,F-errors,G-uiux,H-security}
print_success "Screenshot directories created at: $PROJECT_ROOT/qa-screenshots/"

# Step 2: Create test assets
print_status "Setting up test assets..."
if [ -f "$BACKEND_DIR/test-assets/test-image.jpg" ]; then
    print_success "Test assets already exist"
else
    print_status "Running test assets setup script..."
    chmod +x "$SCRIPT_DIR/setup-test-assets.sh"
    cd "$BACKEND_DIR"
    "$SCRIPT_DIR/setup-test-assets.sh" || print_warning "Some test assets may not have been created"
fi

# Step 3: Check database
print_status "Checking database..."
mkdir -p "$BACKEND_DIR/data"
if [ -f "$BACKEND_DIR/data/fammail.db" ]; then
    print_success "Database exists: $BACKEND_DIR/data/fammail.db"
else
    print_status "Database will be created on first server start"
fi

# Step 4: Check environment file
print_status "Checking environment configuration..."
if [ -f "$BACKEND_DIR/.env" ]; then
    print_success ".env file exists"
    
    # Check for required variables
    if grep -q "JWT_SECRET" "$BACKEND_DIR/.env"; then
        print_success "JWT_SECRET configured"
    else
        print_warning "JWT_SECRET not found in .env - using default"
    fi
    
    if grep -q "POSTGRID_TEST_API_KEY" "$BACKEND_DIR/.env"; then
        print_success "PostGrid test API key configured"
    else
        print_warning "PostGrid API keys not configured - some tests may fail"
    fi
else
    print_warning "No .env file found"
    
    # Create template .env
    print_status "Creating .env template..."
    cat > "$BACKEND_DIR/.env" << 'EOF'
# FamMail Backend Configuration
# Copy this file and fill in your values

# Server
PORT=8484
DATABASE_PATH=./data/fammail.db

# JWT Configuration
JWT_SECRET=your-secret-key-min-32-characters-long-for-security!
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# PostGrid API (get keys from https://dashboard.postgrid.com)
POSTGRID_MODE=test
POSTGRID_TEST_API_KEY=your-test-api-key
POSTGRID_LIVE_API_KEY=your-live-api-key
POSTGRID_FORCE_TEST_MODE=false

# OIDC Configuration (Authentik/Google/etc.)
OIDC_ISSUER_URL=https://your-oidc-provider.com
OIDC_CLIENT_ID=your-client-id
OIDC_CLIENT_SECRET=your-client-secret
OIDC_REDIRECT_URI=http://localhost:8484/api/auth/callback

# QA Testing (Optional - enables mock auth bypass)
# BYPASS_AUTH=true
# TEST_USER_ID=test-user-123
# TEST_USER_EMAIL=tester@fammail.local
EOF
    print_success "Created .env template - please configure your values"
fi

# Step 5: Seed test user
print_status "Seeding test user..."
cd "$BACKEND_DIR"
bun run scripts/seed-test-user.ts 2>/dev/null || print_warning "Could not seed test user (database may not be initialized)"

# Step 6: Generate test token
print_status "Generating test authentication token..."
echo ""
print_status "Run this command to generate a test token:"
echo ""
echo "    cd backend && bun run scripts/generate-test-token.ts"
echo ""

# Step 7: Print summary
echo ""
echo "=============================================="
echo "  QA Environment Setup Complete!"
echo "=============================================="
echo ""
echo "Setup Summary:"
echo "--------------"
echo ""

# Check what was created
echo "✅ Created directories:"
echo "   - $PROJECT_ROOT/qa-screenshots/"
echo ""

if [ -d "$BACKEND_DIR/test-assets" ]; then
    asset_count=$(ls -1 "$BACKEND_DIR/test-assets" 2>/dev/null | wc -l | tr -d ' ')
    echo "✅ Test assets: $asset_count files in backend/test-assets/"
fi
echo ""

echo "Next Steps:"
echo "-----------"
echo ""
echo "1. Configure your .env file:"
echo "   $EDITOR $BACKEND_DIR/.env"
echo ""
echo "2. Start the backend server:"
echo "   cd backend && bun run dev"
echo ""
echo "3. In a new terminal, start the frontend:"
echo "   cd frontend && bun run dev"
echo ""
echo "4. Generate a test token for authenticated tests:"
echo "   cd backend && bun run scripts/generate-test-token.ts"
echo ""
echo "5. Open Chrome and navigate to:"
echo "   http://localhost:5173"
echo ""
echo "6. Inject test token in browser console:"
echo "   localStorage.setItem('auth_token', 'YOUR_TOKEN_HERE');"
echo "   location.reload();"
echo ""
echo "7. Run QA tests following docs/qa-testing-plan.md"
echo ""

# Print quick test commands
echo "Quick Test Commands:"
echo "-------------------"
echo ""
echo "  # Test backend health"
echo "  curl http://localhost:8484/api/health"
echo ""
echo "  # Test with authentication"
echo "  curl -H 'Authorization: Bearer YOUR_TOKEN' http://localhost:8484/api/drafts"
echo ""

echo "Documentation:"
echo "  - QA Testing Plan: $PROJECT_ROOT/docs/qa-testing-plan.md"
echo "  - Screenshot output: $PROJECT_ROOT/qa-screenshots/"
echo ""
