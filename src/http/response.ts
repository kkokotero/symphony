import type {
	IncomingMessage,
	ServerResponse,
	OutgoingHttpHeaders,
} from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname } from 'node:path';
import type { ContentType } from './types/content-type';
import type { Server } from './server';
import mime from 'mime';

/**
 * Options for setting cookies in the response.
 */
export interface CookieOptions {
	path?: string; // Cookie path
	maxAge?: number; // Expiration in seconds
	httpOnly?: boolean; // Whether the cookie is HTTP-only
	secure?: boolean; // Whether the cookie is secure
	sameSite?: 'Strict' | 'Lax' | 'None'; // SameSite policy
	domain?: string; // Cookie domain
}

/**
 * Response wrapper class to simplify sending HTTP responses.
 * Provides methods for setting status, headers, cookies, and sending various types of content.
 */
export class Response {
	/** HTTP status code, defaults to 200 */
	private _statusCode = 200;

	/** Flag to track whether the response has been finished */
	private _finished = false;

	/**
	 * @param native The original Node.js ServerResponse object, extended to include the request.
	 */
	constructor(
		public native: ServerResponse<IncomingMessage> & { req: IncomingMessage },
		private parent: Server,
	) {}

	/** Getter for the current HTTP status code */
	get statusCode(): number {
		return this._statusCode;
	}

	/**
	 * Sets the HTTP status code.
	 * @param code Status code to set.
	 * @returns This Response instance for chaining.
	 */
	status(code: number): this {
		this._statusCode = code;
		this.native.statusCode = code;
		return this;
	}

	/** Returns all headers of the response */
	get headers(): OutgoingHttpHeaders {
		return this.native.getHeaders();
	}

	/**
	 * Sets a single header.
	 * @param name Header name.
	 * @param value Header value (string, number, or array).
	 * @returns This Response instance for chaining.
	 */
	header(name: string, value: string | number | string[]): this {
		this.native.setHeader(name, value);
		return this;
	}

	/**
	 * Sets multiple headers at once.
	 * @param headers Object containing header key/value pairs.
	 */
	setHeaders(headers: OutgoingHttpHeaders): this {
		for (const [key, value] of Object.entries(headers)) {
			this.native.setHeader(key, value as string | number | string[]);
		}
		return this;
	}

	setHeader(name: string, value: number | string | string[]) {
		this.native.setHeader(name, value);
		return this;
	}

	/** Checks if a header exists */
	hasHeader(name: string): boolean {
		return this.native.hasHeader(name);
	}

	/** Gets the value of a header */
	getHeader(name: string): string | number | string[] | undefined {
		return this.native.getHeader(name);
	}

	/**
	 * Sets the 'Content-Type' header.
	 * @param type MIME type.
	 * @param extra Optional extra string (e.g., charset).
	 */
	contentType(type: ContentType, extra?: string): this {
		this.header('Content-Type', extra ? `${type}; ${extra}` : type);
		return this;
	}

	/**
	 * Determines the content type based on a file path extension.
	 * @param path File path.
	 * @returns The corresponding MIME type or 'application/octet-stream'.
	 */
	getContentType(path: string): ContentType {
		return (mime.getType(extname(path)) ||
			'application/octet-stream') as ContentType;
	}

	/**
	 * Appends a value to an existing header.
	 * Handles single or multiple values gracefully.
	 */
	appendHeader(name: string, value: string | string[]): this {
		const existing = this.native.getHeader(name);
		if (!existing) {
			this.native.setHeader(name, value);
		} else if (Array.isArray(existing)) {
			this.native.setHeader(name, [
				...existing,
				...(Array.isArray(value) ? value : [value]),
			]);
		} else {
			this.native.setHeader(name, [
				String(existing),
				...(Array.isArray(value) ? value : [value]),
			]);
		}
		return this;
	}

	/**
	 * Sets a cookie in the response.
	 * @param name Cookie name.
	 * @param value Cookie value.
	 * @param options Cookie options such as path, maxAge, httpOnly, etc.
	 */
	cookie(name: string, value: string, options: CookieOptions = {}): this {
		let cookieStr = `${name}=${encodeURIComponent(value)}`;

		if (options.path) cookieStr += `; Path=${options.path}`;
		if (options.domain) cookieStr += `; Domain=${options.domain}`;
		if (options.maxAge !== undefined)
			cookieStr += `; Max-Age=${options.maxAge}`;
		if (options.httpOnly) cookieStr += '; HttpOnly';
		if (options.secure) cookieStr += '; Secure';
		if (options.sameSite) cookieStr += `; SameSite=${options.sameSite}`;

		this.appendHeader('Set-Cookie', cookieStr);
		return this;
	}

	setCookie = (...args: Parameters<Response['cookie']>) => this.cookie(...args);

