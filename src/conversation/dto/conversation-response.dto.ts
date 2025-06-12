import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { ParticipantType, MessageType, ConversationStatus } from '../../shared/enums/conversation.enum';

export class MessageResponseDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439015' })
  _id: string;

  @ApiProperty({ example: '507f1f77bcf86cd799439012' })
  senderId: string;

  @ApiProperty({ enum: ParticipantType, example: ParticipantType.STUDENT })
  senderType: ParticipantType;

  @ApiProperty({ enum: MessageType, example: MessageType.TEXT })
  messageType: MessageType;

  @ApiProperty({ example: 'Hello, I need help with my experiment' })
  content: string;

  @ApiPropertyOptional({ example: 'https://example.com/image.jpg' })
  imageUrl?: string;

  @ApiPropertyOptional({ example: '507f1f77bcf86cd799439014' })
  relatedImageId?: string;

  @ApiProperty({ example: false })
  isRead: boolean;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  sentAt: Date;

  @ApiPropertyOptional()
  metadata?: Record<string, any>;
}

export class ConversationResponseDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439016' })
  _id: string;

  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  experimentId: string;

  @ApiProperty({ example: '507f1f77bcf86cd799439012' })
  studentId: string;

  @ApiPropertyOptional({ example: '507f1f77bcf86cd799439013' })
  instructorId?: string;

  @ApiProperty({ example: 'Image Processing Discussion' })
  title: string;

  @ApiProperty({ enum: ConversationStatus, example: ConversationStatus.ACTIVE })
  status: ConversationStatus;

  @ApiProperty({ type: [MessageResponseDto] })
  messages: MessageResponseDto[];

  @ApiPropertyOptional({ example: '2024-01-15T10:30:00.000Z' })
  lastMessageAt?: Date;

  @ApiPropertyOptional({ example: '507f1f77bcf86cd799439012' })
  lastMessageBy?: string;

  @ApiProperty({ example: 2 })
  unreadCount: number;

  @ApiProperty({ example: '2024-01-15T10:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  updatedAt: Date;

  @ApiPropertyOptional()
  metadata?: Record<string, any>;
}

export class ConversationListResponseDto {
  @ApiProperty({ type: [ConversationResponseDto] })
  conversations: ConversationResponseDto[];

  @ApiProperty({ example: 25 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({ example: 3 })
  totalPages: number;
}