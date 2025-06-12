import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { User } from '../../user/schemas/user.schema';
import { Experiment } from '../../experiment/schemas/experiment.schema';
import { ParticipantType, MessageType, ConversationStatus } from '../../shared/enums/conversation.enum';

export type ConversationDocument = Conversation & Document & {
  createdAt: Date;
  updatedAt: Date;
};
export type MessageDocument = Message & Document;

@Schema({ timestamps: true })
export class Message {
  @Prop({ type: MongooseSchema.Types.ObjectId, auto: true })
  _id: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  senderId: Types.ObjectId;

  @Prop({ required: true, enum: ParticipantType })
  senderType: ParticipantType;

  @Prop({ required: true, enum: MessageType, default: MessageType.TEXT })
  messageType: MessageType;

  @Prop({ required: true })
  content: string;

  @Prop()
  imageUrl?: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Image' })
  relatedImageId?: Types.ObjectId;

  @Prop({ default: false })
  isRead: boolean;

  @Prop({ type: Date, default: Date.now })
  sentAt: Date;

  @Prop({ type: Object })
  metadata?: Record<string, any>;
}

export const MessageSchema = SchemaFactory.createForClass(Message);

@Schema({ timestamps: true })
export class Conversation {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Experiment', required: true })
  experimentId: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  studentId: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  instructorId?: Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop({ enum: ConversationStatus, default: ConversationStatus.ACTIVE })
  status: ConversationStatus;

  @Prop({ type: [MessageSchema], default: [] })
  messages: Message[];

  @Prop({ type: Date })
  lastMessageAt?: Date;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  lastMessageBy?: Types.ObjectId;

  @Prop({ default: 0 })
  unreadCount: number;

  @Prop({ type: Object })
  metadata?: Record<string, any>;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);

// Index for efficient queries
ConversationSchema.index({ experimentId: 1, studentId: 1 });
ConversationSchema.index({ studentId: 1, lastMessageAt: -1 });
ConversationSchema.index({ instructorId: 1, lastMessageAt: -1 });
ConversationSchema.index({ 'messages.senderId': 1 });