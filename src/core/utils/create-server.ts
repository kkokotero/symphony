import {
	createServer as createHttp,
	type IncomingMessage,
	type Server,
	type ServerResponse,
	type ServerOptions as HttpServerOptions,
} from 'node:http';
import {
	createServer as createHttps,
	type ServerOptions as HttpsServerOptions,
} from 'node:https';
import { existsSync, readFileSync } from 'node:fs';

/**
 * Extended HTTPS options type that includes standard HTTPS server options
 * plus optional `key`, `cert`, and `ca` properties for SSL/TLS configuration.
 *
 * @template Request - Type of the incoming HTTP request (defaults to `IncomingMessage`).
 * @template Response - Type of the server response (defaults to `ServerResponse` corresponding to the Request type).
 */
export type ExtendedHttpsOptions<
	Request extends typeof IncomingMessage,
	Response extends typeof ServerResponse<
		InstanceType<Request>
	> = typeof ServerResponse,
> = HttpsServerOptions<Request, Response> & {
	/**
	 * Private key for SSL/TLS as a string path or Buffer.
	 */
	key?: string | Buffer;

	/**
	 * Certificate for SSL/TLS as a string path or Buffer.
	 */
	cert?: string | Buffer;

	/**
	 * Certificate authority chain as a string path or Buffer.
	 */
	ca?: string | Buffer;
};

/**
 * General server options type that can represent either HTTP or HTTPS configuration.
 *
 * @template Request - Type of the incoming HTTP request.
 * @template Response - Type of the server response.
 */
export type ServerOptions<
	Request extends typeof IncomingMessage = typeof IncomingMessage,
	Response extends typeof ServerResponse<
		InstanceType<Request>
	> = typeof ServerResponse,
> =
	| ExtendedHttpsOptions<Request, Response>
	| HttpServerOptions<Request, Response>;

/**
 * Original server type alias representing a Node.js HTTP(S) server.
 *
 * @template Request - Type of the incoming HTTP request.
 * @template Response - Type of the server response.
 */
export type OriginalServer<
	Request extends typeof IncomingMessage = typeof IncomingMessage,
	Response extends typeof ServerResponse<
		InstanceType<Request>
	> = typeof ServerResponse,
> = Server<Request, Response>;

/**
 * Creates an HTTP or HTTPS server based on the provided options.
 *
 * This function automatically detects if HTTPS should be used by checking
 * for the presence of `key` and `cert`. If both exist, it will read the
 * key and certificate files if provided as file paths and create an HTTPS
 * server. Otherwise, it falls back to a standard HTTP server.
 *
 * @template Request - Type of the incoming HTTP request.
 * @template Response - Type of the server response.
 * @param opts - Server configuration options for HTTP or HTTPS.
 * @returns A Node.js HTTP or HTTPS server instance.
 */
export function createServer<
	Request extends typeof IncomingMessage = typeof IncomingMessage,
	Response extends typeof ServerResponse<
		InstanceType<Request>
	> = typeof ServerResponse,
>(opts: ServerOptions<Request, Response> = {}): Server<Request, Response> {
	// Cast the options to ExtendedHttpsOptions to check for HTTPS properties
	const maybeHttps = opts as ExtendedHttpsOptions<Request, Response>;

	let { key, cert } = maybeHttps;

	// If key or cert is provided as a file path string, read the file contents
	if (typeof key === 'string' && existsSync(key)) key = readFileSync(key);
	if (typeof cert === 'string' && existsSync(cert)) cert = readFileSync(cert);

	// If both key and cert are available, create an HTTPS server
	if (key && cert) {
		return createHttps({ ...maybeHttps, key, cert });
	}

	// Otherwise, create a standard HTTP server
	return createHttp(opts);
}
