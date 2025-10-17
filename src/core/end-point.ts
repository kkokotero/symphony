import { normalizePath } from '@routing/utils/normalize-path';
import type { GenericController, MaybePromise, Methods } from '@src/types';

/**
 * Configuration options for an API or WebSocket endpoint.
 *
 * @template T - The type of the controller function for the endpoint.
 */
export interface EndPointOptions<T> {
	/** The main handler function for this endpoint. */
	handler?: T;

	/** HTTP method (GET, POST, etc.) or 'WS' for WebSocket endpoints. */
	method?: Methods | 'WS' | 'ALL';

	/** URL path or route for the endpoint. */
	path?: string;

	/** Human-readable title for the endpoint. */
	title?: string;

	/** Detailed description of what the endpoint does. */
	description?: string;

	/** Middleware functions to execute before the main handler. */
	middleware?: T[];

	/** Tags for categorization or documentation purposes. */
	tag?: string[];

	/** Functions to execute before the endpoint's main logic. */
	before?: (() => MaybePromise<unknown>)[];

	/** Functions to execute after the endpoint's main logic. */
	after?: (() => MaybePromise<unknown>)[];

	/** Optional function to run when removing the endpoint. */
	remove?: () => MaybePromise<unknown>;

	/** Marks the endpoint as deprecated. */
	deprecated?: boolean;
}

/**
 * Custom error type specifically for endpoint-related errors.
 */
export class EndPointError extends Error {
	constructor(message: string, options?: ErrorOptions) {
		super(message, options);
		this.name = 'EndPointError';
	}
}

/**
 * Represents an API or WebSocket endpoint with fluent configuration methods.
 *
 * This class allows chaining configuration calls to set up routes, handlers,
 * middleware, lifecycle hooks, tags, and metadata.
 *
 * @template T - The type of the controller function for this endpoint.
 */
export class EndPoint<T extends GenericController> {
	/** Internal storage for the endpoint configuration */
	constructor(private options: EndPointOptions<T> = {}) {}

	/** Sets or updates the main handler for the endpoint */
	public handler(handler?: T): this {
		if (handler !== undefined) {
			this.options.handler = handler;
		}
		return this;
	}

	/** Sets or updates the HTTP/WebSocket method for the endpoint */
	public method(method: Methods | 'WS' | 'ALL'): this {
		this.options.method = method;
		return this;
	}

	/** Sets or updates the path/route for the endpoint */
	public path(path: string): this {
		this.options.path = normalizePath(path).join('/');
		return this;
	}

	/** Sets or updates the human-readable title for the endpoint */
	public title(title: string): this {
		this.options.title = title;
		return this;
	}

	/** Marks or unmarks the endpoint as deprecated */
	public deprecated(flag = true): this {
		this.options.deprecated = flag;
		return this;
	}

	/** Sets or updates the description of the endpoint */
	public description(description: string): this {
		this.options.description = description;
		return this;
	}

	/** Adds one or more middleware functions to the endpoint */
	public middleware(...middlewares: T[]): this {
		if (!this.options.middleware) this.options.middleware = [];
		this.options.middleware.push(...middlewares);
		return this;
	}

	/** Adds one or more tags for documentation or categorization */
	public tag(...tags: string[]): this {
		if (!this.options.tag) this.options.tag = [];
		this.options.tag.push(...tags);
		return this;
	}

	/** Registers a function to run before the main handler */
	before(fn: () => MaybePromise<void>): this {
		if (!this.options.before) this.options.before = [];
		this.options.before.push(fn);
		return this;
	}

	/** Registers a function to run after the main handler */
	after(fn: () => MaybePromise<void>): this {
		if (!this.options.after) this.options.after = [];
		this.options.after.push(fn);
		return this;
	}

	/** Sets a custom removal function for the endpoint */
	setRemove(removeFn: () => MaybePromise<unknown>): this {
		this.options.remove = removeFn;
		return this;
	}

	/** Invokes the removal function if it exists */
	remove(): this {
		this.options.remove?.();
		return this;
	}

	/** Creates a shallow clone of the current endpoint with the same configuration */
	clone(): EndPoint<T> {
		return new EndPoint({ ...this.options });
	}

	/** Exports the current configuration as a plain object */
	export(): EndPointOptions<T> {
		return { ...this.options };
	}

	/**
	 * Executes the endpoint, running middleware, handler, and lifecycle hooks
	 * in the proper order.
	 *
	 * @param args - The arguments to pass to middleware and handler functions.
	 *               Typically (request, response, next).
	 * @throws EndPointError if no handler or middleware is defined.
	 */
	async call(...args: Parameters<T>) {
		const { middleware = [], handler } = this.options;

		// Ensure there is at least one middleware or handler to execute
		if (!handler && middleware.length === 0) {
			throw new EndPointError(
				'No handler or middleware defined for this endpoint',
			);
		}

		// Combine middleware and handler into a single execution chain
		const controllers = [...middleware, handler];

		// Execute all "before" hooks first
		for (const fn of this.options.before || []) fn();

		// Function to execute each controller in sequence
		const next = async (id: number) => {
			const handler = controllers[id] as T;
			if (handler) handler(args[0], args[1], () => next(id + 1));
		};

		// Start the execution chain
		next(0);

		// Execute all "after" hooks
		for (const fn of this.options.after || []) fn();
	}
}
