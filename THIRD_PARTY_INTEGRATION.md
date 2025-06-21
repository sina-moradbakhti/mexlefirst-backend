# Third Party Image Processing Integration

## Overview

This project has been updated to use a 3rd party service for DataMatrix code detection instead of local image processing libraries. The change improves performance and reduces the application's dependency footprint.

## Changes Made

### 1. New Service Implementation
- **Created**: `src/image/services/third-party-detector.service.ts`
- **Purpose**: Handles communication with the external DataMatrix detection service
- **Features**:
  - Sends image URLs to the 3rd party API
  - Downloads processed images from the service
  - Converts 3rd party response format to internal format
  - Maintains compatibility with existing conversation and socket systems

### 2. Service Replacement
- **Replaced**: `MatrixCodeDetectorService` with `ThirdPartyDetectorService`
- **Updated**: `ImageProcessingService` to use the new 3rd party service
- **Updated**: `ImageModule` to inject the new service

### 3. Dependencies Removed
The following heavy image processing libraries have been removed:
- `@tensorflow-models/coco-ssd`
- `@tensorflow/tfjs-node`
- `@zxing/browser`
- `@zxing/library`
- `canvas`
- `jsqr`
- `sharp`

### 4. Configuration Added
New environment variables for 3rd party service integration:
- `THIRD_PARTY_DETECTOR_URL`: URL of the detection service (default: http://localhost:5001)
- `BASE_URL`: Base URL for serving uploaded images (default: http://localhost:3000 for development, https://server.mexle.org for production)

## API Integration

### 3rd Party Service Endpoint
- **URL**: `POST /detect_url`
- **Request Body**:
  ```json
  {
    "url": "https://server.mexle.org/uploads/20250523-0919-71437.jpg"
  }
  ```
- **Response Format**:
  ```json
  {
    "count": 2,
    "detected_codes": [
      {
        "data": "00000",
        "method": "pylibdmtx",
        "position": {
          "height": 26,
          "width": 34,
          "x": 607,
          "y": 145
        },
        "type": "DATAMATRIX"
      }
    ],
    "image_url": "/download/result_efdf41d7_20250523-0919-71437.jpg",
    "source_url": "https://server.mexle.org/uploads/20250523-0919-71437.jpg"
  }
  ```

## Workflow

1. **Image Upload**: User uploads image via existing API
2. **URL Generation**: System generates public URL for the uploaded image
3. **3rd Party Call**: System sends image URL to 3rd party detection service
4. **Processing**: 3rd party service processes the image and returns results
5. **Image Download**: System downloads the processed image from 3rd party service
6. **Response Conversion**: 3rd party response is converted to internal format
7. **User Notification**: Results are sent to user via WebSocket and conversation system

## Backward Compatibility

- All existing APIs remain unchanged
- WebSocket events maintain the same format
- Conversation integration continues to work
- Database schema remains the same
- Frontend applications require no changes

## Configuration

### Development Environment
```env
THIRD_PARTY_DETECTOR_URL=http://localhost:5001
BASE_URL=http://localhost:3000
```

### Production Environment
```env
THIRD_PARTY_DETECTOR_URL=http://localhost:5001
BASE_URL=https://server.mexle.org
```

## Benefits

1. **Reduced Bundle Size**: Removed heavy image processing libraries
2. **Better Performance**: Offloaded processing to specialized service
3. **Improved Accuracy**: Leveraging specialized detection algorithms
4. **Easier Maintenance**: Reduced complexity in the main application
5. **Scalability**: Processing can be scaled independently

## Error Handling

The system includes comprehensive error handling:
- Network connectivity issues with 3rd party service
- Invalid responses from 3rd party service
- Image download failures
- Timeout handling for long-running processes

## Testing

To test the integration:
1. Ensure the 3rd party service is running on `localhost:5001`
2. Upload an image through the existing API
3. Monitor the logs for 3rd party service calls
4. Verify processed images are downloaded to the `uploads/processed` directory
5. Check that WebSocket events are sent with correct data

## Rollback Plan

If needed, the old image processing system can be restored from:
- `../backup-old-image-processing/backup/old-services/`
- Restore removed dependencies in `package.json`
- Update service imports in `ImageModule`