# Conversation System Documentation

## Overview

The conversation system provides a comprehensive chat-based communication platform for students, instructors, and AI bots within the experimental learning environment. It replaces the simple socket-based feedback system with a structured conversation approach that maintains chat history and supports real-time communication.

## Architecture

### Core Components

1. **Conversation Schema** (`src/conversation/schemas/conversation.schema.ts`)
   - Stores conversations with embedded messages
   - Links to experiments and participants
   - Tracks read status and metadata

2. **Conversation Service** (`src/conversation/services/conversation.service.ts`)
   - Business logic for conversation management
   - Message handling and permissions
   - Bot message integration

3. **Conversation Controller** (`src/conversation/controllers/conversation.controller.ts`)
   - REST API endpoints for conversation operations
   - Authentication and authorization

4. **Conversation Gateway** (`src/conversation/gateways/conversation.gateway.ts`)
   - WebSocket real-time communication
   - Room-based messaging
   - Event handling

5. **Enhanced Image Processing** (`src/image/services/conversation-image-processing.service.ts`)
   - Integrates image analysis with conversations
   - Automated bot feedback
   - Progress notifications

## Data Models

### Conversation Schema
```typescript
{
  experimentId: ObjectId,        // Links to experiment
  studentId: ObjectId,          // Student participant
  instructorId?: ObjectId,      // Optional instructor
  title: string,                // Conversation title
  status: 'active' | 'archived' | 'closed',
  messages: Message[],          // Embedded messages
  lastMessageAt?: Date,
  lastMessageBy?: ObjectId,
  unreadCount: number,
  metadata?: Record<string, any>
}
```

### Message Schema
```typescript
{
  _id: ObjectId,
  senderId: ObjectId,           // Message sender
  senderType: 'student' | 'instructor' | 'admin' | 'bot',
  messageType: 'text' | 'image' | 'feedback' | 'system',
  content: string,              // Message content
  imageUrl?: string,            // Optional image
  relatedImageId?: ObjectId,    // Link to processed image
  isRead: boolean,
  sentAt: Date,
  metadata?: Record<string, any>
}
```

## API Endpoints

### Conversation Management

#### Create Conversation
```http
POST /conversations
Authorization: Bearer <token>
Content-Type: application/json

{
  "experimentId": "507f1f77bcf86cd799439011",
  "studentId": "507f1f77bcf86cd799439012",
  "instructorId": "507f1f77bcf86cd799439013",
  "title": "Image Processing Discussion",
  "initialMessage": "Hello, I need help with my experiment"
}
```

#### Send Message
```http
POST /conversations/:id/messages
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Hello, I need help with my experiment",
  "messageType": "text",
  "imageUrl": "https://example.com/image.jpg",
  "relatedImageId": "507f1f77bcf86cd799439014"
}
```

#### Get Student Conversations
```http
GET /conversations/student/:studentId?page=1&limit=10&status=active&experimentId=...
Authorization: Bearer <token>
```

#### Get Instructor Conversations
```http
GET /conversations/instructor/:instructorId?page=1&limit=10
Authorization: Bearer <token>
```

#### Get Conversation Between Student and Instructor
```http
GET /conversations/between/:studentId/:instructorId?experimentId=...
Authorization: Bearer <token>
```

#### Get Specific Conversation
```http
GET /conversations/:id
Authorization: Bearer <token>
```

#### Mark Messages as Read
```http
PATCH /conversations/:id/read
Authorization: Bearer <token>
```

#### Update Conversation Status
```http
PATCH /conversations/:id/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "archived"
}
```

#### Get My Conversations
```http
GET /conversations/my/conversations?page=1&limit=10
Authorization: Bearer <token>
```

## WebSocket Events

### Connection
Connect to the `/conversations` namespace with JWT authentication:

```javascript
const socket = io('http://localhost:3000/conversations', {
  auth: {
    token: 'your-jwt-token'
  }
});
```

