# Chat Server Example

A complete real-time chat application built with Symphony, demonstrating WebSocket integration, room management, and modern web development practices.

## Features

- **Real-time Messaging**: Instant message delivery using WebSocket connections
- **Room Management**: Create and join multiple chat rooms
- **User Interface**: Clean, responsive web interface
- **Connection Handling**: Robust connection management with cleanup
- **Static File Serving**: Integrated static file server for the frontend

## Architecture

This example showcases a full-stack chat application with:

- **Backend**: Symphony HTTP server with WebSocket support
- **Frontend**: Vanilla JavaScript with modern CSS styling
- **Communication**: WebSocket-based real-time messaging
- **Routing**: RESTful API endpoints for room management

## Project Structure

```
chat-server/
├── index.ts          # Main server entry point
├── public/           # Frontend assets
│   ├── index.html   # Chat interface
│   ├── main.js      # Client-side JavaScript
│   └── styles.css   # Application styling
└── routes/
    └── room.ts      # Room management routes
```

## Getting Started

1. Navigate to this directory:
   ```bash
   cd examples/chat-server
   ```

2. Install dependencies (if not already installed):
   ```bash
   npm install
   ```

3. Start the server:
   ```bash
   npm run index.ts
   ```

4. Open your browser and navigate to `http://localhost:3000`

## Usage

Once the server is running:

1. **Join a Room**: Enter your username and room name, then click "Join"
2. **Send Messages**: Type your message and press Enter or click Send
3. **Switch Rooms**: Join different rooms to see isolated conversations
4. **Multiple Users**: Open multiple browser tabs to simulate multiple users

## Key Concepts Demonstrated

### WebSocket Integration
- WebSocket server setup and configuration
- Connection lifecycle management
- Message broadcasting to room participants

### Room Management
- Dynamic room creation and destruction
- User tracking within rooms
- Cleanup of empty rooms with configurable delay

### Static File Serving
- Integration of static file middleware
- Serving HTML, CSS, and JavaScript files
- Path resolution and file organization

### Error Handling
- Graceful handling of connection errors
- User-friendly error messages
- Server stability under various conditions

## Configuration

The server includes several configurable options:

- **Port**: Default port 3000
- **Room Cleanup Delay**: 5 seconds (configurable in `index.ts`)
- **Static Files**: Served from the `public` directory

## Extending This Example

This chat server provides a solid foundation for further development:

- **Authentication**: Add user authentication and authorization
- **Persistence**: Store chat history in a database
- **Private Messages**: Implement direct messaging between users
- **File Sharing**: Allow users to share images and files
- **Typing Indicators**: Show when users are typing
- **User Presence**: Display online/offline status

The modular architecture makes it easy to add new features while maintaining clean separation of concerns.
