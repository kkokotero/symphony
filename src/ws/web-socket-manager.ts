import type { MaybePromise, WSController, Plugin } from '@src/types';
import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import { WebSocketServer } from 'ws';
import { Socket } from './socket';
import { Request } from '@http/request';
import { Trie } from '@src/routing/trie';
import { EndPoint } from '@core/end-point';
import type { CacheConfig } from '@core/utils/cache';
import { RoomManager, type RoomManagerOptions } from '@src/core/rooms';

/**
 * Defines all events that can be emitted by the WebSocket server.
 * Each event handler can return a synchronous or asynchronous result.
 */
export interface SocketServerEvent {
	/** Triggered when a new WebSocket client successfully connects. */
	connection: (socket: Socket, request: Request) => MaybePromise<unknown>;

	/** Triggered when the WebSocket server closes or shuts down. */
	close: () => MaybePromise<unknown>;

	/** Triggered when an error occurs within the server. */
	error: (error: Error) => MaybePromise<unknown>;

	/** Triggered when the WebSocket server starts listening for connections. */
	listening: () => MaybePromise<unknown>;

	/**
	 * Triggered before completing the handshake phase of a connection.
	 * Allows you to modify response headers before they are sent to the client.
	 */
	headers: (headers: string[], request: Request) => MaybePromise<unknown>;
}

/**
 * The `WebSocketManager` class provides a structured abstraction layer
 * on top of the native `ws` WebSocketServer, adding:
 *
 * - Route-based endpoint registration using a Trie router
 * - Middleware and plugin support for modular extensibility
 * - Strongly-typed event binding (`on`, `once`, `off`)
 * - Integration with a Node.js HTTP server for WebSocket upgrades
 *
 * This class serves as a flexible WebSocket framework designed
 * for structured, scalable applications.
 *
 * Example:
 * ```ts
 * const wsManager = new WebSocketManager(server);
 *
 * wsManager
 *   .use(authMiddleware)
 *   .on("connection", (socket, req) => {
 *      console.log("Client connected:", req.url);
 *    })
 *   .route("/chat/:roomId", chatController);
 * ```
 */
export class WebSocketManager {
	/** The underlying WebSocketServer instance provided by the `ws` library. */
	public readonly native: WebSocketServer;

	/**
	 * A Trie-based router structure that efficiently matches
	 * incoming connection paths to registered WebSocket endpoints.
	 */
	public routes: Trie<EndPoint<WSController>>;

	/**
	 * A list of global middleware functions that will be executed
	 * before any route-specific middleware or handlers.
	 */
	private middlewares: WSController[] = [];

	private rooms: RoomManager;

	/**
	 * Creates a new WebSocketManager bound to a Node.js HTTP server.
	 *
	 * @param server - The HTTP server to attach to for handling WebSocket upgrades.
	 * @param config - Optional configuration object for caching Trie routes.
	 */
	constructor(
		server: Server<typeof IncomingMessage, typeof ServerResponse>,
		config?: CacheConfig & RoomManagerOptions,
	) {
		// Initialize a native WebSocket server that attaches to the given HTTP server
		this.native = new WebSocketServer({ server });
		this.rooms = new RoomManager(config);

		// Create a Trie router for route matching and parameter parsing
		this.routes = new Trie(config);

		// Automatically handle incoming WebSocket connections
		this.native.on('connection', (s, req) => {
			// Only process connections if routes have been defined
			if (this.routes.hasContent()) {
				// Attempt to match the incoming URL against registered routes
				const result = this.routes.find(req.url ?? '/');
				req.method = 'WS';

				// Wrap the native IncomingMessage into a higher-level Request abstraction
				const request = new Request(req, {
					params: result?.params,
					query: result?.query,
					wildCard: result?.wildCard,
				});

				// Wrap the native WebSocket into a custom Socket wrapper
				const socket = new Socket(s, this.rooms);

				// If a valid route handler is found, invoke it
				if (result?.node.handler) {
					result?.node.handler.call(socket, request, () => {});
					socket.emit('open');
					return;
				}

				// If no matching route exists, close the connection with a 1008 policy error
				socket.send(`WebSocket route not found: ${request.url}`);
				socket.close(1008, 'Not found');
				return;
			}
		});
	}

	/**
	 * Replaces the internal Trie router with a new one.
	 *
	 * @param trie - The new Trie instance containing route definitions.
	 * @returns The current WebSocketManager instance (chainable).
	 */
	public attach(trie: Trie<EndPoint<WSController>>): this {
		this.routes = trie;
		return this;
	}

	/**
	 * Exports all registered WebSocket routes into an array of endpoint definitions.
	 * Useful for introspection, documentation generation, or testing.
	 *
	 * @returns An array of serialized WebSocket endpoint configurations.
	 */
	public export(): Record<string, EndPoint<WSController>> {
		const result: Record<string, EndPoint<WSController>> = {};
		this.routes.export((path, endpoint) => {
			result[path] = endpoint;
		});
		return result;
	}

