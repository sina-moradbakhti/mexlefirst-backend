# WebSocket Authentication Guide

This guide explains how to connect to the WebSocket server with authentication and handle image processing events.

## WebSocket Connection with Authentication

The WebSocket server requires authentication using a JWT token. Here's how to connect:

### Using Socket.IO Client (Browser)

```javascript
// Import Socket.IO client
import { io } from "socket.io-client";

// Connect with authentication
const socket = io("http://your-server-url/image-processing", {
  auth: {
    token: "your-jwt-token" // The same token used for REST API authentication
  }
});

// Connection events
socket.on("connect", () => {
  console.log("Connected to WebSocket server");
});

socket.on("connect_error", (error) => {
  console.error("Connection error:", error.message);
});

socket.on("disconnect", (reason) => {
  console.log("Disconnected:", reason);
});

// Listen for processing events
socket.on("processing-update", (data) => {
  console.log("Processing update:", data);
  // Example data: { imageId: "123", status: "processing", message: "Analyzing image..." }
});

socket.on("processing-complete", (data) => {
  console.log("Processing complete:", data);
  // Example data: { imageId: "123", status: "completed", message: "Analysis complete", ... }
});
```

### Using Socket.IO Client (Node.js)

```javascript
const { io } = require("socket.io-client");

// Connect with authentication
const socket = io("http://your-server-url/image-processing", {
  auth: {
    token: "your-jwt-token"
  }
});

// Connection and event handling is the same as browser example
```

## Alternative Authentication Methods

The server supports multiple ways to provide the authentication token:

### 1. Using auth object (recommended)

```javascript
const socket = io("http://your-server-url/image-processing", {
  auth: { token: "your-jwt-token" }
});
```

### 2. Using query parameter

```javascript
const socket = io("http://your-server-url/image-processing?token=your-jwt-token");
```

### 3. Using headers

```javascript
const socket = io("http://your-server-url/image-processing", {
  extraHeaders: { Authorization: "Bearer your-jwt-token" }
});
```

## Image Upload Process

1. Upload an image using the REST API endpoint: `POST /images/upload`
2. Include your JWT token in the Authorization header
3. The server will process the image and send updates via WebSocket
4. Listen for `processing-update` and `processing-complete` events

## Testing

You can use the included HTML test page to test the WebSocket connection and image upload:

1. Open `test-websocket-auth.html` in your browser
2. Enter your server URL and JWT token
3. Connect to the WebSocket server
4. Upload an image and observe the processing events

## Troubleshooting

- If you receive a connection error, check that your token is valid
- Make sure your token has not expired
- Verify that you're connecting to the correct namespace (/image-processing)
- Check server logs for more detailed error information