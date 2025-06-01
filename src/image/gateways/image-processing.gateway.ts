import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../../user/user.service';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/image-processing',
})
export class ImageProcessingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ImageProcessingGateway.name);
  private connectedClients = new Map<string, Socket>();

  constructor(
    private jwtService: JwtService,
    private userService: UserService,
  ) {}

  async handleConnection(client: Socket) {
    this.logger.log(`Client attempting to connect: ${client.id}`);
    
    try {
      // Extract token from handshake auth or headers
      const token = this.extractToken(client);
      
      if (!token) {
        this.logger.warn(`Client ${client.id} connection rejected: No authorization token provided`);
        client.disconnect(true);
        return;
      }
      
      // Verify and decode the token
      const payload = await this.jwtService.verifyAsync(token);
      
      if (!payload || !payload.id) {
        this.logger.warn(`Client ${client.id} connection rejected: Invalid token payload`);
        client.disconnect(true);
        return;
      }
      
      // Verify user exists
      const user = await this.userService.findById(payload.id);
      if (!user) {
        this.logger.warn(`Client ${client.id} connection rejected: User not found`);
        client.disconnect(true);
        return;
      }
      
      // Store client with user ID
      const userId = payload.id;
      this.connectedClients.set(userId, client);
      
      // Store user data in socket for later use
      client.data.user = {
        id: userId,
        email: payload.email,
        role: payload.role
      };
      
      this.logger.log(`User ${userId} (${payload.email}) authenticated and connected with socket ${client.id}`);
    } catch (error) {
      this.logger.error(`Authentication error for client ${client.id}:`, error.message);
      client.disconnect(true);
    }
  }
  
  private extractToken(client: Socket): string | null {
    // Try to get token from handshake auth
    if (client.handshake.auth && client.handshake.auth.token) {
      return client.handshake.auth.token;
    }
    
    // Try to get token from headers (Authorization: Bearer token)
    if (client.handshake.headers.authorization) {
      const authHeader = client.handshake.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7);
      }
    }
    
    // Try to get token from query parameter
    if (client.handshake.query && client.handshake.query.token) {
      return client.handshake.query.token as string;
    }
    
    return null;
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    
    // If we have user data stored in the socket, use it for a more efficient lookup
    if (client.data && client.data.user && client.data.user.id) {
      const userId = client.data.user.id;
      if (this.connectedClients.has(userId)) {
        this.connectedClients.delete(userId);
        this.logger.log(`User ${userId} (${client.data.user.email}) disconnected`);
      }
    } else {
      // Fallback to the previous method if no user data is available
      for (const [userId, socket] of this.connectedClients.entries()) {
        if (socket.id === client.id) {
          this.connectedClients.delete(userId);
          this.logger.log(`User ${userId} disconnected`);
          break;
        }
      }
    }
  }

  /**
   * Send processing update to a specific user
   */
  sendProcessingUpdate(userId: string, data: any) {
    // Ensure userId is a string
    const userIdStr = String(userId);
    
    const client = this.connectedClients.get(userIdStr);
    if (client) {
      client.emit('processing-update', data);
      this.logger.log(`Sent processing update to user ${userIdStr}`);
    } else {
      // Try to find by partial match (in case of ObjectId vs string issues)
      let found = false;
      for (const [connectedId, socket] of this.connectedClients.entries()) {
        if (connectedId.includes(userIdStr) || userIdStr.includes(connectedId)) {
          socket.emit('processing-update', data);
          this.logger.log(`Sent processing update to user ${connectedId} (partial match for ${userIdStr})`);
          found = true;
          break;
        }
      }
      
      if (!found) {
        this.logger.warn(`User ${userIdStr} not connected, cannot send update`);
      }
    }
  }

  /**
   * Send processing completion notification to a specific user
   */
  sendProcessingComplete(userId: string, data: any) {
    // Ensure userId is a string
    const userIdStr = String(userId);
    
    const client = this.connectedClients.get(userIdStr);
    if (client) {
      client.emit('processing-complete', data);
      this.logger.log(`Sent processing complete notification to user ${userIdStr}`);
    } else {
      // Try to find by partial match (in case of ObjectId vs string issues)
      let found = false;
      for (const [connectedId, socket] of this.connectedClients.entries()) {
        if (connectedId.includes(userIdStr) || userIdStr.includes(connectedId)) {
          socket.emit('processing-complete', data);
          this.logger.log(`Sent processing complete notification to user ${connectedId} (partial match for ${userIdStr})`);
          found = true;
          break;
        }
      }
      
      if (!found) {
        this.logger.warn(`User ${userIdStr} not connected, cannot send completion notification`);
      }
    }
  }

  /**
   * Broadcast message to all connected clients
   */
  broadcast(event: string, data: any) {
    this.server.emit(event, data);
    this.logger.log(`Broadcasted ${event} to all clients`);
  }
}