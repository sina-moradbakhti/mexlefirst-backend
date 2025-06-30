# Container-to-Container Networking Guide

## 🎯 Objective

Set up proper Docker networking so your NestJS backend container can communicate with the DataMatrix service container **internally**, without exposing services to external networks.

## 🐳 Current Setup Analysis

### Your NestJS App (mexlefirst)
```yaml
# docker-compose.yml
services:
  backend:
    container_name: backend
    networks:
      - server-network  # Internal network
```

### DataMatrix Service (matrix-detection)
```yaml
# docker-compose.yml  
services:
  datamatrix-service:
    container_name: datamatrix-service
    networks:
      - server-network  # Separate internal network with same name
```

## ❌ The Problem

Both services use networks named `server-network`, but they're **separate networks**. Container `backend` cannot reach `datamatrix-service` because they're in different network namespaces.

## ✅ The Solution: Shared External Network

### Step 1: Create Shared Network

```bash
# Create a shared external network
docker network create server-network
```

### Step 2: Update Docker Compose Files

**Your NestJS app** (`docker-compose.yml`):
```yaml
networks:
  server-network:
    external: true  # Use existing external network
```

**DataMatrix service** (`~/matrix-detection/docker-compose.yml`):
```yaml
networks:
  server-network:
    external: true  # Use the same external network
```

### Step 3: Update Environment Configuration

**File**: `.env.production`
```env
# Use container name for internal communication
THIRD_PARTY_DETECTOR_URL=http://datamatrix-service:5001
BASE_URL=https://server.mexle.org
```

## 🚀 Deployment Steps

### Automated Setup (Recommended)

```bash
# Make setup script executable
chmod +x setup-container-networking.sh

# Run the setup script
./setup-container-networking.sh
```

### Manual Setup

```bash
# 1. Create shared network
docker network create server-network

# 2. Stop both services
docker-compose down
cd ~/matrix-detection && docker-compose down

# 3. Update DataMatrix service docker-compose.yml
cd ~/matrix-detection
# Edit docker-compose.yml to use external network:
# networks:
#   server-network:
#     external: true

# 4. Start DataMatrix service with new network
docker-compose up -d

# 5. Start your NestJS app with new network
cd ~/mexlefirst  # or wherever your app is
docker-compose up --build -d
```

## 🧪 Testing Container Communication

### Test 1: Network Inspection
```bash
# Check if both containers are in the same network
docker network inspect server-network

# Should show both containers:
# - backend
# - datamatrix-service
```

### Test 2: Container-to-Container Ping
```bash
# Test from backend container
docker exec backend ping datamatrix-service

# Test HTTP connectivity
docker exec backend curl http://datamatrix-service:5001/health
```

### Test 3: Application Logs
```bash
# Check NestJS logs for successful connection
docker logs backend | grep "ThirdPartyDetectorService"

# Should show:
# [ThirdPartyDetectorService] API URL: http://datamatrix-service:5001
# [ThirdPartyDetectorService] 3rd party API response: X codes detected
```

## 🔧 Network Architecture

```
┌─────────────────────────────────────────────────────────┐
│                 server-network (external)               │
│                                                         │
│  ┌─────────────────┐    ┌─────────────────────────────┐ │
│  │   backend       │    │   datamatrix-service        │ ���
│  │   (NestJS)      │───▶│   (Flask/Python)            │ │
│  │   :3001         │    │   :5001                     │ │
│  └─────────────────┘    └─────────────────────────────┘ │
│                                                         │
│  ┌─────────────────┐                                    │
│  │   db-mongo      │                                    │
│  │   :27017        │                                    │
│  └─────────────────┘                                    │
└─────────────────────────────────────────────────────────┘
```

## 🔍 Troubleshooting

### Issue 1: "server-network" already exists
```bash
# Check if it's the right type
docker network inspect server-network

# If it's not external, remove and recreate
docker network rm server-network
docker network create server-network
```

### Issue 2: Container can't resolve "datamatrix-service"
```bash
# Check if both containers are in the same network
docker network inspect server-network --format '{{range .Containers}}{{.Name}}: {{.IPv4Address}}{{end}}'

# Should show both containers with IP addresses
```

### Issue 3: Connection refused
```bash
# Check if DataMatrix service is healthy
docker exec datamatrix-service curl localhost:5001/health

# Check service logs
docker logs datamatrix-service
```

## 📋 Verification Checklist

- ✅ External network `server-network` exists
- ✅ Both containers are connected to the same network
- ✅ DataMatrix service is healthy and responding
- ✅ NestJS app uses `http://datamatrix-service:5001`
- ✅ Container-to-container ping works
- ✅ HTTP requests succeed between containers
- ✅ Application logs show successful API calls

## 🎯 Expected Success Messages

After proper setup, you should see:

```
[ThirdPartyDetectorService] API URL: http://datamatrix-service:5001
[ThirdPartyDetectorService] Using configured BASE_URL: https://server.mexle.org
[ThirdPartyDetectorService] Sending image URL to 3rd party service: https://server.mexle.org/uploads/filename.jpg
[ThirdPartyDetectorService] 3rd party API response: 2 codes detected
```

## 🔒 Security Benefits

- ✅ **Internal communication only**: Services communicate via container names
- ✅ **No external exposure**: DataMatrix service not accessible from internet
- ✅ **Network isolation**: Services isolated from other Docker networks
- ✅ **Controlled access**: Only containers in the same network can communicate

---

**Status**: 🔧 **READY FOR CONTAINER DEPLOYMENT**  
**Next**: Run setup script and deploy with shared network configuration  
**Result**: Secure internal container-to-container communication