import { Flag, type FindResult, type Node, type Segment } from './types';
import { Cache, type CacheConfig } from '@core/utils/cache';
import { getSegmentName, transformToSegment } from './utils/segment';
import { parseQuery } from './utils/parse-query';
import { normalizePath } from './utils/normalize-path';

/**
 * Custom error type specific to the Trie router.
 *
 * This class represents logic or validation errors that occur
 * during route registration, such as duplicate definitions or
 * conflicting patterns (e.g., overlapping wildcards or params).
 */
export class TrieError extends Error {
	constructor(message: string, options?: ErrorOptions) {
		super(message, options);
		this.name = 'TrieError';
	}
}

/**
 * Trie-based router for efficient path registration and lookup.
 *
 * This class implements a prefix tree (Trie) to store and resolve routes
 * for both HTTP and WebSocket servers. It supports:
 *
 * - **Static paths** (e.g., `/home`)
 * - **Parameterized paths** (e.g., `/users/:id`)
 * - **Wildcard paths** (e.g., `/files/*`)
 * - **Query string parsing** via `parseQuery`
 * - **Internal caching** for faster lookups of repeated paths
 * - **Conflict detection** for overlapping or duplicate routes
 *
 * Each registered path maps to a user-defined `handler` (function, object, etc.).
 *
 * @template T Type of the handler associated with each route
 */
export class Trie<T = unknown> {
	/** Root node of the Trie, initialized with `/`. */
	private root: Node<T> = { children: new Map(), routePath: '/' };

	/** Cache storing parsed path segments for faster route lookups. */
	private cache: Cache<string, Segment[]>;

	/** Tracks whether the Trie currently holds any registered routes. */
	private _hasContent = false;

	/**
	 * Creates a new Trie instance.
	 *
	 * @param options Optional configuration for the internal cache
	 *                (e.g., size limit, TTL, cleanup intervals).
	 */
	constructor(options?: CacheConfig) {
		this.cache = new Cache(options);
	}

	/** Returns `true` if the Trie has any registered routes. */
	public hasContent() {
		return this._hasContent;
	}

	/**
	 * Registers a new route in the Trie.
	 *
	 * Handles path normalization, segment creation, and conflict detection.
	 * Throws a `TrieError` if the route already exists or conflicts with
	 * another parameterized/wildcard path.
	 *
	 * @param path Route pattern to register (e.g., `/users/:id`).
	 * @param handler Associated handler for the route.
	 * @throws {TrieError} If the route conflicts or already exists.
	 */
	public create(path: string, handler?: T) {
		this._hasContent = true;
		const trimmed = path.trim();

		// Special handling for the root route
		if (trimmed === '' || trimmed === '/') {
			this.throwIf(trimmed, this.root.handler);
			this.root.handler = handler;
			return;
		}

		// Fetch parsed segments from cache or compute them
		const segments = this.getSegmentsFromCache(trimmed);
		const normalizedPath = segments.map((v) => v.name).join('/');

		let current: Node<T> = this.root;

		// Traverse or create Trie nodes for each path segment
		for (let i = 0; i < segments.length; i++) {
			const segment = segments[i] ?? { flag: Flag.Normal, name: 'unknown' };
			const key = getSegmentName(segment);
			let next = current.children.get(key) as Node<T> | undefined;

			// Create new node if it doesn’t exist
			if (!next) {
				next = { children: new Map(), routePath: normalizedPath };
				current.children.set(key, next);

				// Handle parameterized segment (e.g., ":id")
				if (segment.flag === Flag.Param) {
					this.throwIf(
						normalizedPath,
						current.paramChild?.handler,
						current.paramChild?.routePath || current.routePath,
					);
					current.paramChild = next;
					current.paramName = segment.name.slice(1); // remove the leading ':'
				}
				// Handle wildcard segment (e.g., "*")
				else if (segment.flag === Flag.WildCard) {
					this.throwIf(
						normalizedPath,
						current.wildcardChild?.handler,
						current.wildcardChild?.routePath || current.routePath,
					);
					current.wildcardChild = next;
					current.wildcardChild.routePath = normalizedPath;
				}
			}

			current = next;

			// Handle wildcard-only root route (e.g., "*")
			if (segments.length === 1 && segment.flag === Flag.WildCard && i === 0) {
				if (!this.root.handler) this.root.handler = handler;
			}
		}

		// Prevent overwriting an existing route
		if (current !== this.root) this.throwIf(normalizedPath, current.handler);
		current.handler = handler;
	}

