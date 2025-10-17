import {
	createServer,
	type ServerOptions,
	type OriginalServer,
} from '@core/utils/create-server';
import { Router, type RouterConfig } from './router';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { MaybePromise, Methods } from '@src/types';
import { Request } from './request';
import { Response } from './response';
import {
	type SocketEventMap,
	type SocketServerEvent,
	WebSocketManager,
} from '@ws/index';
import type { RoomManagerOptions } from '@src/core/rooms';

/**
 * Defines all events that the Server class can emit.
 */
export type ServerEvents = {
	/** Triggered when the server starts listening on a port */
	listening: (port: number) => MaybePromise<unknown>;
	/** Triggered when an internal server error occurs */
	error: (err: Error) => MaybePromise<unknown>;
	/** Triggered when a request does not match any route */
	'not-found': (req: Request, res: Response) => MaybePromise<unknown>;
	/** Triggered on every incoming HTTP request */
	request: (req: Request, res: Response) => MaybePromise<unknown>;
	socketConnection: (
		...args: Parameters<SocketServerEvent['connection']>
	) => MaybePromise<unknown>;
	socketMessage: (
		...args: Parameters<SocketEventMap['message']>
	) => MaybePromise<unknown>;
	socketClose: (
		...args: Parameters<SocketEventMap['close']>
	) => MaybePromise<unknown>;
	/** Triggered when the server is closed */
	closed: () => MaybePromise<unknown>;
};

/**
 * Server class extending Router.
 * Handles HTTP and WebSocket requests, event handling, and lifecycle methods.
 */
export class Server extends Router {
	/** Native HTTP/S server instance */
	public readonly native: OriginalServer<
		typeof IncomingMessage,
		typeof ServerResponse
	>;

	/** Optional WebSocket manager instance */
	public webSocketManager?: WebSocketManager;

	/** Internal event storage for registered listeners */
	private events: {
		[K in keyof ServerEvents]?: ServerEvents[K][];
	} = {};

	/**
	 * Initializes a new Server instance.
	 * @param options Configuration for router prefix, caching, and server options.
	 */
	constructor(
		private config?: RouterConfig &
			RoomManagerOptions &
			ServerOptions<typeof IncomingMessage, typeof ServerResponse>,
	) {
		super(config);

		// Create the underlying native HTTP server
		this.native = createServer(config);

		// Attach HTTP request listener
		this.native.on('request', async (req, res) => {
			// Attempt to find a matching route in the HTTP trie
			const result = this.routes.http
				.get((req.method ?? 'GET') as Methods)
				?.find(req.url ?? '/');

			// Wrap the native request/response with our Request/Response classes
			const request = new Request(req, {
				params: result?.params,
				query: result?.query,
				wildCard: result?.wildCard,
			});

			const response = new Response(res, this);

			if (result?.node.handler) {
				try {
					// Execute the matched route handler
					result.node.handler.call(request, response, () => {});
				} catch (err) {
					// Handle internal server errors
					console.error(err);
					response.status(500).send('Internal Server Error');
					this.emit('error', err as Error);
				}
			} else {
				// No route matched: return 404 Not Found
				response.status(404).send('Not Found.');
				this.emit('not-found', request, response);
			}

			// Emit a request event for all incoming requests
			this.emit('request', request, response);
		});

		// Attach native error listener
		this.native.on('error', (err) => this.emit('error', err));

		['SIGINT', 'SIGTERM'].forEach((signal) => {
			process.on(signal, () => {
				this.close(() => process.exit(0));
			});
		});
	}

	/**
	 * Returns the server address as a formatted URL string.
	 * Includes protocol, host, port, and prefix path.
	 */
	get address() {
		const addr = this.native.address();

		if (!addr) return {};

		// Si el servidor devuelve una cadena (caso Unix socket)
		if (typeof addr === 'string') {
			return {
				url: addr,
				protocol: 'unix',
				host: '',
				port: null,
				family: null,
				raw: addr,
			};
		}

		// Detecta si es HTTPS
		const isSecure =
			typeof (this.native as any).addContext === 'function' ||
			this.native.constructor.name.toLowerCase().includes('https');

		const protocol = isSecure ? 'https' : 'http';

		// Normaliza el host
		const host =
			addr.address === '::' || addr.address === '0.0.0.0'
				? 'localhost'
				: addr.address;

		// Prefijo del servidor (opcional)
		const prefix = typeof this.prefix === 'string' ? this.prefix : '';
		const normalizedPrefix = prefix.replace(/^\/+|\/+$/g, ''); // quita / al inicio y final

		const url = `${protocol}://${host}:${addr.port}${
			normalizedPrefix ? `/${normalizedPrefix}` : ''
		}`;

		return {
			url,
			protocol,
			host,
			port: addr.port,
			family: addr.family,
			raw: addr,
		};
	}

	/**
	 * Registers an event listener for a specific server event.
	 * @param event Event name to listen for
	 * @param listener Callback function for the event
	 */
	on<K extends keyof ServerEvents>(event: K, listener: ServerEvents[K]): this {
		if (!this.events[event]) this.events[event] = [];
		this.events[event]?.push(listener);
		return this;
	}

	/**
	 * Emits a server event to all registered listeners.
	 * @param event Event name to emit
	 * @param args Arguments to pass to event listeners
	 */
	async emit<K extends keyof ServerEvents>(
		event: K,
		...args: Parameters<ServerEvents[K]>
	) {
		const listeners = this.events[event];
		if (!listeners) return 0;
		for (const listener of listeners) {
			(listener as any)(...args);
		}

		return listeners.length;
	}

	/**
	 * Starts listening on the specified port.
	 * If WebSocket routes exist, initializes WebSocketManager.
	 * @param port Port number to listen on
	 * @param callback Optional callback invoked after listening starts
	 */
	listen(port: number, callback?: () => MaybePromise<unknown>) {
		// Initialize WebSocket manager if WS routes exist
		if (this.routes.ws.hasContent()) {
			this.webSocketManager = new WebSocketManager(this.native, this.config);
			this.webSocketManager.attach(this.routes.ws);

			this.webSocketManager.on('connection', (socket, req) => {
				this.emit('socketConnection', socket, req);

				socket.on('message', (...args) => {
					this.emit('socketMessage', ...args);
				});

				socket.on('close', (...args) => {
					this.emit('socketClose', ...args);
				});
			});
			this.webSocketManager.on('error', (err) => this.emit('error', err));
		}

		// Start native HTTP server
		this.native.listen(port);

		callback?.();
		this.emit('listening', port);
	}

	/**
	 * Closes the server.
	 * @param callback Optional callback invoked after closing
	 */
	close(callback?: () => MaybePromise<unknown>) {
		this.native.close();

		callback?.();
		this.emit('closed');
	}
}
