import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';

interface ThirdPartyDetectedCode {
  data: string;
  method: string;
  position: {
    height: number;
    width: number;
    x: number;
    y: number;
  };
  type: string;
}

interface ThirdPartyResponse {
  count: number;
  detected_codes: ThirdPartyDetectedCode[];
  image_url: string;
  source_url: string;
}

interface DetectedCode {
  data: string;
  points: Array<{ x: number; y: number }>;
  readable: boolean;
  confidence: number;
  detectionMethod?: string;
  preprocessingType?: string;
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
export class ThirdPartyDetectorService {
  private readonly logger = new Logger(ThirdPartyDetectorService.name);
  private readonly thirdPartyApiUrl: string;

  constructor(private configService: ConfigService) {
    // Get the 3rd party API URL from config, default to localhost:5001
    this.thirdPartyApiUrl = this.configService.get<string>('THIRD_PARTY_DETECTOR_URL') || 'http://localhost:5001';
    
    // Log networking configuration for debugging
    const baseUrl = this.configService.get<string>('BASE_URL');
    this.logger.log(`3rd Party Detector Service initialized`);
    this.logger.log(`API URL: ${this.thirdPartyApiUrl}`);
    this.logger.log(`Base URL for images: ${baseUrl}`);
  }

  /**
   * Process uploaded photo using 3rd party service
   * @param imagePath - Path to the uploaded image
   * @param outputDir - Directory to save processed image
   * @returns Analysis result
   */
  async processImage(imagePath: string, outputDir: string): Promise<ProcessingResult> {
    try {
      this.logger.log(`Processing image with 3rd party service: ${imagePath}`);

      // Get the base URL for the uploaded image with fallback logic
      const baseUrl = await this.getAccessibleBaseUrl();
      const uploadDir = this.configService.get<string>('UPLOAD_DIR') || 'uploads';
      
      // Convert local file path to URL
      const filename = path.basename(imagePath);
      // Clean up upload directory path (remove ./ prefix if present)
      const cleanUploadDir = uploadDir.replace(/^\.\//, '');
      const imageUrl = `${baseUrl}/${cleanUploadDir}/${filename}`;

      this.logger.log(`Sending image URL to 3rd party service: ${imageUrl}`);

      // Call the 3rd party API
      const thirdPartyResponse = await this.callThirdPartyApi(imageUrl);

      if (!thirdPartyResponse) {
        return {
          success: false,
          error: 'No response from 3rd party service'
        };
      }

      // Convert 3rd party response to our format
      const detectedCodes = this.convertThirdPartyResponse(thirdPartyResponse);

      // Download the processed image from 3rd party service
      let processedImagePath: string | undefined;
      if (thirdPartyResponse.image_url) {
        processedImagePath = await this.downloadProcessedImage(
          thirdPartyResponse.image_url,
          outputDir,
          filename
        );
      }

      // Generate report
      const report = this.generateReport(detectedCodes);

      return {
        success: true,
        processedImagePath,
        detectedCodes,
        report,
        totalCodes: detectedCodes.length,
        readableCodes: detectedCodes.filter(code => code.readable).length,
        unreadableCodes: detectedCodes.filter(code => !code.readable).length
      };

    } catch (error) {
      this.logger.error(`Error processing image with 3rd party service: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Call the 3rd party detection API
   */
  private async callThirdPartyApi(imageUrl: string): Promise<ThirdPartyResponse | null> {
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify({
        url: imageUrl
      });

      const url = new URL(`${this.thirdPartyApiUrl}/detect_url`);
      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const client = url.protocol === 'https:' ? https : http;
      
      const req = client.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            if (res.statusCode === 200) {
              const response = JSON.parse(data) as ThirdPartyResponse;
              this.logger.log(`3rd party API response: ${response.count} codes detected`);
              resolve(response);
            } else {
              this.logger.error(`3rd party API error: ${res.statusCode} - ${data}`);
              reject(new Error(`API returned status ${res.statusCode}: ${data}`));
            }
          } catch (parseError) {
            this.logger.error(`Error parsing 3rd party API response: ${parseError.message}`);
            reject(new Error(`Failed to parse API response: ${parseError.message}`));
          }
        });
      });

      req.on('error', (error) => {
        this.logger.error(`3rd party API request error: ${error.message}`);
        reject(error);
      });

      req.write(postData);
      req.end();
    });
  }

  /**
   * Convert 3rd party response to our internal format
   */
  private convertThirdPartyResponse(response: ThirdPartyResponse): DetectedCode[] {
    if (!response.detected_codes || response.detected_codes.length === 0) {
      return [];
    }

    return response.detected_codes.map((code, index) => {
      // Convert position to points (create a rectangle from position data)
      const { x, y, width, height } = code.position;
      const points = [
        { x, y },
        { x: x + width, y },
        { x: x + width, y: y + height },
        { x, y: y + height }
      ];

      return {
        data: code.data,
        points,
        readable: true, // Assume all codes from 3rd party are readable
        confidence: 0.9, // High confidence for 3rd party service
        detectionMethod: code.method || '3rd-party',
        preprocessingType: 'external-service'
      };
    });
  }

  /**
   * Download processed image from 3rd party service
   */
  private async downloadProcessedImage(
    imageUrl: string,
    outputDir: string,
    originalFilename: string
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        // Ensure output directory exists
        fs.mkdir(outputDir, { recursive: true }).catch(() => {});

        // Create output filename
        const outputFilename = `processed_${Date.now()}_${originalFilename}`;
        const outputPath = path.join(outputDir, outputFilename);

        // Determine if we need to use the 3rd party service URL or if it's already a full URL
        let fullImageUrl = imageUrl;
        if (imageUrl.startsWith('/')) {
          fullImageUrl = `${this.thirdPartyApiUrl}${imageUrl}`;
        }

        this.logger.log(`Downloading processed image from: ${fullImageUrl}`);

        const url = new URL(fullImageUrl);
        const client = url.protocol === 'https:' ? https : http;

        const req = client.get(fullImageUrl, (res) => {
          if (res.statusCode === 200) {
            const fileStream = require('fs').createWriteStream(outputPath);
            
            res.pipe(fileStream);
            
            fileStream.on('finish', () => {
              fileStream.close();
              this.logger.log(`Processed image downloaded to: ${outputPath}`);
              resolve(outputPath);
            });

            fileStream.on('error', (error: Error) => {
              this.logger.error(`Error writing processed image: ${error.message}`);
              reject(error);
            });
          } else {
            this.logger.error(`Failed to download processed image: ${res.statusCode}`);
            reject(new Error(`Failed to download processed image: ${res.statusCode}`));
          }
        });

        req.on('error', (error) => {
          this.logger.error(`Error downloading processed image: ${error.message}`);
          reject(error);
        });

      } catch (error) {
        this.logger.error(`Error setting up image download: ${error.message}`);
        reject(error);
      }
    });
  }

  /**
   * Get the accessible base URL for the 3rd party service
   * Handles different networking scenarios (Docker, local, etc.)
   */
  private async getAccessibleBaseUrl(): Promise<string> {
    const configuredBaseUrl = this.configService.get<string>('BASE_URL');
    
    if (configuredBaseUrl) {
      this.logger.log(`Using configured BASE_URL: ${configuredBaseUrl}`);
      return configuredBaseUrl;
    }

    // Fallback logic for different environments
    const port = this.configService.get<string>('PORT') || '3000';
    const nodeEnv = this.configService.get<string>('NODE_ENV') || 'development';
    
    if (nodeEnv === 'production') {
      return 'https://server.mexle.org';
    }

    // Development environment - try different networking options
    const networkingOptions = [
      `http://host.docker.internal:${port}`,  // Docker Desktop
      `http://172.17.0.1:${port}`,           // Default Docker bridge
      `http://localhost:${port}`,            // Local fallback
    ];

    this.logger.log(`No BASE_URL configured, trying networking options for development...`);
    
    // For now, return the first option and log it
    // In a more sophisticated setup, you could test connectivity to each
    const selectedUrl = networkingOptions[0];
    this.logger.log(`Selected BASE_URL: ${selectedUrl}`);
    
    return selectedUrl;
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
}