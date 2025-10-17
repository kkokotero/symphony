/**
 * Splits a given URL path into its individual normalized segments.
 *
 * This function removes any query string (`?param=value`), handles both
 * forward slashes (`/`) and backslashes (`\`) as separators, and ignores
 * redundant slashes (e.g. multiple `/` in a row).
 *
 * Example:
 * ```ts
 * normalizePath("/users/42/orders/99?include=items");
 * // → ["users", "42", "orders", "99"]
 * ```
 *
 * @param path - The input path string (e.g. "/api/v1/users?id=10").
 * @returns An array of clean path segments (e.g. ["api", "v1", "users"]).
 */
export function normalizePath(path: string): string[] {
	// Find the position of the first '?' (start of query string)
	const end = path.indexOf('?');

	// Remove the query string, keeping only the path portion
	const trimmed = end === -1 ? path : path.slice(0, end);

	// Array that will store each path segment (e.g. ["users", "42"])
	const segments: string[] = [];

	// Marks the start index of the current segment
	// (-1 means no active segment being tracked)
	let segmentStart = -1;

	// Iterate through each character in the trimmed path
	// We go one step beyond the end (<= length) to ensure the last segment is captured
	for (let i = 0; i <= trimmed.length; i++) {
		const char = trimmed[i];

		// Determine if the current character is a path separator
		// Handles both '/' and '\' for cross-platform compatibility
		const isSeparator = char === '/' || char === '\\';

		// If we hit a separator or the end of the path, extract the segment
		if (isSeparator || i === trimmed.length) {
			if (segmentStart !== -1) {
				// Slice the substring that forms the segment
				const segment = trimmed.slice(segmentStart, i);

				// Only add non-empty segments (skips repeated slashes)
				if (segment.length > 0) segments.push(segment);

				// Reset start marker to signal no active segment
				segmentStart = -1;
			}
		}
		// If we are not in a segment and find a non-separator, mark segment start
		else if (segmentStart === -1) {
			segmentStart = i;
		}
	}

	// Return the array of normalized path segments
	return segments;
}