### Client Events (Emit)

#### Join Conversation
```javascript
socket.emit('join-conversation', {
  conversationId: '507f1f77bcf86cd799439016'
});
```

#### Leave Conversation
```javascript
socket.emit('leave-conversation', {
  conversationId: '507f1f77bcf86cd799439016'
});
```

#### Send Message
```javascript
socket.emit('send-message', {
  conversationId: '507f1f77bcf86cd799439016',
  message: {
    content: 'Hello, I need help with my experiment',
    messageType: 'text',
    imageUrl: 'https://example.com/image.jpg',
    relatedImageId: '507f1f77bcf86cd799439014'
  }
});
```

#### Mark as Read
```javascript
socket.emit('mark-as-read', {
  conversationId: '507f1f77bcf86cd799439016'
});
```

### Server Events (Listen)

#### Connection Events
```javascript
socket.on('connected', (data) => {
  console.log(data.message); // "Successfully connected to conversations"
});

socket.on('error', (data) => {
  console.error(data.message);
});
```

#### Conversation Events
```javascript
socket.on('joined-conversation', (data) => {
  console.log(`Joined conversation: ${data.conversationId}`);
});

socket.on('left-conversation', (data) => {
  console.log(`Left conversation: ${data.conversationId}`);
});
```

#### Message Events
```javascript
socket.on('new-message', (data) => {
  console.log('New message:', data.message);
  console.log('Updated conversation:', data.conversation);
});

socket.on('bot-message-received', (data) => {
  console.log('Bot message:', data.message);
});

socket.on('message-received', (data) => {
  console.log(`Message received in conversation ${data.conversationId}`);
});

socket.on('messages-read', (data) => {
  console.log(`Messages read by ${data.readBy}`);
});

socket.on('marked-as-read', (data) => {
  console.log(`Messages marked as read in ${data.conversationId}`);
});
```

## Image Processing Integration

### Automated Conversation Flow

When a student uploads an image:

1. **Image Upload**: Student uploads image via existing API
2. **Conversation Creation**: System finds or creates conversation for the experiment
3. **Processing Notification**: Bot sends "Analysis started" message
4. **Analysis**: Matrix code detection runs in background
5. **Feedback Delivery**: Bot sends detailed analysis results
6. **Guidance**: If issues found, bot provides improvement suggestions
7. **Real-time Updates**: All messages sent via WebSocket for immediate delivery

### Bot Message Types

#### Processing Started
```
🔄 Starting analysis of your submitted image: filename.jpg
```

#### Analysis Complete (Success)
```
✅ Analysis Complete

📊 Analysis Results:
• Total Matrix codes detected: 5
• Readable codes: 4
• Unreadable codes: 1

🔍 Detected Components:
1. ✅ Component-A-001
2. ✅ Component-B-002
3. ✅ Component-C-003
4. ✅ Component-D-004
5. ❌ Unreadable

📝 Detailed Report:
[Analysis details...]
```

#### Improvement Guidance
```
💡 Improvement Suggestions

I detected 1 unreadable Matrix codes. Here are some tips to improve your image quality:

• Ensure good lighting conditions
• Hold the camera steady to avoid blur
• Make sure Matrix codes are clearly visible and not obstructed
• Try to capture the image from directly above
• Ensure the entire experimental setup is visible

Feel free to resubmit your image or ask your instructor for help! 🤝
```

#### Processing Failed
```
❌ Processing Failed

I encountered an error while analyzing your image:

[Error details]

Please try uploading the image again or contact your instructor for assistance.
```

## Usage Examples

### Frontend Integration

