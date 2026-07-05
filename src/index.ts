/**
 * Snowflake ID generation mode
 *
 * - `"default"`: Ensures uniqueness via an assigned `(datacenterId, workerId)` and a sequence.
 * - `"edge"`: Fills the 22 non-timestamp bits with cryptographic randomness (entropy).
 *   Useful for serverless/edge environments where a stable worker number cannot be assigned.
 */
export type SnowflakeMode = "default" | "edge";

/**
 * Snowflake ID configuration
 */
export interface SnowflakeConfig {
	/**
	 * Custom epoch in milliseconds (defaults to 2020-01-01T00:00:00.000Z)
	 *
	 * Must be an integer, non-negative, and not in the future (i.e. `<= Date.now()`).
	 */
	epoch?: number;
	/** Datacenter ID (0-31). Ignored when `mode` is `"edge"`. */
	datacenterId?: number;
	/** Worker ID (0-31). Ignored when `mode` is `"edge"`. */
	workerId?: number;
	/** Generation mode (defaults to `"default"`) */
	mode?: SnowflakeMode;
}

/**
 * Default epoch: 2020-01-01T00:00:00.000Z
 */
const DEFAULT_EPOCH = 1577836800000;

/**
 * Bit lengths for ID components
 */
const DATACENTER_BITS = 5;
const WORKER_BITS = 5;
const SEQUENCE_BITS = 12;

/**
 * Maximum values for ID components
 */
const MAX_DATACENTER_ID = (1 << DATACENTER_BITS) - 1; // 31
const MAX_WORKER_ID = (1 << WORKER_BITS) - 1; // 31
const MAX_SEQUENCE = (1 << SEQUENCE_BITS) - 1; // 4095

/**
 * Number of random bits used in edge mode (datacenter + worker + sequence = 22)
 */
const ENTROPY_BITS = DATACENTER_BITS + WORKER_BITS + SEQUENCE_BITS; // 22
const MAX_ENTROPY = (1 << ENTROPY_BITS) - 1; // 4194303

/**
 * Bit shifts for ID components
 */
const WORKER_SHIFT = SEQUENCE_BITS;
const DATACENTER_SHIFT = SEQUENCE_BITS + WORKER_BITS;
const TIMESTAMP_SHIFT = SEQUENCE_BITS + WORKER_BITS + DATACENTER_BITS;

/**
 * Generate 22 bits of cryptographic randomness for edge mode.
 * Uses the global `crypto.getRandomValues` (Workers, browsers, Node 18+).
 */
const generateEntropy = (): number => {
	const buffer = new Uint32Array(1);
	crypto.getRandomValues(buffer);
	// Extract the lower 22 bits (result is always a non-negative value 0..MAX_ENTROPY)
	return buffer[0] & MAX_ENTROPY;
};

/**
 * Create a Snowflake ID generator function
 */
export const createSnowflake = (config: SnowflakeConfig = {}) => {
	const { epoch = DEFAULT_EPOCH, datacenterId = 0, workerId = 0, mode = "default" } = config;

	// Validate epoch (applies to both "default" and "edge" modes)
	if (!Number.isInteger(epoch)) {
		throw new Error("Epoch must be an integer timestamp in milliseconds");
	}
	if (epoch < 0) {
		throw new Error("Epoch must not be negative");
	}
	if (epoch > Date.now()) {
		throw new Error("Epoch must not be in the future");
	}

	// Edge mode: fill the non-timestamp bits with cryptographic randomness.
	// datacenterId / workerId are ignored (and not validated) in this mode.
	if (mode === "edge") {
		return (): string => {
			const timestamp = Date.now();
			const id = (BigInt(timestamp - epoch) << BigInt(TIMESTAMP_SHIFT)) | BigInt(generateEntropy());
			return id.toString();
		};
	}

	// Validate configuration
	if (datacenterId < 0 || datacenterId > MAX_DATACENTER_ID) {
		throw new Error(`Datacenter ID must be between 0 and ${MAX_DATACENTER_ID}`);
	}
	if (workerId < 0 || workerId > MAX_WORKER_ID) {
		throw new Error(`Worker ID must be between 0 and ${MAX_WORKER_ID}`);
	}

	let lastTimestamp = -1;
	let sequence = 0;

	return (): string => {
		let timestamp = Date.now();

		// Check for clock moving backwards
		if (timestamp < lastTimestamp) {
			throw new Error("Clock moved backwards. Refusing to generate id");
		}

		// Handle same millisecond
		if (timestamp === lastTimestamp) {
			sequence = (sequence + 1) & MAX_SEQUENCE;
			// If sequence overflows, wait for next millisecond
			if (sequence === 0) {
				while (timestamp <= lastTimestamp) {
					timestamp = Date.now();
				}
			}
		} else {
			sequence = 0;
		}

		lastTimestamp = timestamp;

		// Calculate timestamp offset from epoch
		const timestampOffset = timestamp - epoch;

		// Combine all components into a single ID
		const id =
			(BigInt(timestampOffset) << BigInt(TIMESTAMP_SHIFT)) |
			(BigInt(datacenterId) << BigInt(DATACENTER_SHIFT)) |
			(BigInt(workerId) << BigInt(WORKER_SHIFT)) |
			BigInt(sequence);

		return id.toString();
	};
};

