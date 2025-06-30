#!/bin/bash

# Container-to-Container Networking Setup Script
# This script sets up proper Docker networking for your services

echo "🐳 Setting up Container-to-Container Networking"
echo "==============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker first."
    exit 1
fi

print_status "Docker is running ✓"

# Step 1: Create external network if it doesn't exist
print_status "Creating shared Docker network..."

if docker network ls | grep -q "server-network"; then
    print_warning "Network 'server-network' already exists"
    
    # Check if it's external
    if docker network inspect server-network --format '{{.Options}}' | grep -q "com.docker.network.bridge.name"; then
        print_status "Removing existing internal network to create external one..."
        docker network rm server-network 2>/dev/null || true
    fi
fi

# Create external network
if ! docker network ls | grep -q "server-network"; then
    docker network create server-network --driver bridge
    print_success "Created external network 'server-network'"
else
    print_success "Network 'server-network' is ready"
fi

# Step 2: Check current container status
print_status "Checking current container status..."

# Check NestJS backend
if docker ps | grep -q "backend"; then
    print_status "NestJS backend container is running"
    BACKEND_RUNNING=true
else
    print_status "NestJS backend container is not running"
    BACKEND_RUNNING=false
fi

# Check DataMatrix service
if docker ps | grep -q "datamatrix-service"; then
    print_status "DataMatrix service container is running"
    DATAMATRIX_RUNNING=true
else
    print_warning "DataMatrix service container is not running"
    DATAMATRIX_RUNNING=false
fi

# Step 3: Connect existing containers to the network (if running)
if [ "$BACKEND_RUNNING" = true ]; then
    print_status "Connecting backend container to shared network..."
    docker network connect server-network backend 2>/dev/null || print_warning "Backend already connected to network"
fi

if [ "$DATAMATRIX_RUNNING" = true ]; then
    print_status "Connecting datamatrix-service to shared network..."
    docker network connect server-network datamatrix-service 2>/dev/null || print_warning "DataMatrix service already connected to network"
fi

# Step 4: Test network connectivity
print_status "Testing network connectivity..."

if [ "$BACKEND_RUNNING" = true ] && [ "$DATAMATRIX_RUNNING" = true ]; then
    print_status "Testing container-to-container communication..."
    
    # Test from backend to datamatrix service
    if docker exec backend curl -s --max-time 5 http://datamatrix-service:5001/health > /dev/null 2>&1; then
        print_success "✅ Backend can reach DataMatrix service!"
    else
        print_error "❌ Backend cannot reach DataMatrix service"
        print_status "This might be normal if services need to be restarted with new network config"
    fi
else
    print_warning "Cannot test connectivity - one or both containers are not running"
fi

# Step 5: Provide deployment instructions
echo ""
echo "📋 Next Steps:"
echo "=============="

if [ "$DATAMATRIX_RUNNING" = false ]; then
    echo "1. Start your DataMatrix service:"
    echo "   cd ~/matrix-detection"
    echo "   docker-compose up -d"
    echo ""
fi

echo "2. Deploy your NestJS application:"
echo "   cd ~/mexlefirst"  # Adjust path as needed
echo "   docker-compose down"
echo "   docker-compose up --build -d"
echo ""

echo "3. Verify the setup:"
echo "   docker network ls | grep server-network"
echo "   docker network inspect server-network"
echo "   docker logs backend | grep 'ThirdPartyDetectorService'"
echo ""

echo "🔧 Configuration Summary:"
echo "========================"
echo "• Network: server-network (external, shared)"
echo "• NestJS Backend: backend container"
echo "• DataMatrix Service: datamatrix-service container"
echo "• Internal URL: http://datamatrix-service:5001"
echo "• External URL: http://localhost:5001 (for testing)"
echo ""

echo "🧪 Test Commands:"
echo "================"
echo "# Test from host machine:"
echo "curl http://localhost:5001/health"
echo ""
echo "# Test from backend container:"
echo "docker exec backend curl http://datamatrix-service:5001/health"
echo ""
echo "# Check network connections:"
echo "docker network inspect server-network --format '{{range .Containers}}{{.Name}}: {{.IPv4Address}}{{\"\\n\"}}{{end}}'"

print_success "Network setup complete! 🎉"