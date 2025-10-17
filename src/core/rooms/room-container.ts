import type { MaybePromise } from '@src/types';
import { Message, type Socket } from '@ws/index';

/**
 * RoomEvent defines the set of events that can occur in a room.
 * Each event corresponds to a function signature.
 */
export type RoomEvent = {
	/**
	 * Triggered when a socket joins the room.
	 * @param socket The socket that joined.
	 * @returns Maybe a promise that resolves when the join event handling is complete.
	 */
	join: (socket: Socket) => MaybePromise<unknown>;

	/**
	 * Triggered when a socket leaves the room.
	 * @param socket The socket that left.
	 * @returns Maybe a promise that resolves when the leave event handling is complete.
	 */
	leave: (socket: Socket) => MaybePromise<unknown>;

	/**
	 * Triggered when a message is sent to the room.
	 * @param data The data being sent. Can be a string, object, Buffer, ArrayBuffer, or array of Buffers.
	 * @param type The type of the message, defined in the Message enum.
	 * @returns Maybe a promise that resolves when the message event handling is complete.
	 */
	message: (
		data: string | object | Buffer | ArrayBuffer | Buffer[],
		type: Message,
	) => MaybePromise<unknown>;

	/**
	 * Triggered when the room becomes empty (no connected sockets).
	 * @returns Maybe a promise that resolves when the empty event handling is complete.
	 */
	empty: () => MaybePromise<unknown>;
};

/**
 * RoomContainer manages a group of sockets (roommates) and their associated events.
 * It supports join, leave, message handling, and emits events for connected sockets.
 */
export class RoomContainer {
	/**
	 * A set containing all connected sockets in the room.
	 */
	public roommates: Set<Socket> = new Set();

	/**
	 * A map of room events to sets of listener functions, indexed by event type and associated socket ID.
	 */
	private events: Map<
		keyof RoomEvent,
		Set<{ event: RoomEvent[keyof RoomEvent]; id: string }>
	> = new Map();

	/**
	 * Create a new RoomContainer.
	 * @param name The unique name of the room.
	 */
	constructor(public readonly name: string) {}

	/**
	 * Register a listener for a specific event in the room.
	 * @param socket The socket associated with the listener.
	 * @param name The name of the event ('join', 'leave', 'message', 'empty').
	 * @param event The callback function to invoke when the event is triggered.
	 * @returns The RoomContainer instance for chaining.
	 */
	on<T extends keyof RoomEvent>(
		socket: Socket,
		name: T,
		event: RoomEvent[T],
	): this {
		if (!this.events.has(name)) this.events.set(name, new Set());
		this.events.get(name)?.add({ event, id: socket.id });
		return this;
	}

	/**
	 * Returns the current number of sockets connected to the room.
	 */
	get size(): number {
		return this.roommates.size;
	}

	/**
	 * Add a socket to the room.
	 * Triggers 'join' event listeners for all other sockets in the room.
	 * Registers an automatic leave when the socket closes.
	 * @param socket The socket to join.
	 * @returns The RoomContainer instance for chaining.
	 */
	join(socket: Socket): this {
		if (this.roommates.has(socket)) return this;

		this.roommates.add(socket);

		// Notify all 'join' listeners except the joining socket itself
		this.events.get('join')?.forEach((fn) => {
			if (fn.id !== socket.id) (fn.event as RoomEvent['join'])(socket);
		});

		// Automatically remove socket from room when it closes
		socket.on('close', () => {
			this.leave(socket);
		});

		return this;
	}

	/**
	 * Remove a socket from the room.
	 * Triggers 'leave' event listeners for all other sockets.
	 * If room becomes empty, triggers 'empty' events and cleans up listeners.
	 * @param socket The socket to remove.
	 * @returns The RoomContainer instance for chaining.
	 */
	leave(socket: Socket): this {
		if (!this.roommates.has(socket)) return this;

		this.roommates.delete(socket);

		// Notify all 'leave' listeners except the leaving socket itself
		this.events.get('leave')?.forEach((fn) => {
			if (fn.id !== socket.id) (fn.event as RoomEvent['leave'])(socket);
		});

		// If room is empty, trigger 'empty' events
		if (this.roommates.size < 1) {
			this.events
				.get('empty')
				?.forEach((fn) => (fn.event as RoomEvent['empty'])());
		}

		// Cleanup all event listeners associated with the leaving socket
		const leavingId = socket.id;
		for (const [_, listeners] of this.events) {
			for (const listener of Array.from(listeners)) {
				if (listener.id === leavingId) {
					listeners.delete(listener);
				}
			}
		}

		// Clear all events if room is empty
		if (this.roommates.size < 1) {
			this.events.clear();
		}

		return this;
	}

	/**
	 * Send a message to all sockets in the room, excluding the sender.
	 * Automatically detects the type of the message (string, object, buffer, etc.)
	 * and calls the 'message' event listeners.
	 * @param socket The sender socket.
	 * @param args Arguments to pass to the socket.send method (typically the message).
	 * @returns The RoomContainer instance for chaining.
	 */
	send(socket: Socket, ...args: Parameters<Socket['send']>): this {
		const message = args[0];

		// Determine message type for event notification
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

		// Notify all 'message' listeners except the sender itself
		this.events.get('message')?.forEach((fn) => {
			if (fn.id !== socket.id)
				(fn.event as RoomEvent['message'])(message, type);
		});

		return this;
	}
}
