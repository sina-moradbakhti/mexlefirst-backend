import { MatrixCodeDetectorService } from './services/matrix-code-detector.service';
import * as path from 'path';
import * as fs from 'fs/promises';

/**
 * Test script for the enhanced DataMatrix detection
 */
async function testDataMatrixDetection() {
  console.log('Testing enhanced DataMatrix detection...');
  
  // Create output directory if it doesn't exist
  const outputDir = path.join(__dirname, '../../output');
  try {
    await fs.mkdir(outputDir, { recursive: true });
  } catch (error) {
    console.error(`Error creating output directory: ${error.message}`);
  }
  
  // Initialize the service
  const detectorService = new MatrixCodeDetectorService();
  
  // Check if image path is provided as command line argument
  const imagePath = process.argv[2] || path.join(__dirname, '../../uploads/20250531-1844-54747.jpg');
  
  console.log(`Processing image: ${imagePath}`);
  
  try {
    // Process the image
    const result = await detectorService.processImage(imagePath, outputDir);
    
    if (result.success) {
      console.log('Detection successful!');
      console.log(`Total codes detected: ${result.totalCodes}`);
      console.log(`Readable codes: ${result.readableCodes}`);
      console.log(`Unreadable codes: ${result.unreadableCodes}`);
      console.log(`Processed image saved to: ${result.processedImagePath}`);
      console.log('\nDetected codes:');
      
      result.detectedCodes?.forEach((code, index) => {
        console.log(`\nCode #${index + 1}:`);
        console.log(`  Data: ${code.data}`);
        console.log(`  Readable: ${code.readable}`);
        console.log(`  Confidence: ${code.confidence}`);
        console.log(`  Points: ${JSON.stringify(code.points)}`);
      });
      
      console.log('\nReport:');
      console.log(result.report);
    } else {
      console.error(`Detection failed: ${result.error}`);
    }
  } catch (error) {
    console.error('Error during detection:', error);
  }
}

// Run the test
testDataMatrixDetection().catch(console.error);