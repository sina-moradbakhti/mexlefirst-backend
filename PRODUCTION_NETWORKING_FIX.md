# Production Networking Fix Guide

## 🐛 Problem Identified

Your NestJS application is trying to connect to the 3rd party DataMatrix service using `localhost:5001`, but both services are running in separate Docker containers. This causes the connection to fail with:

```
ERROR [ThirdPartyDetectorService] 3rd party API request error: connect ECONNREFUSED 127.0.0.1:5001
```

## 🔧 Root Cause

- **NestJS App**: Running in Docker container with network `server-network`
- **DataMatrix Service**: Running in separate Docker container with its own `server-network`
- **Issue**: `localhost:5001` inside NestJS container refers to the container itself, not the host machine

## ✅ Solutions Applied

### 1. Updated Production Environment

**File**: `.env.production`
```env
# Before (❌ Won't work in Docker)
THIRD_PARTY_DETECTOR_URL=http://localhost:5001

# After (✅ Works with Docker on Linux)
THIRD_PARTY_DETECTOR_URL=http://172.17.0.1:5001
```

### 2. Enhanced Docker Compose

**File**: `docker-compose.yml`
- Added `extra_hosts` for better networking compatibility
- Added `host.docker.internal` mapping for cross-platform support

### 3. Networking Test Script

**File**: `fix-production-networking.js`
- Automatically tests different networking options
- Updates configuration with the best working option
- Provides detailed diagnostics

## 🚀 Deployment Steps

### Step 1: Upload Updated Files

Upload these updated files to your server:
- `.env.production`
- `docker-compose.yml`
- `fix-production-networking.js`

### Step 2: Test Networking (Recommended)

Run the networking test script on your server:

```bash
# Make script executable
chmod +x fix-production-networking.js

# Run networking tests
node fix-production-networking.js
```

This will:
- Test different networking options
- Automatically update `.env.production` with the best option
- Provide deployment recommendations

### Step 3: Rebuild and Deploy

```bash
# Stop current containers
docker-compose down

# Rebuild with new configuration
docker-compose up --build -d

# Check container status
docker ps
```

### Step 4: Verify Fix

Check the logs to confirm successful networking:

```bash
# Check NestJS app logs
docker logs backend

# Look for these success messages:
# [ThirdPartyDetectorService] API URL: http://172.17.0.1:5001
# [ThirdPartyDetectorService] 3rd party API response: X codes detected
```

## 🔍 Alternative Networking Options

If `172.17.0.1:5001` doesn't work, try these alternatives:

### Option A: Host Network Mode

Update `docker-compose.yml`:
```yaml
services:
  backend:
    # ... other config
    network_mode: "host"
```

Then use:
```env
THIRD_PARTY_DETECTOR_URL=http://localhost:5001
```

### Option B: External Network

Create a shared Docker network:

```bash
# Create external network
docker network create shared-network

# Update both docker-compose.yml files to use:
networks:
  default:
    external:
      name: shared-network
```

Then use service name:
```env
THIRD_PARTY_DETECTOR_URL=http://datamatrix-service:5001
```

### Option C: Server IP Address

Find your server's IP and use it directly:
```bash
# Get server IP
hostname -I | awk '{print $1}'

# Use in .env.production
THIRD_PARTY_DETECTOR_URL=http://[SERVER_IP]:5001
```

## �� Testing Commands

### Test 3rd Party Service Accessibility

```bash
# From host machine
curl -I http://localhost:5001/health

# From inside NestJS container
docker exec backend curl -I http://172.17.0.1:5001/health

# Test image upload endpoint
curl -X POST http://172.17.0.1:5001/detect_url \
  -H "Content-Type: application/json" \
  -d '{"url": "https://server.mexle.org/uploads/test.jpg"}'
```

### Monitor Logs

```bash
# Real-time logs for both services
docker logs -f backend &
docker logs -f datamatrix-service &

# Test image upload and watch logs
```

## 📋 Troubleshooting Checklist

- ✅ Both services are running: `docker ps`
- ✅ DataMatrix service is healthy: `docker logs datamatrix-service`
- ✅ Port 5001 is accessible: `curl http://localhost:5001/health`
- ✅ Updated `.env.production` with correct URL
- ✅ Rebuilt containers after config change
- ✅ NestJS app can reach 3rd party service
- ✅ Image URLs are accessible from 3rd party service

## 🎯 Expected Success Messages

After applying the fix, you should see:

```
[ThirdPartyDetectorService] API URL: http://172.17.0.1:5001
[ThirdPartyDetectorService] Using configured BASE_URL: https://server.mexle.org
[ThirdPartyDetectorService] Sending image URL to 3rd party service: https://server.mexle.org/uploads/filename.jpg
[ThirdPartyDetectorService] 3rd party API response: 2 codes detected
[ImageProcessingService] Sending completion notification to user
```

## 🚨 Common Issues

### Issue 1: Still getting ECONNREFUSED
**Solution**: Try different IP addresses or use host network mode

### Issue 2: 3rd party can't access image URLs
**Solution**: Ensure `BASE_URL=https://server.mexle.org` is correct and images are publicly accessible

### Issue 3: Docker networking varies by system
**Solution**: Use the networking test script to find what works on your specific server

---

**Status**: 🔧 **READY FOR DEPLOYMENT**  
**Next**: Run networking test script and deploy updated configuration  
**Expected Result**: Successful 3rd party integration without connection errors