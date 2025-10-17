import { Trie } from '@src/routing/trie';
import {
	type Controller,
	type GenericController,
	type MaybePromise,
	type Methods,
	type Plugin,
	type WSController,
	METHODS,
} from '@src/types';
import type { CacheConfig } from '@core/utils/cache';
import { EndPoint } from '@core/end-point';
import { isPromise } from 'node:util/types';
import os from 'node:os';

/**
 * Configuration type for the Router.
 * Extends cache settings and allows defining a route prefix.
 * The prefix is prepended to all route paths registered within this router.
 */
export type RouterConfig = CacheConfig & { prefix?: string };

/**
 * Router class that manages the registration and organization of HTTP and WebSocket routes.
 *
 * Features:
 * - Stores routes efficiently using Trie structures for fast lookups.
 * - Supports route-level and global middlewares.
 * - Allows inclusion of sub-routers and route grouping.
 * - Enables plugin-based extensibility.
 * - Supports health check and static file routes out of the box.
 */
export class Router {
	/**
	 * Internal storage for all routes.
	 *
	 * - `http`: a Map associating each HTTP method (GET, POST, etc.) with its own Trie instance.
	 *   Each Trie stores routes for that specific HTTP method.
	 * - `ws`: a single Trie that stores all WebSocket routes.
	 */
	public routes: {
		http: Map<Methods, Trie<EndPoint<Controller>>>;
		ws: Trie<EndPoint<WSController>>;
	};

	/**
	 * Global middleware storage.
	 *
	 * - Middlewares registered through `.use()` are applied to all subsequent routes.
	 * - They are separated by protocol type: HTTP or WebSocket.
	 */
	private middlewares: { http: Controller[]; ws: WSController[] } = {
		http: [],
		ws: [],
	};

	/**
	 * Optional prefix applied to every route in this router.
	 * Used to logically group or namespace routes (e.g. `/api`).
	 */
	protected prefix = '/';

	public count: { http: number; ws: number } = { http: 0, ws: 0 };

	/**
	 * Creates a new Router instance.
	 * @param options Optional RouterConfig object to define cache behavior and a route prefix.
	 */
	constructor(options?: RouterConfig) {
		this.routes = {
			http: new Map(),
			ws: new Trie(options),
		};

		// Initialize a separate Trie for each HTTP method.
		for (const method of METHODS) {
			this.routes.http.set(method, new Trie(options));
		}

		// If a prefix was provided, apply it globally.
		if (options?.prefix) this.prefix = options.prefix;
	}

	/**
	 * Registers global middlewares for either HTTP or WS routes.
	 * These middlewares will execute before route-specific handlers.
	 *
	 * @param on Specifies the type of route ('http' or 'ws').
	 * @param middlewares One or more middleware functions to apply.
	 * @returns The Router instance for chaining.
	 */
	use(on: 'http' | 'ws', ...middlewares: GenericController[]): this {
		this.middlewares[on].push(...middlewares);
		return this;
	}

	/**
	 * Applies one or more plugins to the router.
	 * Plugins are functions that extend or modify router behavior.
	 *
	 * @param plugins An array of plugin functions.
	 * @returns The Router instance for chaining.
	 */
	plugin(...plugins: Plugin<this>[]): this {
		for (const plugin of plugins) plugin(this);
		return this;
	}

	/**
	 * Includes another router into this one.
	 * Useful for modular applications where routes are split across files or modules.
	 *
	 * The included router’s routes are merged, with prefixes adjusted accordingly.
	 *
	 * @param router Another Router instance to include.
	 */
	include(router: Router) {
		const routes = router.export();

		for (const method of Object.keys(routes)) {
			const routeMethods = routes[method] ?? {};

			if (method === 'WS') {
				for (const path of Object.keys(routeMethods)) {
					const fullPath = `${this.prefix}/${path}`;
					this.routes.ws.create(fullPath, routeMethods[path]);
					this.count.ws++;
				}
				continue;
			}

			for (const path of Object.keys(routeMethods)) {
				const fullPath = `${this.prefix}/${path}`;
				this.routes.http
					.get(method as Methods)
					?.create(fullPath, routeMethods[path]);
				this.count.http++;
			}
		}
	}

