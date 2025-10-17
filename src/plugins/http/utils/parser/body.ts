import { Buffer } from 'buffer';
import type { Request, Response } from '@src/http';

/**
 * Function type to generate an error when a payload exceeds a certain size limit.
 * @param limit - The maximum allowed size in bytes
 * @returns An Error instance describing the exceeded limit
 */
export type BodyLimitErrorFn = (limit: number) => Error;

/**
 * Options for configuring the body parser.
 *
 * @template T - Extra custom options to extend the parser configuration
 */
export type BodyParserOptions<
	T extends Record<string, any> = Record<string, any>,
> = Partial<{
	/** Maximum allowed payload size in bytes */
	payloadLimit: number;
	/** Function to generate error when payload exceeds the limit */
	payloadLimitErrorFn: BodyLimitErrorFn;
	/** Content-Type to check for, or a function that returns a boolean based on the request */
	type: string | ((req: Request) => boolean);
}> &
	T;

/**
 * Type for middleware "next" functions.
 * Optionally accepts an error to pass to error handling middleware.
 */
export type NextFunction = (err?: any) => void;

// Default limits and error functions
const DEFAULT_PAYLOAD_LIMIT = 100 * 1024; // 100KiB
const DEFAULT_FILE_SIZE_LIMIT = 200 * 1024 * 1024; // 200MiB

const DEFAULT_PAYLOAD_ERROR: BodyLimitErrorFn = (limit) =>
	new Error(`Payload too large. Limit: ${limit} bytes`);

const DEFAULT_FILE_SIZE_ERROR: BodyLimitErrorFn = (limit) =>
	new Error(`File too large. Limit: ${limit} bytes`);

/**
 * Checks if a given HTTP method can have a body.
 * Only POST, PUT, PATCH, DELETE are considered to have a body.
 */
const hasBody = (method?: string) =>
	!!method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase());

/**
 * Converts a header value into a string.
 * If the header is an array, joins values with a semicolon.
 */
const headerToString = (h?: string | string[] | undefined) =>
	Array.isArray(h) ? h.join(';') : (h ?? '');

/**
 * Checks whether the request content type matches the expected type.
 * Accepts either a string or a function returning a boolean.
 */
const checkContentType = (
	req: Request,
	type?: string | ((req: Request) => boolean),
): boolean => {
	if (!type) return true;
	if (typeof type === 'function') return type(req);
	const contentType = headerToString(req.headers['content-type']).toLowerCase();
	return contentType.includes(type.toLowerCase());
};

/**
 * Interface representing a single uploaded file.
 */
export interface UploadedFile {
	filename: string;
	type?: string;
	size: number;
	buffer: Buffer;
}

/**
 * Context helpers for storing/retrieving data associated with a request.
 * Supports frameworks with getContext/setContext or falls back to request object properties.
 */
const getReqContext = (req: any, key: string) => {
	try {
		if (typeof req.getContext === 'function') return req.getContext(key);
		return req?.context?.[key];
	} catch {
		return (req as any)?.[`_${key}`];
	}
};

const setReqContext = (req: any, key: string, value: any) => {
	try {
		if (typeof req.setContext === 'function') return req.setContext(key, value);
		if (!req.context) req.context = {};
		req.context[key] = value;
		(req as any)[`_${key}`] = value;
	} catch {
		(req as any)[`_${key}`] = value;
	}
};

/**
 * Checks if the request body has already been parsed to prevent duplicate parsing.
 */
const isBodyParsed = (req: any) => {
	const ctx = getReqContext(req, 'bodyParsed');
	return !!ctx || !!(req as any)._bodyParsed;
};

/**
 * Collects the full request body into a Buffer.
 * Supports both async iterable streams and traditional 'data'/'end' events.
 */
