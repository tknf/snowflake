/**
 * Snowflake ID configuration
 */
export interface SnowflakeConfig {
	/** Custom epoch in milliseconds (defaults to 2020-01-01T00:00:00.000Z) */
	epoch?: number;
	/** Datacenter ID (0-31) */
	datacenterId?: number;
	/** Worker ID (0-31) */
	workerId?: number;
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
 * Bit shifts for ID components
 */
const SEQUENCE_SHIFT = 0;
const WORKER_SHIFT = SEQUENCE_BITS;
const DATACENTER_SHIFT = SEQUENCE_BITS + WORKER_BITS;
const TIMESTAMP_SHIFT = SEQUENCE_BITS + WORKER_BITS + DATACENTER_BITS;

/**
 * Create a Snowflake ID generator function
 */
export const createSnowflake = (config: SnowflakeConfig = {}) => {
	const { epoch = DEFAULT_EPOCH, datacenterId = 0, workerId = 0 } = config;

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
 */
export const parseSnowflakeId = (id: string, epoch = DEFAULT_EPOCH) => {
	const idBigInt = BigInt(id);

	// Extract components using bit operations
	const timestamp = Number(idBigInt >> BigInt(TIMESTAMP_SHIFT)) + epoch;
	const datacenterId = Number((idBigInt >> BigInt(DATACENTER_SHIFT)) & BigInt(MAX_DATACENTER_ID));
	const workerId = Number((idBigInt >> BigInt(WORKER_SHIFT)) & BigInt(MAX_WORKER_ID));
	const sequence = Number(idBigInt & BigInt(MAX_SEQUENCE));

	return {
		timestamp,
		datacenterId,
		workerId,
		sequence,
		date: new Date(timestamp),
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