#### React Hook Example
```javascript
import { useEffect, useState } from 'react';
import io from 'socket.io-client';

function useConversation(token, conversationId) {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!token) return;

    const newSocket = io('http://localhost:3000/conversations', {
      auth: { token }
    });

    newSocket.on('connect', () => setConnected(true));
    newSocket.on('disconnect', () => setConnected(false));
    
    newSocket.on('new-message', (data) => {
      setMessages(prev => [...prev, data.message]);
    });

    setSocket(newSocket);

    return () => newSocket.close();
  }, [token]);

  useEffect(() => {
    if (socket && conversationId) {
      socket.emit('join-conversation', { conversationId });
    }
  }, [socket, conversationId]);

  const sendMessage = (content) => {
    if (socket && conversationId) {
      socket.emit('send-message', {
        conversationId,
        message: { content, messageType: 'text' }
      });
    }
  };

  return { connected, messages, sendMessage };
}
```

#### Vue.js Component Example
```javascript
export default {
  data() {
    return {
      socket: null,
      messages: [],
      connected: false,
      newMessage: ''
    };
  },
  async mounted() {
    this.socket = io('http://localhost:3000/conversations', {
      auth: { token: this.$store.state.auth.token }
    });

    this.socket.on('connect', () => {
      this.connected = true;
    });

    this.socket.on('new-message', (data) => {
      this.messages.push(data.message);
    });

    if (this.conversationId) {
      this.socket.emit('join-conversation', {
        conversationId: this.conversationId
      });
    }
  },
  methods: {
    sendMessage() {
      if (this.newMessage.trim()) {
        this.socket.emit('send-message', {
          conversationId: this.conversationId,
          message: {
            content: this.newMessage,
            messageType: 'text'
          }
        });
        this.newMessage = '';
      }
    }
  }
};
```

## Testing

### Test File
Use the provided `test-conversation.html` file to test the conversation system:

1. Start your NestJS server
2. Open `test-conversation.html` in a browser
3. Enter a valid JWT token
4. Connect to the conversation namespace
5. Create conversations and test real-time messaging

### Manual Testing Steps

1. **Authentication Test**
   - Connect with valid/invalid tokens
   - Verify connection status

2. **Conversation Creation**
   - Create conversations with different participants
   - Test validation and error handling

3. **Real-time Messaging**
   - Join conversations
   - Send messages between participants
   - Test message delivery and read status

4. **Image Processing Integration**
   - Upload images and verify conversation creation
   - Check bot message delivery
   - Test reprocessing functionality

## Security Considerations

1. **Authentication**: All endpoints require JWT authentication
2. **Authorization**: Users can only access their own conversations
3. **Input Validation**: All inputs are validated using DTOs
4. **Rate Limiting**: Consider implementing rate limiting for message sending
5. **Message Sanitization**: Sanitize message content to prevent XSS

## Performance Considerations

1. **Message Pagination**: Large conversations are paginated
2. **Connection Management**: WebSocket connections are properly managed
3. **Database Indexing**: Proper indexes on conversation queries
4. **Memory Usage**: Consider message archiving for old conversations

## Future Enhancements

1. **File Attachments**: Support for file uploads in messages
2. **Message Reactions**: Emoji reactions to messages
3. **Typing Indicators**: Show when users are typing
4. **Push Notifications**: Mobile/browser notifications
5. **Message Search**: Full-text search across conversations
6. **Conversation Templates**: Pre-defined conversation templates
7. **Analytics**: Conversation analytics and reporting

## Troubleshooting

### Common Issues

1. **Connection Failed**
   - Check JWT token validity
   - Verify server is running
   - Check CORS configuration

2. **Messages Not Delivered**
   - Ensure user is in conversation room
   - Check WebSocket connection status
   - Verify conversation permissions

3. **Bot Messages Not Appearing**
   - Check image processing service integration
   - Verify conversation creation logic
   - Check error logs for processing failures

### Debug Mode

Enable debug logging by setting environment variable:
```bash
DEBUG=conversation:* npm run start:dev
```

This comprehensive conversation system provides a robust foundation for communication between students, instructors, and AI bots, with real-time capabilities and proper integration with your existing image processing workflow.