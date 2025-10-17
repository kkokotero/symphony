import type { IncomingMessage, Server, ServerResponse } from 'http';
import { WebSocketManager } from './web-socket-manager';
import { createServer, type ServerOptions } from '@core/utils/create-server';
import type { CacheConfig } from '@core/utils/cache';
import type { MaybePromise } from '@src/types';

/**
 * @class WebSocketServer
 * @extends WebSocketManager
 *
 * High-level wrapper that combines an HTTP/S server with a WebSocket manager.
 * It provides built-in server lifecycle handling (listen/close),
 * automatic address resolution, and protocol detection (ws / wss).
 *
 * This class simplifies the process of creating and managing a WebSocket server
 * by extending the core {@link WebSocketManager} with its own HTTP server instance.
 */
export class WebSocketServer extends WebSocketManager {
	/** The underlying HTTP/S server instance used to attach WebSocket connections. */
	public readonly server: Server<typeof IncomingMessage, typeof ServerResponse>;

	/**
	 * Creates a new WebSocketServer instance.
	 *
	 * @param options - Optional HTTP server configuration and caching settings.
	 * Supports {@link ServerOptions} and {@link CacheConfig}.
	 *
	 * The constructor internally creates a Node.js HTTP or HTTPS server
	 * (depending on provided TLS options), then passes it to the WebSocketManager.
	 */
	constructor(
		options?: ServerOptions<typeof IncomingMessage, typeof ServerResponse> &
			CacheConfig,
	) {
		const server = createServer(options);
		super(server, options);

		this.server = server;

		['SIGINT', 'SIGTERM'].forEach((signal) => {
			process.on(signal, () => {
				this.close(() => process.exit(0));
			});
		});
	}

	/**
	 * Returns the complete public WebSocket address of the server.
	 *
	 * The method determines:
	 * - Whether the server is secure (`wss://`) or not (`ws://`)
	 * - The host (e.g., localhost or IPv6)
	 * - The port the server is listening on
	 *
	 * @returns A formatted WebSocket URL, e.g. `ws://localhost:8080` or `wss://[::1]:443`
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

		const protocol = isSecure ? 'wss' : 'ws';

		// Normaliza el host
		const host =
			addr.address === '::' || addr.address === '0.0.0.0'
				? 'localhost'
				: addr.address;

		// Prefijo del servidor (opcional)

		const url = `${protocol}://${host}:${addr.port}`;

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
	 * Starts listening for incoming WebSocket and HTTP/S connections.
	 *
	 * @param port - The port number to bind the server to.
	 * @param callback - Optional callback invoked once the server starts listening.
	 *
	 * @returns The current instance for chaining.
	 *
	 * @example
	 * ```ts
	 * const wss = new WebSocketServer();
	 * wss.listen(8080, () => console.log(`Server running on ${wss.address.url}`));
	 * ```
	 */
	listen(port: number, callback?: () => MaybePromise<unknown>): this {
		this.server.listen(port, () => callback?.());
		return this;
	}

	/**
	 * Gracefully closes the WebSocket and underlying HTTP/S server.
	 *
	 * @param callback - Optional callback invoked once the server is closed.
	 *
	 * @remarks
	 * This stops accepting new connections and closes existing ones.
	 */
	close(callback?: () => MaybePromise<unknown>): void {
		this.close(callback);
	}
}
