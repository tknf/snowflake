import type { SnowflakeConfig } from "./index.js";
import { createSnowflake } from "./index.js";

/**
 * Environment variable names for Snowflake configuration
 */
export const ENV_VARS = {
	EPOCH: "SNOWFLAKE_EPOCH",
	DATACENTER_ID: "SNOWFLAKE_DATACENTER_ID",
	WORKER_ID: "SNOWFLAKE_WORKER_ID",
} as const;

/**
 * Parse environment variable as integer with validation
 */
const parseEnvInt = (
	value: string | undefined,
	min: number,
	max: number,
	name: string
): number | undefined => {
	if (!value) return undefined;

	const parsed = Number.parseInt(value, 10);
	if (Number.isNaN(parsed)) {
		throw new Error(`Environment variable ${name} must be a valid integer`);
	}
	if (parsed < min || parsed > max) {
		throw new Error(`Environment variable ${name} must be between ${min} and ${max}`);
	}
	return parsed;
};

/**
 * Load Snowflake configuration from environment variables
 */
export const loadConfigFromEnv = (): SnowflakeConfig => {
	const config: SnowflakeConfig = {};

	// Load epoch from environment
	const epochStr = process.env[ENV_VARS.EPOCH];
	if (epochStr) {
		const epoch = Number.parseInt(epochStr, 10);
		if (Number.isNaN(epoch)) {
			throw new Error(`Environment variable ${ENV_VARS.EPOCH} must be a valid integer timestamp`);
		}
		config.epoch = epoch;
	}

	// Load datacenter ID from environment (0-31)
	config.datacenterId = parseEnvInt(
		process.env[ENV_VARS.DATACENTER_ID],
		0,
		31,
		ENV_VARS.DATACENTER_ID
	);

	// Load worker ID from environment (0-31)
	config.workerId = parseEnvInt(process.env[ENV_VARS.WORKER_ID], 0, 31, ENV_VARS.WORKER_ID);

	return config;
};

/**
 * Create a Snowflake ID generator with configuration loaded from environment variables
 */
export const createSnowflakeFromEnv = (overrides: SnowflakeConfig = {}) => {
	const envConfig = loadConfigFromEnv();
	const finalConfig = { ...envConfig, ...overrides };
	return createSnowflake(finalConfig);
};

/**
 * Generate a single Snowflake ID with configuration from environment variables
 */
export const generateFromEnv = (overrides: SnowflakeConfig = {}): string => {
	const generator = createSnowflakeFromEnv(overrides);
	return generator();
};
