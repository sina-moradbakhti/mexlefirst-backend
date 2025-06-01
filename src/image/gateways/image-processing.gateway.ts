import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';

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

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    
    // Store client with user ID if provided
    const userId = client.handshake.query.userId as string;
    if (userId) {
      this.connectedClients.set(userId, client);
      this.logger.log(`User ${userId} connected with socket ${client.id}`);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    
    // Remove client from connected clients
    for (const [userId, socket] of this.connectedClients.entries()) {
      if (socket.id === client.id) {
        this.connectedClients.delete(userId);
        this.logger.log(`User ${userId} disconnected`);
        break;
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