const collectRequestBody = async (
	nativeReq: any,
	payloadLimit: number,
	payloadLimitErrorFn: BodyLimitErrorFn,
): Promise<Buffer> => {
	const chunks: Buffer[] = [];
	let totalSize = 0;

	// Async iterable (Node.js >= 10)
	if (nativeReq && typeof nativeReq[Symbol.asyncIterator] === 'function') {
		for await (const chunk of nativeReq as AsyncIterable<Buffer | string>) {
			const buf = Buffer.isBuffer(chunk)
				? chunk
				: Buffer.from(String(chunk));
			totalSize += buf.byteLength;
			if (totalSize > payloadLimit) throw payloadLimitErrorFn(payloadLimit);
			chunks.push(buf);
		}
		return Buffer.concat(chunks);
	}

	// Event listener fallback
	return await new Promise<Buffer>((resolve, reject) => {
		const onData = (chunk: Buffer | string) => {
			const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
			totalSize += buf.byteLength;
			if (totalSize > payloadLimit) {
				cleanup();
				reject(payloadLimitErrorFn(payloadLimit));
				return;
			}
			chunks.push(buf);
		};
		const onEnd = () => {
			cleanup();
			resolve(Buffer.concat(chunks));
		};
		const onError = (err: any) => {
			cleanup();
			reject(err);
		};
		const cleanup = () => {
			nativeReq.removeListener('data', onData);
			nativeReq.removeListener('end', onEnd);
			nativeReq.removeListener('error', onError);
		};

		nativeReq.on('data', onData);
		nativeReq.on('end', onEnd);
		nativeReq.on('error', onError);
	});
};

/**
 * Reads the raw body from context if already parsed or from the stream otherwise.
 * Stores the raw body in context for reuse by other parsers.
 */
const readOrReuseRawBody = async (
	req: any,
	payloadLimit: number,
	payloadLimitErrorFn: BodyLimitErrorFn,
): Promise<Buffer> => {
	const existing = getReqContext(req, 'rawBody');
	if (existing && Buffer.isBuffer(existing)) return existing;

	if ((req as any)._rawBody && Buffer.isBuffer((req as any)._rawBody)) {
		setReqContext(req, 'rawBody', (req as any)._rawBody);
		return (req as any)._rawBody;
	}
	if ((req as any).rawBody && Buffer.isBuffer((req as any).rawBody)) {
		setReqContext(req, 'rawBody', (req as any).rawBody);
		return (req as any).rawBody;
	}

	const nativeReq = req.native;
	const full = await collectRequestBody(
		nativeReq,
		payloadLimit,
		payloadLimitErrorFn,
	);

	setReqContext(req, 'rawBody', full);
	return full;
};

/**
 * Creates a generic body parser.
 * - Uses readOrReuseRawBody to retrieve raw request body
 * - Marks request as parsed
 * - Supports asynchronous parsing
 *
 * @param parserFn - Function that parses a Buffer into desired type
 * @param payloadLimit - Maximum allowed size in bytes
 * @param payloadLimitErrorFn - Function to generate error if limit is exceeded
 */
export const createBodyParser =
	<T = any>(
		parserFn: (body: Buffer, req?: Request) => T | Promise<T>,
		payloadLimit = DEFAULT_PAYLOAD_LIMIT,
		payloadLimitErrorFn: BodyLimitErrorFn = DEFAULT_PAYLOAD_ERROR,
	) =>
	async (
		req: Request,
		_res: Response,
		next?: NextFunction,
	): Promise<T | void> => {
		if (isBodyParsed(req)) return;

		try {
			const full = await readOrReuseRawBody(
				req,
				payloadLimit,
				payloadLimitErrorFn,
			);
			const parsed = await parserFn(full, req);

			try {
				setReqContext(req, 'bodyParsed', true);
			} catch {
				/* ignore */
			}

			return parsed;
		} catch (err) {
			next?.(err);
			return;
		}
	};

/* ------------------- Middleware Factories ------------------- */

/**
 * Custom parser middleware factory.
 * Executes only if method supports body, body is not already parsed, and content type matches.
 */
export const custom =
	<T = any>(
		parserFn: (body: Buffer) => T | Promise<T>,
		type?: BodyParserOptions['type'],
	) =>
	async (req: Request, res: Response, next?: NextFunction) => {
		if (!hasBody(req.method)) return next?.();
		if (isBodyParsed(req)) return next?.();
		if (!checkContentType(req, type)) return next?.();

		const result = await createBodyParser<T>(parserFn)(req, res, next);
		if (typeof result !== 'undefined') req.body = result as any;
		next?.();
	};

