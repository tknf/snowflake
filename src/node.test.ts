import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ENV_VARS, createSnowflakeFromEnv, generateFromEnv, loadConfigFromEnv } from "./node.js";

describe("Node.js Utilities", () => {
	const originalEnv = process.env;

	beforeEach(() => {
		vi.clearAllMocks();
		// Reset environment variables
		process.env = { ...originalEnv };
		delete process.env[ENV_VARS.EPOCH];
		delete process.env[ENV_VARS.DATACENTER_ID];
		delete process.env[ENV_VARS.WORKER_ID];
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	describe("ENV_VARS", () => {
		it("should export correct environment variable names", () => {
			expect(ENV_VARS.EPOCH).toBe("SNOWFLAKE_EPOCH");
			expect(ENV_VARS.DATACENTER_ID).toBe("SNOWFLAKE_DATACENTER_ID");
			expect(ENV_VARS.WORKER_ID).toBe("SNOWFLAKE_WORKER_ID");
		});
	});

	describe("loadConfigFromEnv", () => {
		it("should return empty config when no env vars are set", () => {
			const config = loadConfigFromEnv();
			expect(config).toEqual({});
		});

		it("should load epoch from environment", () => {
			process.env[ENV_VARS.EPOCH] = "1234567890000";
			const config = loadConfigFromEnv();
			expect(config.epoch).toBe(1234567890000);
		});

		it("should load datacenter ID from environment", () => {
			process.env[ENV_VARS.DATACENTER_ID] = "15";
			const config = loadConfigFromEnv();
			expect(config.datacenterId).toBe(15);
		});

		it("should load worker ID from environment", () => {
			process.env[ENV_VARS.WORKER_ID] = "20";
			const config = loadConfigFromEnv();
			expect(config.workerId).toBe(20);
		});

		it("should load all values from environment", () => {
			process.env[ENV_VARS.EPOCH] = "1500000000000";
			process.env[ENV_VARS.DATACENTER_ID] = "5";
			process.env[ENV_VARS.WORKER_ID] = "10";

			const config = loadConfigFromEnv();
			expect(config).toEqual({
				epoch: 1500000000000,
				datacenterId: 5,
				workerId: 10,
			});
		});

		it("should throw error for invalid epoch", () => {
			process.env[ENV_VARS.EPOCH] = "invalid";
			expect(() => loadConfigFromEnv()).toThrow(
				"Environment variable SNOWFLAKE_EPOCH must be a valid integer timestamp"
			);
		});

		it("should throw error for invalid datacenter ID", () => {
			process.env[ENV_VARS.DATACENTER_ID] = "invalid";
			expect(() => loadConfigFromEnv()).toThrow(
				"Environment variable SNOWFLAKE_DATACENTER_ID must be a valid integer"
			);
		});

		it("should throw error for datacenter ID out of range", () => {
			process.env[ENV_VARS.DATACENTER_ID] = "32";
			expect(() => loadConfigFromEnv()).toThrow(
				"Environment variable SNOWFLAKE_DATACENTER_ID must be between 0 and 31"
			);

			process.env[ENV_VARS.DATACENTER_ID] = "-1";
			expect(() => loadConfigFromEnv()).toThrow(
				"Environment variable SNOWFLAKE_DATACENTER_ID must be between 0 and 31"
			);
		});

		it("should throw error for invalid worker ID", () => {
			process.env[ENV_VARS.WORKER_ID] = "invalid";
			expect(() => loadConfigFromEnv()).toThrow(
				"Environment variable SNOWFLAKE_WORKER_ID must be a valid integer"
			);
		});

		it("should throw error for worker ID out of range", () => {
			process.env[ENV_VARS.WORKER_ID] = "32";
			expect(() => loadConfigFromEnv()).toThrow(
				"Environment variable SNOWFLAKE_WORKER_ID must be between 0 and 31"
			);

			process.env[ENV_VARS.WORKER_ID] = "-1";
			expect(() => loadConfigFromEnv()).toThrow(
				"Environment variable SNOWFLAKE_WORKER_ID must be between 0 and 31"
			);
		});

		it("should handle edge case values", () => {
			process.env[ENV_VARS.DATACENTER_ID] = "0";
			process.env[ENV_VARS.WORKER_ID] = "31";

			const config = loadConfigFromEnv();
			expect(config.datacenterId).toBe(0);
			expect(config.workerId).toBe(31);
		});
	});

	describe("createSnowflakeFromEnv", () => {
		it("should create generator with env config", () => {
			process.env[ENV_VARS.DATACENTER_ID] = "5";
			process.env[ENV_VARS.WORKER_ID] = "10";

			const generator = createSnowflakeFromEnv();
			expect(typeof generator).toBe("function");

			const id = generator();
			expect(typeof id).toBe("string");
		});

		it("should merge env config with overrides", async () => {
			process.env[ENV_VARS.DATACENTER_ID] = "5";
			process.env[ENV_VARS.WORKER_ID] = "10";

			// Override workerId
			const generator = createSnowflakeFromEnv({ workerId: 15 });
			const id = generator();

			// Parse ID to verify override took effect
			const { parseSnowflakeId } = await import("./index.js");
			const parsed = parseSnowflakeId(id);
			expect(parsed.datacenterId).toBe(5); // From env
			expect(parsed.workerId).toBe(15); // From override
		});

		it("should work with empty environment", () => {
			const generator = createSnowflakeFromEnv();
			const id = generator();
			expect(typeof id).toBe("string");
		});
	});

	describe("generateFromEnv", () => {
		it("should generate single ID from env config", async () => {
			process.env[ENV_VARS.DATACENTER_ID] = "7";
			process.env[ENV_VARS.WORKER_ID] = "12";

			const id = generateFromEnv();
			expect(typeof id).toBe("string");

			// Verify the configuration was applied
			const { parseSnowflakeId } = await import("./index.js");
			const parsed = parseSnowflakeId(id);
			expect(parsed.datacenterId).toBe(7);
			expect(parsed.workerId).toBe(12);
		});

		it("should apply overrides to env config", async () => {
			process.env[ENV_VARS.DATACENTER_ID] = "7";
			process.env[ENV_VARS.WORKER_ID] = "12";

			const id = generateFromEnv({ datacenterId: 20 });

			const { parseSnowflakeId } = await import("./index.js");
			const parsed = parseSnowflakeId(id);
			expect(parsed.datacenterId).toBe(20); // Override applied
			expect(parsed.workerId).toBe(12); // From env
		});

		it("should work with no environment variables", () => {
			const id = generateFromEnv();
			expect(typeof id).toBe("string");
			expect(id.length).toBeGreaterThan(0);
		});
	});

	describe("Integration tests", () => {
		it("should work end-to-end with environment variables", async () => {
			process.env[ENV_VARS.EPOCH] = "1600000000000";
			process.env[ENV_VARS.DATACENTER_ID] = "15";
			process.env[ENV_VARS.WORKER_ID] = "25";

			const generator = createSnowflakeFromEnv();
			const ids: string[] = [];

			// Generate multiple IDs
			for (let i = 0; i < 100; i++) {
				ids.push(generator());
			}

			// All should be unique
			const uniqueIds = new Set(ids);
			expect(uniqueIds.size).toBe(100);

			// Check first ID has correct config
			const { parseSnowflakeId } = await import("./index.js");
			const parsed = parseSnowflakeId(ids[0], 1600000000000);
			expect(parsed.datacenterId).toBe(15);
			expect(parsed.workerId).toBe(25);
		});
	});
});