	/**
	 * Creates a nested group of routes with a shared prefix.
	 * The provided callback receives a new Router instance scoped to that prefix.
	 *
	 * When the callback finishes (sync or async), the group’s routes are merged into the parent router.
	 *
	 * @param prefix The prefix for all routes within the group.
	 * @param handler A function that defines routes using the nested router.
	 * @returns The Router instance for chaining.
	 */
	public group(
		prefix: string,
		handler: (router: Router) => MaybePromise<unknown>,
	): this {
		const router = new Router({ prefix });
		const result = handler(router);

		if (isPromise(result)) result.then(() => this.include(router));
		else this.include(router);

		return this;
	}

	/**
	 * Registers a route handler for a specific HTTP or WebSocket method.
	 *
	 * @param method The HTTP method (GET, POST, etc.) or 'WS' for WebSocket.
	 * @param path The route path pattern.
	 * @param handlers One or more controller functions (last one is the main handler).
	 * @returns The created EndPoint object representing the route.
	 */
	route(
		method: Methods | 'WS' | 'ALL',
		path: string,
		...handlers: GenericController[]
	): EndPoint<GenericController> {
		const fullPath = `${this.prefix}/${path}`;

		const handler = handlers[handlers.length - 1];
		const middlewares = handlers.slice(0, -1);

		const endPoint = new EndPoint<GenericController>()
			.method(method)
			.path(fullPath)
			.handler(handler)
			.middleware(...this.middlewares[method === 'WS' ? 'ws' : 'http'])
			.middleware(...middlewares);

		// Special case: register route for all HTTP methods.
		if (method === 'ALL') {
			for (const m of METHODS) {
				this.routes.http.get(m)?.create(fullPath, endPoint);
			}

			endPoint.setRemove(() => {
				for (const m of METHODS) {
					this.routes.http.get(m)?.delete(fullPath);
				}
			});
			this.count.http++;

			return endPoint;
		}

		// Register WebSocket route
		if (method === 'WS') {
			this.routes.ws.create(fullPath, endPoint);
			endPoint.setRemove(() => this.routes.ws.delete(fullPath));
			this.count.ws++;

			return endPoint;
		}

		// Register standard HTTP route
		this.count.http++;
		this.routes.http.get(method)?.create(fullPath, endPoint);
		endPoint.setRemove(() => this.routes.http.get(method)?.delete(fullPath));
		return endPoint;
	}

	/**
	 * Exports all routes as a nested object structure.
	 *
	 * Example return shape:
	 * {
	 *   GET: { '/users': EndPoint, '/posts': EndPoint },
	 *   POST: { '/users': EndPoint },
	 *   WS: { '/chat': EndPoint }
	 * }
	 *
	 * @returns An object mapping each method to its route paths and endpoints.
	 */
	export(): Record<string, Record<string, EndPoint<GenericController>>> {
		const result: Record<
			string,
			Record<string, EndPoint<GenericController>>
		> = {};

		// Export HTTP routes
		for (const method of this.routes.http.keys()) {
			const routes: Record<string, EndPoint<GenericController>> = {};

			this.routes.http.get(method)?.export((path, endpoint) => {
				routes[path] = endpoint;
			});

			result[method] = routes;
		}

		// Export WS routes
		const routes: Record<string, EndPoint<GenericController>> = {};

		this.routes.ws.export((path, endpoint) => {
			routes[path] = endpoint;
		});

		result.WS = routes;

		return result;
	}

	/**
	 * Shortcut for defining a WebSocket route.
	 * Equivalent to: router.route('WS', path, ...handlers)
	 */
	ws = (path: string, ...handlers: WSController[]): EndPoint<WSController> =>
		this.route('WS', path, ...handlers);

	/**
	 * Registers a route for all HTTP methods (GET, POST, PUT, etc.).
	 */
	all = <
		Body = Record<string, string>,
		Params extends Record<string, string> = Record<string, string>,
	>(
		path: string,
		...handlers: Controller<Body, Params>[]
	): EndPoint<Controller<Body, Params>> => this.route('ALL', path, ...handlers);

