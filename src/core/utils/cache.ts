/**
 * Configuration options for the cache.
 */
export type CacheConfig = {
	/** Maximum number of items allowed in the cache. Default: 500 */
	maxSize?: number;

	/** Default expiration time (TTL) for each entry in milliseconds. Default: 10 seconds */
	expiration?: number;

	/** Interval (in ms) at which expired items are automatically cleaned up. Default: 10 seconds */
	cleanupInterval?: number;
};

/**
 * Internal doubly-linked list node used to manage cache order (LRU).
 * Each node holds a key-value pair and metadata such as expiration time.
 */
class CacheNode<K, V> {
	/** The unique key for this cache entry */
	key: K;

	/** The value associated with this key */
	value: V;

	/** Optional timestamp (in ms) indicating when this entry expires */
	expiresAt?: number;

	/** Pointer to the previous node in the linked list (for LRU ordering) */
	prev?: CacheNode<K, V>;

	/** Pointer to the next node in the linked list (for LRU ordering) */
	next?: CacheNode<K, V>;

	constructor(key: K, value: V, expiresAt?: number) {
		this.key = key;
		this.value = value;
		this.expiresAt = expiresAt;
	}
}

/**
 * A highly efficient, in-memory Least Recently Used (LRU) cache implementation
 * with optional per-item TTL (time-to-live) and automatic cleanup.
 *
 * This cache uses:
 *  - A Map for O(1) lookups and insertions.
 *  - A doubly-linked list to efficiently track recency of access.
 *
 * When the cache exceeds `maxSize`, the least recently used (oldest) entry
 * is automatically evicted.
 */
export class Cache<K, V> {
	/** Maximum number of items stored in the cache */
	private maxSize: number;

	/** Default expiration time (TTL) for items, in milliseconds */
	private expiration?: number;

	/** Interval for automatic cleanup of expired items, in milliseconds */
	private cleanupInterval?: number;

	/** Fast key-to-node lookup map (O(1)) */
	private map = new Map<K, CacheNode<K, V>>();

	/** Pointer to the least recently used (LRU) node — the oldest item */
	private head?: CacheNode<K, V>;

	/** Pointer to the most recently used (MRU) node — the newest item */
	private tail?: CacheNode<K, V>;

	/** Periodic cleanup timer handle */
	private cleanupTimer?: NodeJS.Timeout;

	/**
	 * Creates a new cache instance with optional configuration.
	 * Default configuration:
	 *  - maxSize: 500
	 *  - expiration: 10 seconds
	 *  - cleanupInterval: 10 seconds
	 */
	constructor(options?: CacheConfig) {
		const config: CacheConfig = {
			maxSize: 500,
			cleanupInterval: 10000,
			expiration: 10000,
			...options,
		};

		this.maxSize = config.maxSize ?? Number.POSITIVE_INFINITY;
		this.expiration = config.expiration;
		this.cleanupInterval = config.cleanupInterval;

		// Automatically clean up expired items if configured
		if (this.cleanupInterval) {
			this.cleanupTimer = setInterval(
				() => this.cleanup(),
				this.cleanupInterval,
			);
			// Prevent the timer from keeping the Node.js event loop alive
			this.cleanupTimer.unref();
		}
	}

	/**
	 * Adds a node to the end (MRU position) of the linked list.
	 */
	private addNodeToTail(node: CacheNode<K, V>) {
		if (!this.tail) {
			this.head = this.tail = node;
		} else {
			this.tail.next = node;
			node.prev = this.tail;
			this.tail = node;
		}
	}

	/**
	 * Removes a node from the linked list in O(1) time.
	 */
	private removeNode(node: CacheNode<K, V>) {
		if (node.prev) node.prev.next = node.next;
		else this.head = node.next;

		if (node.next) node.next.prev = node.prev;
		else this.tail = node.prev;

		node.prev = undefined;
		node.next = undefined;
	}

	/**
	 * Moves an existing node to the tail (most recently used position).
	 */
	private moveToTail(node: CacheNode<K, V>) {
		if (this.tail === node) return;
		this.removeNode(node);
		this.addNodeToTail(node);
	}

	/**
	 * Checks whether a cache entry has expired.
	 * If expired, the entry is deleted immediately.
	 */
	private isExpired(node: CacheNode<K, V>): boolean {
		if (node.expiresAt && node.expiresAt <= Date.now()) {
			this.delete(node.key);
			return true;
		}
		return false;
	}

	/**
	 * Periodically removes expired items from the cache.
	 * Starts from the head (oldest) node and stops when it finds a valid one.
	 */
	private cleanup() {
		let node = this.head;
		const now = Date.now();

		while (node) {
			if (node.expiresAt && node.expiresAt <= now) {
				const next = node.next;
				this.delete(node.key);
				node = next;
			} else {
				break; // Stop once a valid (non-expired) node is found
			}
		}
	}

	/**
	 * Retrieves a value from the cache.
	 * - Returns `undefined` if the key doesn't exist or is expired.
	 * - Marks the entry as recently used by moving it to the tail.
	 */
	get(key: K): V | undefined {
		const node = this.map.get(key);
		if (!node) return undefined;
		if (this.isExpired(node)) return undefined;

		this.moveToTail(node);
		return node.value;
	}

	/**
	 * Checks whether a key exists in the cache and is not expired.
	 */
	has(key: K): boolean {
		const node = this.map.get(key);
		if (!node) return false;
		if (this.isExpired(node)) return false;
		return true;
	}

	/**
	 * Adds or updates an entry in the cache.
	 * - If the cache is full, the least recently used entry is evicted.
	 * - Optional per-entry TTL can override the global expiration setting.
	 */
	set(key: K, value: V, ttl?: number) {
		const expiresAt =
			ttl !== undefined
				? Date.now() + ttl
				: this.expiration
					? Date.now() + this.expiration
					: undefined;

		let node = this.map.get(key);
		if (node) {
			node.value = value;
			node.expiresAt = expiresAt;
			this.moveToTail(node);
		} else {
			// Evict oldest entry if cache exceeds max size
			if (this.map.size >= this.maxSize && this.head) {
				this.delete(this.head.key);
			}
			node = new CacheNode(key, value, expiresAt);
			this.map.set(key, node);
			this.addNodeToTail(node);
		}
	}

	/**
	 * Deletes a specific entry from the cache.
	 */
	delete(key: K) {
		const node = this.map.get(key);
		if (!node) return;
		this.removeNode(node);
		this.map.delete(key);
	}

	/**
	 * Clears all entries from the cache and stops cleanup timers.
	 */
	clear() {
		this.map.clear();
		this.head = this.tail = undefined;
		this.dispose();
	}

	/**
	 * Disposes of any active cleanup timer.
	 */
	dispose() {
		if (this.cleanupTimer) {
			clearInterval(this.cleanupTimer);
			this.cleanupTimer = undefined;
		}
	}
}
