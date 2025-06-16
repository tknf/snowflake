import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	createSnowflake,
	generateSnowflakeId,
	getSnowflakeTimestamp,
	parseSnowflakeId,
	snowflakeToDate,
} from "./index.js";

describe("Snowflake ID Generator", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("createSnowflake", () => {
		it("should create a generator function", () => {
			const generator = createSnowflake();
			expect(typeof generator).toBe("function");
		});

		it("should generate unique IDs", () => {
			const generator = createSnowflake();
			const id1 = generator();
			const id2 = generator();
			expect(id1).not.toBe(id2);
			expect(typeof id1).toBe("string");
			expect(typeof id2).toBe("string");
		});

		it("should generate sortable IDs", () => {
			const generator = createSnowflake();
			const id1 = generator();
			// Wait a bit to ensure different timestamp
			vi.useFakeTimers();
			vi.advanceTimersByTime(1);
			const id2 = generator();
			vi.useRealTimers();

			expect(BigInt(id1)).toBeLessThan(BigInt(id2));
		});

		it("should accept custom configuration", () => {
			const config = {
				epoch: 1000000000000,
				datacenterId: 5,
				workerId: 10,
			};
			const generator = createSnowflake(config);
			const id = generator();

			const parsed = parseSnowflakeId(id, config.epoch);
			expect(parsed.datacenterId).toBe(5);
			expect(parsed.workerId).toBe(10);
		});

		it("should throw error for invalid datacenter ID", () => {
			expect(() => createSnowflake({ datacenterId: -1 })).toThrow(
				"Datacenter ID must be between 0 and 31"
			);
			expect(() => createSnowflake({ datacenterId: 32 })).toThrow(
				"Datacenter ID must be between 0 and 31"
			);
		});

		it("should throw error for invalid worker ID", () => {
			expect(() => createSnowflake({ workerId: -1 })).toThrow("Worker ID must be between 0 and 31");
			expect(() => createSnowflake({ workerId: 32 })).toThrow("Worker ID must be between 0 and 31");
		});

		it("should handle sequence overflow", () => {
			const generator = createSnowflake();

			// Mock Date.now to return same timestamp multiple times, then increment
			let callCount = 0;
			const mockTimestamp = Date.now();
			vi.spyOn(Date, "now").mockImplementation(() => {
				if (callCount < 4096) {
					callCount++;
					return mockTimestamp;
				}
				// Simulate waiting for next millisecond
				if (callCount === 4096) {
					callCount++;
					return mockTimestamp; // Same timestamp to trigger wait loop
				}
				return mockTimestamp + 1; // Next millisecond
			});

			// Generate enough IDs to overflow sequence in same millisecond
			const ids: string[] = [];
			for (let i = 0; i < 4097; i++) {
				ids.push(generator());
			}

			// All IDs should be unique
			const uniqueIds = new Set(ids);
			expect(uniqueIds.size).toBe(ids.length);

			vi.restoreAllMocks();
		});

		it("should handle sequence overflow with waiting", () => {
			const generator = createSnowflake();

			// Mock Date.now to simulate sequence overflow and waiting
			let callCount = 0;
			const mockTimestamp = Date.now();
			vi.spyOn(Date, "now").mockImplementation(() => {
				if (callCount < 4096) {
					callCount++;
					return mockTimestamp;
				}
				// First call after overflow returns same timestamp (triggers wait)
				if (callCount === 4096) {
					callCount++;
					return mockTimestamp;
				}
				// Second call returns next millisecond (exits wait loop)
				return mockTimestamp + 1;
			});

			// Generate enough IDs to overflow sequence
			const ids: string[] = [];
			for (let i = 0; i < 4097; i++) {
				ids.push(generator());
			}

			// All IDs should be unique
			const uniqueIds = new Set(ids);
			expect(uniqueIds.size).toBe(ids.length);

			vi.restoreAllMocks();
		});

		it("should throw error when clock moves backwards", () => {
			const generator = createSnowflake();

			// Generate first ID
			generator();

			// Mock Date.now to return earlier timestamp
			const originalNow = Date.now;
			vi.spyOn(Date, "now").mockReturnValue(originalNow() - 1000);

			expect(() => generator()).toThrow("Clock moved backwards. Refusing to generate id");

			vi.restoreAllMocks();
		});
	});

	describe("generateSnowflakeId", () => {
		it("should generate a single ID with default config", () => {
			const id = generateSnowflakeId();
			expect(typeof id).toBe("string");
			expect(id.length).toBeGreaterThan(0);
		});

		it("should generate a single ID with custom config", () => {
			const config = { datacenterId: 1, workerId: 2 };
			const id = generateSnowflakeId(config);

			const parsed = parseSnowflakeId(id);
			expect(parsed.datacenterId).toBe(1);
			expect(parsed.workerId).toBe(2);
		});
	});

	describe("parseSnowflakeId", () => {
		it("should parse ID components correctly", () => {
			const config = {
				epoch: 1577836800000,
				datacenterId: 5,
				workerId: 10,
			};
			const generator = createSnowflake(config);
			const id = generator();

			const parsed = parseSnowflakeId(id, config.epoch);
			expect(parsed.datacenterId).toBe(5);
			expect(parsed.workerId).toBe(10);
			expect(parsed.sequence).toBeGreaterThanOrEqual(0);
			expect(parsed.sequence).toBeLessThanOrEqual(4095);
			expect(parsed.timestamp).toBeGreaterThan(config.epoch);
			expect(parsed.date).toBeInstanceOf(Date);
		});

		it("should use default epoch when not provided", () => {
			const id = generateSnowflakeId();
			const parsed = parseSnowflakeId(id);

			expect(parsed.timestamp).toBeGreaterThan(1577836800000);
			expect(parsed.datacenterId).toBe(0);
			expect(parsed.workerId).toBe(0);
		});

		it("should handle maximum values correctly", () => {
			const config = {
				epoch: 1577836800000,
				datacenterId: 31,
				workerId: 31,
			};
			const generator = createSnowflake(config);
			const id = generator();

			const parsed = parseSnowflakeId(id, config.epoch);
			expect(parsed.datacenterId).toBe(31);
			expect(parsed.workerId).toBe(31);
		});
	});

	describe("getSnowflakeTimestamp", () => {
		it("should extract timestamp from ID", () => {
			const generator = createSnowflake();
			const beforeGeneration = Date.now();
			const id = generator();
			const afterGeneration = Date.now();

			const timestamp = getSnowflakeTimestamp(id);
			expect(timestamp).toBeGreaterThanOrEqual(beforeGeneration);
			expect(timestamp).toBeLessThanOrEqual(afterGeneration);
		});

		it("should use custom epoch", () => {
			const customEpoch = 1000000000000;
			const config = { epoch: customEpoch };
			const generator = createSnowflake(config);
			const id = generator();

			const timestamp = getSnowflakeTimestamp(id, customEpoch);
			expect(timestamp).toBeGreaterThan(customEpoch);
		});

		it("should use default epoch when not provided", () => {
			const id = generateSnowflakeId();
			const timestamp = getSnowflakeTimestamp(id);
			expect(timestamp).toBeGreaterThan(1577836800000);
		});
	});

	describe("snowflakeToDate", () => {
		it("should convert ID to Date object", () => {
			const generator = createSnowflake();
			const beforeGeneration = new Date();
			const id = generator();
			const afterGeneration = new Date();

			const date = snowflakeToDate(id);
			expect(date).toBeInstanceOf(Date);
			expect(date.getTime()).toBeGreaterThanOrEqual(beforeGeneration.getTime());
			expect(date.getTime()).toBeLessThanOrEqual(afterGeneration.getTime());
		});

		it("should use custom epoch", () => {
			const customEpoch = 1000000000000;
			const config = { epoch: customEpoch };
			const generator = createSnowflake(config);
			const id = generator();

			const date = snowflakeToDate(id, customEpoch);
			expect(date.getTime()).toBeGreaterThan(customEpoch);
		});

		it("should use default epoch when not provided", () => {
			const id = generateSnowflakeId();
			const date = snowflakeToDate(id);
			expect(date.getTime()).toBeGreaterThan(1577836800000);
		});
	});

	describe("Integration tests", () => {
		it("should maintain chronological order across multiple generators", () => {
			const generator1 = createSnowflake({ workerId: 1 });
			const generator2 = createSnowflake({ workerId: 2 });

			const ids: string[] = [];
			// Generate IDs sequentially to ensure proper ordering
			for (let i = 0; i < 5; i++) {
				ids.push(generator1());
				ids.push(generator2());
			}

			// All IDs should be unique
			const uniqueIds = new Set(ids);
			expect(uniqueIds.size).toBe(ids.length);

			// Parse timestamps to verify chronological order
			const timestamps = ids.map((id) => getSnowflakeTimestamp(id));
			for (let i = 1; i < timestamps.length; i++) {
				expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i - 1]);
			}
		});

		it("should handle high-frequency generation", () => {
			const generator = createSnowflake();
			const ids: string[] = [];

			// Generate many IDs quickly
			for (let i = 0; i < 1000; i++) {
				ids.push(generator());
			}

			// All IDs should be unique
			const uniqueIds = new Set(ids);
			expect(uniqueIds.size).toBe(ids.length);

			// IDs should be in ascending order
			for (let i = 1; i < ids.length; i++) {
				expect(BigInt(ids[i])).toBeGreaterThanOrEqual(BigInt(ids[i - 1]));
			}
		});
	});
});