	/**
	 * Registers one or more global WebSocket middlewares.
	 * These middlewares will execute before any route-specific ones.
	 *
	 * @param middlewares - The middleware functions to register globally.
	 * @returns The current WebSocketManager instance (chainable).
	 */
	public use(...middlewares: WSController[]): this {
		this.middlewares.push(...middlewares);
		return this;
	}

	/**
	 * Installs one or more WebSocket plugins.
	 * Each plugin receives the WebSocketManager instance and
	 * can add routes, register middlewares, or modify configuration.
	 *
	 * @param plugins - The plugin functions to execute.
	 * @returns The current WebSocketManager instance (chainable).
	 */
	public plugin(...plugins: Plugin<this>[]): this {
		for (const plugin of plugins) plugin(this);
		return this;
	}

	/**
	 * Registers a new WebSocket route and associates it with middleware and a handler.
	 *
	 * The final argument is the main route handler, while all preceding arguments
	 * are treated as route-specific middleware.
	 *
	 * @example
	 * ```ts
	 * ws.route("/room/:id", authMiddleware, chatController);
	 * ```
	 *
	 * @param path - The URL path or pattern to match (e.g. `/chat/:roomId`).
	 * @param handlers - One or more WebSocket controllers (middleware + handler).
	 * @returns The created endpoint instance for further configuration.
	 */
	public route(
		path: string,
		...handlers: WSController[]
	): EndPoint<WSController> {
		// The final handler is the main controller
		const handler = handlers[handlers.length - 1];
		// Preceding handlers are route-level middlewares
		const middlewares = handlers.slice(0, -1);

		// Create and configure a new WebSocket endpoint
		const endPoint = new EndPoint<WSController>()
			.method('WS')
			.path(path)
			.handler(handler)
			.middleware(...this.middlewares) // Apply global middlewares
			.middleware(...middlewares); // Apply route-specific middlewares

		// Register the endpoint in the Trie router
		this.routes.create(path, endPoint);

		// Allow dynamic removal of this route
		endPoint.setRemove(() => this.routes.delete(path));

		return endPoint;
	}

	/**
	 * Registers a persistent listener for a given WebSocket server event.
	 *
	 * @param name - The name of the event (e.g. "connection", "error").
	 * @param event - The callback function to handle the event.
	 * @returns The current WebSocketManager instance (chainable).
	 */
	on<K extends keyof SocketServerEvent>(
		name: K,
		event: SocketServerEvent[K],
	): this {
		this.bind(name, event, 'on');
		return this;
	}

	/**
	 * Registers a one-time listener for a WebSocket server event.
	 * The listener will be automatically removed after its first execution.
	 *
	 * @param name - The event name to listen for.
	 * @param event - The handler to execute once.
	 * @returns The current WebSocketManager instance (chainable).
	 */
	once<K extends keyof SocketServerEvent>(
		name: K,
		event: SocketServerEvent[K],
	): this {
		this.bind(name, event, 'once');
		return this;
	}

	/**
	 * Removes a previously registered event listener from the WebSocket server.
	 *
	 * @param name - The event name to remove.
	 * @param event - The exact function reference previously registered.
	 * @returns The current WebSocketManager instance (chainable).
	 */
	off<K extends keyof SocketServerEvent>(
		name: K,
		event: SocketServerEvent[K],
	): this {
		this.native.off(name, event);
		return this;
	}

	/**
	 * Internal helper method to bind event listeners (`on` or `once`)
	 * to the native WebSocket server, applying type-safe wrappers for complex events.
	 *
	 * @param name - The event name to listen for.
	 * @param event - The callback to execute when the event occurs.
	 * @param method - Whether to register persistently (`on`) or once (`once`).
	 */
	private bind<K extends keyof SocketServerEvent>(
		name: K,
		event: SocketServerEvent[K],
		method: 'on' | 'once',
	): void {
		switch (name) {
			case 'connection':
				// Wraps the native socket and request objects into structured abstractions
				this.native[method]('connection', (s, req) => {
					req.method = 'WS';
					const socket = new Socket(s, this.rooms);
					const request = new Request(req);
					(event as SocketServerEvent['connection'])(socket, request);
				});
				break;

			case 'headers':
				// Allows modification of response headers before completing the handshake
				this.native[method]('headers', (headers, req) => {
					const request = new Request(req);
					(event as SocketServerEvent['headers'])(headers, request);
				});
				break;

			// Other events are passed directly without additional wrapping
			case 'close':
			case 'error':
			case 'listening':
				this.native[method](name, event);
				break;
		}
	}
}