	/** Shortcut for HTTP GET route registration. */
	get = <
		Body = Record<string, string>,
		Params extends Record<string, string> = Record<string, string>,
	>(
		path: string,
		...handlers: Controller<Body, Params>[]
	): EndPoint<Controller<Body, Params>> => this.route('GET', path, ...handlers);

	/** Shortcut for HTTP POST route registration. */
	post = <
		Body = Record<string, string>,
		Params extends Record<string, string> = Record<string, string>,
	>(
		path: string,
		...handlers: Controller<Body, Params>[]
	): EndPoint<Controller<Body, Params>> =>
		this.route('POST', path, ...handlers);

	/** Shortcut for HTTP PUT route registration. */
	put = <
		Body = Record<string, string>,
		Params extends Record<string, string> = Record<string, string>,
	>(
		path: string,
		...handlers: Controller<Body, Params>[]
	): EndPoint<Controller<Body, Params>> => this.route('PUT', path, ...handlers);

	/** Shortcut for HTTP DELETE route registration. */
	delete = <
		Body = Record<string, string>,
		Params extends Record<string, string> = Record<string, string>,
	>(
		path: string,
		...handlers: Controller<Body, Params>[]
	): EndPoint<Controller<Body, Params>> =>
		this.route('DELETE', path, ...handlers);

	/** Shortcut for HTTP PATCH route registration. */
	patch = <
		Body = Record<string, string>,
		Params extends Record<string, string> = Record<string, string>,
	>(
		path: string,
		...handlers: Controller<Body, Params>[]
	): EndPoint<Controller<Body, Params>> =>
		this.route('PATCH', path, ...handlers);

	/** Shortcut for HTTP HEAD route registration. */
	head = <
		Body = Record<string, string>,
		Params extends Record<string, string> = Record<string, string>,
	>(
		path: string,
		...handlers: Controller<Body, Params>[]
	): EndPoint<Controller<Body, Params>> =>
		this.route('HEAD', path, ...handlers);

	/** Shortcut for HTTP OPTIONS route registration. */
	options = <
		Body = Record<string, string>,
		Params extends Record<string, string> = Record<string, string>,
	>(
		path: string,
		...handlers: Controller<Body, Params>[]
	): EndPoint<Controller<Body, Params>> =>
		this.route('OPTIONS', path, ...handlers);

	/**
	 * Registers a route for serving static files from a directory.
	 * Uses a GET route with a wildcard to match file paths.
	 *
	 * Example:
	 * router.static('/assets/*', './public');
	 *
	 * @param path The base route path (e.g., '/assets/*').
	 * @param directory The directory to serve files from.
	 */
static<
	Body = Record<string, string>,
	Params extends Record<string, string> = Record<string, string>,
>(path: string, directory: string): EndPoint<Controller<Body, Params>> {
	return this.get(path, (request, response, next) => {
		const wildCard = request.wildCard;

		if (wildCard.endsWith('com.chrome.devtools.json')) return next();

		let filePath = `${directory}/${wildCard}`;

		if (!wildCard || wildCard === '') {
			filePath = `${directory}/index.html`;
		} else if (!wildCard.includes('.')) {
			filePath = `${directory}/${wildCard}/index.html`;
			if (!response.exists(filePath)) {
				filePath = `${directory}/${wildCard}.html`;
			}
		}

		response.file(filePath);
	});
}


	/**
	 * Registers a built-in health check route.
	 * Provides runtime information for monitoring or load balancers.
	 *
	 * Example response:
	 * {
	 *   "status": "ok",
	 *   "uptime": 102.52,
	 *   "timestamp": "2025-10-11T18:30:45.000Z",
	 *   "hostname": "server-01"
	 * }
	 *
	 * @param path Optional custom path (defaults to '/health').
	 */
	health<
		Body = Record<string, string>,
		Params extends Record<string, string> = Record<string, string>,
	>(path?: string): EndPoint<Controller<Body, Params>> {
		return this.get(path ?? '/health', (request, response) => {
			response.json({
				status: 'ok',
				uptime: process.uptime(),
				timestamp: new Date().toISOString(),
				hostname: os.hostname(),
			});
		});
	}
}
