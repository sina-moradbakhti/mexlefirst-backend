import { IsString, IsNotEmpty, IsOptional, IsEnum, IsMongoId, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MessageType } from '../../shared/enums/conversation.enum';

export class SendMessageDto {
  @ApiProperty({ description: 'Message content', example: 'Hello, I need help with my experiment' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({ enum: MessageType, description: 'Type of message', example: MessageType.TEXT })
  @IsEnum(MessageType)
  @IsOptional()
  messageType?: MessageType = MessageType.TEXT;

  @ApiPropertyOptional({ description: 'Image URL if message contains image' })
  @IsUrl()
  @IsOptional()
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'Related image ID for context', example: '507f1f77bcf86cd799439014' })
  @IsMongoId()
  @IsOptional()
  relatedImageId?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  metadata?: Record<string, any>;
}