	/**
	 * Finds and returns a matching route for a given request path.
	 *
	 * This method traverses the Trie based on the request’s segments,
	 * extracting parameters and handling wildcards when necessary.
	 *
	 * Also parses query strings automatically.
	 *
	 * @param path The request path (can include query string, e.g. `/user/12?lang=en`)
	 * @returns A result object containing:
	 *          - `node`: The matched node
	 *          - `params`: Extracted route parameters
	 *          - `query`: Parsed query string
	 *          - `wildCard`: Remaining unmatched path (for wildcard routes)
	 *          Returns `undefined` if no match is found.
	 */
	public find<
		Params extends Record<string, string> = Record<string, string>,
		Query extends Record<string, string> = Record<string, string>,
	>(path: string): FindResult<T, Params, Query> | undefined {
		const [pathname = '/', queryString = ''] = path.split('?');
		const segments = this.getSegmentsFromCache(pathname);
		const query = parseQuery(queryString);

		let current: Node<T> | undefined = this.root;
		const params: Record<string, string> = {};
		let wildcard: Node<T> | undefined;
		let wildcardIndex = -1;

		for (let i = 0; i < segments.length; i++) {
			const segment = segments[i];
			if (!current) break;

			let next = current.children.get(segment?.name ?? '/') as
				| Node<T>
				| undefined;

			// Parameterized segment match (e.g., ":id")
			if (!next && current.paramChild) {
				const decoded = decodeURIComponent(segment?.name ?? 'unknown');
				params[current.paramName ?? 'unknown'] = decoded;
				next = current.paramChild;
			}

			// Wildcard segment match (e.g., "*")
			if (!next && current.wildcardChild) {
				wildcard = current.wildcardChild;
				next = wildcard;
				if (wildcardIndex === -1) wildcardIndex = i;
			}

			// No match found — fallback to wildcard route if available
			if (!next) {
				return wildcard
					? {
							node: wildcard,
							params: params as Params,
							query: query as Query,
							wildCard: segments
								.slice(wildcardIndex)
								.map((s) => s.name)
								.join('/'),
						}
					: undefined;
			}

			current = next;
		}

		// Return match (direct or wildcard fallback)
		return {
			node: current ?? wildcard,
			params: params as Params,
			query: query as Query,
			wildCard:
				wildcardIndex >= 0
					? segments
							.slice(wildcardIndex)
							.map((s) => s.name)
							.join('/')
					: '',
		};
	}

	/**
	 * Removes a route from the Trie.
	 *
	 * Deletes the associated handler and recursively prunes
	 * empty nodes to keep the Trie compact.
	 *
	 * @param path The route path to delete (e.g., `/users/:id`)
	 * @returns `true` if a route was deleted, otherwise `false`
	 */
	public delete(path: string): boolean {
		const trimmed = path.trim();

		// Handle root route deletion
		if (trimmed === '' || trimmed === '/') {
			if (this.root.handler) {
				delete this.root.handler;
				return true;
			}
			return false;
		}

		const segments = this.getSegmentsFromCache(trimmed);
		let current: Node<T> | undefined = this.root;
		const stack: Node<T>[] = [this.root]; // For backtracking and cleanup

		for (const segment of segments) {
			const key = getSegmentName(segment);
			const next: Node<T> | undefined = current?.children.get(key);
			if (!next) return false; // Route does not exist
			current = next;
			stack.push(current);
		}

		// Remove handler at target node
		if (!current.handler) return false;
		delete current.handler;

		// Cleanup orphaned nodes (nodes without children or handlers)
		for (let i = stack.length - 1; i > 0; i--) {
			const node = stack[i];
			const parent = stack[i - 1];
			if (!node?.handler && node?.children.size === 0) {
				for (const [k, child] of parent?.children ?? []) {
					if (child === node) {
						parent?.children.delete(k);
						break;
					}
				}
			} else {
				break; // Stop pruning at first valid node
			}
		}

		return true;
	}

	/**
	 * Traverses all routes in the Trie and invokes a callback for each one.
	 *
	 * Useful for:
	 * - Route inspection/debugging
	 * - Documentation generation
	 * - Exporting route maps
	 *
	 * @param callback Function called for each route and its associated handler.
	 */
	public export(callback: (path: string, handler: T) => void) {
		const traverse = (node: Node<T>, path: string) => {
			if (node.handler) {
				const result = normalizePath(path ?? '/').join('/');
				callback(result === '*' ? '/*' : result || '/', node.handler);
			}
			for (const [key, child] of node.children) {
				const segment = `/${key}`;
				traverse(child, path + segment);
			}
		};
		traverse(this.root, '');
	}

	/**
	 * Retrieves pre-parsed segments for a given path from cache.
	 * If the segments are not cached, they are computed and stored.
	 */
	private getSegmentsFromCache(path: string): Segment[] {
		let segments = this.cache.get(path);
		if (segments) return segments;

		segments = transformToSegment(path);
		this.cache.set(path, segments);
		return segments;
	}

	/**
	 * Throws a `TrieError` if a route already exists or conflicts with another.
	 *
	 * @param path The route being registered.
	 * @param handler Existing handler (if any).
	 * @param conflictPath Optional path of the conflicting route.
	 */
	private throwIf(path: string, handler?: T, conflictPath?: string) {
		if (handler) {
			throw new TrieError(
				`The route "${path}" has already been defined.` +
					(conflictPath ? ` (conflicts with route "${conflictPath}")` : ''),
			);
		}
	}
}
