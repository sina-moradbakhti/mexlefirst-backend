import { Injectable, Logger } from '@nestjs/common';
import * as sharp from 'sharp';
import * as fs from 'fs/promises';
import * as path from 'path';
import { BrowserDatamatrixCodeReader, BrowserMultiFormatReader, BarcodeFormat } from '@zxing/browser';
import { createCanvas, loadImage, Image } from 'canvas';
import { DecodeHintType } from '@zxing/library';
import * as jsQR from 'jsqr';

interface DetectedCode {
  data: string;
  points: Array<{ x: number; y: number }>;
  readable: boolean;
  confidence: number;
  detectionMethod?: string;  // Added to track which method detected the code
  preprocessingType?: string; // Added to track which preprocessing was used
}

interface ProcessingResult {
  success: boolean;
  processedImagePath?: string;
  detectedCodes?: DetectedCode[];
  report?: string;
  totalCodes?: number;
  readableCodes?: number;
  unreadableCodes?: number;
  error?: string;
}

@Injectable()
export class MatrixCodeDetectorService {
  private readonly logger = new Logger(MatrixCodeDetectorService.name);

  /**
   * Process uploaded photo to detect Matrix codes
   * @param imagePath - Path to the uploaded image
   * @param outputDir - Directory to save processed image
   * @returns Analysis result
   */
  async processImage(imagePath: string, outputDir: string): Promise<ProcessingResult> {
    try {
      this.logger.log(`Processing image: ${imagePath}`);

      // Read the image
      const imageBuffer = await fs.readFile(imagePath);
      
      // Detect DataMatrix codes
      const detectedCodes = await this.detectDataMatrixCodes(imageBuffer);
      
      // Log detailed information about detected codes
      this.logDecodedDataMatrixCodes(detectedCodes);
      
      // Create output filename
      const inputFilename = path.basename(imagePath);
      const outputFilename = `processed_${Date.now()}_${inputFilename}`;
      const outputPath = path.join(outputDir, outputFilename);

      // Create highlighted image
      const processedImageBuffer = await this.createHighlightedImage(
        imageBuffer,
        detectedCodes
      );

      // Save the processed image
      await fs.writeFile(outputPath, processedImageBuffer);

      // Generate report
      const report = this.generateReport(detectedCodes);

      return {
        success: true,
        processedImagePath: outputPath,
        detectedCodes: detectedCodes,
        report: report,
        totalCodes: detectedCodes.length,
        readableCodes: detectedCodes.filter(code => code.readable).length,
        unreadableCodes: detectedCodes.filter(code => !code.readable).length
      };
    } catch (error) {
      this.logger.error(`Error processing image: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Detect DataMatrix codes in the image
   * @param imageBuffer - Image buffer
   * @returns Array of detected codes
   */
  private async detectDataMatrixCodes(imageBuffer: Buffer): Promise<DetectedCode[]> {
    try {
      // Try multiple detection methods and combine results
      const detectedCodes: DetectedCode[] = [];
      
      // Method 1: ZXing Library (original method)
      try {
        const zxingCodes = await this.detectWithZXingLibrary(imageBuffer);
        this.logger.log(`ZXing detection found ${zxingCodes.length} codes`);
        
        // Add unique codes to results with detection method
        for (const code of zxingCodes) {
          if (!this.isDuplicateCode(detectedCodes, code)) {
            code.detectionMethod = 'ZXing';
            detectedCodes.push(code);
          }
        }
      } catch (error) {
        this.logger.error(`ZXing detection error: ${error.message}`);
      }
      
      // Method 2: Enhanced detection with preprocessing (inspired by Python approach)
      try {
        const enhancedCodes = await this.detectWithEnhancedProcessing(imageBuffer);
        this.logger.log(`Enhanced detection found ${enhancedCodes.length} codes`);
        
        // Add unique codes to results with detection method
        for (const code of enhancedCodes) {
          if (!this.isDuplicateCode(detectedCodes, code)) {
            code.detectionMethod = 'Enhanced';
            detectedCodes.push(code);
          }
        }
      } catch (error) {
        this.logger.error(`Enhanced detection error: ${error.message}`);
      }
      
      // Method 3: jsQR for QR codes that might be misidentified as DataMatrix
      try {
        const jsqrCodes = await this.detectWithJsQR(imageBuffer);
        this.logger.log(`jsQR detection found ${jsqrCodes.length} codes`);
        
        // Add unique codes to results with detection method
        for (const code of jsqrCodes) {
          if (!this.isDuplicateCode(detectedCodes, code)) {
            code.detectionMethod = 'jsQR';
            detectedCodes.push(code);
          }
        }
      } catch (error) {
        this.logger.error(`jsQR detection error: ${error.message}`);
      }
      
      this.logger.log(`Total unique codes detected: ${detectedCodes.length}`);
      
      // If no codes detected with any method, return empty array
      if (detectedCodes.length === 0) {
        this.logger.log('No DataMatrix codes detected in the image');
        return [];
      }
      
      return detectedCodes;
    } catch (error) {
      this.logger.error(`All detection methods failed: ${error.message}`);
      // Return empty array instead of simulating
      return [];
    }
  }
  
  /**
   * Check if a code is a duplicate of any existing code
   */
  private isDuplicateCode(existingCodes: DetectedCode[], newCode: DetectedCode): boolean {
    return existingCodes.some(existing => this.isOverlapping(existing.points, newCode.points));
  }
  
  /**
   * Detect DataMatrix codes using enhanced image processing techniques
   * Inspired by the Python approach with multiple preprocessing steps
   */
  private async detectWithEnhancedProcessing(imageBuffer: Buffer): Promise<DetectedCode[]> {
    const detectedCodes: DetectedCode[] = [];
    
    try {
      // Get image metadata
      const metadata = await sharp(imageBuffer).metadata();
      const { width, height } = metadata;
      
      // Apply multiple preprocessing techniques similar to the Python approach
      const preprocessingMethods = [
        // Method 1: CLAHE-like contrast enhancement
        async () => {
          const enhanced = await sharp(imageBuffer)
            .grayscale()
            .normalize()
            .gamma(1.5)  // Increase contrast
            .toBuffer();
          return { name: 'CLAHE-like', buffer: enhanced };
        },
        
        // Method 2: Gaussian blur to reduce noise
        async () => {
          const blurred = await sharp(imageBuffer)
            .grayscale()
            .blur(1.5)  // Similar to GaussianBlur in OpenCV
            .normalize()
            .toBuffer();
          return { name: 'Gaussian', buffer: blurred };
        },
        
        // Method 3: Threshold to create binary image
        async () => {
          const binary = await sharp(imageBuffer)
            .grayscale()
            .threshold(128)  // Binary threshold
            .toBuffer();
          return { name: 'Threshold', buffer: binary };
        },
        
        // Method 4: Inverted image (negative)
        async () => {
          const inverted = await sharp(imageBuffer)
            .grayscale()
            .negate()  // Invert colors
            .toBuffer();
          return { name: 'Inverted', buffer: inverted };
        },
        
        // Method 5: Sharpen to enhance edges
        async () => {
          const sharpened = await sharp(imageBuffer)
            .grayscale()
            .sharpen(1.5, 1, 1.5)  // Enhance edges
            .toBuffer();
          return { name: 'Sharpened', buffer: sharpened };
        }
      ];
      
      // Process with each method and try to detect codes
      for (const preprocessMethod of preprocessingMethods) {
        try {
          const { name, buffer } = await preprocessMethod();
          
          // Load the preprocessed image
          const image = await loadImage(buffer);
          
          // Create canvas for detection
          const canvas = createCanvas(width, height);
          const ctx = canvas.getContext('2d');
          ctx.drawImage(image, 0, 0, width, height);
          
          // Set up DataMatrix reader with hints
          const hints = new Map();
          hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.DATA_MATRIX, BarcodeFormat.QR_CODE]);
          hints.set(DecodeHintType.TRY_HARDER, true);
          
          const dataMatrixReader = new BrowserDatamatrixCodeReader(hints);
          const multiFormatReader = new BrowserMultiFormatReader(hints);
          
          // Try to detect with both readers
          try {
            const results = await this.detectWithZXing(canvas, dataMatrixReader, multiFormatReader);
            
            if (results.length > 0) {
              this.logger.log(`Found ${results.length} codes with ${name} preprocessing`);
              
              for (const result of results) {
                const isDuplicate = detectedCodes.some(existing => 
                  this.isOverlapping(existing.points, result.points)
                );
                
                if (!isDuplicate) {
                  // Add preprocessing method to data for debugging
                  const enhancedResult = {
                    ...result,
                    data: result.data + ` (${name})`,
                    preprocessingType: name
                  };
                  detectedCodes.push(enhancedResult);
                }
              }
            }
          } catch (error) {
            this.logger.debug(`Error detecting with ${name} preprocessing: ${error.message}`);
          }
        } catch (error) {
          this.logger.debug(`Error in ${preprocessMethod.name} preprocessing: ${error.message}`);
        }
      }
      
      return detectedCodes;
    } catch (error) {
      this.logger.error(`Enhanced processing error: ${error.message}`);
      return [];
    }
  }
  
  /**
   * Detect QR codes using jsQR library
   * This can help catch codes that might be misidentified
   */
  private async detectWithJsQR(imageBuffer: Buffer): Promise<DetectedCode[]> {
    try {
      // Convert image to raw RGBA pixels for jsQR
      const { data, info } = await sharp(imageBuffer)
        .ensureAlpha()  // Make sure we have an alpha channel
        .raw()
        .toBuffer({ resolveWithObject: true });
      
      // jsQR requires RGBA data
      const code = jsQR.default(new Uint8ClampedArray(data), info.width, info.height);
      
      if (code) {
        // Convert jsQR location points to our format
        const points = [
          { x: code.location.topLeftCorner.x, y: code.location.topLeftCorner.y },
          { x: code.location.topRightCorner.x, y: code.location.topRightCorner.y },
          { x: code.location.bottomRightCorner.x, y: code.location.bottomRightCorner.y },
          { x: code.location.bottomLeftCorner.x, y: code.location.bottomLeftCorner.y }
        ];
        
        return [{
          data: code.data,
          points,
          readable: true,
          confidence: 0.8  // Arbitrary confidence value
        }];
      }
      
      return [];
    } catch (error) {
      this.logger.error(`jsQR detection error: ${error.message}`);
      return [];
    }
  }
  
  /**
   * Detect DataMatrix codes using ZXing library
   */
  private async detectWithZXingLibrary(imageBuffer: Buffer): Promise<DetectedCode[]> {
    
    const detectedCodes: DetectedCode[] = [];
    
    try {
      // Load image metadata
      const metadata = await sharp(imageBuffer).metadata();
      
      // Load image for canvas
      const image = await loadImage(imageBuffer);
      
      // Create a canvas for ZXing to use
      const canvasInstance = createCanvas(metadata.width, metadata.height);
      const ctx = canvasInstance.getContext('2d');
      ctx.drawImage(image, 0, 0);
      
      // Set up DataMatrix reader with hints
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.DATA_MATRIX, BarcodeFormat.QR_CODE]);
      hints.set(DecodeHintType.TRY_HARDER, true);
      
      const dataMatrixReader = new BrowserDatamatrixCodeReader(hints);
      const multiFormatReader = new BrowserMultiFormatReader(hints);
      
      // Try to detect DataMatrix codes
      const results = await this.detectWithZXing(canvasInstance, dataMatrixReader, multiFormatReader);
      
      if (results.length > 0) {
        this.logger.log(`Found ${results.length} codes with ZXing`);
        
        // Add unique codes to the results
        for (const result of results) {
          // Check if this code is already detected (by position)
          const isDuplicate = detectedCodes.some(existing => 
            this.isOverlapping(existing.points, result.points)
          );
          
          if (!isDuplicate) {
            detectedCodes.push(result);
          }
        }
      }
      
      // If no codes detected, try with preprocessed images
      if (detectedCodes.length === 0) {
        this.logger.log('No codes detected with direct method, trying preprocessing...');
        
        // Try with different preprocessing techniques specifically for DataMatrix codes
        const preprocessingOptions = [
          { name: 'contrast', process: async (buf: Buffer) => 
            sharp(buf).gamma(2.2).linear(1.1, -0.1).toBuffer() 
          },
          { name: 'sharpen', process: async (buf: Buffer) => 
            sharp(buf).sharpen(2).toBuffer() 
          },
          { name: 'normalize', process: async (buf: Buffer) => 
            sharp(buf).normalize().toBuffer() 
          },
          { name: 'threshold', process: async (buf: Buffer) => 
            sharp(buf).grayscale().threshold(128).toBuffer() 
          },
          { name: 'adaptive-threshold', process: async (buf: Buffer) => {
            // Simulate adaptive thresholding using sharp
            const metadata = await sharp(buf).metadata();
            const { data } = await sharp(buf)
              .grayscale()
              .raw()
              .toBuffer({ resolveWithObject: true });
            
            // Apply a simple adaptive threshold
            const width = metadata.width;
            const blockSize = 11; // Must be odd
            const C = 2; // Constant subtracted from mean
            
            // Create output buffer
            const output = Buffer.alloc(data.length);
            
            // Apply adaptive threshold
            for (let y = 0; y < metadata.height; y++) {
              for (let x = 0; x < width; x++) {
                // Calculate local mean
                let sum = 0;
                let count = 0;
                
                for (let dy = -blockSize/2; dy <= blockSize/2; dy++) {
                  for (let dx = -blockSize/2; dx <= blockSize/2; dx++) {
                    const nx = x + dx;
                    const ny = y + dy;
                    
                    if (nx >= 0 && nx < width && ny >= 0 && ny < metadata.height) {
                      sum += data[ny * width + nx];
                      count++;
                    }
                  }
                }
                
                const mean = sum / count;
                const idx = y * width + x;
                output[idx] = data[idx] > mean - C ? 255 : 0;
              }
            }
            
            return sharp(output, {
              raw: {
                width: metadata.width,
                height: metadata.height,
                channels: 1
              }
            }).toBuffer();
          }}
        ];
        
        for (const option of preprocessingOptions) {
          try {
            const processedBuffer = await option.process(imageBuffer);
            const processedImage = await loadImage(processedBuffer);
            
            ctx.clearRect(0, 0, canvasInstance.width, canvasInstance.height);
            ctx.drawImage(processedImage, 0, 0, canvasInstance.width, canvasInstance.height);
            
            const results = await this.detectWithZXing(canvasInstance, dataMatrixReader, multiFormatReader);
            
            if (results.length > 0) {
              this.logger.log(`Found ${results.length} codes with ${option.name} preprocessing`);
              
              for (const result of results) {
                const isDuplicate = detectedCodes.some(existing => 
                  this.isOverlapping(existing.points, result.points)
                );
                
                if (!isDuplicate) {
                  detectedCodes.push(result);
                }
              }
            }
          } catch (error) {
            this.logger.debug(`Error with ${option.name} preprocessing: ${error.message}`);
          }
        }
      }
      
      this.logger.log(`Total unique codes detected: ${detectedCodes.length}`);
      
      // If still no codes detected, fall back to simulation
      if (detectedCodes.length === 0) {
        this.logger.log('No codes detected with ZXing');
        return [];
      }
      
      return detectedCodes;
      
    } catch (error) {
      this.logger.error(`Error in ZXing detection: ${error.message}`);
      // Return empty array instead of simulating
      return [];
    }
  }
  
  // Removed simulation methods as they are not needed for detecting real DataMatrix codes
  
  // Note: This function is already defined elsewhere in the file

  /**
   * Detect codes using ZXing library
   */
  private async detectWithZXing(
    canvas: any, 
    dataMatrixReader: BrowserDatamatrixCodeReader,
    multiFormatReader: BrowserMultiFormatReader
  ): Promise<DetectedCode[]> {
    const detectedCodes: DetectedCode[] = [];
    
    try {
      // Try DataMatrix specific reader first with different orientations
      let dataMatrixResults;
      try {
        dataMatrixResults = await dataMatrixReader.decodeFromCanvas(canvas);
      } catch (error) {
        // If direct detection fails, try with inverted image
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // Invert the image colors
        for (let i = 0; i < imageData.data.length; i += 4) {
          imageData.data[i] = 255 - imageData.data[i];       // R
          imageData.data[i + 1] = 255 - imageData.data[i + 1]; // G
          imageData.data[i + 2] = 255 - imageData.data[i + 2]; // B
        }
        
        ctx.putImageData(imageData, 0, 0);
        try {
          dataMatrixResults = await dataMatrixReader.decodeFromCanvas(canvas);
        } catch (innerError) {
          // If still fails, continue with multiformat reader
        }
      }
      
      if (dataMatrixResults) {
        const points = dataMatrixResults.getResultPoints().map(point => ({
          x: Math.round(point.getX()),
          y: Math.round(point.getY())
        }));
        
        // Ensure we have 4 points for a quadrilateral
        const formattedPoints = this.formatPoints(points);
        
        detectedCodes.push({
          data: dataMatrixResults.getText(),
          points: formattedPoints,
          readable: true,
          confidence: 0.9
        });
      }
      
      // Try multi-format reader as backup
      try {
        const multiResults = await multiFormatReader.decodeFromCanvas(canvas);
        
        if (multiResults) {
          const points = multiResults.getResultPoints().map(point => ({
            x: Math.round(point.getX()),
            y: Math.round(point.getY())
          }));
          
          // Check if this is a new code (not already detected)
          const isDuplicate = detectedCodes.some(existing => 
            this.isOverlapping(existing.points, this.formatPoints(points))
          );
          
          if (!isDuplicate) {
            detectedCodes.push({
              data: multiResults.getText(),
              points: this.formatPoints(points),
              readable: true,
              confidence: 0.85
            });
          }
        }
      } catch (error) {
        // Ignore errors from multi-format reader
      }
      
    } catch (error) {
      // If detection fails, we'll return an empty array
      this.logger.debug(`ZXing detection error: ${error.message}`);
    }
    
    return detectedCodes;
  }
  
  /**
   * Format points to ensure we have exactly 4 points for a quadrilateral
   */
  private formatPoints(points: Array<{x: number, y: number}>): Array<{x: number, y: number}> {
    if (points.length === 4) {
      return points;
    }
    
    // If we have 3 points (common with DataMatrix), calculate the 4th
    if (points.length === 3) {
      // Calculate the 4th point to form a parallelogram
      const p0 = points[0];
      const p1 = points[1];
      const p2 = points[2];
      
      // The 4th point is calculated to form a parallelogram
      const p3 = {
        x: p0.x + (p2.x - p1.x),
        y: p0.y + (p2.y - p1.y)
      };
      
      return [p0, p1, p2, p3];
    }
    
    // If we have 2 points, assume it's opposite corners of a rectangle
    if (points.length === 2) {
      const p0 = points[0];
      const p1 = points[1];
      
      return [
        p0,
        { x: p1.x, y: p0.y },
        p1,
        { x: p0.x, y: p1.y }
      ];
    }
    
    // If we have more than 4 or less than 2, use convex hull or fallback
    if (points.length > 4) {
      // Use the first 4 points as an approximation
      return points.slice(0, 4);
    }
    
    // Fallback for insufficient points
    if (points.length === 1) {
      const p = points[0];
      const size = 30; // Arbitrary size
      
      return [
        { x: p.x - size/2, y: p.y - size/2 },
        { x: p.x + size/2, y: p.y - size/2 },
        { x: p.x + size/2, y: p.y + size/2 },
        { x: p.x - size/2, y: p.y + size/2 }
      ];
    }
    
    // Empty array fallback
    return [
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 50, y: 50 },
      { x: 0, y: 50 }
    ];
  }
  
  /**
   * Check if two sets of points overlap significantly
   */
  private isOverlapping(points1: Array<{x: number, y: number}>, points2: Array<{x: number, y: number}>): boolean {
    // Calculate centroids
    const centroid1 = {
      x: points1.reduce((sum, p) => sum + p.x, 0) / points1.length,
      y: points1.reduce((sum, p) => sum + p.y, 0) / points1.length
    };
    
    const centroid2 = {
      x: points2.reduce((sum, p) => sum + p.x, 0) / points2.length,
      y: points2.reduce((sum, p) => sum + p.y, 0) / points2.length
    };
    
    // Calculate average size
    const size1 = Math.sqrt(
      Math.pow(points1[0].x - points1[2].x, 2) + 
      Math.pow(points1[0].y - points1[2].y, 2)
    );
    
    const size2 = Math.sqrt(
      Math.pow(points2[0].x - points2[2].x, 2) + 
      Math.pow(points2[0].y - points2[2].y, 2)
    );
    
    const avgSize = (size1 + size2) / 2;
    
    // Calculate distance between centroids
    const distance = Math.sqrt(
      Math.pow(centroid1.x - centroid2.x, 2) + 
      Math.pow(centroid1.y - centroid2.y, 2)
    );
    
    // If distance is less than half the average size, consider them overlapping
    return distance < (avgSize * 0.5);
  }

  /**
   * Create highlighted image with detected codes
   * Enhanced version inspired by the Python approach
   */
  private async createHighlightedImage(
    originalBuffer: Buffer,
    codes: DetectedCode[]
  ): Promise<Buffer> {
    try {
      if (codes.length === 0) {
        return originalBuffer; // No codes detected, return original
      }

      // Load the image to get dimensions
      const metadata = await sharp(originalBuffer).metadata();
      
      // Create SVG overlay for highlighting with different colors for different detection methods
      const overlays = codes.map((code, index) => {
        // Define colors based on readability and detection method
        let colorScheme;
        
        if (code.data.includes('CLAHE-like')) {
          colorScheme = { fill: 'rgba(0, 255, 0, 0.2)', stroke: 'rgb(0, 255, 0)', text: 'rgb(0, 100, 0)' };
        } else if (code.data.includes('Gaussian')) {
          colorScheme = { fill: 'rgba(0, 0, 255, 0.2)', stroke: 'rgb(0, 0, 255)', text: 'rgb(0, 0, 150)' };
        } else if (code.data.includes('Threshold')) {
          colorScheme = { fill: 'rgba(255, 0, 255, 0.2)', stroke: 'rgb(255, 0, 255)', text: 'rgb(150, 0, 150)' };
        } else if (code.data.includes('Inverted')) {
          colorScheme = { fill: 'rgba(255, 165, 0, 0.2)', stroke: 'rgb(255, 165, 0)', text: 'rgb(180, 95, 0)' };
        } else if (code.data.includes('Sharpened')) {
          colorScheme = { fill: 'rgba(255, 0, 0, 0.2)', stroke: 'rgb(255, 0, 0)', text: 'rgb(150, 0, 0)' };
        } else {
          // Default colors based on readability
          colorScheme = code.readable 
            ? { fill: 'rgba(0, 255, 0, 0.2)', stroke: 'rgb(0, 255, 0)', text: 'rgb(0, 100, 0)' }
            : { fill: 'rgba(255, 255, 0, 0.2)', stroke: 'rgb(255, 255, 0)', text: 'rgb(150, 100, 0)' };
        }
        
        const { fill: fillColor, stroke: strokeColor, text: textColor } = colorScheme;
        
        // Get the points for the polygon/rectangle
        const points = code.points;
        
        // Calculate the bounding box
        const minX = Math.min(...points.map(p => p.x));
        const minY = Math.min(...points.map(p => p.y));
        const maxX = Math.max(...points.map(p => p.x));
        const maxY = Math.max(...points.map(p => p.y));
        
        // Calculate dimensions
        const width = maxX - minX;
        const height = maxY - minY;
        
        // Calculate center for text placement
        const centerX = minX + width / 2;
        const centerY = minY + height / 2;
        
        // Format the data for display (truncate if too long)
        const displayData = code.data.length > 20 
          ? code.data.substring(0, 17) + '...' 
          : code.data;
        
        // Create polygon points string for exact shape highlighting
        const polygonPoints = points.map(p => `${p.x},${p.y}`).join(' ');
        
        // Create a more prominent highlight with multiple elements
        return `
          <g>
            <!-- Exact polygon shape (if 4 points available) -->
            <polygon 
              points="${polygonPoints}" 
              fill="${fillColor}" 
              stroke="${strokeColor}" 
              stroke-width="3"
            />
            
            <!-- Corner markers for better visibility -->
            ${points.map(p => `<circle cx="${p.x}" cy="${p.y}" r="4" fill="${strokeColor}" />`).join('')}
            
            <!-- Label background for better readability -->
            <rect 
              x="${centerX - 70}" 
              y="${minY - 25}" 
              width="140" 
              height="20" 
              rx="5" 
              ry="5" 
              fill="white" 
              fill-opacity="0.8"
            />
            
            <!-- Label text -->
            <text 
              x="${centerX}" 
              y="${minY - 10}" 
              fill="${textColor}" 
              font-size="12" 
              font-weight="bold" 
              text-anchor="middle"
            >
              DM${index + 1}: ${displayData}
            </text>
            
            <!-- Confidence indicator -->
            <rect 
              x="${minX}" 
              y="${maxY + 5}" 
              width="${width * code.confidence}" 
              height="3" 
              fill="${strokeColor}" 
            />
            
            <!-- Diagonal cross for unreadable codes -->
            ${!code.readable ? `
              <line x1="${minX}" y1="${minY}" x2="${maxX}" y2="${maxY}" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="5,5" />
              <line x1="${maxX}" y1="${minY}" x2="${minX}" y2="${maxY}" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="5,5" />
            ` : ''}
          </g>
        `;
      }).join('');

      // Create a border around the entire image for context
      const imageBorder = `
        <rect 
          x="0" 
          y="0" 
          width="${metadata.width}" 
          height="${metadata.height}" 
          fill="none" 
          stroke="blue" 
          stroke-width="2" 
          stroke-opacity="0.5"
        />
      `;

      // Add a more detailed legend at the bottom of the image
      const legendHeight = 60;
      const legend = `
        <g transform="translate(10, ${metadata.height - legendHeight + 10})">
          <!-- Background for legend -->
          <rect x="0" y="-5" width="${metadata.width - 20}" height="${legendHeight}" fill="white" fill-opacity="0.7" rx="5" ry="5" />
          
          <!-- Detection method indicators -->
          <rect x="10" y="0" width="15" height="15" fill="rgba(0, 255, 0, 0.2)" stroke="rgb(0, 255, 0)" stroke-width="2" />
          <text x="30" y="12" fill="black" font-size="12">Standard/CLAHE</text>
          
          <rect x="150" y="0" width="15" height="15" fill="rgba(0, 0, 255, 0.2)" stroke="rgb(0, 0, 255)" stroke-width="2" />
          <text x="170" y="12" fill="black" font-size="12">Gaussian</text>
          
          <rect x="250" y="0" width="15" height="15" fill="rgba(255, 0, 255, 0.2)" stroke="rgb(255, 0, 255)" stroke-width="2" />
          <text x="270" y="12" fill="black" font-size="12">Threshold</text>
          
          <rect x="350" y="0" width="15" height="15" fill="rgba(255, 165, 0, 0.2)" stroke="rgb(255, 165, 0)" stroke-width="2" />
          <text x="370" y="12" fill="black" font-size="12">Inverted</text>
          
          <rect x="450" y="0" width="15" height="15" fill="rgba(255, 0, 0, 0.2)" stroke="rgb(255, 0, 0)" stroke-width="2" />
          <text x="470" y="12" fill="black" font-size="12">Sharpened</text>
          
          <!-- Readability indicators -->
          <rect x="10" y="25" width="15" height="15" fill="rgba(0, 255, 0, 0.2)" stroke="rgb(0, 255, 0)" stroke-width="2" />
          <text x="30" y="37" fill="black" font-size="12">Readable</text>
          
          <rect x="150" y="25" width="15" height="15" fill="rgba(255, 255, 0, 0.2)" stroke="rgb(255, 255, 0)" stroke-width="2" />
          <line x1="150" y1="25" x2="165" y2="40" stroke="rgb(255, 255, 0)" stroke-width="2" stroke-dasharray="2,2" />
          <line x1="165" y1="25" x2="150" y2="40" stroke="rgb(255, 255, 0)" stroke-width="2" stroke-dasharray="2,2" />
          <text x="170" y="37" fill="black" font-size="12">Unreadable</text>
          
          <!-- Summary -->
          <text x="${metadata.width - 250}" y="25" fill="black" font-size="14" font-weight="bold">
            Total: ${codes.length} DataMatrix codes
          </text>
          <text x="${metadata.width - 250}" y="45" fill="black" font-size="12">
            Readable: ${codes.filter(c => c.readable).length}, 
            Unreadable: ${codes.filter(c => !c.readable).length}
          </text>
        </g>
      `;

      const svgOverlay = `
        <svg width="${metadata.width}" height="${metadata.height}" xmlns="http://www.w3.org/2000/svg">
          ${imageBorder}
          ${overlays}
          ${legend}
        </svg>
      `;

      // Composite the overlay onto the original image
      const result = await sharp(originalBuffer)
        .composite([
          {
            input: Buffer.from(svgOverlay),
            top: 0,
            left: 0
          }
        ])
        .jpeg({ quality: 95 })
        .toBuffer();

      return result;
    } catch (error) {
      this.logger.error(`Error creating highlighted image: ${error.message}`, error.stack);
      // Return original image if highlighting fails
      return originalBuffer;
    }
  }

  /**
   * Log detailed information about decoded DataMatrix codes
   */
  private logDecodedDataMatrixCodes(codes: DetectedCode[]): void {
    this.logger.log(`===== DATAMATRIX DECODING RESULTS =====`);
    this.logger.log(`Total codes detected: ${codes.length}`);
    
    if (codes.length === 0) {
      this.logger.log(`No DataMatrix codes detected.`);
      return;
    }
    
    // Log each detected code with detailed information
    if (codes.length > 0) {
      this.logger.log(`\n----- DETECTED DATAMATRIX CODES -----`);
      
      codes.forEach((code, index) => {
        this.logger.log(`\nDataMatrix #${index + 1}:`);
        
        // Extract method information if present in the data
        let decodedData = code.data;
        let detectionMethod = code.detectionMethod || 'Unknown';
        
        const methodMatch = code.data.match(/\s*\(([^)]+)\)$/);
        if (methodMatch) {
          detectionMethod = methodMatch[1];
          decodedData = code.data.substring(0, code.data.length - methodMatch[0].length);
        }
        
        this.logger.log(`  Raw Data: ${code.data}`);
        this.logger.log(`  Decoded Data: ${decodedData}`);
        this.logger.log(`  Detection Method: ${detectionMethod}`);
        this.logger.log(`  Confidence: ${code.confidence.toFixed(2)}`);
        this.logger.log(`  Readable: ${code.readable}`);
        
        // Try to interpret the data
        this.interpretDataMatrixContent(decodedData);
        
        // Log position information
        const points = code.points;
        if (points && points.length > 0) {
          const minX = Math.min(...points.map(p => p.x));
          const minY = Math.min(...points.map(p => p.y));
          const maxX = Math.max(...points.map(p => p.x));
          const maxY = Math.max(...points.map(p => p.y));
          
          this.logger.log(`  Position: (${minX},${minY}) to (${maxX},${maxY}), size: ${maxX-minX}x${maxY-minY}px`);
        }
      });
    }
    
    this.logger.log(`===== END OF DATAMATRIX DECODING RESULTS =====`);
  }
  
  /**
   * Attempt to interpret the content of a DataMatrix code
   */
  private interpretDataMatrixContent(data: string): void {
    try {
      // Check for common DataMatrix content patterns
      
      // 1. Check if it's a URL
      if (/^https?:\/\//i.test(data)) {
        this.logger.log(`  Content Type: URL`);
        return;
      }
      
      // 2. Check if it's a GS1 formatted code (starts with ]d2)
      if (data.startsWith(']d2')) {
        this.logger.log(`  Content Type: GS1 DataMatrix`);
        // Parse GS1 format (beyond scope of this example)
        return;
      }
      
      // 3. Check if it's a serial number pattern
      if (/^[A-Z0-9]{4,}-[A-Z0-9]{4,}(-[A-Z0-9]{4,})*$/i.test(data)) {
        this.logger.log(`  Content Type: Serial Number / Product Code`);
        return;
      }
      
      // 4. Check if it's numeric only
      if (/^[0-9]+$/.test(data)) {
        this.logger.log(`  Content Type: Numeric Data`);
        // Check if it might be a GTIN/EAN
        if (data.length === 8 || data.length === 12 || data.length === 13 || data.length === 14) {
          this.logger.log(`  Possible GTIN/EAN/UPC format`);
        }
        return;
      }
      
      // 5. Check if it's alphanumeric
      if (/^[A-Z0-9]+$/i.test(data)) {
        this.logger.log(`  Content Type: Alphanumeric Code`);
        return;
      }
      
      // 6. Check if it contains control characters (binary data)
      if (/[\x00-\x1F\x7F-\xFF]/.test(data)) {
        this.logger.log(`  Content Type: Binary Data`);
        return;
      }
      
      // 7. Default to plain text
      this.logger.log(`  Content Type: Plain Text`);
      
    } catch (error) {
      this.logger.debug(`Error interpreting DataMatrix content: ${error.message}`);
    }
  }
  
  /**
   * Generate report based on detection results
   */
  private generateReport(codes: DetectedCode[]): string {
    const totalCodes = codes.length;
    const readableCodes = codes.filter(code => code.readable).length;
    const unreadableCodes = totalCodes - readableCodes;

    if (totalCodes === 0) {
      return "Bot: No DataMatrix codes detected in your image. Please ensure your components are visible and try again with better lighting and focus.";
    }

    if (unreadableCodes === 0) {
      if (totalCodes === 1) {
        return "Bot: The DataMatrix code on your component is readable! Please wait for the final report...";
      } else {
        return `Bot: All ${totalCodes} DataMatrix codes on your components are readable! Please wait for the final report...`;
      }
    } else {
      // Calculate readability percentage
      const readablePercentage = Math.round((readableCodes / totalCodes) * 100);
      
      // Provide more detailed feedback based on readability percentage
      if (readablePercentage >= 75) {
        return `Bot: Found ${totalCodes} components with DataMatrix codes. ${readableCodes} are readable (${readablePercentage}%), but ${unreadableCodes} ${unreadableCodes === 1 ? 'is' : 'are'} not clear enough. Try improving the lighting or focus for the highlighted components.`;
      } else if (readablePercentage >= 50) {
        return `Bot: Found ${totalCodes} components with DataMatrix codes. Only ${readableCodes} out of ${totalCodes} (${readablePercentage}%) are readable. Please try again with better lighting and make sure all components are clearly visible.`;
      } else {
        return `Bot: Found ${totalCodes} components, but most DataMatrix codes (${unreadableCodes} out of ${totalCodes}) are not readable. Please take a new photo with better lighting, proper focus, and ensure all components are clearly visible.`;
      }
    }
  }

  // Removed fallback detection methods as they are not needed for detecting real DataMatrix codes
  
  // Removed filterOverlappingRegions as it was only used for simulation
}