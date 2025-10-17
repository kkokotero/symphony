import type { Socket } from '@ws/index';
import type { RoomContainer, RoomEvent } from './room-container';

/**
 * Room is a wrapper around a RoomContainer for a specific socket.
 * It provides convenient methods to interact with the room from the
 * perspective of a single connected socket.
 */
export class Room {
  /**
   * Create a new Room instance.
   * Automatically joins the given socket to the RoomContainer.
   * @param socket The socket associated with this Room instance.
   * @param conteiner The RoomContainer managing the room.
   */
  constructor(
    private socket: Socket,
    private conteiner: RoomContainer,
  ) {
    // Automatically join the socket to the room
    this.conteiner.join(this.socket);
  }

  /**
   * Get all sockets currently in the room.
   * @returns A Set of all connected sockets (roommates).
   */
  get roommates() {
    return this.conteiner.roommates;
  }

  /**
   * Get the name of the room.
   */
  get name(): string {
    return this.conteiner.name;
  }

  /**
   * Get the number of sockets currently in the room.
   */
  get size(): number {
    return this.conteiner.size;
  }

  /**
   * Register an event listener for this socket in the room.
   * Delegates the call to the RoomContainer, automatically associating
   * the event with this socket.
   * @param name The name of the event ('join', 'leave', 'message', 'empty').
   * @param event The callback function to handle the event.
   * @returns The Room instance for chaining.
   */
  on<T extends keyof RoomEvent>(name: T, event: RoomEvent[T]): this {
    this.conteiner.on(this.socket, name, event);
    return this;
  }

  /**
   * Send a message from this socket to all other sockets in the room.
   * Delegates to the RoomContainer, which determines the message type.
   * @param args The arguments to pass to the socket's send method (message payload).
   * @returns The Room instance for chaining.
   */
  send(...args: Parameters<Socket['send']>): this {
    this.conteiner.send(this.socket, ...args);
    return this;
  }

  /**
   * Leave the room, removing this socket from the RoomContainer.
   * Triggers 'leave' events and cleans up event listeners associated with this socket.
   * @returns The Room instance for chaining.
   */
  leave(): this {
    this.conteiner.leave(this.socket);
    return this;
  }
}
