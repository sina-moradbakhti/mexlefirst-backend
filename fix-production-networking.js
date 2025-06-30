#!/usr/bin/env node

/**
 * Production Networking Fix Script
 * 
 * This script helps identify and fix networking issues between your NestJS app
 * and the 3rd party DataMatrix detection service in production.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

console.log('🔧 Production Networking Fix Script');
console.log('=====================================\n');

// Test different networking options for production
const networkingOptions = [
  {
    name: 'Server IP Address (Recommended)',
    url: 'http://168.119.181.146:5001',
    description: 'Your server\'s actual IP address'
  },
  {
    name: 'Docker Bridge Gateway (Linux)',
    url: 'http://172.17.0.1:5001',
    description: 'Default Docker bridge network gateway IP'
  },
  {
    name: 'Host Docker Internal (Docker Desktop)',
    url: 'http://host.docker.internal:5001',
    description: 'Docker Desktop host gateway (macOS/Windows)'
  },
  {
    name: 'Localhost (Same Host)',
    url: 'http://localhost:5001',
    description: 'Direct localhost access (if not in container)'
  },
  {
    name: 'Loopback IP',
    url: 'http://127.0.0.1:5001',
    description: 'Loopback interface access'
  }
];

/**
 * Test connectivity to a URL
 */
function testConnectivity(option) {
  return new Promise((resolve) => {
    console.log(`🧪 Testing: ${option.name}`);
    console.log(`   URL: ${option.url}`);
    console.log(`   Description: ${option.description}`);
    
    const startTime = Date.now();
    
    // Test health endpoint
    const healthUrl = `${option.url}/health`;
    
    const req = http.get(healthUrl, { timeout: 5000 }, (res) => {
      const duration = Date.now() - startTime;
      
      if (res.statusCode === 200) {
        console.log(`   ✅ SUCCESS (${duration}ms) - Status: ${res.statusCode}`);
        resolve({ ...option, success: true, duration, statusCode: res.statusCode });
      } else {
        console.log(`   ❌ FAILED - Status: ${res.statusCode}`);
        resolve({ ...option, success: false, statusCode: res.statusCode });
      }
    });
    
    req.on('timeout', () => {
      console.log(`   ⏰ TIMEOUT (5000ms)`);
      req.destroy();
      resolve({ ...option, success: false, error: 'timeout' });
    });
    
    req.on('error', (error) => {
      console.log(`   ❌ ERROR: ${error.message}`);
      resolve({ ...option, success: false, error: error.message });
    });
    
    console.log('');
  });
}

/**
 * Update environment file with the best networking option
 */
function updateEnvironmentFile(bestOption) {
  const envPath = path.join(__dirname, '.env.production');
  
  try {
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // Update THIRD_PARTY_DETECTOR_URL
    const urlRegex = /THIRD_PARTY_DETECTOR_URL=.*/;
    const newUrl = `THIRD_PARTY_DETECTOR_URL=${bestOption.url}`;
    
    if (urlRegex.test(envContent)) {
      envContent = envContent.replace(urlRegex, newUrl);
    } else {
      envContent += `\n${newUrl}\n`;
    }
    
    // Add comment explaining the choice
    const comment = `# Auto-detected best networking option: ${bestOption.name}`;
    envContent = envContent.replace(newUrl, `${comment}\n${newUrl}`);
    
    fs.writeFileSync(envPath, envContent);
    
    console.log('📝 Updated .env.production with optimal networking configuration');
    console.log(`   Selected: ${bestOption.name}`);
    console.log(`   URL: ${bestOption.url}`);
    
  } catch (error) {
    console.error('❌ Failed to update .env.production:', error.message);
  }
}

/**
 * Generate Docker Compose networking recommendations
 */
function generateDockerRecommendations(results) {
  console.log('\n🐳 Docker Compose Networking Recommendations:');
  console.log('==============================================');
  
  const workingOptions = results.filter(r => r.success);
  
  if (workingOptions.length === 0) {
    console.log('❌ No networking options worked. Possible issues:');
    console.log('   1. 3rd party service is not running');
    console.log('   2. Port 5001 is not accessible');
    console.log('   3. Firewall blocking connections');
    console.log('   4. Different Docker network configuration needed');
    console.log('\n🔧 Try these solutions:');
    console.log('   1. Ensure datamatrix-service is running: docker ps');
    console.log('   2. Check service logs: docker logs datamatrix-service');
    console.log('   3. Test direct access: curl http://localhost:5001/health');
    return;
  }
  
  console.log('✅ Working networking options found:');
  workingOptions.forEach((option, index) => {
    console.log(`   ${index + 1}. ${option.name} (${option.duration}ms)`);
  });
  
  const bestOption = workingOptions.reduce((best, current) => 
    current.duration < best.duration ? current : best
  );
  
  console.log(`\n🏆 Recommended: ${bestOption.name}`);
  console.log(`   Fastest response: ${bestOption.duration}ms`);
  
  return bestOption;
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting networking tests...\n');
  
  // Test all networking options
  const results = [];
  for (const option of networkingOptions) {
    const result = await testConnectivity(option);
    results.push(result);
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    const duration = result.duration ? `(${result.duration}ms)` : '';
    console.log(`${status} ${result.name} ${duration}`);
  });
  
  // Generate recommendations
  const bestOption = generateDockerRecommendations(results);
  
  if (bestOption) {
    console.log('\n🔧 Applying fix...');
    updateEnvironmentFile(bestOption);
    
    console.log('\n✅ Fix applied successfully!');
    console.log('\n📋 Next steps:');
    console.log('   1. Rebuild and restart your containers:');
    console.log('      docker-compose down');
    console.log('      docker-compose up --build -d');
    console.log('   2. Test image upload functionality');
    console.log('   3. Check logs for successful 3rd party communication');
  }
  
  console.log('\n🎯 Expected log messages after fix:');
  console.log(`   [ThirdPartyDetectorService] API URL: ${bestOption?.url || '[DETECTED_URL]'}`);
  console.log('   [ThirdPartyDetectorService] 3rd party API response: X codes detected');
  console.log('\n🔍 If issues persist, check:');
  console.log('   - Docker container logs: docker logs backend');
  console.log('   - 3rd party service logs: docker logs datamatrix-service');
  console.log('   - Network connectivity: docker network ls');
}

// Run the script
main().catch(error => {
  console.error('💥 Script failed:', error.message);
  process.exit(1);
});