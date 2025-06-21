#!/usr/bin/env node

/**
 * Test script for 3rd party image processing integration
 * This script tests the API call to the 3rd party service
 */

const http = require('http');

// Configuration
const THIRD_PARTY_URL = process.env.THIRD_PARTY_DETECTOR_URL || 'http://localhost:5001';
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TEST_IMAGE_URL = `${BASE_URL}/uploads/20250523-0919-71437.jpg`;

function testThirdPartyAPI() {
  console.log('🧪 Testing 3rd Party Image Processing Integration');
  console.log('================================================');
  console.log(`📡 API URL: ${THIRD_PARTY_URL}/detect_url`);
  console.log(`🖼️  Test Image: ${TEST_IMAGE_URL}`);
  console.log('');

  const postData = JSON.stringify({
    url: TEST_IMAGE_URL
  });

  const options = {
    hostname: 'localhost',
    port: 5001,
    path: '/detect_url',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  console.log('📤 Sending request to 3rd party service...');
  
  const req = http.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      console.log(`📥 Response Status: ${res.statusCode}`);
      console.log('📄 Response Headers:', res.headers);
      console.log('');

      if (res.statusCode === 200) {
        try {
          const response = JSON.parse(data);
          console.log('✅ SUCCESS: 3rd party service responded correctly');
          console.log('📊 Detection Results:');
          console.log(`   • Total codes detected: ${response.count}`);
          console.log(`   • Source URL: ${response.source_url}`);
          console.log(`   • Processed image: ${response.image_url}`);
          console.log('');
          
          if (response.detected_codes && response.detected_codes.length > 0) {
            console.log('🔍 Detected Codes:');
            response.detected_codes.forEach((code, index) => {
              console.log(`   ${index + 1}. Data: "${code.data}"`);
              console.log(`      Method: ${code.method}`);
              console.log(`      Type: ${code.type}`);
              console.log(`      Position: x=${code.position.x}, y=${code.position.y}, w=${code.position.width}, h=${code.position.height}`);
              console.log('');
            });
          }
          
          console.log('🎉 Integration test PASSED!');
          console.log('✨ The 3rd party service is working correctly and can be used by the application.');
          
        } catch (parseError) {
          console.log('❌ ERROR: Failed to parse response JSON');
          console.log('📄 Raw response:', data);
          console.log('🐛 Parse error:', parseError.message);
        }
      } else {
        console.log('❌ ERROR: 3rd party service returned error status');
        console.log('📄 Response body:', data);
      }
    });
  });

  req.on('error', (error) => {
    console.log('❌ ERROR: Failed to connect to 3rd party service');
    console.log('🔗 Make sure the service is running on http://localhost:5001');
    console.log('🐛 Error details:', error.message);
    console.log('');
    console.log('💡 To start the 3rd party service:');
    console.log('   1. Make sure Docker is running');
    console.log('   2. The service should be available on the same network');
    console.log('   3. Test manually with: curl -X POST -H "Content-Type: application/json" -d \'{"url":"' + TEST_IMAGE_URL + '"}\' http://localhost:5001/detect_url');
  });

  req.write(postData);
  req.end();
}

// Run the test
testThirdPartyAPI();