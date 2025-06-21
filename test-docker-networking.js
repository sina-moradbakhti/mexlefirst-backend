#!/usr/bin/env node

/**
 * Docker Networking Test Script
 * Helps determine the correct BASE_URL for your Docker setup
 */

const http = require('http');
const { execSync } = require('child_process');

console.log('🐳 Docker Networking Configuration Test');
console.log('=====================================');
console.log('');

// Get current environment
require('dotenv').config({ path: '.env.development' });
const currentBaseUrl = process.env.BASE_URL;
const port = process.env.PORT || '3000';

console.log('📋 Current Configuration:');
console.log(`   BASE_URL: ${currentBaseUrl}`);
console.log(`   PORT: ${port}`);
console.log('');

// Test different networking options
const networkingOptions = [
  {
    name: 'localhost (local only)',
    url: `http://localhost:${port}`,
    description: 'Works when both services run locally'
  },
  {
    name: 'host.docker.internal (Docker Desktop)',
    url: `http://host.docker.internal:${port}`,
    description: 'Works on Docker Desktop (Mac/Windows)'
  },
  {
    name: 'Docker bridge gateway',
    url: `http://172.17.0.1:${port}`,
    description: 'Default Docker bridge network gateway'
  }
];

// Try to get Docker bridge IP
try {
  const dockerBridgeIP = execSync("docker network inspect bridge --format='{{range .IPAM.Config}}{{.Gateway}}{{end}}'", { encoding: 'utf8' }).trim();
  if (dockerBridgeIP && dockerBridgeIP !== '172.17.0.1') {
    networkingOptions.push({
      name: 'Custom Docker bridge',
      url: `http://${dockerBridgeIP}:${port}`,
      description: 'Your Docker bridge gateway IP'
    });
  }
} catch (error) {
  console.log('ℹ️  Could not detect Docker bridge IP (Docker not running or not available)');
}

console.log('🔍 Testing Network Connectivity Options:');
console.log('');

async function testConnectivity(option) {
  return new Promise((resolve) => {
    const url = new URL(option.url);
    const req = http.request({
      hostname: url.hostname,
      port: url.port,
      path: '/uploads/',  // Test the uploads endpoint
      method: 'GET',
      timeout: 2000
    }, (res) => {
      resolve({ success: true, status: res.statusCode });
    });

    req.on('error', (error) => {
      resolve({ success: false, error: error.message });
    });

    req.on('timeout', () => {
      resolve({ success: false, error: 'Connection timeout' });
    });

    req.end();
  });
}

async function runTests() {
  for (const option of networkingOptions) {
    console.log(`Testing: ${option.name}`);
    console.log(`   URL: ${option.url}`);
    console.log(`   Description: ${option.description}`);
    
    const result = await testConnectivity(option);
    
    if (result.success) {
      console.log(`   ✅ SUCCESS - Server responded (status: ${result.status})`);
      if (option.url !== currentBaseUrl) {
        console.log(`   💡 Consider updating BASE_URL to: ${option.url}`);
      }
    } else {
      console.log(`   ❌ FAILED - ${result.error}`);
    }
    console.log('');
  }

  console.log('📝 Recommendations:');
  console.log('');
  
  if (currentBaseUrl && currentBaseUrl.includes('localhost')) {
    console.log('⚠️  Current BASE_URL uses localhost - this won\'t work if 3rd party service is in Docker');
    console.log('   Try: BASE_URL=http://host.docker.internal:' + port);
  }
  
  console.log('🔧 How to fix:');
  console.log('   1. Update .env.development with the working BASE_URL');
  console.log('   2. Restart your application');
  console.log('   3. Test image upload again');
  console.log('');
  
  console.log('🐳 Docker Setup Options:');
  console.log('   Option A: Run your app locally, 3rd party in Docker');
  console.log('   → Use: BASE_URL=http://host.docker.internal:' + port);
  console.log('');
  console.log('   Option B: Both services in same Docker network');
  console.log('   → Use: BASE_URL=http://backend:3001 (if backend service name is "backend")');
  console.log('');
  console.log('   Option C: Custom Docker bridge network');
  console.log('   → Use: BASE_URL=http://172.17.0.1:' + port + ' (or detected bridge IP)');
}

// Check if server is running first
console.log('🔍 Checking if your application server is running...');
testConnectivity({ url: `http://localhost:${port}` }).then(result => {
  if (result.success) {
    console.log('✅ Local server is running, proceeding with network tests...');
    console.log('');
    runTests();
  } else {
    console.log('❌ Local server is not running on port ' + port);
    console.log('   Please start your application first: npm run start:dev');
    console.log('   Then run this test again.');
  }
});