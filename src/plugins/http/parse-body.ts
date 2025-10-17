// Importing the Server type to properly type the plugin function
import type { Server } from '@src/http';

// Importing individual body parsers for different content types
import { json, urlencoded, text, raw, multipart } from './utils/parser/body';

// Importing the Plugin type to define server extensions
import type { Plugin } from '@src/types';

/**
 * Collection of available body parsers.
 * Each parser handles a specific content type:
 * - json: application/json
 * - urlencoded: application/x-www-form-urlencoded
 * - text: text/plain
 * - raw: application/octet-stream
 * - multipart: multipart/form-data (for file uploads)
 */
export { json, urlencoded, text, raw, multipart };

/**
 * Default body parser plugin for the server.
 * Attaches middleware to handle parsing of different request body types.
 * This plugin ensures the server can correctly process incoming data in
 * various formats including JSON, URL-encoded forms, plain text, raw binary,
 * and multipart/form-data for file uploads.
 *
 * @type Plugin<Server>
 * @param server - The server instance where the middleware will be registered
 */
export const parseBody: Plugin<Server> = (server) => {
	server.use(
		'http', // Apply middleware only for HTTP requests

		// JSON parser middleware
		json({
			payloadLimit: Number.POSITIVE_INFINITY, // Maximum allowed body size
			type: 'application/json', // Content-Type to handle
		}),

		// URL-encoded form parser middleware
		urlencoded({
			payloadLimit: Number.POSITIVE_INFINITY, // Maximum allowed body size
			type: 'application/x-www-form-urlencoded', // Content-Type to handle
		}),

		// Plain text parser middleware
		text({
			payloadLimit: Number.POSITIVE_INFINITY, // Maximum allowed body size
			type: 'text/plain', // Content-Type to handle
		}),

		// Raw binary parser middleware
		raw({
			payloadLimit: Number.POSITIVE_INFINITY, // Maximum allowed body size
			type: 'application/octet-stream', // Content-Type to handle
		}),

		// Multipart/form-data parser middleware for handling file uploads
		multipart({
			payloadLimit: Number.POSITIVE_INFINITY, // Maximum total payload size
			fileSizeLimit: Number.POSITIVE_INFINITY, // Maximum individual file size
			// Custom error function triggered when file exceeds the limit
			fileSizeLimitErrorFn: (limit) =>
				new Error(`File too large. Limit: ${limit} bytes`),
			// Function to determine if request should be handled by this parser
			type: (req) => {
				const contentType = req.headers['content-type'];
				return (
					typeof contentType === 'string' &&
					contentType.includes('multipart/form-data')
				);
			},
		}),
	);
};
