import type { Socket } from '@ws/index';
import { RoomContainer } from './room-container';
import { Room } from './room';

/**
 * Options for configuring the behavior of RoomManager.
 */
export interface RoomManagerOptions {
  /**
   * Delay time (in milliseconds) before deleting an empty room.
   * If set to 0 or undefined, the room is deleted immediately when empty.
   */
  roomCleanupDelay?: number;
}

/**
 * RoomManager is responsible for managing multiple RoomContainer instances.
 * It handles joining sockets to rooms, scheduling deletion of empty rooms,
 * and cancelling deletion if new sockets join before the cleanup.
 */
export class RoomManager {
  /**
   * A map of room names to their corresponding RoomContainer instances.
   */
  public rooms: Map<string, RoomContainer> = new Map();

  /**
   * A map of room names to active cleanup timers.
   * This is used to delay deletion of empty rooms.
   */
  private cleanupTimers: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Create a new RoomManager with optional configuration.
   * @param options Configuration options for room cleanup delay.
   */
  constructor(private readonly options: RoomManagerOptions = {}) {}

  /**
   * Join a socket to a room by name.
   * - If the room does not exist, it creates a new RoomContainer.
   * - Registers an 'empty' event listener on the room to schedule deletion when empty.
   * - If the room already exists, cancels any previously scheduled deletion.
   * @param socket The socket joining the room.
   * @param name The name of the room to join.
   * @returns A Room instance representing the socket's connection to the room.
   */
  join(socket: Socket, name: string) {
    let room = this.rooms.get(name);

    if (!room) {
      // Create a new room if it doesn't exist
      room = new RoomContainer(name);

      // Schedule deletion when the room becomes empty
      room.on(socket, 'empty', () => {
        this.scheduleDeletion(name);
      });

      this.rooms.set(name, room);
    } else {
      // Cancel any scheduled deletion if someone joins again
      this.cancelDeletion(name);
    }

    // Wrap the socket and room into a Room object for convenience
    return new Room(socket, room);
  }

  /**
   * Schedule deletion of a room after a specified delay.
   * If the delay is 0, deletes the room immediately.
   * Ensures only one timer exists per room.
   * @param name The name of the room to delete.
   */
  private scheduleDeletion(name: string) {
    const delay = this.options.roomCleanupDelay ?? 0;

    if (delay <= 0) {
      // Immediate deletion if no delay is configured
      this.rooms.delete(name);
      return;
    }

    // Prevent duplicate timers for the same room
    this.cancelDeletion(name);

    const timer = setTimeout(() => {
      const room = this.rooms.get(name);
      if (!room || room.size > 0) return; // Extra safety: only delete if room is empty
      this.rooms.delete(name);
      this.cleanupTimers.delete(name);
    }, delay);

    // Store the timer for possible cancellation
    this.cleanupTimers.set(name, timer);
  }

  /**
   * Cancel a scheduled deletion of a room.
   * This is called when a new socket joins a room before the timer expires.
   * @param name The name of the room whose deletion should be cancelled.
   */
  private cancelDeletion(name: string) {
    const timer = this.cleanupTimers.get(name);
    if (timer) {
      clearTimeout(timer);
      this.cleanupTimers.delete(name);
    }
  }
}