/**
 * Cache of generators keyed by resolved config, so repeated calls to
 * `generateSnowflakeId` with equivalent configs share sequence state.
 */
const generatorCache = new Map<string, () => string>();

/**
 * Generate a single Snowflake ID with default configuration
 *
 * Generators for the same resolved config are shared internally (cached by
 * `epoch`, `datacenterId`, `workerId`, and `mode`), so consecutive calls
 * preserve sequence state and remain unique even within the same millisecond.
 */
export const generateSnowflakeId = (config: SnowflakeConfig = {}): string => {
	const { epoch = DEFAULT_EPOCH, datacenterId = 0, workerId = 0, mode = "default" } = config;
	const key = `${epoch}|${datacenterId}|${workerId}|${mode}`;

	let generator = generatorCache.get(key);
	if (!generator) {
		generator = createSnowflake(config);
		generatorCache.set(key, generator);
	}

	return generator();
};

/**
 * Check whether a string is a valid Snowflake ID.
 *
 * A valid Snowflake ID is a non-negative integer string (digits only, no sign,
 * no decimal point) that fits within 63 bits (i.e. `< 2n ** 63n`).
 */
export const isValidSnowflakeId = (id: string): boolean => {
	if (typeof id !== "string") {
		return false;
	}
	if (!/^\d+$/.test(id)) {
		return false;
	}
	return BigInt(id) < 2n ** 63n;
};

/**
 * Parse a Snowflake ID into its components
 *
 * In `"edge"` mode the non-timestamp bits are random, so `datacenterId`, `workerId`,
 * and `sequence` are returned as `null` and the raw 22-bit value is returned as `entropy`.
 * In `"default"` mode the worker fields are returned and `entropy` is `null`.
 *
 * @throws {Error} if `id` is not a valid Snowflake ID
 */
export const parseSnowflakeId = (
	id: string,
	epoch = DEFAULT_EPOCH,
	mode: SnowflakeMode = "default"
) => {
	if (!isValidSnowflakeId(id)) {
		throw new Error(`Invalid Snowflake ID: ${id}`);
	}

	const idBigInt = BigInt(id);

	const timestamp = Number(idBigInt >> BigInt(TIMESTAMP_SHIFT)) + epoch;
	const date = new Date(timestamp);

	if (mode === "edge") {
		return {
			timestamp,
			datacenterId: null,
			workerId: null,
			sequence: null,
			entropy: Number(idBigInt & BigInt(MAX_ENTROPY)),
			date,
		};
	}

	// Extract components using bit operations
	const datacenterId = Number((idBigInt >> BigInt(DATACENTER_SHIFT)) & BigInt(MAX_DATACENTER_ID));
	const workerId = Number((idBigInt >> BigInt(WORKER_SHIFT)) & BigInt(MAX_WORKER_ID));
	const sequence = Number(idBigInt & BigInt(MAX_SEQUENCE));

	return {
		timestamp,
		datacenterId,
		workerId,
		sequence,
		entropy: null,
		date,
	};
};

/**
 * Parse a Snowflake ID into its components without throwing.
 *
 * Same arguments and return shape as `parseSnowflakeId`, but returns `null`
 * instead of throwing when `id` is not a valid Snowflake ID.
 */
export const safeParseSnowflakeId = (
	id: string,
	epoch = DEFAULT_EPOCH,
	mode: SnowflakeMode = "default"
): ReturnType<typeof parseSnowflakeId> | null => {
	if (!isValidSnowflakeId(id)) {
		return null;
	}
	return parseSnowflakeId(id, epoch, mode);
};

/**
 * Get the timestamp from a Snowflake ID
 *
 * @throws {Error} if `id` is not a valid Snowflake ID
 */
export const getSnowflakeTimestamp = (id: string, epoch = DEFAULT_EPOCH): number => {
	if (!isValidSnowflakeId(id)) {
		throw new Error(`Invalid Snowflake ID: ${id}`);
	}
	const idBigInt = BigInt(id);
	return Number(idBigInt >> BigInt(TIMESTAMP_SHIFT)) + epoch;
};

/**
 * Convert Snowflake ID to Date object
 *
 * @throws {Error} if `id` is not a valid Snowflake ID
 */
export const snowflakeToDate = (id: string, epoch = DEFAULT_EPOCH): Date => {
	if (!isValidSnowflakeId(id)) {
		throw new Error(`Invalid Snowflake ID: ${id}`);
	}
	return new Date(getSnowflakeTimestamp(id, epoch));
};
