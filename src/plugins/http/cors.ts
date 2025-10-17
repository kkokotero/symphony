import type { Controller, Methods } from '@src/types';

/**
 * Configuration options for the CORS (Cross-Origin Resource Sharing) middleware.
 *
 * These options define how cross-origin HTTP requests are handled,
 * controlling which origins, methods, and headers are permitted.
 */
export type CorsOptions = {
	/**
	 * Defines which origins are allowed to access the resource.
	 *
	 * Example:
	 *  - `"*"`: Allow all origins (default)
	 *  - `"https://example.com"`: Allow only requests from this domain
	 */
	origin?: string;

	/**
	 * Defines which HTTP methods are permitted for cross-origin requests.
	 *
	 * Can be a string (e.g. `"GET,POST"`) or an array of method names (e.g. `["GET", "POST"]`).
	 *
	 * Default: `["GET", "POST", "PUT", "DELETE", "OPTIONS"]`
	 */
	methods?: string | Methods[];

	/**
	 * Defines which request headers are allowed in cross-origin requests.
	 *
	 * Can be a string (e.g. `"Content-Type,Authorization"`) or an array of header names.
	 *
	 * Default: `["Authorization", "Content-Type"]`
	 */
	headers?: string | string[];

	/**
	 * Indicates whether or not the response to the request can be exposed
	 * when the credentials flag is true (i.e. whether cookies and authorization headers are allowed).
	 *
	 * Default: `false`
	 */
	credentials?: boolean;

	/**
	 * Indicates how long (in seconds) the results of a preflight request (OPTIONS)
	 * can be cached by the browser.
	 *
	 * Default: `600` (10 minutes)
	 */
	maxAge?: number;
};

/**
 * Creates a CORS middleware controller that applies the specified CORS policy
 * to incoming HTTP requests.
 *
 * This function configures and sets appropriate CORS headers for responses,
 * allowing or restricting cross-origin access as defined in the provided options.
 *
 * @param options - CORS configuration options.
 * @returns A controller function compatible with the server middleware system.
 */
export function cors(options: CorsOptions = {}): Controller {
	// Destructure and apply default values for CORS configuration
	const {
		origin = '*',
		methods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
		headers = ['Authorization', 'Content-Type'],
		credentials = false,
		maxAge = 600,
	} = options;

	/**
	 * Middleware handler that applies CORS headers to each response.
	 *
	 * @param request - The incoming HTTP request object.
	 * @param response - The HTTP response object.
	 * @param next - A function to call the next middleware in the chain.
	 */
	return (request, response, next) => {
		// Set allowed origin (who can access the resource)
		response.setHeader('Access-Control-Allow-Origin', origin);

		// Set allowed HTTP methods for cross-origin requests
		response.setHeader('Access-Control-Allow-Methods', methods);

		// Set allowed custom headers for cross-origin requests
		response.setHeader('Access-Control-Allow-Headers', headers);

		// Define how long the preflight response can be cached
		response.setHeader('Access-Control-Max-Age', String(maxAge));

		// Allow credentials (cookies, Authorization headers) if enabled
		if (credentials)
			response.setHeader('Access-Control-Allow-Credentials', 'true');

		// Handle cases where the Origin header is 'null' (e.g., local files)
		if (request.headers.origin === 'null') {
			response.setHeader('Access-Control-Allow-Origin', '*');
		}

		// Debugging: logs the current origin header from the response (for development)
		console.log(response.headers.origin);

		// If this is a preflight request (OPTIONS), end the response immediately
		if (request.method === 'OPTIONS') {
			return response.status(204).end(); // No content
		}

		// Continue to the next middleware or route handler
		next();
	};
}
