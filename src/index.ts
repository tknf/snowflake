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
	/** Custom epoch in milliseconds (defaults to 2020-01-01T00:00:00.000Z) */
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
const TIMESTAMP_BITS = 41;
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
const SEQUENCE_SHIFT = 0;
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
 * Generate a single Snowflake ID with default configuration
 */
export const generateSnowflakeId = (config: SnowflakeConfig = {}): string => {
	const generator = createSnowflake(config);
	return generator();
};

/**
 * Parse a Snowflake ID into its components
 *
 * In `"edge"` mode the non-timestamp bits are random, so `datacenterId`, `workerId`,
 * and `sequence` are returned as `null` and the raw 22-bit value is returned as `entropy`.
 * In `"default"` mode the worker fields are returned and `entropy` is `null`.
 */
export const parseSnowflakeId = (
	id: string,
	epoch = DEFAULT_EPOCH,
	mode: SnowflakeMode = "default"
) => {
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
 * Get the timestamp from a Snowflake ID
 */
export const getSnowflakeTimestamp = (id: string, epoch = DEFAULT_EPOCH): number => {
	const idBigInt = BigInt(id);
	return Number(idBigInt >> BigInt(TIMESTAMP_SHIFT)) + epoch;
};

/**
 * Convert Snowflake ID to Date object
 */
export const snowflakeToDate = (id: string, epoch = DEFAULT_EPOCH): Date => {
	return new Date(getSnowflakeTimestamp(id, epoch));
};
