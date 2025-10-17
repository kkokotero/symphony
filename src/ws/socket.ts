import type { MaybePromise } from '@src/types';
import type { WebSocket } from 'ws';
import type { WebSocketManager } from './web-socket-manager';
import type { Room, RoomContainer, RoomManager } from '@src/core/rooms';
import { randomUUID } from 'node:crypto';

/**
 * Enumerates the possible message data types that can be received or sent
 * through the WebSocket abstraction.
 *
 * These values allow the system to identify the payload type and handle it
 * appropriately (for example, text messages, JSON objects, or binary buffers).
 */
export enum Message {
	String = 0,       // Plain text message (string-based)
	Object = 1,       // JSON object that has been parsed
	Buffer = 2,       // Node.js Buffer containing binary data
	ArrayBuffer = 3,  // ArrayBuffer type for raw binary data (browser-like)
	ListBuffer = 4,   // Array containing multiple Buffer segments
}

/**
 * Defines the available events that can be emitted by a `Socket` instance,
 * along with their corresponding listener function signatures.
 *
 * Each event aligns with the WebSocket lifecycle or control frames, providing
 * both synchronous and asynchronous handler compatibility.
 */
export interface SocketEventMap {
	/** Fired when the WebSocket connection is successfully opened. */
	open: () => MaybePromise<unknown>;

	/**
	 * Fired whenever a message is received from the connected peer.
	 * The listener receives both the data payload and the automatically
	 * detected message type.
	 *
	 * @param data - The payload received, which may be a string, Buffer, ArrayBuffer, etc.
	 * @param type - The deduced `Message` type, based on the payload structure.
	 */
	message: (
		data: string | object | Buffer | ArrayBuffer | Buffer[],
		type: Message,
	) => MaybePromise<unknown>;

	/**
	 * Fired when the WebSocket connection has been closed by either
	 * the client or the server.
	 *
	 * @param code - The numeric close code.
	 * @param reason - A human-readable reason string (if provided).
	 */
	close: (code: number, reason: string) => MaybePromise<unknown>;

	/**
	 * Fired whenever an error occurs in the WebSocket stream or handler.
	 *
	 * @param error - The encountered `Error` instance.
	 */
	error: (error: Error) => MaybePromise<unknown>;

	/** Fired when a `ping` frame is received from the peer. */
	ping: (data: Buffer) => MaybePromise<unknown>;

	/** Fired when a `pong` frame is received from the peer. */
	pong: (data: Buffer) => MaybePromise<unknown>;
}

/**
 * Represents a managed WebSocket connection.
 *
 * This class provides a high-level, type-safe interface over a native `WebSocket`,
 * including:
 *  - Unified event management (registering persistent and one-time listeners)
 *  - Automatic detection of message types (text, binary, JSON, etc.)
 *  - Built-in lifecycle utilities (ping/pong, close, context storage)
 *  - Room-based grouping and broadcasting via `RoomManager`
 *
 * Instances of this class are created and managed automatically by
 * the {@link WebSocketManager}. Direct manual instantiation is not typical.
 */
export class Socket {
	/**
	 * Persistent event listeners map.
	 * Each key corresponds to an event type (e.g. `"message"`, `"close"`),
	 * and its value is a `Set` of callback functions that remain active
	 * until explicitly removed.
	 */
	private events = new Map<
		keyof SocketEventMap,
		Set<SocketEventMap[keyof SocketEventMap]>
	>();

	/**
	 * One-time listeners map.
	 * These listeners behave like `.once()` in Node.js — they execute once
	 * and are automatically deleted afterward.
	 */
	private onceEvents = new Map<
		keyof SocketEventMap,
		Set<SocketEventMap[keyof SocketEventMap]>
	>();

	/**
	 * Indicates whether this socket instance has been fully destroyed.
	 * Once destroyed, it cannot emit or receive events anymore.
	 */
	private destroyed = false;

	/**
	 * Arbitrary context storage per socket connection.
	 * Used to attach metadata or user state (e.g. authentication info,
	 * user profiles, session variables, etc.).
	 */
	public context: Record<string, unknown> = {};

	/** Universally unique identifier (UUID) for this socket connection. */
	public readonly uuid = randomUUID();

