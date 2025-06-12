import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Conversation, ConversationDocument, Message } from '../schemas/conversation.schema';
import { CreateConversationDto, InternalCreateConversationDto } from '../dto/create-conversation.dto';
import { SendMessageDto } from '../dto/send-message.dto';
import { ConversationQueryDto } from '../dto/conversation-query.dto';
import { ConversationListResponseDto, ConversationResponseDto } from '../dto/conversation-response.dto';
import { ParticipantType, ConversationStatus, MessageType } from '../../shared/enums/conversation.enum';
import { UserRole } from '../../shared/enums/user.enum';
import { Experiment, ExperimentDocument } from '../../experiment/schemas/experiment.schema';

@Injectable()
export class ConversationService {
  constructor(
    @InjectModel(Conversation.name) private conversationModel: Model<ConversationDocument>,
    @InjectModel(Experiment.name) private experimentModel: Model<ExperimentDocument>,
  ) {}

  async createConversation(createConversationDto: CreateConversationDto, creatorId: string): Promise<ConversationResponseDto> {
    const { experimentId, initialMessage } = createConversationDto;

    // Fetch experiment to get instructor ID
    const experiment = await this.experimentModel.findById(experimentId).exec();
    if (!experiment) {
      throw new NotFoundException('Experiment not found');
    }

    const studentId = creatorId; // The creator is the student
    const instructorId = experiment.instructorId.toString();
    const title = 'Image Processing Discussion'; // Standard title for all conversations

    // Check if conversation already exists for this experiment and student
    const existingConversation = await this.conversationModel.findOne({
      experimentId: new Types.ObjectId(experimentId),
      studentId: new Types.ObjectId(studentId),
    });

    if (existingConversation) {
      throw new BadRequestException('Conversation already exists for this experiment and student');
    }

    const conversation = new this.conversationModel({
      experimentId: new Types.ObjectId(experimentId),
      studentId: new Types.ObjectId(studentId),
      instructorId: new Types.ObjectId(instructorId),
      title,
      messages: [],
      lastMessageAt: new Date(),
      lastMessageBy: new Types.ObjectId(creatorId),
      unreadCount: 0,
    });

    // Add initial message if provided
    if (initialMessage) {
      const message: Message = {
        _id: new Types.ObjectId(),
        senderId: new Types.ObjectId(creatorId),
        senderType: ParticipantType.STUDENT, // Creator is student
        messageType: MessageType.TEXT,
        content: initialMessage,
        isRead: false,
        sentAt: new Date(),
      };
      conversation.messages.push(message);
      conversation.unreadCount = 1;
    }

    const savedConversation = await conversation.save();
    return this.transformToResponseDto(savedConversation);
  }

  // Internal method for creating conversations with all parameters (used by image processing)
  async createConversationInternal(internalDto: InternalCreateConversationDto): Promise<ConversationResponseDto> {
    const { experimentId, studentId, instructorId, title, initialMessage } = internalDto;

    // Check if conversation already exists for this experiment and student
    const existingConversation = await this.conversationModel.findOne({
      experimentId: new Types.ObjectId(experimentId),
      studentId: new Types.ObjectId(studentId),
    });

    if (existingConversation) {
      return this.transformToResponseDto(existingConversation);
    }

    const conversation = new this.conversationModel({
      experimentId: new Types.ObjectId(experimentId),
      studentId: new Types.ObjectId(studentId),
      instructorId: new Types.ObjectId(instructorId),
      title,
      messages: [],
      lastMessageAt: new Date(),
      lastMessageBy: new Types.ObjectId(studentId),
      unreadCount: 0,
    });

    // Add initial message if provided
    if (initialMessage) {
      const message: Message = {
        _id: new Types.ObjectId(),
        senderId: new Types.ObjectId(studentId),
        senderType: ParticipantType.STUDENT,
        messageType: MessageType.TEXT,
        content: initialMessage,
        isRead: false,
        sentAt: new Date(),
      };
      conversation.messages.push(message);
      conversation.unreadCount = 1;
    }

    const savedConversation = await conversation.save();
    return this.transformToResponseDto(savedConversation);
  }

