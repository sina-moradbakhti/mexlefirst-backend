#!/usr/bin/env node

/**
 * Quick Server Networking Test
 * Tests connectivity to DataMatrix service on your server (168.119.181.146)
 */

const http = require('http');

console.log('🧪 Testing DataMatrix Service Connectivity');
console.log('==========================================\n');

const testUrls = [
  'http://168.119.181.146:5001/health',  // Your server IP
  'http://localhost:5001/health',        // Localhost
  'http://127.0.0.1:5001/health'         // Loopback
];

async function testUrl(url) {
  return new Promise((resolve) => {
    console.log(`Testing: ${url}`);
    
    const startTime = Date.now();
    const req = http.get(url, { timeout: 5000 }, (res) => {
      const duration = Date.now() - startTime;
      console.log(`✅ SUCCESS - Status: ${res.statusCode} (${duration}ms)\n`);
      resolve(true);
    });
    
    req.on('timeout', () => {
      console.log(`⏰ TIMEOUT (5000ms)\n`);
      req.destroy();
      resolve(false);
    });
    
    req.on('error', (error) => {
      console.log(`❌ ERROR: ${error.message}\n`);
      resolve(false);
    });
  });
}

async function main() {
  console.log('🚀 Starting tests...\n');
  
  for (const url of testUrls) {
    await testUrl(url);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between tests
  }
  
  console.log('📋 Recommendations:');
  console.log('===================');
  console.log('1. If server IP (168.119.181.146) works: ✅ Use it in production');
  console.log('2. If localhost works: Use it only if both services are on same host');
  console.log('3. If none work: Check if DataMatrix service is running');
  console.log('\n🔧 To check DataMatrix service:');
  console.log('   docker ps | grep datamatrix');
  console.log('   docker logs datamatrix-service');
  console.log('   curl http://localhost:5001/health');
}

main().catch(console.error);