	/**
	 * Constructs a new `Socket` wrapper.
	 *
	 * @param native - The underlying WebSocket object from the `ws` library.
	 * @param roomManager - The `RoomManager` instance managing all active rooms.
	 */
	constructor(
		public native: WebSocket,
		private roomManager: RoomManager,
	) {
		this.bindNativeEvents();
	}

	/**
	 * Internal method that binds the native WebSocket events to
	 * this class’s internal event system.
	 *
	 * It ensures all WebSocket lifecycle events (e.g. message, close, ping/pong)
	 * are re-emitted through the `Socket`’s unified event emitter.
	 */
	private bindNativeEvents() {
		this.native.on('message', async (data) => {
			this.emit('message', data, Message.String);
		});

		this.native.on('close', async (code, reason) =>
			this.emit('close', code, reason.toString()),
		);

		this.native.on('error', async (err) => this.emit('error', err));

		this.native.on('ping', async (data) => this.emit('ping', data));
		this.native.on('pong', async (data) => this.emit('pong', data));
	}

	// ---------------------------------------------------------------------
	// EVENT MANAGEMENT
	// ---------------------------------------------------------------------

	/**
	 * Registers a persistent listener for a given event.
	 *
	 * Each time the event occurs, all registered listeners will be invoked
	 * in the order they were added.
	 *
	 * @param event - The event name (e.g. `"message"`, `"error"`).
	 * @param listener - The callback function to execute when the event fires.
	 * @returns The current `Socket` instance, for chaining.
	 */
	on<K extends keyof SocketEventMap>(
		event: K,
		listener: SocketEventMap[K],
	): this {
		if (!this.events.has(event)) this.events.set(event, new Set());
		this.events.get(event)?.add(listener);
		return this;
	}

	/**
	 * Registers a one-time listener that automatically removes itself
	 * after the first invocation.
	 *
	 * Useful for initialization or cleanup logic that should only occur once.
	 *
	 * @param event - The event name to subscribe to.
	 * @param listener - The callback function to invoke once.
	 * @returns The current `Socket` instance.
	 */
	once<K extends keyof SocketEventMap>(
		event: K,
		listener: SocketEventMap[K],
	): this {
		if (!this.onceEvents.has(event)) this.onceEvents.set(event, new Set());
		this.onceEvents.get(event)?.add(listener);
		return this;
	}

	/**
	 * Removes listeners for a specific event.
	 *
	 * If a listener is provided, only that callback is removed.
	 * If no listener is specified, all listeners for that event are cleared.
	 *
	 * @param event - The target event name.
	 * @param listener - Optional specific listener to remove.
	 * @returns The current `Socket` instance.
	 */
	off<K extends keyof SocketEventMap>(
		event: K,
		listener?: SocketEventMap[K],
	): this {
		if (listener) {
			this.events.get(event)?.delete(listener);
			this.onceEvents.get(event)?.delete(listener);
		} else {
			this.events.delete(event);
			this.onceEvents.delete(event);
		}
		return this;
	}

	/**
	 * Emits an event, triggering all associated listeners.
	 * If the event is `"message"`, the message type is automatically
	 * determined based on the payload structure.
	 *
	 * @param event - The event to emit.
	 * @param args - Arguments to pass to the listener callbacks.
	 * @returns The current `Socket` instance.
	 */
	emit<K extends keyof SocketEventMap>(
		event: K,
		...args: Parameters<SocketEventMap[K]>
	): this {
		const listeners = [
			...(this.events.get(event) ?? []),
			...(this.onceEvents.get(event) ?? []),
		];

		if (listeners.length === 0) return this;

		// Infer payload type for message events
		if (event === 'message') {
			const message = args[0];
			let type = Message.String;

			if (Buffer.isBuffer(message)) {
				type = Message.Buffer;
			} else if (message instanceof ArrayBuffer) {
				type = Message.ArrayBuffer;
			} else if (Array.isArray(message)) {
				type = Message.ListBuffer;
			} else {
				type = Message.Object;
			}

			for (const fn of listeners)
				(fn as SocketEventMap['message'])(message as string, type);
		} else {
			for (const fn of listeners) (fn as any)(...args);
		}

		// Once-listeners are cleared after their first trigger
		if (this.onceEvents.has(event)) this.onceEvents.delete(event);
		return this;
	}

