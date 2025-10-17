# HTTP Examples Collection

This directory contains comprehensive examples demonstrating Symphony's HTTP server capabilities, from basic routing to advanced middleware and plugin systems.

## Examples Overview

### Core Examples

#### Simple Server (`simple-server.ts`)
The perfect starting point for understanding Symphony's HTTP server. Demonstrates basic server setup and route handling.

**Key Concepts:**
- Server initialization
- Basic GET routing
- Response handling
- Server startup and address binding

#### Echo Server (`echo-server.ts`)
Shows request/response echo functionality, useful for debugging and understanding request processing.

**Key Concepts:**
- Request body parsing
- Response mirroring
- Content type handling
- Request method support

### Advanced Features

#### Events (`events.ts`)
Demonstrates event-driven architecture within the HTTP server for handling various server lifecycle events.

**Key Concepts:**
- Event emission and listening
- Server lifecycle management
- Custom event handling
- Asynchronous event processing

#### File Stream (`file-stream.ts`)
Shows efficient file streaming capabilities for handling large files and optimizing memory usage.

**Key Concepts:**
- File streaming
- Memory efficiency
- Content disposition headers
- Error handling for file operations

#### Redirect (`redirect.ts`)
Implements various HTTP redirection patterns and status code handling.

**Key Concepts:**
- HTTP redirect status codes
- Temporary vs permanent redirects
- Redirect chains
- URL rewriting

#### Static Files (`static-files.ts`)
Demonstrates static file serving with proper MIME type detection and caching headers.

**Key Concepts:**
- Static file middleware
- MIME type detection
- Cache control headers
- Directory serving

### Middleware System

#### Global Middleware (`middlewares/global-middleware.ts`)
Shows application-wide middleware that processes every request.

**Key Concepts:**
- Global request processing
- Middleware execution order
- Request/response modification
- Error propagation

#### Authentication Middleware (`middlewares/auth-middleware.ts`)
Implements authentication patterns with token-based access control.

**Key Concepts:**
- Authentication headers
- Token validation
- Protected routes
- Unauthorized responses

#### Logger Middleware (`middlewares/logger-middleware.ts`)
Demonstrates request logging with various detail levels and formatting options.

**Key Concepts:**
- Request logging
- Response time tracking
- Log formatting
- Performance monitoring

### Plugin Architecture

#### Basic Plugin (`plugins/basic-plugin.ts`)
Shows the plugin system for extending server functionality with modular components.

**Key Concepts:**
- Plugin registration
- Modular architecture
- Plugin lifecycle
- Extensibility patterns

### Routing Patterns

#### Simple Routing (`routing/simple-routing.ts`)
Demonstrates basic routing patterns and parameter handling.

**Key Concepts:**
- Route parameters
- Query string handling
- Route matching
- Response formatting

#### Router (`routing/router.ts`)
Shows advanced router configuration with nested routes and middleware application.

**Key Concepts:**
- Router instances
- Route grouping
- Nested routing
- Router-level middleware

#### Group Routing (`routing/group.ts`)
Demonstrates route grouping for organizing related endpoints and applying shared middleware.

**Key Concepts:**
- Route prefixes
- Group middleware
- Organized endpoint structure
- Shared route configuration

### WebSocket Integration

#### WebSocket Examples (`websocket/`)
Shows WebSocket integration within HTTP servers for real-time communication.

**Key Concepts:**
- WebSocket upgrade handling
- Real-time communication
- HTTP and WebSocket coexistence
- Connection management

## Getting Started

1. Choose an example that matches your learning goal
2. Navigate to the example file
3. Run the example:
   ```bash
   bun run [example-name].ts
   ```
4. Test the endpoints using curl, Postman, or your browser
5. Study the code to understand the implementation

## Learning Path

### Beginner Path
1. Start with `simple-server.ts` for basic concepts
2. Progress to `echo-server.ts` for request handling
3. Explore `static-files.ts` for file serving
4. Try `routing/simple-routing.ts` for URL patterns

### Intermediate Path
1. Study `middlewares/` directory for request processing
2. Examine `routing/` examples for advanced patterns
3. Implement `plugins/basic-plugin.ts` for extensibility
4. Combine concepts in your own applications

### Advanced Path
1. Master the middleware system with custom implementations
2. Create complex routing structures with groups
3. Implement authentication and authorization
4. Build plugin-based architectures
5. Integrate WebSocket for real-time features

## Testing Examples

Each example can be tested using various tools:

### curl Commands
```bash
# Test simple server
curl http://localhost:3000

# Test echo server
curl -X POST -d "Hello World" http://localhost:3000/echo

# Test routing with parameters
curl http://localhost:3000/users/123
```

### Browser Testing
- Navigate to `http://localhost:3000` for GET endpoints
- Use browser developer tools to inspect responses
- Test static file serving by accessing served files

## Best Practices Demonstrated

- **Clean Code**: Each example follows clean coding principles
- **Error Handling**: Proper error handling and user feedback
- **Performance**: Efficient request processing and response handling
- **Security**: Input validation and secure coding patterns
- **Modularity**: Well-organized, reusable code structures

## Extending These Examples

These examples provide solid foundations for building more complex applications:

- **REST APIs**: Combine routing and middleware for API development
- **Web Applications**: Use static files and routing for full web apps
- **Microservices**: Implement service-oriented architectures
- **Real-time Applications**: Integrate WebSocket for live features

Each example is designed to be educational while maintaining production-quality code standards.