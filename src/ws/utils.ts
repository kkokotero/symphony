/**
 * Parses different types of WebSocket message payloads into either
 * a string or a JavaScript object.
 *
 * This function is designed to normalize incoming WebSocket data from
 * various binary and textual formats, attempting to decode them into UTF-8
 * text and then parse JSON content when applicable.
 *
 * Supported input types:
 * - `string`: returned as-is or parsed as JSON if possible
 * - `Buffer`: converted to UTF-8 string, then parsed as JSON if possible
 * - `ArrayBuffer`: converted to a Node.js Buffer, then UTF-8 string, then parsed
 * - `Buffer[]`: concatenated into a single Buffer, then UTF-8 string, then parsed
 *
 * @param data - The raw WebSocket message data received.
 * @returns A string or parsed JavaScript object, depending on content.
 */
export function parseSocketMessage(
	data: string | object | Buffer | ArrayBuffer | Buffer[],
): string | object {
	// If the data is already a string, attempt to parse as JSON if applicable
	if (typeof data === 'string') return tryParseJson(data);

	// If the data is a Node.js Buffer, convert to UTF-8 and attempt to parse
	if (Buffer.isBuffer(data)) return tryParseJson(data.toString('utf8'));

	// If the data is an ArrayBuffer (browser or low-level binary data),
	// convert it to a Buffer, then decode as UTF-8 and attempt to parse
	if (data instanceof ArrayBuffer)
		return tryParseJson(Buffer.from(data).toString('utf8'));

	// If the data is an array of Buffers, concatenate into one,
	// decode as UTF-8, and attempt to parse
	if (Array.isArray(data))
		return tryParseJson(Buffer.concat(data).toString('utf8'));

	// If the data type is unknown or already an object, return as-is
	return data;
}

/**
 * Attempts to safely parse a string as JSON.
 *
 * - If the string starts with `{` or `[`, it is likely JSON and will be parsed.
 * - If parsing fails or the content does not appear to be JSON,
 *   the original string is returned unchanged.
 *
 * This approach avoids unnecessary `JSON.parse()` attempts on plain text.
 *
 * @param str - The string potentially containing JSON data.
 * @returns A parsed object if JSON, or the original string otherwise.
 */
function tryParseJson(str: string): string | object {
	// Return early if the string is empty or too short to contain JSON
	if (!str || str.length < 2) return str;

	// Get the character code of the first character for quick JSON detection
	const first = str.charCodeAt(0);

	// 123 = '{', 91 = '['
	if (first === 123 || first === 91) {
		try {
			// Attempt to parse the string as JSON
			return JSON.parse(str);
		} catch {
			// If parsing fails, return the raw string instead of throwing an error
			return str;
		}
	}

	// If it doesn't start with '{' or '[', return the original string
	return str;
}