	// ---------------------------------------------------------------------
	// COMMUNICATION & LIFECYCLE
	// ---------------------------------------------------------------------

	/**
	 * Sends data to the connected peer.
	 * Automatically converts JavaScript objects to JSON strings
	 * before transmission.
	 *
	 * @param data - The outgoing payload (string, Buffer, ArrayBuffer, or object).
	 * @returns The current `Socket` instance for chaining.
	 */
	send(data: string | Buffer | ArrayBuffer | object): this {
		if (
			typeof data === 'object' &&
			!(data instanceof Buffer) &&
			!(data instanceof ArrayBuffer)
		) {
			this.native.send(JSON.stringify(data));
			return this;
		}
		this.native.send(data);
		return this;
	}

	/**
	 * Gracefully closes the WebSocket connection and cleans up
	 * internal resources, such as event listeners.
	 *
	 * @param code - Optional close code (default 1000 = normal closure).
	 * @param reason - Optional textual reason describing the closure.
	 */
	close(code?: number, reason?: string): void {
		this.destroyed = true;
		this.native.close(code, reason);
		this.events.clear();
		this.onceEvents.clear();
	}

	// ---------------------------------------------------------------------
	// PING / PONG HANDLING
	// ---------------------------------------------------------------------

	/**
	 * Sends a `ping` control frame to the client.
	 * Commonly used to verify connection health or measure latency.
	 *
	 * @param data - Optional ping payload.
	 * @param mask - Whether to apply masking to the frame.
	 */
	ping(data?: Buffer, mask = false): void {
		if (this.is('open')) {
			this.native.ping(data ?? Buffer.alloc(0), mask);
		}
	}

	/**
	 * Sends a `pong` frame, usually in response to a received ping.
	 *
	 * @param data - Optional pong payload.
	 * @param mask - Whether to apply masking to the frame.
	 */
	pong(data?: Buffer, mask = false): void {
		if (this.is('open')) {
			this.native.pong(data ?? Buffer.alloc(0), mask);
		}
	}

	// ---------------------------------------------------------------------
	// METADATA & STATE HELPERS
	// ---------------------------------------------------------------------

	/** Returns this socket’s unique UUID identifier. */
	get id(): string {
		return this.uuid;
	}

	/** Retrieves the client’s remote IP address from the underlying TCP socket. */
	get remoteAddress(): string {
		return (this.native as any)._socket?.remoteAddress ?? '';
	}

	/** Retrieves the client’s remote TCP port from the underlying socket. */
	get remotePort(): number {
		return (this.native as any)._socket?.remotePort ?? 0;
	}

	/**
	 * Checks whether the WebSocket is in a specific state.
	 *
	 * @param isvalue - One of `"open"`, `"closed"`, or `"destroyed"`.
	 * @returns `true` if the current state matches the requested one.
	 */
	is(isvalue: 'open' | 'closed' | 'destroyed') {
		if (isvalue === 'open') return this.native.readyState === this.native.OPEN;
		if (isvalue === 'closed')
			return this.native.readyState === this.native.CLOSED;
		return this.destroyed;
	}

	/**
	 * Stores a contextual value under the specified key.
	 * This allows adding metadata to the socket for later retrieval.
	 *
	 * @param key - Context key name.
	 * @param value - Value to associate with this key.
	 */
	setContext(key: string, value: unknown): void {
		this.context[key] = value;
	}

	/**
	 * Retrieves a previously stored value from the socket’s context.
	 *
	 * @param key - The context key to retrieve.
	 * @returns The stored value, or `undefined` if not present.
	 */
	getContext<T>(key: string): T | undefined {
		return this.context[key] as T | undefined;
	}

	/**
	 * Joins the socket to a specific named room, allowing broadcast
	 * messaging and shared event propagation.
	 *
	 * @param name - The name of the room to join.
	 * @param callback - Optional callback invoked once the room is joined.
	 * @returns The `Room` instance representing the joined room.
	 */
	join(name: string, callback?: (room: Room) => MaybePromise<unknown>): Room {
		const room = this.roomManager.join(this, name);
		callback?.(room);
		return room;
	}

	/**
	 * Returns the full set of active rooms managed by this socket’s
	 * associated `RoomManager`.
	 */
	get rooms(): Map<string, RoomContainer> {
		return this.roomManager.rooms;
	}
}
