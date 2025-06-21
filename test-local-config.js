#!/usr/bin/env node

/**
 * Test script to verify local environment configuration
 */

require('dotenv').config({ path: '.env.development' });

console.log('🔧 Local Environment Configuration Test');
console.log('=====================================');
console.log('');

console.log('📋 Environment Variables:');
console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
console.log(`   PORT: ${process.env.PORT || 'not set'}`);
console.log(`   BASE_URL: ${process.env.BASE_URL || 'not set'}`);
console.log(`   THIRD_PARTY_DETECTOR_URL: ${process.env.THIRD_PARTY_DETECTOR_URL || 'not set'}`);
console.log(`   UPLOAD_DIR: ${process.env.UPLOAD_DIR || 'not set'}`);
console.log('');

// Test URL generation
const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
const uploadDir = (process.env.UPLOAD_DIR || 'uploads').replace(/^\.\//, '');
const testFilename = '20250523-0919-71437.jpg';
const testImageUrl = `${baseUrl}/${uploadDir}/${testFilename}`;

console.log('🔗 Generated URLs:');
console.log(`   Test Image URL: ${testImageUrl}`);
console.log(`   3rd Party API: ${process.env.THIRD_PARTY_DETECTOR_URL}/detect_url`);
console.log('');

// Validate configuration
let isValid = true;
const issues = [];

if (!process.env.BASE_URL) {
  issues.push('❌ BASE_URL not set in environment');
  isValid = false;
} else if (process.env.BASE_URL.includes('server.mexle.org') && process.env.NODE_ENV === 'development') {
  issues.push('⚠️  BASE_URL points to production server in development mode');
  isValid = false;
}

if (!process.env.THIRD_PARTY_DETECTOR_URL) {
  issues.push('❌ THIRD_PARTY_DETECTOR_URL not set in environment');
  isValid = false;
}

if (process.env.NODE_ENV === 'development' && process.env.BASE_URL && !process.env.BASE_URL.includes('localhost')) {
  issues.push('⚠️  BASE_URL should point to localhost in development mode');
}

console.log('✅ Configuration Validation:');
if (isValid && issues.length === 0) {
  console.log('   ✅ All configuration looks good!');
  console.log('   ✅ Ready for local testing');
} else {
  console.log('   Issues found:');
  issues.forEach(issue => console.log(`   ${issue}`));
}

console.log('');
console.log('💡 Expected behavior:');
console.log('   • Development: Images served from http://localhost:3000/uploads/');
console.log('   • Production: Images served from https://server.mexle.org/uploads/');
console.log('   • 3rd party service should be accessible on localhost:5001');