  async sendMessage(
    conversationId: string,
    sendMessageDto: SendMessageDto,
    senderId: string,
    senderType: ParticipantType,
  ): Promise<ConversationResponseDto> {
    const conversation = await this.conversationModel.findById(conversationId);
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Verify sender has permission to send message in this conversation
    this.validateMessagePermission(conversation, senderId, senderType);

    const message: Message = {
      _id: new Types.ObjectId(),
      senderId: new Types.ObjectId(senderId),
      senderType,
      messageType: sendMessageDto.messageType || MessageType.TEXT,
      content: sendMessageDto.content,
      imageUrl: sendMessageDto.imageUrl,
      relatedImageId: sendMessageDto.relatedImageId ? new Types.ObjectId(sendMessageDto.relatedImageId) : undefined,
      isRead: false,
      sentAt: new Date(),
      metadata: sendMessageDto.metadata,
    };

    conversation.messages.push(message);
    conversation.lastMessageAt = new Date();
    conversation.lastMessageBy = new Types.ObjectId(senderId);
    conversation.unreadCount += 1;

    const savedConversation = await conversation.save();
    return this.transformToResponseDto(savedConversation);
  }

  async getConversationsByStudent(
    studentId: string,
    query: ConversationQueryDto,
  ): Promise<ConversationListResponseDto> {
    const { page = 1, limit = 10, status, experimentId, search } = query;
    const skip = (page - 1) * limit;

    const filter: any = { studentId: new Types.ObjectId(studentId) };
    
    if (status) {
      filter.status = status;
    }
    
    if (experimentId) {
      filter.experimentId = new Types.ObjectId(experimentId);
    }
    
    if (search) {
      filter.title = { $regex: search, $options: 'i' };
    }

    const [conversations, total] = await Promise.all([
      this.conversationModel
        .find(filter)
        .sort({ lastMessageAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('studentId', 'email')
        .populate('instructorId', 'email')
        .populate('experimentId', 'experimentId experimentType')
        .exec(),
      this.conversationModel.countDocuments(filter),
    ]);

    return {
      conversations: conversations.map(conv => this.transformToResponseDto(conv)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getConversationsByInstructor(
    instructorId: string,
    query: ConversationQueryDto,
  ): Promise<ConversationListResponseDto> {
    const { page = 1, limit = 10, status, experimentId, search } = query;
    const skip = (page - 1) * limit;

    const filter: any = { instructorId: new Types.ObjectId(instructorId) };
    
    if (status) {
      filter.status = status;
    }
    
    if (experimentId) {
      filter.experimentId = new Types.ObjectId(experimentId);
    }
    
    if (search) {
      filter.title = { $regex: search, $options: 'i' };
    }

    const [conversations, total] = await Promise.all([
      this.conversationModel
        .find(filter)
        .sort({ lastMessageAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('studentId', 'email')
        .populate('instructorId', 'email')
        .populate('experimentId', 'experimentId experimentType')
        .exec(),
      this.conversationModel.countDocuments(filter),
    ]);

    return {
      conversations: conversations.map(conv => this.transformToResponseDto(conv)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getConversationBetweenStudentAndInstructor(
    studentId: string,
    instructorId: string,
    experimentId?: string,
  ): Promise<ConversationResponseDto[]> {
    const filter: any = {
      studentId: new Types.ObjectId(studentId),
      instructorId: new Types.ObjectId(instructorId),
    };

    if (experimentId) {
      filter.experimentId = new Types.ObjectId(experimentId);
    }

    const conversations = await this.conversationModel
      .find(filter)
      .sort({ lastMessageAt: -1 })
      .populate('studentId', 'email')
      .populate('instructorId', 'email')
      .populate('experimentId', 'experimentId experimentType')
      .exec();

    return conversations.map(conv => this.transformToResponseDto(conv));
  }

  async getConversationById(conversationId: string, userId: string, userRole: UserRole): Promise<ConversationResponseDto> {
    const conversation = await this.conversationModel
      .findById(conversationId)
      .populate('studentId', 'email')
      .populate('instructorId', 'email')
      .populate('experimentId', 'experimentId experimentType')
      .exec();

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Verify user has permission to view this conversation
    this.validateViewPermission(conversation, userId, userRole);

    return this.transformToResponseDto(conversation);
  }

  async markMessagesAsRead(conversationId: string, userId: string): Promise<void> {
    const conversation = await this.conversationModel.findById(conversationId);
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Mark messages as read for the current user
    let hasUnreadMessages = false;
    conversation.messages.forEach(message => {
      if (!message.isRead && message.senderId.toString() !== userId) {
        message.isRead = true;
        hasUnreadMessages = true;
      }
    });

    if (hasUnreadMessages) {
      // Recalculate unread count
      conversation.unreadCount = conversation.messages.filter(
        msg => !msg.isRead && msg.senderId.toString() !== userId
      ).length;
      
      await conversation.save();
    }
  }

  async updateConversationStatus(conversationId: string, status: ConversationStatus): Promise<ConversationResponseDto> {
    const conversation = await this.conversationModel.findByIdAndUpdate(
      conversationId,
      { status },
      { new: true }
    ).populate('studentId', 'email')
     .populate('instructorId', 'email')
     .populate('experimentId', 'experimentId experimentType');

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return this.transformToResponseDto(conversation);
  }

  async sendBotMessage(
    conversationId: string,
    content: string,
    messageType: any = 'feedback',
    metadata?: Record<string, any>,
  ): Promise<ConversationResponseDto> {
    const conversation = await this.conversationModel.findById(conversationId);
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const message: Message = {
      _id: new Types.ObjectId(),
      senderId: new Types.ObjectId('000000000000000000000000'), // Special bot ID
      senderType: ParticipantType.BOT,
      messageType,
      content,
      isRead: false,
      sentAt: new Date(),
      metadata,
    };

    conversation.messages.push(message);
    conversation.lastMessageAt = new Date();
    conversation.lastMessageBy = new Types.ObjectId('000000000000000000000000');
    conversation.unreadCount += 1;

    const savedConversation = await conversation.save();
    return this.transformToResponseDto(savedConversation);
  }

  private validateMessagePermission(conversation: ConversationDocument, senderId: string, senderType: ParticipantType): void {
    const senderObjectId = new Types.ObjectId(senderId);
    
    switch (senderType) {
      case ParticipantType.STUDENT:
        if (!conversation.studentId.equals(senderObjectId)) {
          throw new ForbiddenException('Student can only send messages in their own conversations');
        }
        break;
      case ParticipantType.INSTRUCTOR:
        if (conversation.instructorId && !conversation.instructorId.equals(senderObjectId)) {
          throw new ForbiddenException('Instructor can only send messages in assigned conversations');
        }
        break;
      case ParticipantType.BOT:
        // Bot can send messages to any conversation
        break;
      case ParticipantType.ADMIN:
        // Admin can send messages to any conversation
        break;
      default:
        throw new BadRequestException('Invalid sender type');
    }
  }

  private validateViewPermission(conversation: ConversationDocument, userId: string, userRole: UserRole): void {
    const userObjectId = new Types.ObjectId(userId);
    
    if (userRole === UserRole.ADMIN) {
      return; // Admin can view all conversations
    }
    
    if (userRole === UserRole.STUDENT && conversation.studentId.equals(userObjectId)) {
      return; // Student can view their own conversations
    }
    
    if (userRole === UserRole.INSTRUCTOR && conversation.instructorId && conversation.instructorId.equals(userObjectId)) {
      return; // Instructor can view assigned conversations
    }
    
    throw new ForbiddenException('You do not have permission to view this conversation');
  }

  private transformToResponseDto(conversation: ConversationDocument): ConversationResponseDto {
    return {
      _id: conversation._id.toString(),
      experimentId: conversation.experimentId.toString(),
      studentId: conversation.studentId.toString(),
      instructorId: conversation.instructorId?.toString(),
      title: conversation.title,
      status: conversation.status,
      messages: conversation.messages.map(msg => ({
        _id: msg._id.toString(),
        senderId: msg.senderId.toString(),
        senderType: msg.senderType,
        messageType: msg.messageType,
        content: msg.content,
        imageUrl: msg.imageUrl,
        relatedImageId: msg.relatedImageId?.toString(),
        isRead: msg.isRead,
        sentAt: msg.sentAt,
        metadata: msg.metadata,
      })),
      lastMessageAt: conversation.lastMessageAt,
      lastMessageBy: conversation.lastMessageBy?.toString(),
      unreadCount: conversation.unreadCount,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      metadata: conversation.metadata,
    };
  }
}