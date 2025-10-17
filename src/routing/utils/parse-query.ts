/**
 * Parses a query string (the part after `?` in a URL) into a key-value object.
 *
 * This function safely decodes percent-encoded values using `decodeURIComponent`
 * and supports multiple query parameters separated by `&`.
 *
 * It also gracefully handles:
 * - Empty or undefined query strings (returns `{}`)
 * - Parameters without a value (e.g. `?flag` → `{ flag: "" }`)
 * - Percent-encoded characters (e.g. `name=John%20Doe` → `{ name: "John Doe" }`)
 *
 * Example:
 * ```ts
 * parseQuery("user=john&id=42&empty&encoded=Hello%20World");
 * // → { user: "john", id: "42", empty: "", encoded: "Hello World" }
 * ```
 *
 * @param qs - The raw query string (without the leading '?').
 * @returns An object mapping each query parameter to its decoded string value.
 */
export function parseQuery(qs?: string): Record<string, string> {
	// If no query string is provided, return an empty object
	if (!qs) return {};

	// Output object to hold parsed key-value pairs
	const out: Record<string, string> = {};

	// Marks the start index of the current parameter substring
	let start = 0;

	// Loop through each character in the query string
	// We iterate up to `qs.length` (inclusive) to ensure the last parameter is processed
	for (let i = 0; i <= qs.length; i++) {
		// When we reach the end of the string or encounter '&', we have a complete parameter
		if (i === qs.length || qs[i] === '&') {
			// Only process if there’s content between `start` and `i`
			if (i > start) {
				// Extract the current key=value pair substring
				const pair = qs.slice(start, i);

				// Find the position of '=' separating key and value
				const eqIndex = pair.indexOf('=');

				// If there is no '=', the parameter has no value (e.g. "flag")
				if (eqIndex === -1) {
					out[decodeURIComponent(pair)] = '';
				} else {
					// Extract and decode both the key and the value
					const key = decodeURIComponent(pair.slice(0, eqIndex));
					const value = decodeURIComponent(pair.slice(eqIndex + 1));
					out[key] = value;
				}
			}

			// Move the start index to the next character after '&'
			start = i + 1;
		}
	}

	// Return the parsed query parameters
	return out;
}
