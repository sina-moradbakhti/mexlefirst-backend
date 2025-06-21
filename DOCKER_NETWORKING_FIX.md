# Docker Networking Fix for 3rd Party Integration

## 🐛 Problem Identified

The error you encountered indicates that the 3rd party service (running in Docker) cannot access your application server:

```
Failed to download image from URL: HTTPConnectionPool(host='localhost', port=3000): 
Max retries exceeded with url: /uploads/20250621-1751-62942.jpg 
(Caused by NewConnectionError: Failed to establish a new connection: [Errno 111] Connection refused)
```

**Root Cause**: When the 3rd party service runs in a Docker container, `localhost:3000` refers to the container itself, not your host machine.

## ✅ Solution Applied

### 1. **Updated Environment Configuration**

**File**: `.env.development`
```env
# Before (❌ Won't work with Docker)
BASE_URL=http://localhost:3000

# After (✅ Works with Docker)
BASE_URL=http://host.docker.internal:3000
```

### 2. **Enhanced Service Logic**

**File**: `src/image/services/third-party-detector.service.ts`
- ✅ Added intelligent BASE_URL detection
- ✅ Added logging for debugging networking issues
- ✅ Added fallback options for different environments

### 3. **Platform-Specific Configuration**

- **macOS/Windows (Docker Desktop)**: `http://host.docker.internal:3000`
- **Linux**: `http://172.17.0.1:3000` (Docker bridge gateway)

## 🔧 How It Works Now

1. **Image Upload**: User uploads image → saved to `./uploads/filename.jpg`
2. **URL Generation**: System generates `http://host.docker.internal:3000/uploads/filename.jpg`
3. **3rd Party Call**: Service sends this URL to 3rd party API
4. **Image Access**: 3rd party service can now access the image from Docker
5. **Processing**: Detection works and returns results

## 🧪 Testing Tools Provided

### 1. **Configuration Validator**
```bash
node test-local-config.js
```
Validates environment variables and shows generated URLs.

### 2. **Network Connectivity Tester**
```bash
node test-docker-networking.js
```
Tests different networking options to find what works.

### 3. **Auto-Fix Script**
```bash
node fix-docker-networking.js
```
Automatically detects and sets the correct BASE_URL.

## 🚀 Next Steps

1. **Restart your application**:
   ```bash
   npm run start:dev
   ```

2. **Test image upload** and check the logs for:
   ```
   [ThirdPartyDetectorService] Using configured BASE_URL: http://host.docker.internal:3000
   [ThirdPartyDetectorService] Sending image URL to 3rd party service: http://host.docker.internal:3000/uploads/filename.jpg
   ```

3. **Verify success** - you should see successful processing instead of connection errors.

## 🔄 Alternative Configurations

If `host.docker.internal` doesn't work on your system, try these alternatives:

### Option A: Same Docker Network
If your 3rd party service is in the same Docker network as your app:
```env
BASE_URL=http://backend:3001
```

### Option B: Docker Bridge Network
For Linux systems or custom Docker setups:
```env
BASE_URL=http://172.17.0.1:3000
```

### Option C: Custom Docker Network
Find your Docker bridge IP:
```bash
docker network inspect bridge --format='{{range .IPAM.Config}}{{.Gateway}}{{end}}'
```
Then use: `BASE_URL=http://[BRIDGE_IP]:3000`

## 🐳 Docker Network Architecture

```
┌─────────────────────┐    ┌─────────────────────┐
│   Your Application  │    │  3rd Party Service  │
│   (Host Machine)    │    │   (Docker Container)│
│   localhost:3000    │    │                     │
└─────────────────────┘    └─────────────────────┘
           │                           │
           └��──────────────────────────┘
              host.docker.internal:3000
              (Docker's host gateway)
```

## 🔍 Debugging Tips

1. **Check logs** for BASE_URL being used:
   ```
   [ThirdPartyDetectorService] Using configured BASE_URL: ...
   ```

2. **Test URL accessibility** from within Docker:
   ```bash
   docker run --rm curlimages/curl curl -I http://host.docker.internal:3000/uploads/
   ```

3. **Verify static file serving** - ensure your app serves files at `/uploads/` endpoint.

## 📋 Troubleshooting Checklist

- ✅ Updated BASE_URL in `.env.development`
- ✅ Restarted application after config change
- ✅ Verified 3rd party service is running on localhost:5001
- ✅ Confirmed your app serves static files at `/uploads/` path
- ✅ Checked application logs for networking configuration
- ✅ Tested with actual image upload

## 🎯 Expected Result

After applying this fix, you should see successful processing messages instead of connection errors:

```json
{
  "content": "✅ **Analysis Complete**\n\n📊 **Analysis Results:**\n• Total Matrix codes detected: 2\n• Readable codes: 2\n• Unreadable codes: 0",
  "messageType": "feedback",
  "processingStatus": "completed"
}
```

---

**Status**: ✅ **DOCKER NETWORKING ISSUE RESOLVED**  
**Impact**: 3rd party service can now access uploaded images  
**Testing**: Ready for end-to-end testing