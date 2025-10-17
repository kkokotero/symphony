import type { IncomingHttpHeaders, IncomingMessage } from 'node:http';
import { TLSSocket } from 'node:tls';
import type { ContentType } from './types/content-type';
import type { Methods } from '@src/types';

/**
 * Request class represents an HTTP request object.
 * Provides easy access to parameters, query strings, headers, cookies, protocol info, and more.
 * Generic types:
 *  - Params: Type for route parameters (default: Record<string, string>)
 *  - Body: Type for request body (default: Record<string, string>)
 */
export class Request<
	Params extends Record<string, string> = Record<string, string>,
	Body = Record<string, string>,
> {
	/**
	 * Parsed request body.
	 */
	public body: Body = {} as Body;

	/**
	 * Arbitrary context object for storing data during request lifecycle.
	 */
	public context: Record<string, any> = {};

	/**
	 * URL route parameters.
	 */
	public readonly params: Params;

	/**
	 * Query string parameters.
	 */
	public readonly queries: Record<string, string>;

	/**
	 * Wildcard portion of the route, if using route patterns.
	 */
	public readonly wildCard: string;

	/**
	 * HTTP headers for the request.
	 */
	public readonly headers: IncomingHttpHeaders & NodeJS.Dict<string | string[]>;

	/**
	 * Constructor.
	 * @param native The raw IncomingMessage from Node.js HTTP server.
	 * @param config Optional config for params, queries, and wildcard.
	 */
	constructor(
		public native: IncomingMessage,
		config: {
			params?: Params;
			query?: Record<string, string>;
			wildCard?: string;
		} = {},
	) {
		this.params = config.params ?? ({} as Params);
		this.queries = config.query ?? ({} as Record<string, string>);
		this.wildCard = config.wildCard ?? '';
		this.headers = native.headers as IncomingHttpHeaders &
			NodeJS.Dict<string | string[]>;
	}

	/**
	 * Checks if an object has a property as its own key.
	 * @param obj Object to check.
	 * @param key Property key.
	 */
	private hasKey<T extends Record<string, any>>(obj: T, key: string): boolean {
		return Object.prototype.hasOwnProperty.call(obj, key);
	}

	/**
	 * Retrieves a route parameter by name.
	 * @param name Parameter key.
	 */
	param(name: keyof Params): string {
		return this.params[name] ?? '';
	}

	/**
	 * Checks if a route parameter exists and is not empty.
	 * @param name Parameter key.
	 */
	hasParam(name: keyof Params): boolean {
		return Boolean(this.params[name]);
	}

	/**
	 * Retrieves a query string value by key.
	 * @param name Query parameter name.
	 */
	query(name: string): string | undefined {
		return this.queries[name];
	}

	/**
	 * Checks if a query parameter exists.
	 * @param name Query parameter name.
	 */
	hasQuery(name: string): boolean {
		return this.hasKey(this.queries, name);
	}

	/**
	 * Retrieves the value of an HTTP header.
	 * @param name Header name (case-insensitive).
	 */
	header(name: string): string | string[] | undefined {
		return this.headers[name.toLowerCase()];
	}

	/**
	 * Checks if an HTTP header exists.
	 * @param name Header name (case-insensitive).
	 */
	hasHeader(name: string): boolean {
		return this.hasKey(this.headers, name.toLowerCase());
	}

	/**
	 * Checks if the request's Content-Type matches the given type.
	 * @param type Expected content type.
	 */
	is(type: ContentType): boolean {
		const ct = this.contentType();
		return ct?.includes(type) ?? false;
	}

	/**
	 * Retrieves the Content-Type header value.
	 */
	contentType(): string | undefined {
		const ct = this.header('content-type');
		return Array.isArray(ct) ? ct[0] : ct;
	}

	/**
	 * Retrieves the HTTP method for the request.
	 */
	get method(): Methods {
		return this.native.method as Methods ?? '';
	}

	/**
	 * Retrieves the raw URL including query string.
	 */
	get url(): string {
		return this.native.url ?? '';
	}

	/**
	 * Retrieves the path portion of the URL (excluding query string).
	 */
	get path(): string {
		return this.url.split('?')[0] ?? '/';
	}

	/**
	 * Retrieves the full URL including protocol, hostname, and path.
	 */
	get fullUrl(): string {
		return `${this.protocol}://${this.hostname}${this.url}`;
	}

	/**
	 * Determines if the request uses HTTP or HTTPS protocol.
	 */
	get protocol(): 'http' | 'https' {
		return this.native.socket instanceof TLSSocket ? 'https' : 'http';
	}

	/**
	 * Retrieves the hostname from the Host header.
	 */
	get hostname(): string {
		const host = this.header('host');
		return typeof host === 'string' ? (host.split(':')[0] ?? '') : '';
	}

	/**
	 * Retrieves the client's IP address, considering X-Forwarded-For header.
	 */
	get ip(): string {
		const forwarded = this.native.headers?.['x-forwarded-for'];
		if (forwarded && typeof forwarded === 'string') {
			return forwarded?.split(',')[0]!.trim();
		}

		const addr = this.native.socket?.remoteAddress ?? '';

		if (addr === '::1' || addr === '::ffff:127.0.0.1') return '127.0.0.1';
		if (addr.startsWith('::ffff:')) return addr.replace('::ffff:', '');
		if (!addr || addr === '::') return '0.0.0.0';

		return addr;
	}

	/**
	 * Timestamp of the request.
	 */
	get timestamp(): number {
		return Date.now();
	}

	/**
	 * Returns true if the request uses HTTPS.
	 */
	get secure(): boolean {
		return this.protocol === 'https';
	}

	/**
	 * Retrieves the Origin header value.
	 */
	get origin(): string {
		const origin = this.header('origin');
		return typeof origin === 'string' ? origin : '';
	}

	/**
	 * Retrieves the Referer header value.
	 */
	get referer(): string {
		const ref = this.header('referer');
		return typeof ref === 'string' ? ref : '';
	}

	/**
	 * Parses cookies from the Cookie header.
	 */
	get cookies(): Record<string, string> | undefined {
		const cookieHeader = this.header('cookie');
		if (!cookieHeader) return undefined;
		const cookies = (
			Array.isArray(cookieHeader) ? cookieHeader.join(';') : cookieHeader
		)
			.split(';')
			.map((c) => c.trim().split('='))
			.reduce(
				(acc, [key, value]) => ({ ...acc, [key as any]: value }),
				{} as Record<string, string>,
			);
		return cookies;
	}

	/**
	 * Checks if the request accepts any of the given MIME types.
	 * @param types List of MIME types.
	 */
	accepts(...types: string[]): boolean {
		const acceptHeader = this.header('accept');
		if (!acceptHeader) return false;
		const accepted = (
			Array.isArray(acceptHeader) ? acceptHeader.join(',') : acceptHeader
		).split(',');
		return types.some((type) => accepted.includes(type));
	}

	/**
	 * Returns an array of accepted languages from the Accept-Language header.
	 */
	acceptsLanguage(): string[] {
		const lang = this.header('accept-language');
		if (!lang || typeof lang !== 'string') return [];
		return lang.split(',').map((l) => l.split(';')[0]!.trim());
	}

	/**
	 * Sets a value in the request context.
	 * @param key Context key.
	 * @param value Value to store.
	 */
	setContext(key: string, value: unknown): void {
		this.context[key] = value;
	}

	/**
	 * Retrieves a value from the request context.
	 * @param key Context key.
	 */
	getContext<T>(key: string): T | undefined {
		return this.context[key];
	}
}
