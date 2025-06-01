import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Image, ImageDocument } from '../schemas/image.schema';
import { MatrixCodeDetectorService } from './matrix-code-detector.service';
import { ImageProcessingGateway } from '../gateways/image-processing.gateway';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as fs from 'fs/promises';

@Injectable()
export class ImageProcessingService {
  private readonly logger = new Logger(ImageProcessingService.name);

  constructor(
    @InjectModel(Image.name) private imageModel: Model<ImageDocument>,
    private matrixCodeDetector: MatrixCodeDetectorService,
    private imageProcessingGateway: ImageProcessingGateway,
    private configService: ConfigService,
  ) {}

  /**
   * Process an uploaded image for Matrix code detection
   */
  async processUploadedImage(imageId: string): Promise<void> {
    try {
      this.logger.log(`Starting processing for image ${imageId}`);

      // Find the image record
      const image = await this.imageModel.findById(imageId).populate('userId').exec();
      if (!image) {
        this.logger.error(`Image ${imageId} not found`);
        return;
      }

      // Update processing status
      image.processingStatus = 'processing';
      await image.save();

      // Notify user that processing has started
      // Extract user ID properly from the populated userId field
      const userId = typeof image.userId === 'object' && image.userId._id 
        ? image.userId._id.toString() 
        : image.userId.toString();
        
      this.logger.log(`Sending processing update to user ${userId}`);
      this.imageProcessingGateway.sendProcessingUpdate(userId, {
        imageId: imageId,
        status: 'processing',
        message: 'Bot: Starting Matrix code analysis...'
      });

      // Get the upload directory and create processed directory
      const uploadDir = this.configService.get<string>('UPLOAD_DIR');
      const processedDir = path.join(uploadDir, 'processed');
      
      // Ensure processed directory exists
      try {
        await fs.access(processedDir);
      } catch {
        await fs.mkdir(processedDir, { recursive: true });
      }

      // Process the image
      const result = await this.matrixCodeDetector.processImage(
        image.imageUrl,
        processedDir
      );

      if (result.success) {
        // Update image record with results
        image.detectedComponents = result.detectedCodes || [];
        image.feedback = result.report || '';
        image.processingStatus = result.unreadableCodes === 0 ? 'completed' : 'needs_review';
        
        // Store the processed image path if available
        if (result.processedImagePath) {
          // You might want to add a field for processed image path in your schema
          (image as any).processedImageUrl = result.processedImagePath;
        }

        await image.save();

        // Send completion notification to user
        this.logger.log(`Sending completion notification to user ${userId}`);
        this.imageProcessingGateway.sendProcessingComplete(userId, {
          imageId: imageId,
          status: image.processingStatus,
          message: result.report,
          totalCodes: result.totalCodes,
          readableCodes: result.readableCodes,
          unreadableCodes: result.unreadableCodes,
          processedImageUrl: result.processedImagePath
        });

        this.logger.log(`Successfully processed image ${imageId}: ${result.totalCodes} codes detected`);
      } else {
        // Handle processing failure
        image.processingStatus = 'failed';
        image.feedback = `Bot: Processing failed - ${result.error}`;
        await image.save();

        this.logger.log(`Sending failure notification to user ${userId}`);
        this.imageProcessingGateway.sendProcessingComplete(userId, {
          imageId: imageId,
          status: 'failed',
          message: image.feedback,
          error: result.error
        });

        this.logger.error(`Failed to process image ${imageId}: ${result.error}`);
      }

    } catch (error) {
      this.logger.error(`Error processing image ${imageId}:`, error);
      
      // Update image status to failed
      try {
        const image = await this.imageModel.findById(imageId).populate('userId').exec();
        if (image) {
          image.processingStatus = 'failed';
          image.feedback = 'Bot: An unexpected error occurred during processing.';
          await image.save();

          // Extract user ID properly from the populated userId field
          const userId = typeof image.userId === 'object' && image.userId._id 
            ? image.userId._id.toString() 
            : image.userId.toString();
            
          this.logger.log(`Sending error notification to user ${userId}`);
          this.imageProcessingGateway.sendProcessingComplete(userId, {
            imageId: imageId,
            status: 'failed',
            message: image.feedback,
            error: error.message
          });
        }
      } catch (updateError) {
        this.logger.error(`Failed to update image status after error:`, updateError);
      }
    }
  }

  /**
   * Queue image for processing (can be called asynchronously)
   */
  async queueImageProcessing(imageId: string): Promise<void> {
    // Process immediately for now, but this could be enhanced with a proper queue system
    setImmediate(() => {
      this.processUploadedImage(imageId).catch(error => {
        this.logger.error(`Queued processing failed for image ${imageId}:`, error);
      });
    });
  }

  /**
   * Reprocess an image (for retry scenarios)
   */
  async reprocessImage(imageId: string): Promise<void> {
    this.logger.log(`Reprocessing image ${imageId}`);
    await this.processUploadedImage(imageId);
  }

  /**
   * Get processing status for an image
   */
  async getProcessingStatus(imageId: string): Promise<any> {
    const image = await this.imageModel.findById(imageId).exec();
    if (!image) {
      return null;
    }

    return {
      imageId: imageId,
      status: image.processingStatus,
      feedback: image.feedback,
      detectedComponents: image.detectedComponents,
      lastUpdated: (image as any).updatedAt
    };
  }
}