/**
 * JSON parser middleware.
 * Parses JSON payload and optionally supports a reviver function.
 */
export const json = ({
	payloadLimit = DEFAULT_PAYLOAD_LIMIT,
	payloadLimitErrorFn,
	type = 'application/json',
	reviver,
}: BodyParserOptions<{
	reviver?: (this: any, key: string, value: any) => any;
}> = {}) =>
	async (req: Request, res: Response, next?: NextFunction) => {
		if (!hasBody(req.method)) return next?.();
		if (isBodyParsed(req)) return next?.();
		if (!checkContentType(req, type)) return next?.();

		try {
			const parsed = await createBodyParser(
				(buffer) => {
					const str = buffer.toString('utf8').trim();
					if (!str) return {};
					try {
						return JSON.parse(str, reviver);
					} catch (err) {
						const e = new Error(
							`Invalid JSON payload: ${(err as Error).message}`,
						);
						e.name = 'JsonParseError';
						throw e;
					}
				},
				payloadLimit,
				payloadLimitErrorFn,
			)(req, res, next);

			if (typeof parsed !== 'undefined') req.body = parsed;
		} catch (err) {
			return next?.(err);
		}
		next?.();
	};

/**
 * Raw body parser middleware.
 * Stores the raw Buffer in req.body.
 */
export const raw = ({
	payloadLimit = DEFAULT_PAYLOAD_LIMIT,
	payloadLimitErrorFn,
	type,
}: BodyParserOptions = {}) =>
	async (req: Request, res: Response, next?: NextFunction) => {
		if (!hasBody(req.method)) return next?.();
		if (isBodyParsed(req)) return next?.();
		if (!checkContentType(req, type)) return next?.();

		try {
			const parsed = await createBodyParser(
				(x) => x,
				payloadLimit,
				payloadLimitErrorFn,
			)(req, res, next);
			if (typeof parsed !== 'undefined') req.body = parsed as any;
		} catch (err) {
			return next?.(err);
		}
		next?.();
	};

/**
 * Text body parser middleware.
 * Converts body Buffer to UTF-8 string.
 */
export const text = ({
	payloadLimit = DEFAULT_PAYLOAD_LIMIT,
	payloadLimitErrorFn,
	type,
}: BodyParserOptions = {}) =>
	async (req: Request, res: Response, next?: NextFunction) => {
		if (!hasBody(req.method)) return next?.();
		if (isBodyParsed(req)) return next?.();
		if (!checkContentType(req, type)) return next?.();

		try {
			const parsed = await createBodyParser(
				(x) => x.toString('utf8'),
				payloadLimit,
				payloadLimitErrorFn,
			)(req, res, next);
			if (typeof parsed !== 'undefined') req.body = parsed as any;
		} catch (err) {
			return next?.(err);
		}
		next?.();
	};

/**
 * URL-encoded parser middleware.
 * Converts application/x-www-form-urlencoded payload to an object.
 */
export const urlencoded = ({
	payloadLimit = DEFAULT_PAYLOAD_LIMIT,
	payloadLimitErrorFn,
	type,
}: BodyParserOptions = {}) =>
	async (req: Request, res: Response, next?: NextFunction) => {
		if (!hasBody(req.method)) return next?.();
		if (isBodyParsed(req)) return next?.();
		if (!checkContentType(req, type)) return next?.();

		try {
			const parsed = await createBodyParser(
				(x) => {
					const s = x.toString('utf8');
					return Object.fromEntries(new URLSearchParams(s).entries());
				},
				payloadLimit,
				payloadLimitErrorFn,
			)(req, res, next);
			if (typeof parsed !== 'undefined') req.body = parsed;
		} catch (err) {
			return next?.(err);
		}
		next?.();
	};

/* ------------------- Multipart Parser ------------------- */

/**
 * Options for multipart parsing.
 */
type MultipartOptions = Partial<{
	fileCountLimit: number;
	fileSizeLimit: number;
	fileSizeLimitErrorFn: BodyLimitErrorFn;
}>;

