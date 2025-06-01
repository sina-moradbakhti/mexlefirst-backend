# Matrix Code Detection System

This document describes the Matrix code detection system implemented for the MexleFirst project.

## Overview

The system automatically processes uploaded images to detect Matrix codes on electronic components, highlights them, and provides feedback to students about the readability of the codes.

## Features

- **Automatic Matrix Code Detection**: Detects Matrix codes in uploaded images
- **Visual Highlighting**: Highlights detected codes with color-coded overlays:
  - Green (low opacity): Readable codes
  - Yellow (low opacity): Unreadable codes
- **Real-time Feedback**: Uses WebSocket to notify students immediately when processing is complete
- **Bot Reports**: Provides automated feedback messages about detection results
- **Database Integration**: Stores detection results and processed images

## System Components

### 1. MatrixCodeDetectorService
- **File**: `src/image/services/matrix-code-detector.service.ts`
- **Purpose**: Core image processing and Matrix code detection
- **Key Methods**:
  - `processImage()`: Main processing method
  - `detectMatrixCodes()`: Detection algorithm
  - `createHighlightedImage()`: Creates highlighted output image
  - `generateReport()`: Creates bot feedback messages

### 2. ImageProcessingService
- **File**: `src/image/services/image-processing.service.ts`
- **Purpose**: Orchestrates the processing workflow
- **Key Methods**:
  - `processUploadedImage()`: Main processing workflow
  - `queueImageProcessing()`: Queues images for processing
  - `reprocessImage()`: Allows reprocessing of images

### 3. ImageProcessingGateway
- **File**: `src/image/gateways/image-processing.gateway.ts`
- **Purpose**: WebSocket communication for real-time updates
- **Events**:
  - `processing-update`: Sent when processing starts
  - `processing-complete`: Sent when processing finishes

### 4. Enhanced Image Schema
- **File**: `src/image/schemas/image.schema.ts`
- **New Fields**:
  - `detectedComponents`: Array of detected Matrix codes
  - `processedImageUrl`: Path to highlighted image
  - `reportByBot`: Bot feedback message
  - `reportedPhoto`: Additional reporting field

## API Endpoints

### Student Endpoints

#### Upload Image
```
POST /images/upload
```
- Uploads image and automatically queues for Matrix code processing
- Returns image metadata immediately
- Processing happens asynchronously

#### Get Processing Status
```
GET /images/processing-status/:imageId
```
- Returns current processing status and results
- Includes detected components and feedback

#### Reprocess Image
```
POST /images/reprocess/:imageId
```
- Triggers reprocessing of an existing image
- Useful for retry scenarios

#### Fetch Images
```
GET /images/:experimentId
```
- Returns all images for an experiment
- Includes processing status and feedback

## WebSocket Integration

### Connection
Connect to the WebSocket namespace:
```javascript
const socket = io('http://localhost:3000/image-processing', {
  query: { userId: 'student-user-id' }
});
```

### Events

#### processing-update
Sent when processing starts:
```javascript
socket.on('processing-update', (data) => {
  // data: { imageId, status: 'processing', message: 'Bot: Starting...' }
});
```

#### processing-complete
Sent when processing finishes:
```javascript
socket.on('processing-complete', (data) => {
  // data: { 
  //   imageId, 
  //   status: 'completed'|'needs_review'|'failed',
  //   message: 'Bot: All 3 components are readable!',
  //   totalCodes: 3,
  //   readableCodes: 3,
  //   unreadableCodes: 0
  // }
});
```

## Processing Workflow

1. **Image Upload**: Student uploads image via `/images/upload`
2. **Queue Processing**: Image is automatically queued for processing
3. **Detection**: Matrix codes are detected and analyzed
4. **Highlighting**: Processed image with highlights is created
5. **Database Update**: Results are stored in database
6. **WebSocket Notification**: Student receives real-time update
7. **Report Generation**: Bot feedback is generated and stored

## Bot Feedback Messages

The system generates different feedback messages based on detection results:

- **No codes detected**: "Bot: No Matrix codes detected in your image. Please ensure your components are visible and try again."
- **All codes readable**: "Bot: All X components are readable! Please wait for the final report..."
- **Some codes unreadable**: "Bot: You have X components, but Y of them are not readable. Please try again and take a photo more accurately."

## Database Schema Updates

The Image schema has been enhanced with new fields:

```typescript
@Schema({ timestamps: true })
export class Image {
  // ... existing fields ...
  
  @Prop({ type: [Object], default: [] })
  detectedComponents: Record<string, any>[];

  @Prop()
  processedImageUrl: string;

  @Prop()
  reportByBot: string;

  @Prop()
  reportedPhoto: string;
}
```

## Testing

### WebSocket Testing
Use the provided test file:
```bash
open test-websocket.html
```

This provides a web interface to:
- Connect to WebSocket
- Simulate processing events
- View real-time updates

### API Testing
Use tools like Postman or curl to test the API endpoints:

```bash
# Upload an image
curl -X POST http://localhost:3000/images/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "image=@path/to/image.jpg" \
  -F "experimentId=EXPERIMENT_ID" \
  -F "description=Test upload"

# Check processing status
curl -X GET http://localhost:3000/images/processing-status/IMAGE_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Configuration

### Environment Variables
Ensure these are set in your environment:
- `UPLOAD_DIR`: Directory for uploaded images
- `MONGODB_URI`: MongoDB connection string

### Dependencies
The system uses these key dependencies:
- `sharp`: Image processing
- `@nestjs/websockets`: WebSocket support
- `socket.io`: Real-time communication

## Error Handling

The system includes comprehensive error handling:
- Failed processing updates image status to 'failed'
- WebSocket errors are logged and handled gracefully
- File system errors are caught and reported
- Database errors trigger appropriate cleanup

## Future Enhancements

Potential improvements:
- Integration with actual Matrix code libraries (e.g., OpenCV)
- Queue system for high-volume processing (Redis/Bull)
- Image preprocessing for better detection
- Machine learning models for improved accuracy
- Batch processing capabilities
- Performance monitoring and metrics

## Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**
   - Check if server is running
   - Verify CORS settings
   - Ensure correct namespace URL

2. **Processing Never Completes**
   - Check server logs for errors
   - Verify file permissions in upload directory
   - Ensure MongoDB connection is stable

3. **Images Not Highlighted**
   - Check if processed directory exists
   - Verify Sharp library installation
   - Check file system permissions

### Logs
Monitor these log sources:
- NestJS application logs
- WebSocket gateway logs
- Image processing service logs
- Matrix code detector logs