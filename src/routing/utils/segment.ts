import { Flag, type Segment } from '../types';
import { normalizePath } from './normalize-path';

/**
 * Returns the name of a segment exactly as stored.
 *
 * The returned string already includes any special characters like ":" for
 * parameters or "*" for wildcards if applicable.
 *
 * @param segment - The segment object.
 * @returns The stored name of the segment.
 */
export function getSegmentName(segment: Segment): string {
	return segment.name; // Already includes ":" or "*" if applicable
}

/**
 * Converts a path string into an array of segments without modifying
 * special characters.
 *
 * Uses `normalizePath` to split the path into parts, then determines
 * the type (flag) of each segment:
 * - `Flag.Param` for segments starting with ":"
 * - `Flag.WildCard` for segments equal to "*"
 * - `Flag.Normal` otherwise
 *
 * This avoids creating new strings unnecessarily, only categorizing existing segments.
 *
 * @param path - The input path string (e.g., "/users/:id/*").
 * @returns An array of `Segment` objects representing each part of the path.
 */
export function transformToSegment(path: string): Segment[] {
	return normalizePath(path).map((segment) => {
		// Handle empty segments gracefully
		if (!segment) return { name: '', flag: Flag.Normal };

		// Determine the segment type only once
		const flag =
			segment[0] === ':'
				? Flag.Param
				: segment === '*'
					? Flag.WildCard
					: Flag.Normal;

		return { name: segment, flag };
	});
}
