# WebSocket Examples Collection

This directory contains comprehensive examples demonstrating Symphony's WebSocket server capabilities, from basic connections to advanced room management and plugin systems.

## Examples Overview

### Core Examples

#### Simple Server (`simple-server.ts`)
The fundamental WebSocket server example, perfect for understanding basic connection handling and message processing.

**Key Concepts:**
- WebSocket server initialization
- Connection event handling
- Message sending and receiving
- Basic server lifecycle management

#### Echo Server (`echo-server.ts`)
Demonstrates bidirectional communication by echoing received messages back to clients, useful for testing and debugging WebSocket connections.

**Key Concepts:**
- Message echo functionality
- Bidirectional communication
- Connection state management
- Error handling for connections

### Advanced Features

#### Middleware (`middleware.ts`)
Shows WebSocket middleware implementation for processing messages and managing connections at various stages.

**Key Concepts:**
- WebSocket middleware architecture
- Message preprocessing
- Connection filtering
- Middleware execution order

#### Rooms (`rooms.ts`)
Demonstrates room-based communication patterns, allowing clients to join specific channels and broadcast messages within those channels.

**Key Concepts:**
- Room creation and management
- Channel-based messaging
- User presence tracking
- Room cleanup and lifecycle

#### Routing (`routing.ts`)
Shows advanced message routing patterns for organizing WebSocket endpoints and handling different message types.

**Key Concepts:**
- Message routing patterns
- Endpoint organization
- Type-based message handling
- Route parameter extraction

### Plugin Architecture

#### Basic Plugin (`plugins/basic-plugin.ts`)
Demonstrates the plugin system for extending WebSocket server functionality with modular components.

**Key Concepts:**
- Plugin registration and lifecycle
- Modular WebSocket extensions
- Plugin configuration
- Extensibility patterns

## Getting Started

### Prerequisites
- Basic understanding of WebSocket protocol
- Familiarity with event-driven programming
- Node.js/Bun runtime environment

### Running Examples

1. Navigate to the WebSocket examples directory:
   ```bash
   cd examples/ws
   ```

2. Choose an example and run it:
   ```bash
   npm run simple-server.ts
   ```

3. Test the WebSocket server using:
   - Browser developer tools
   - WebSocket client libraries
   - Command-line WebSocket tools
   - Online WebSocket testers

### Testing WebSocket Connections

#### Using wscat (Command Line)
```bash
# Install wscat
npm install -g wscat

# Connect to server
wscat -c ws://localhost:8080

# Send messages
> Hello Server!
```

## Learning Path

### Beginner Path
1. **Start Simple**: Begin with `simple-server.ts` to understand basic connections
2. **Message Handling**: Progress to `echo-server.ts` for bidirectional communication
3. **Connection Management**: Study connection lifecycle and error handling
4. **Basic Testing**: Practice with browser console and simple clients

### Intermediate Path
1. **Middleware Mastery**: Study `middleware.ts` for request processing
2. **Room Implementation**: Explore `rooms.ts` for channel-based communication
3. **Message Routing**: Understand `routing.ts` for organized message handling
4. **Client Development**: Build simple WebSocket clients for testing

### Advanced Path
1. **Plugin Development**: Create custom plugins using `basic-plugin.ts`
2. **Scalable Architecture**: Design systems using rooms and routing together
3. **Performance Optimization**: Implement efficient message broadcasting
4. **Production Considerations**: Handle reconnection, load balancing, and scaling

## Key Concepts Explained

### WebSocket Protocol
- Full-duplex communication channel
- Lower overhead than HTTP polling
- Persistent connection between client and server
- Event-driven message handling

### Connection Management
- Handling connection establishment
- Managing connection state
- Implementing graceful disconnections
- Connection error recovery

### Message Patterns
- **Broadcasting**: Sending messages to all connected clients
- **Targeting**: Sending messages to specific clients
- **Room-based**: Organizing clients into channels
- **Request-Response**: Correlating requests with responses

### Scalability Considerations
- Connection pooling
- Message queuing
- Load distribution
- Memory management

## Real-World Applications

These examples provide foundations for building:

### Chat Applications
- Real-time messaging systems
- Multi-user chat rooms
- Private messaging
- User presence indicators

### Live Collaboration
- Document editing collaboration
- Whiteboard applications
- Real-time code editing
- Project management tools

### Gaming
- Multiplayer game servers
- Real-time game state synchronization
- Player matchmaking
- Live game events

### Data Streaming
- Live data feeds
- Real-time analytics
- Stock tickers
- Sensor data monitoring

## Best Practices Demonstrated

### Connection Handling
- Proper connection lifecycle management
- Graceful error handling
- Resource cleanup
- Connection state tracking

### Message Processing
- Efficient message parsing
- Type validation
- Error propagation
- Message queuing

### Architecture Patterns
- Modular design with plugins
- Organized routing structures
- Middleware-based processing
- Room-based organization

### Performance Optimization
- Efficient message broadcasting
- Memory-conscious connection management
- Optimized message routing
- Resource cleanup strategies

## Extending These Examples

These WebSocket examples can be extended to create:

- **Authentication Systems**: Add user authentication and authorization
- **Persistence Layers**: Integrate databases for message history
- **Advanced Protocols**: Implement custom protocols on top of WebSocket
- **Monitoring Systems**: Add connection monitoring and analytics
- **Load Balancing**: Scale across multiple server instances
- **SSL/TLS Support**: Implement secure WebSocket connections (WSS)

Each example is designed to be educational while maintaining production-quality patterns that can be directly applied to real-world applications.
