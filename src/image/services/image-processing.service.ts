import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Image, ImageDocument } from '../schemas/image.schema';
import { ThirdPartyDetectorService } from './third-party-detector.service';
import { ImageProcessingGateway } from '../gateways/image-processing.gateway';
import { ConversationService } from '../../conversation/services/conversation.service';
import { ConversationGateway } from '../../conversation/gateways/conversation.gateway';
import { ConfigService } from '@nestjs/config';
import { MessageType } from '../../shared/enums/conversation.enum';
import * as path from 'path';
import * as fs from 'fs/promises';

@Injectable()
export class ImageProcessingService {
  private readonly logger = new Logger(ImageProcessingService.name);

  constructor(
    @InjectModel(Image.name) private imageModel: Model<ImageDocument>,
    private thirdPartyDetector: ThirdPartyDetectorService,
    private imageProcessingGateway: ImageProcessingGateway,
    private conversationService: ConversationService,
    private conversationGateway: ConversationGateway,
    private configService: ConfigService,
  ) {}

  /**
   * Process an uploaded image for Matrix code detection with conversation integration
   */
  async processUploadedImage(imageId: string): Promise<void> {
    try {
      this.logger.log(`Starting processing for image ${imageId}`);

      // Find the image record with populated references
      const image = await this.imageModel
        .findById(imageId)
        .populate('userId')
        .populate('experimentId')
        .exec();
        
      if (!image) {
        this.logger.error(`Image ${imageId} not found`);
        return;
      }

      // Update processing status
      image.processingStatus = 'processing';
      await image.save();

      // Extract user and experiment IDs
      const userId = this.extractUserId(image.userId);
      const experimentId = this.extractExperimentId(image.experimentId);

      // Find or create conversation for this experiment and student
      let conversation = await this.findOrCreateConversation(
        experimentId,
        userId,
        image.originalFilename || 'Image Processing'
      );

      // Send initial processing message via WebSocket (which also saves to database)
      this.conversationGateway.sendBotMessage(
        conversation._id,
        `🔄 Starting analysis of your submitted image: ${image.originalFilename || 'uploaded image'}`,
        MessageType.SYSTEM,
        {
          imageId: imageId,
          processingStatus: 'started',
          imageUrl: image.imageUrl
        }
      );

      // Legacy socket notification (for backward compatibility)
      this.logger.log(`Sending processing update to user ${userId}`);
      this.imageProcessingGateway.sendProcessingUpdate(userId, {
        imageId: imageId,
        status: 'processing',
        message: 'Bot: Starting Matrix code analysis using 3rd party service...'
      });

      // Get the upload directory and create processed directory
      const uploadDir = this.configService.get<string>('UPLOAD_DIR') || 'uploads';
      const processedDir = path.join(uploadDir, 'processed');
      
      // Ensure processed directory exists
      try {
        await fs.access(processedDir);
      } catch {
        await fs.mkdir(processedDir, { recursive: true });
      }

      // Process the image using 3rd party service
      const result = await this.thirdPartyDetector.processImage(
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
          image.processedImageUrl = result.processedImagePath;
        }

        await image.save();

        // Create detailed feedback message for conversation
        const feedbackMessage = this.createFeedbackMessage(result, image);
        
        // Send feedback message via WebSocket (which also saves to database)
        this.conversationGateway.sendBotMessage(
          conversation._id,
          feedbackMessage,
          MessageType.FEEDBACK,
          {
            imageId: imageId,
            processingStatus: image.processingStatus,
            totalCodes: result.totalCodes,
            readableCodes: result.readableCodes,
            unreadableCodes: result.unreadableCodes,
            processedImageUrl: result.processedImagePath,
            detectedComponents: result.detectedCodes
          }
        );

        // If there are issues, provide guidance
        if (result.unreadableCodes > 0) {
          const guidanceMessage = this.createGuidanceMessage(result);
          
          this.conversationGateway.sendBotMessage(
            conversation._id,
            guidanceMessage,
            MessageType.SYSTEM,
            {
              imageId: imageId,
              type: 'guidance',
              unreadableCodes: result.unreadableCodes
            }
          );
        }

        // Send circuit simulation link after processing is complete
        const circuitMessage = this.createCircuitMessage();
        
        this.conversationGateway.sendBotMessage(
          conversation._id,
          circuitMessage,
          MessageType.SYSTEM,
          {
            imageId: imageId,
            type: 'circuit_link',
            circuitUrl: 'https://www.falstad.com/circuit/circuitjs.html?cct=%24+1+0.000005+10.20027730826997+50+5+43%0Av+128+64+128+160+0+12+0+0+0+0.5%0As+128+160+256+160+0+1+true%0Ar+256+160+256+256+0+470%0A162+256+256+128+256+2+default-led+1+0+0+0.01%0Ag+128+256+128+256+0%0Aw+128+64+256+64+0%0Aw+256+64+256+160+0%0Aw+128+256+256+256+0'
          }
        );

        // Legacy socket notification (for backward compatibility)
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
        image.feedback = `Processing failed - ${result.error}`;
        await image.save();

        const errorMessage = `❌ **Processing Failed**\n\nI encountered an error while analyzing your image:\n\n${result.error}\n\nPlease try uploading the image again or contact your instructor for assistance.`;

        // Send error message via WebSocket (which also saves to database)
        this.conversationGateway.sendBotMessage(
          conversation._id,
          errorMessage,
          MessageType.SYSTEM,
          {
            imageId: imageId,
            processingStatus: 'failed',
            error: result.error
          }
        );

        // Legacy socket notification (for backward compatibility)
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
      
      // Update image status to failed and send error message
      try {
        const image = await this.imageModel.findById(imageId).populate('userId').populate('experimentId').exec();
        if (image) {
          image.processingStatus = 'failed';
          image.feedback = 'An unexpected error occurred during processing.';
          await image.save();

          const userId = this.extractUserId(image.userId);
          const experimentId = this.extractExperimentId(image.experimentId);

          const conversation = await this.findOrCreateConversation(
            experimentId,
            userId,
            'Image Processing Error'
          );

          const errorMessage = `❌ **Unexpected Error**\n\nAn unexpected error occurred while processing your image. Please try again or contact your instructor.\n\nError details: ${error.message}`;

          // Send error via WebSocket (which also saves to database)
          this.conversationGateway.sendBotMessage(
            conversation._id,
            errorMessage,
            MessageType.SYSTEM,
            {
              imageId: imageId,
              processingStatus: 'failed',
              error: error.message
            }
          );

          // Legacy socket notification (for backward compatibility)
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

  /**
   * Helper method to find or create conversation
   */
  private async findOrCreateConversation(experimentId: string, studentId: string, title: string) {
    try {
      // Try to find existing conversation
      const conversations = await this.conversationService.getConversationsByStudent(studentId, {
        experimentId,
        page: 1,
        limit: 1
      });

      if (conversations.conversations.length > 0) {
        return conversations.conversations[0];
      }

      // Create new conversation (instructor ID and title will be auto-derived)
      return await this.conversationService.createConversation({
        experimentId,
        initialMessage: 'Image submitted for analysis'
      }, studentId);
    } catch (error) {
      this.logger.error('Error finding/creating conversation:', error);
      throw error;
    }
  }

  /**
   * Create detailed feedback message
   */
  private createFeedbackMessage(result: any, image: ImageDocument): string {
    const status = result.unreadableCodes === 0 ? '✅' : '⚠️';
    const statusText = result.unreadableCodes === 0 ? 'Analysis Complete' : 'Analysis Complete - Issues Found';

    let message = `${status} **${statusText}**\n\n`;
    message += `📊 **Analysis Results:**\n`;
    message += `• Total Matrix codes detected: ${result.totalCodes}\n`;
    message += `• Readable codes: ${result.readableCodes}\n`;
    message += `• Unreadable codes: ${result.unreadableCodes}\n\n`;

    if (result.detectedCodes && result.detectedCodes.length > 0) {
      message += `🔍 **Detected Components:**\n`;
      result.detectedCodes.forEach((code: any, index: number) => {
        const statusIcon = code.readable ? '✅' : '❌';
        message += `${index + 1}. ${statusIcon} ${code.data || 'Unreadable'}\n`;
      });
      message += '\n';
    }

    if (result.report) {
      message += `📝 **Detailed Report:**\n${result.report}`;
    }

    return message;
  }

  /**
   * Create guidance message for improvements
   */
  private createGuidanceMessage(result: any): string {
    let message = `💡 **Improvement Suggestions**\n\n`;
    message += `I detected ${result.unreadableCodes} unreadable Matrix codes. Here are some tips to improve your image quality:\n\n`;
    message += `• Ensure good lighting conditions\n`;
    message += `• Hold the camera steady to avoid blur\n`;
    message += `• Make sure Matrix codes are clearly visible and not obstructed\n`;
    message += `• Try to capture the image from directly above\n`;
    message += `• Ensure the entire experimental setup is visible\n\n`;
    message += `Feel free to resubmit your image or ask your instructor for help! 🤝`;

    return message;
  }

  /**
   * Create circuit simulation message with link
   */
  private createCircuitMessage(): string {
    let message = `🔌 **Circuit Simulation**\n\n`;
    message += `Based on your circuit analysis, you can now explore and simulate your circuit design using our interactive circuit simulator.\n\n`;
    message += `Click the link below to open the circuit simulation:\n\n`;
    message += `🔗 [Open Circuit Simulator](https://www.falstad.com/circuit/circuitjs.html?cct=%24+1+0.000005+10.20027730826997+50+5+43%0Av+128+64+128+160+0+12+0+0+0+0.5%0As+128+160+256+160+0+1+true%0Ar+256+160+256+256+0+470%0A162+256+256+128+256+2+default-led+1+0+0+0.01%0Ag+128+256+128+256+0%0Aw+128+64+256+64+0%0Aw+256+64+256+160+0%0Aw+128+256+256+256+0)\n\n`;
    message += `💡 **What you can do:**\n`;
    message += `• Modify component values and see real-time effects\n`;
    message += `• Run simulations to understand circuit behavior\n`;
    message += `• Experiment with different configurations\n`;
    message += `• Learn how your physical circuit translates to digital simulation\n\n`;
    message += `Happy experimenting! 🧪⚡`;

    return message;
  }

  /**
   * Extract user ID from populated or non-populated field
   */
  private extractUserId(userId: any): string {
    return typeof userId === 'object' && userId._id 
      ? userId._id.toString() 
      : userId.toString();
  }

  /**
   * Extract experiment ID from populated or non-populated field
   */
  private extractExperimentId(experimentId: any): string {
    return typeof experimentId === 'object' && experimentId._id 
      ? experimentId._id.toString() 
      : experimentId.toString();
  }
}