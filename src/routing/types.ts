/**
 * Enumeration that defines the type of a path segment.
 * Each segment in a route can represent:
 * - A parameter (e.g. ":id")
 * - A wildcard (e.g. "*")
 * - A normal static segment (e.g. "users")
 */
export enum Flag {
	/** Represents a path parameter like ":id" */
	Param = 0,

	/** Represents a wildcard path segment like "*" */
	WildCard = 1,

	/** Represents a regular static segment like "users" */
	Normal = 2,
}

/**
 * Represents a single path segment and its classification.
 * Example:
 *  - { name: "users", flag: Flag.Normal }
 *  - { name: ":id", flag: Flag.Param }
 *  - { name: "*", flag: Flag.WildCard }
 */
export type Segment = {
	name: string;  // The raw name of the segment (e.g., "users", ":id", "*")
	flag: Flag;    // The classification type of this segment
};

/**
 * Represents a node in the Trie structure.
 * Each node corresponds to one path segment and may hold:
 *  - A route handler (if a route ends here)
 *  - Child nodes for sub-paths
 *  - Optional references for parameter and wildcard child nodes
 */
export type Node<T> = {
	/** The complete route path that this node represents (for debugging or introspection) */
	routePath: string;

	/** Optional handler associated with this route (e.g., a function or controller) */
	handler?: T;

	/** Map of child nodes keyed by segment name (e.g., "users", ":id", etc.) */
	children: Map<string, Node<T>>;

	/** Optional direct reference to the parameter child node (e.g., ":id") */
	paramChild?: Node<T>;

	/** Optional direct reference to the wildcard child node (e.g., "*") */
	wildcardChild?: Node<T>;

	/** The name of the parameter (e.g., "id" for ":id"), if this node defines one */
	paramName?: string;
};

/**
 * Represents the result of a successful route lookup in the Trie.
 * It includes:
 *  - The matched node (and its handler)
 *  - Extracted path parameters
 *  - Parsed query string parameters
 *  - Any captured wildcard segment
 */
export type FindResult<
	T,
	Params extends Record<string, string> = Record<string, string>,
	Query extends Record<string, string> = Record<string, string>,
> = {
	/** The matched node that contains the route handler */
	node: Node<T>;

	/** Key-value map of extracted route parameters (e.g. { id: "123" }) */
	params: Params;

	/** Key-value map of parsed query parameters (e.g. { page: "2", sort: "asc" }) */
	query: Query;

	/** If a wildcard was matched, this holds the remaining unmatched path */
	wildCard: string;
};