/**
 * Extracts the boundary string from multipart Content-Type header.
 */
const extractBoundary = (contentType: string): string | null => {
	const match = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType);
	const b = match ? (match[1] ?? match[2]) : null;
	return b ?? null;
};

/**
 * Parses a multipart Buffer into fields and files.
 */
const parseMultipartBuffer = (
	buffer: Buffer,
	boundary: string,
	{
		fileCountLimit,
		fileSizeLimit = DEFAULT_FILE_SIZE_LIMIT,
		fileSizeLimitErrorFn = DEFAULT_FILE_SIZE_ERROR,
	}: MultipartOptions,
) => {
	const str = buffer.toString('latin1');
	const boundaryMarker = `--${boundary}`;
	const rawParts = str.split(boundaryMarker);
	const parts = rawParts.map((p) => p.trim()).filter((p) => p && p !== '--');

	if (fileCountLimit && parts.length > fileCountLimit) {
		throw new Error(`Too many parts. Limit: ${fileCountLimit}`);
	}

	const parsedBody: Record<string, (UploadedFile | string)[]> = {};

	for (const part of parts) {
		const sep = '\r\n\r\n';
		const idx = part.indexOf(sep);
		if (idx === -1) continue;
		const rawHeaders = part.slice(0, idx).trim();
		let bodyStr = part.slice(idx + sep.length);

		if (bodyStr.endsWith('--')) bodyStr = bodyStr.slice(0, -2);
		if (bodyStr.endsWith('\r\n')) bodyStr = bodyStr.slice(0, -2);

		const cdMatch =
			/Content-Disposition:\s*form-data;\s*([^;]+;?[\s\S]*)/i.exec(rawHeaders);
		if (!cdMatch) continue;
		const disposition = cdMatch[1] ?? '';

		const nameMatch = /name="([^"]+)"/.exec(disposition);
		if (!nameMatch) continue;
		const fieldName = nameMatch[1] ?? '';

		const filenameMatch = /filename="([^"]*)"/.exec(disposition);
		const contentTypeMatch = /Content-Type:\s*([^\r\n]+)/i.exec(rawHeaders);

		if (filenameMatch && filenameMatch[1] !== '') {
			const filename = filenameMatch[1] ?? '';
			const fileBuffer = Buffer.from(bodyStr, 'latin1');
			if (fileBuffer.length > fileSizeLimit) {
				throw fileSizeLimitErrorFn(fileSizeLimit);
			}
			const fileObj: UploadedFile = {
				filename,
				type: contentTypeMatch ? (contentTypeMatch[1] ?? '').trim() : undefined,
				size: fileBuffer.length,
				buffer: fileBuffer,
			};
			parsedBody[fieldName] = parsedBody[fieldName]
				? [...parsedBody[fieldName], fileObj]
				: [fileObj];
		} else {
			const value = Buffer.from(bodyStr, 'latin1').toString('utf8');
			parsedBody[fieldName] = parsedBody[fieldName]
				? [...(parsedBody[fieldName] as string[]), value]
				: [value];
		}
	}

	return parsedBody;
};

/**
 * Multipart parser middleware factory.
 */
export const multipart = ({
	payloadLimit = Number.POSITIVE_INFINITY,
	payloadLimitErrorFn,
	type,
	...opts
}: MultipartOptions & BodyParserOptions = {}) =>
	async (req: Request, res: Response, next?: NextFunction) => {
		if (!hasBody(req.method)) return next?.();
		if (isBodyParsed(req)) return next?.();
		if (!checkContentType(req, type)) return next?.();

		try {
			const parsed = await createBodyParser(
				(buf) => {
					const contentType = headerToString(req.headers['content-type']);
					const boundary = extractBoundary(contentType ?? '');
					if (!boundary) return {};
					return parseMultipartBuffer(buf, boundary, opts);
				},
				payloadLimit,
				payloadLimitErrorFn,
			)(req, res, next);

			if (typeof parsed !== 'undefined') req.body = parsed as any;
		} catch (err) {
			return next?.(err);
		}
		next?.();
	};