	end(body: string | Buffer | object = ''): this {
		this.send(body);
		return this;
	}

	/**
	 * Sends a response body.
	 * Automatically sets Content-Type for objects.
	 * @param body String, Buffer, or object to send.
	 * @param type Optional MIME type to override.
	 */
	send(body: string | Buffer | object, type?: ContentType): this {
		if (this._finished) return this;

		if (typeof body === 'object' && !(body instanceof Buffer)) {
			this.contentType('application/json', 'charset=utf-8');
			this.native.end(JSON.stringify(body));
		} else {
			if (type) this.contentType(type, 'charset=utf-8');
			this.native.end(body);
		}

		this._finished = true;
		return this;
	}

	/** Writes a chunk of data to the response without ending it */
	write(chunk: string | Buffer): this {
		if (!this._finished) {
			this.native.write(chunk);
		}
		return this;
	}

	/** Sends JSON data */
	json(data: object): this {
		return this.send(data, 'application/json');
	}

	/** Sends plain text data */
	text(data: string): this {
		return this.send(data, 'text/plain');
	}

	/** Sends HTML content */
	html(content: string): this {
		return this.send(content, 'text/html');
	}

	/**
	 * Sends a file as a response.
	 * Automatically sets Content-Type, Content-Length, and Content-Disposition.
	 * Streams the file to the response to prevent loading it entirely into memory.
	 */
	file(path: string): this {
		try {
			const stats = statSync(path);
			if (!stats.isFile()) {
				this.status(404).send('File not found');
				return this;
			}

			const contentType = this.getContentType(path);
			this.contentType(contentType, 'charset=utf-8');
			this.header('Content-Length', stats.size);
			this.header('Content-Disposition', 'inline');

			const stream = createReadStream(path);
			stream.pipe(this.native);

			stream.on('end', () => {
				this._finished = true;
			});
			stream.on('error', (err) => {
				if (!this.finished) {
					this.status(500).send('Error sending file');
					const fn = async () => {
						if ((await this.parent.emit('error', err as Error)) === 0)
							console.error('Error accessing file:', err);
					};

					fn();
				}
			});
		} catch (err) {
			this.status(404).send('File not found');
			const fn = async () => {
				if ((await this.parent.emit('error', err as Error)) === 0)
					console.error('Error accessing file:', err);
			};
			fn();
		}

		return this;
	}

	exists(filePath: string): boolean {
		return existsSync(filePath);
	}

	/**
	 * Sends a file as a download.
	 * Sets Content-Disposition as 'attachment' with the filename.
	 */
	download(path: string): this {
		try {
			const stats = statSync(path);
			if (!stats.isFile()) {
				this.status(404).send('File not found');
				return this;
			}

			const contentType = this.getContentType(path);
			this.contentType(contentType, 'charset=utf-8');
			this.header('Content-Length', stats.size);
			this.header(
				'Content-Disposition',
				`attachment; filename="${path.split('/').pop() || 'file'}"`,
			);

			const stream = createReadStream(path);
			stream.pipe(this.native);

			stream.on('end', () => {
				this._finished = true;
			});
			stream.on('error', (err) => {
				if (!this.finished) {
					this.status(500).send('Error sending file');
				}
				const fn = async () => {
					if ((await this.parent.emit('error', err as Error)) === 0)
						console.error('Error accessing file:', err);
				};
				fn();
			});
		} catch (err) {
			const fn = async () => {
				if ((await this.parent.emit('error', err as Error)) === 0)
					console.error('Error accessing file:', err);
			};
			fn();
			this.status(404).send('File not found');
		}

		return this;
	}

	/**
	 * Streams a readable stream to the response.
	 * @param readable Node.js readable stream.
	 * @param type Optional content type for the response.
	 */
	stream(readable: NodeJS.ReadableStream, type?: ContentType): this {
		if (type) this.contentType(type);
		readable.pipe(this.native);
		readable.on('end', () => {
			this._finished = true;
		});
		readable.on('error', (err) => {
			if (!this._finished) this.status(500).send('Stream error');
			const fn = async () => {
				if ((await this.parent.emit('error', err as Error)) === 0)
					console.error('Stream error:', err);
			};
			fn();
		});
		return this;
	}

	/**
	 * Sends a redirect response.
	 * @param url URL to redirect to.
	 * @param status HTTP status code, defaults to 302.
	 */
	redirect(url: string, status = 302): this {
		this.status(status);
		this.header('Location', url);
		this.native.end();
		this._finished = true;
		return this;
	}

	/** Returns whether the response has been finished */
	get finished(): boolean {
		return this._finished || this.native.writableEnded;
	}

	/** Returns the current timestamp (in milliseconds) */
	get timestamp(): number {
		return Date.now();
	}
}
