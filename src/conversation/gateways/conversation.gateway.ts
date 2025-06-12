import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../../user/user.service';
import { ConversationService } from '../services/conversation.service';
import { SendMessageDto } from '../dto/send-message.dto';
import { ParticipantType } from '../../shared/enums/conversation.enum';
import { UserRole } from '../../shared/enums/user.enum';

interface AuthenticatedSocket extends Socket {
  user?: {
    id: string;
    email: string;
    role: UserRole;
  };
}

@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/conversations',
})
export class ConversationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ConversationGateway.name);
  private connectedClients = new Map<string, AuthenticatedSocket>();

  constructor(
    private jwtService: JwtService,
    private userService: UserService,
    private conversationService: ConversationService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    this.logger.log(`Client attempting to connect: ${client.id}`);
    
    try {
      const token = this.extractToken(client);
      
      if (!token) {
        this.logger.warn(`Client ${client.id} connection rejected: No authorization token provided`);
        client.disconnect(true);
        return;
      }
      
      const payload = await this.jwtService.verifyAsync(token);
      
      if (!payload || !payload.id) {
        this.logger.warn(`Client ${client.id} connection rejected: Invalid token payload`);
        client.disconnect(true);
        return;
      }
      
      const user = await this.userService.findById(payload.id);
      if (!user) {
        this.logger.warn(`Client ${client.id} connection rejected: User not found`);
        client.disconnect(true);
        return;
      }
      
      const userId = payload.id;
      this.connectedClients.set(userId, client);
      
      client.user = {
        id: userId,
        email: payload.email,
        role: payload.role
      };
      
      // Join user to their personal room for targeted messaging
      client.join(`user:${userId}`);
      
      this.logger.log(`User ${userId} (${payload.email}) connected to conversations namespace`);
      
      // Emit connection success
      client.emit('connected', { message: 'Successfully connected to conversations' });
    } catch (error) {
      this.logger.error(`Authentication error for client ${client.id}:`, error.message);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    
    if (client.user && client.user.id) {
      const userId = client.user.id;
      if (this.connectedClients.has(userId)) {
        this.connectedClients.delete(userId);
        this.logger.log(`User ${userId} (${client.user.email}) disconnected from conversations`);
      }
    }
  }

  @SubscribeMessage('join-conversation')
  async handleJoinConversation(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      if (!client.user) {
        client.emit('error', { message: 'User not authenticated' });
        return;
      }

      const { conversationId } = data;
      
      // Verify user has access to this conversation
      const conversation = await this.conversationService.getConversationById(
        conversationId,
        client.user.id,
        client.user.role,
      );

      // Join the conversation room
      client.join(`conversation:${conversationId}`);
      
      this.logger.log(`User ${client.user.id} joined conversation ${conversationId}`);
      
      client.emit('joined-conversation', {
        conversationId,
        message: 'Successfully joined conversation',
      });
    } catch (error) {
      this.logger.error(`Error joining conversation:`, error.message);
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('leave-conversation')
  async handleLeaveConversation(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const { conversationId } = data;
    client.leave(`conversation:${conversationId}`);
    
    this.logger.log(`User ${client.user?.id} left conversation ${conversationId}`);
    
    client.emit('left-conversation', {
      conversationId,
      message: 'Successfully left conversation',
    });
  }

  @SubscribeMessage('send-message')
  async handleSendMessage(
    @MessageBody() data: { conversationId: string; message: SendMessageDto },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      if (!client.user) {
        client.emit('error', { message: 'User not authenticated' });
        return;
      }

      const { conversationId, message } = data;
      const senderType = this.mapUserRoleToParticipantType(client.user.role);
      
      const updatedConversation = await this.conversationService.sendMessage(
        conversationId,
        message,
        client.user.id,
        senderType,
      );

      // Emit the new message to all clients in the conversation room
      this.server.to(`conversation:${conversationId}`).emit('new-message', {
        conversationId,
        message: updatedConversation.messages[updatedConversation.messages.length - 1],
        conversation: updatedConversation,
      });

      // Also emit to specific users involved in the conversation
      this.notifyConversationParticipants(updatedConversation, 'message-received', {
        conversationId,
        message: updatedConversation.messages[updatedConversation.messages.length - 1],
      });

      this.logger.log(`Message sent in conversation ${conversationId} by user ${client.user.id}`);
    } catch (error) {
      this.logger.error(`Error sending message:`, error.message);
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('mark-as-read')
  async handleMarkAsRead(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      if (!client.user) {
        client.emit('error', { message: 'User not authenticated' });
        return;
      }

      const { conversationId } = data;
      
      await this.conversationService.markMessagesAsRead(conversationId, client.user.id);
      
      // Notify other participants that messages have been read
      client.to(`conversation:${conversationId}`).emit('messages-read', {
        conversationId,
        readBy: client.user.id,
      });

      client.emit('marked-as-read', { conversationId });
      
      this.logger.log(`Messages marked as read in conversation ${conversationId} by user ${client.user.id}`);
    } catch (error) {
      this.logger.error(`Error marking messages as read:`, error.message);
      client.emit('error', { message: error.message });
    }
  }

  /**
   * Send a message from the bot to a specific conversation
   */
  async sendBotMessage(
    conversationId: string,
    content: string,
    messageType: any = 'feedback',
    metadata?: Record<string, any>,
  ) {
    try {
      const updatedConversation = await this.conversationService.sendBotMessage(
        conversationId,
        content,
        messageType,
        metadata,
      );

      // Emit the bot message to all clients in the conversation room
      this.server.to(`conversation:${conversationId}`).emit('new-message', {
        conversationId,
        message: updatedConversation.messages[updatedConversation.messages.length - 1],
        conversation: updatedConversation,
      });

      // Notify conversation participants
      this.notifyConversationParticipants(updatedConversation, 'bot-message-received', {
        conversationId,
        message: updatedConversation.messages[updatedConversation.messages.length - 1],
      });

      this.logger.log(`Bot message sent to conversation ${conversationId}`);
    } catch (error) {
      this.logger.error(`Error sending bot message:`, error.message);
    }
  }

  /**
   * Notify specific users about conversation updates
   */
  private notifyConversationParticipants(conversation: any, event: string, data: any) {
    // Notify student
    if (conversation.studentId) {
      this.server.to(`user:${conversation.studentId}`).emit(event, data);
    }
    
    // Notify instructor if assigned
    if (conversation.instructorId) {
      this.server.to(`user:${conversation.instructorId}`).emit(event, data);
    }
  }

  private extractToken(client: Socket): string | null {
    if (client.handshake.auth && client.handshake.auth.token) {
      return client.handshake.auth.token;
    }
    
    if (client.handshake.headers.authorization) {
      const authHeader = client.handshake.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7);
      }
    }
    
    if (client.handshake.query && client.handshake.query.token) {
      return client.handshake.query.token as string;
    }
    
    return null;
  }

  private mapUserRoleToParticipantType(userRole: UserRole): ParticipantType {
    switch (userRole) {
      case UserRole.STUDENT:
        return ParticipantType.STUDENT;
      case UserRole.INSTRUCTOR:
        return ParticipantType.INSTRUCTOR;
      case UserRole.ADMIN:
        return ParticipantType.ADMIN;
      default:
        throw new Error('Invalid user role');
    }
  }
}