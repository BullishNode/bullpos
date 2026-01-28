#!/usr/bin/env bash
# Phase 1 Backend MVP Verification Script
# Usage: ./scripts/verify-phase1.sh

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=================================================="
echo "Phase 1 Backend MVP Verification"
echo "=================================================="
echo ""

# Check if we're in the backend directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: Must run from backend directory${NC}"
    exit 1
fi

# Track overall status
VERIFICATION_PASSED=true

# Function to check if a PR is merged
check_pr_merged() {
    local pr_number=$1
    local pr_title=$2

    echo -n "Checking PR #$pr_number ($pr_title)... "

    if gh pr view "$pr_number" --json state --jq '.state' | grep -q "MERGED"; then
        echo -e "${GREEN}✅ Merged${NC}"
        return 0
    else
        echo -e "${RED}❌ Not merged${NC}"
        VERIFICATION_PASSED=false
        return 1
    fi
}

# Function to check if endpoint exists in code
check_endpoint_exists() {
    local method=$1
    local path=$2
    local description=$3

    echo -n "Checking $method $path ($description)... "

    # Search for route definition in src/routes
    if grep -r "app\.$method.*$path\|router\.$method.*$path" src/ >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Implemented${NC}"
        return 0
    else
        echo -e "${RED}❌ Not found${NC}"
        VERIFICATION_PASSED=false
        return 1
    fi
}

# Function to run npm script and check result
run_npm_script() {
    local script=$1
    local description=$2

    echo ""
    echo "Running: npm run $script ($description)"
    echo "----------------------------------------"

    if npm run "$script" 2>&1; then
        echo -e "${GREEN}✅ $description passed${NC}"
        return 0
    else
        echo -e "${RED}❌ $description failed${NC}"
        VERIFICATION_PASSED=false
        return 1
    fi
}

# Step 1: Check Dependencies
echo "Step 1: Checking Dependencies"
echo "------------------------------"
check_pr_merged 64 "Rate limiting and security headers"
check_pr_merged 67 "CI pipeline"
echo ""

# Step 2: Check Core PRs
echo "Step 2: Checking Core Implementation PRs"
echo "-----------------------------------------"
check_pr_merged 61 "Authentication"
check_pr_merged 58 "Merchant profile management"
check_pr_merged 62 "Encrypted link storage"
check_pr_merged 63 "Backup storage"
echo ""

# Step 3: Check Test PRs
echo "Step 3: Checking Test Implementation PRs"
echo "-----------------------------------------"
check_pr_merged 65 "Unit tests"
check_pr_merged 66 "Integration tests"
echo ""

# Step 4: Verify Code Implementation
echo "Step 4: Verifying Code Implementation"
echo "--------------------------------------"

# Check if routes directory exists
if [ ! -d "src/routes" ]; then
    echo -e "${RED}❌ src/routes directory not found${NC}"
    VERIFICATION_PASSED=false
else
    echo -e "${GREEN}✅ src/routes directory exists${NC}"
fi

# Check for key files
for file in "src/db.ts" "src/auth.ts" "src/index.ts"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅ $file exists${NC}"
    else
        echo -e "${YELLOW}⚠️  $file not found${NC}"
    fi
done
echo ""

# Step 5: Check npm scripts
echo "Step 5: Verifying Build Configuration"
echo "--------------------------------------"
if grep -q '"test":' package.json; then
    echo -e "${GREEN}✅ Test script configured${NC}"
else
    echo -e "${RED}❌ Test script not configured${NC}"
    VERIFICATION_PASSED=false
fi

if grep -q '"build":' package.json; then
    echo -e "${GREEN}✅ Build script configured${NC}"
else
    echo -e "${RED}❌ Build script not configured${NC}"
    VERIFICATION_PASSED=false
fi

if grep -q '"lint":' package.json; then
    echo -e "${GREEN}✅ Lint script configured${NC}"
else
    echo -e "${RED}❌ Lint script not configured${NC}"
    VERIFICATION_PASSED=false
fi
echo ""

# Step 6: Try to run builds/tests if possible
echo "Step 6: Running Build and Test Commands"
echo "----------------------------------------"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Try TypeScript compilation
if command -v tsc &> /dev/null; then
    echo "Checking TypeScript compilation..."
    if npm run build 2>&1 | tail -10; then
        echo -e "${GREEN}✅ TypeScript compilation successful${NC}"
    else
        echo -e "${RED}❌ TypeScript compilation failed${NC}"
        VERIFICATION_PASSED=false
    fi
else
    echo -e "${YELLOW}⚠️  TypeScript not available, skipping build check${NC}"
fi

# Try linting
if npm run lint 2>&1 | tail -10; then
    echo -e "${GREEN}✅ Linting passed${NC}"
else
    echo -e "${YELLOW}⚠️  Linting issues found (may be expected if code not merged)${NC}"
fi

# Try tests
if [ -d "src/__tests__" ] || [ -d "tests" ]; then
    if npm test 2>&1 | tail -20; then
        echo -e "${GREEN}✅ Tests passed${NC}"
    else
        echo -e "${RED}❌ Tests failed${NC}"
        VERIFICATION_PASSED=false
    fi
else
    echo -e "${YELLOW}⚠️  No test directory found${NC}"
fi
echo ""

# Step 7: Check CI configuration
echo "Step 7: Checking CI Configuration"
echo "----------------------------------"
if [ -f "../.github/workflows/backend-ci.yml" ] || [ -f "../.github/workflows/ci.yml" ]; then
    echo -e "${GREEN}✅ CI configuration exists${NC}"
else
    echo -e "${RED}❌ CI configuration not found${NC}"
    VERIFICATION_PASSED=false
fi
echo ""

# Final Summary
echo "=================================================="
echo "Verification Summary"
echo "=================================================="
echo ""

if [ "$VERIFICATION_PASSED" = true ]; then
    echo -e "${GREEN}✅ VERIFICATION PASSED${NC}"
    echo ""
    echo "Phase 1 Backend MVP is complete and functional!"
    echo ""
    exit 0
else
    echo -e "${RED}❌ VERIFICATION FAILED${NC}"
    echo ""
    echo "Phase 1 Backend MVP is incomplete. Please review:"
    echo "1. Ensure all PRs (#58, #61-#67) are merged"
    echo "2. Check that all tests are passing"
    echo "3. Verify CI pipeline is configured and green"
    echo ""
    echo "See VERIFICATION.md for detailed status and merge order."
    echo ""
    exit 1
fi
