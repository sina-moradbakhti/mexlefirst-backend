#!/usr/bin/env node

/**
 * Auto-fix Docker networking configuration
 * Detects the correct BASE_URL and updates .env.development
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Auto-fixing Docker Networking Configuration');
console.log('===========================================');
console.log('');

const envPath = '.env.development';
const port = '3000'; // Default port

// Read current .env file
let envContent = '';
try {
  envContent = fs.readFileSync(envPath, 'utf8');
} catch (error) {
  console.log('❌ Could not read .env.development file');
  process.exit(1);
}

// Determine the best BASE_URL based on common scenarios
function getBestBaseUrl() {
  // Check if we're on macOS/Windows (Docker Desktop) or Linux
  const platform = process.platform;
  
  if (platform === 'darwin' || platform === 'win32') {
    // Docker Desktop - use host.docker.internal
    return `http://host.docker.internal:${port}`;
  } else {
    // Linux - use Docker bridge gateway
    return `http://172.17.0.1:${port}`;
  }
}

const newBaseUrl = getBestBaseUrl();

console.log('🔍 Detected platform:', process.platform);
console.log('💡 Recommended BASE_URL:', newBaseUrl);
console.log('');

// Update the BASE_URL in the env file
const updatedEnvContent = envContent.replace(
  /BASE_URL=.*/,
  `BASE_URL=${newBaseUrl}`
);

// Write back to file
try {
  fs.writeFileSync(envPath, updatedEnvContent);
  console.log('✅ Updated .env.development with new BASE_URL');
  console.log('');
  
  console.log('📋 Updated Configuration:');
  console.log(`   BASE_URL=${newBaseUrl}`);
  console.log('');
  
  console.log('🚀 Next Steps:');
  console.log('   1. Restart your application: npm run start:dev');
  console.log('   2. Test image upload again');
  console.log('   3. Check logs for successful 3rd party API calls');
  console.log('');
  
  console.log('🧪 To test the configuration:');
  console.log('   node test-docker-networking.js');
  
} catch (error) {
  console.log('❌ Could not update .env.development file:', error.message);
  process.exit(1);
}

console.log('');
console.log('ℹ️  Alternative configurations if this doesn\'t work:');
console.log('   • If both services in same Docker network: BASE_URL=http://backend:3001');
console.log('   • If running everything locally: BASE_URL=http://localhost:3000');
console.log('   • Custom Docker setup: Check your Docker network configuration');