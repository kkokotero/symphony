import type { Request } from './http/request';
import type { Response } from './http/response';
import type { Socket } from './ws/socket';

/**
 * Represents a value that can either be a direct value of type `T`
 * or a Promise that resolves to type `T`.
 *
 * This is useful for controller functions, middleware, or plugins
 * that may perform asynchronous operations and return either a
 * synchronous value or a Promise.
 *
 * @template T - The type of value or resolved Promise.
 */
export type MaybePromise<T> = T | Promise<T>;

/**
 * Array of all standard and non-standard HTTP methods supported by the framework.
 *
 * Marked as `const` so that each element retains its literal type,
 * enabling strict type-checking in TypeScript when defining routes or middleware.
 */
export const METHODS = [
	'ACL',
	'BIND',
	'CHECKOUT',
	'CONNECT',
	'COPY',
	'DELETE',
	'GET',
	'HEAD',
	'LINK',
	'LOCK',
	'M-SEARCH',
	'MERGE',
	'MKACTIVITY',
	'MKCALENDAR',
	'MKCOL',
	'MOVE',
	'NOTIFY',
	'OPTIONS',
	'PATCH',
	'POST',
	'PROPFIND',
	'PROPPATCH',
	'PURGE',
	'PUT',
	'QUERY',
	'REBIND',
	'REPORT',
	'SEARCH',
	'SOURCE',
	'SUBSCRIBE',
	'TRACE',
	'UNBIND',
	'UNLINK',
	'UNLOCK',
	'UNSUBSCRIBE',
] as const;

/**
 * Type representing all possible HTTP methods listed in the `METHODS` array.
 *
 * Using this type ensures that route definitions can only accept
 * valid, predefined HTTP methods.
 */
export type Methods = (typeof METHODS)[number];

/**
 * Represents the `next` function in a middleware chain.
 *
 * Calling `next()` signals the framework to proceed to the next
 * middleware or controller in the pipeline.
 */
export type Next = () => void;

/**
 * Generic controller function type.
 *
 * This type is a catch-all for middleware or handlers where
 * specific typing for request or response is not required.
 *
 * @param arg0 - First argument, typically the request object or some data.
 * @param arg1 - Second argument, usually the response object.
 * @param next - Function to call to pass control to the next middleware.
 * @returns A value or a Promise of unknown type.
 */
export type GenericController = (
	arg0: any,
	arg1: any,
	next: Next,
) => MaybePromise<unknown>;

/**
 * Strongly-typed controller function for HTTP routes.
 *
 * Provides type inference for URL parameters (`Params`) and
 * the request body (`Body`) to improve type safety.
 *
 * @template Params - Object type representing route parameters (default: empty object)
 * @template Body - Object type representing the request body (default: empty object)
 * @param request - The HTTP request object, containing parameters, query, and body.
 * @param response - The HTTP response object used to send data back to the client.
 * @param next - Function to pass control to the next middleware or controller.
 * @returns A value or a Promise of unknown type.
 */
export type Controller<
	Body = Record<string, string>,
	Params extends Record<string, string> = Record<string, string>,
> = (
	request: Request<Params, Body>,
	response: Response,
	next: Next,
) => MaybePromise<unknown>;

/**
 * WebSocket controller function type.
 *
 * Used for handling messages and events on a WebSocket connection.
 *
 * @param socket - The `Socket` instance representing the client connection.
 * @param request - The HTTP request that initiated the WebSocket upgrade.
 * @param next - Function to pass control to the next middleware in the WS chain.
 * @returns A value or a Promise of unknown type.
 */
export type WSController = (
	socket: Socket,
	request: Request,
	next: Next,
) => MaybePromise<unknown>;

/**
 * Represents a plugin function that can extend or modify the
 * framework's core behavior.
 *
 * @template T - The type of the plugin object or configuration.
 * @param plugin - The plugin instance or configuration object.
 * @returns A value or a Promise of unknown type.
 */
export type Plugin<T> = (plugin: T) => MaybePromise<unknown>;

/**
 * Aliases for controller types to improve semantic readability.
 */
export type Middleware = Controller;
export type WSMiddleware = WSController;
