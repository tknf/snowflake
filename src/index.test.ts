import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import {
	createSnowflake,
	generateSnowflakeId,
	getSnowflakeTimestamp,
	isValidSnowflakeId,
	parseSnowflakeId,
	safeParseSnowflakeId,
	type SnowflakeConfig,
	snowflakeToDate,
} from "./index.js";

/** edge モード用の設定を生成するファクトリ */
const createEdgeConfig = (overrides: Partial<SnowflakeConfig> = {}): SnowflakeConfig => ({
	mode: "edge",
	...overrides,
});

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

		it("未来の epoch を指定すると例外を投げる", () => {
			expect(() => createSnowflake({ epoch: Date.now() + 1000000 })).toThrow(
				"Epoch must not be in the future"
			);
		});

		it("負の epoch を指定すると例外を投げる", () => {
			expect(() => createSnowflake({ epoch: -1 })).toThrow("Epoch must not be negative");
		});

		it("非整数の epoch を指定すると例外を投げる", () => {
			expect(() => createSnowflake({ epoch: 1.5 })).toThrow(
				"Epoch must be an integer timestamp in milliseconds"
			);
		});

		it("edge モードでも未来の epoch を指定すると例外を投げる", () => {
			expect(() => createSnowflake(createEdgeConfig({ epoch: Date.now() + 1000000 }))).toThrow(
				"Epoch must not be in the future"
			);
		});

		it("有効な過去の epoch では正常に生成され ID が負にならない", () => {
			const generator = createSnowflake({ epoch: 1577836800000 });
			const id = generator();
			expect(id.startsWith("-")).toBe(false);
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

		it("同一ミリ秒内で連続呼び出ししても異なる ID になる", () => {
			const fixed = Date.now();
			vi.spyOn(Date, "now").mockReturnValue(fixed);

			const config = { datacenterId: 3, workerId: 4 };
			const id1 = generateSnowflakeId(config);
			const id2 = generateSnowflakeId(config);

			vi.restoreAllMocks();

			expect(id1).not.toBe(id2);
		});

		it("同一設定で 1000 回連続呼び出ししても全件ユニークになる", () => {
			const config = { datacenterId: 6, workerId: 7 };
			const ids = Array.from({ length: 1000 }, () => generateSnowflakeId(config));

			expect(new Set(ids).size).toBe(ids.length);
		});

		it("異なる設定では別のジェネレータが使われ、workerId が反映される", () => {
			const idA = generateSnowflakeId({ datacenterId: 8, workerId: 9 });
			const idB = generateSnowflakeId({ datacenterId: 8, workerId: 10 });

			const parsedA = parseSnowflakeId(idA);
			const parsedB = parseSnowflakeId(idB);

			expect(parsedA.workerId).toBe(9);
			expect(parsedB.workerId).toBe(10);
			expect(idA).not.toBe(idB);
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

	describe("isValidSnowflakeId", () => {
		it("生成した有効な ID は true を返す", () => {
			const id = generateSnowflakeId();
			expect(isValidSnowflakeId(id)).toBe(true);
		});

		it("'0' は true を返す", () => {
			expect(isValidSnowflakeId("0")).toBe(true);
		});

		it("文字列以外が渡された場合は false を返す（実行時の型不正への防御）", () => {
			const isValidSnowflakeIdUnsafe = isValidSnowflakeId as (id: unknown) => boolean;
			expect(isValidSnowflakeIdUnsafe(123)).toBe(false);
		});

		it.each(["abc", "", "-1", "1.5", " 1", (2n ** 63n).toString()])(
			"'%s' は false を返す",
			(input) => {
				expect(isValidSnowflakeId(input)).toBe(false);
			}
		);
	});

	describe("不正な ID を渡した場合のエラーハンドリング", () => {
		it.each(["abc", "", "-1"])(
			"parseSnowflakeId('%s') は Invalid Snowflake ID を含む Error を投げる",
			(input) => {
				expect(() => parseSnowflakeId(input)).toThrow(/Invalid Snowflake ID/);
				try {
					parseSnowflakeId(input);
				} catch (e) {
					expect(e).toBeInstanceOf(Error);
					expect(e).not.toBeInstanceOf(SyntaxError);
				}
			}
		);

		it.each(["abc", "", "-1"])(
			"getSnowflakeTimestamp('%s') は Invalid Snowflake ID を含む Error を投げる",
			(input) => {
				expect(() => getSnowflakeTimestamp(input)).toThrow(/Invalid Snowflake ID/);
				try {
					getSnowflakeTimestamp(input);
				} catch (e) {
					expect(e).toBeInstanceOf(Error);
					expect(e).not.toBeInstanceOf(SyntaxError);
				}
			}
		);

		it.each(["abc", "", "-1"])(
			"snowflakeToDate('%s') は Invalid Snowflake ID を含む Error を投げる",
			(input) => {
				expect(() => snowflakeToDate(input)).toThrow(/Invalid Snowflake ID/);
				try {
					snowflakeToDate(input);
				} catch (e) {
					expect(e).toBeInstanceOf(Error);
					expect(e).not.toBeInstanceOf(SyntaxError);
				}
			}
		);
	});

	describe("safeParseSnowflakeId", () => {
		it.each(["abc", "", "-1"])("不正な ID '%s' の場合は null を返す", (input) => {
			expect(safeParseSnowflakeId(input)).toBeNull();
		});

		it("有効な ID の場合は parseSnowflakeId と同一の結果を返す", () => {
			const config = { epoch: 1577836800000, datacenterId: 5, workerId: 10 };
			const generator = createSnowflake(config);
			const id = generator();

			expect(safeParseSnowflakeId(id, config.epoch)).toEqual(parseSnowflakeId(id, config.epoch));
		});

		it("edge モードでも従来どおり動く", () => {
			const epoch = 1640995200000;
			const id = createSnowflake(createEdgeConfig({ epoch }))();

			expect(safeParseSnowflakeId(id, epoch, "edge")).toEqual(parseSnowflakeId(id, epoch, "edge"));
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

	describe("edge モード（エントロピー）", () => {
		// 22bit エントロピーの最大値（datacenter + worker + sequence = 22bit）
		const MAX_ENTROPY = 2 ** 22 - 1; // 4194303

		it("worker-id を指定せずにジェネレータ関数を返す", () => {
			const generate = createSnowflake(createEdgeConfig());
			expect(typeof generate).toBe("function");
		});

		it("数値文字列の ID を生成する", () => {
			const id = createSnowflake(createEdgeConfig())();
			expect(typeof id).toBe("string");
			expect(id).toMatch(/^\d+$/);
		});

		it("生成 ID は 63bit の正の整数になる", () => {
			const id = createSnowflake(createEdgeConfig())();
			const value = BigInt(id);
			expect(value).toBeGreaterThan(0n);
			expect(value).toBeLessThan(1n << 63n);
		});

		it("datacenterId / workerId を無視する（範囲外でも例外を投げない）", () => {
			const generate = createSnowflake(createEdgeConfig({ datacenterId: 999, workerId: -10 }));
			expect(generate()).toMatch(/^\d+$/);
		});

		it("同一ミリ秒内でもエントロピーにより ID がばらつく", () => {
			const fixed = Date.now();
			vi.spyOn(Date, "now").mockReturnValue(fixed);

			const generate = createSnowflake(createEdgeConfig());
			// タイムスタンプ固定なので、ID の差分はエントロピーのみに依存する
			const ids = Array.from({ length: 1000 }, () => generate());

			vi.restoreAllMocks();

			// 22bit 乱数のため 1000 件中の重複は理論上ごく僅か（~0.12 件）。十分にばらつくことを確認
			expect(new Set(ids).size).toBeGreaterThanOrEqual(990);
		});

		it("時刻が進む高頻度生成では全 ID がユニークかつ昇順になる", () => {
			let current = Date.now();
			vi.spyOn(Date, "now").mockImplementation(() => current++);

			const generate = createSnowflake(createEdgeConfig());
			const ids: string[] = [];
			for (let i = 0; i < 10000; i++) {
				ids.push(generate());
			}

			vi.restoreAllMocks();

			expect(new Set(ids).size).toBe(ids.length);
			for (let i = 1; i < ids.length; i++) {
				expect(BigInt(ids[i])).toBeGreaterThan(BigInt(ids[i - 1]));
			}
		});

		it("カスタム epoch を反映する", () => {
			const epoch = 1640995200000; // 2022-01-01
			const before = Date.now();
			const id = createSnowflake(createEdgeConfig({ epoch }))();
			const after = Date.now();

			const timestamp = getSnowflakeTimestamp(id, epoch);
			expect(timestamp).toBeGreaterThanOrEqual(before);
			expect(timestamp).toBeLessThanOrEqual(after);
		});

		it("getSnowflakeTimestamp / snowflakeToDate が edge ID でも正しく動く", () => {
			const before = Date.now();
			const id = createSnowflake(createEdgeConfig())();
			const after = Date.now();

			const timestamp = getSnowflakeTimestamp(id);
			expect(timestamp).toBeGreaterThanOrEqual(before);
			expect(timestamp).toBeLessThanOrEqual(after);

			const date = snowflakeToDate(id);
			expect(date).toBeInstanceOf(Date);
			expect(date.getTime()).toBe(timestamp);
		});

		it("parseSnowflakeId は edge ID を entropy として返し worker 系を null にする", () => {
			const epoch = 1640995200000;
			const id = createSnowflake(createEdgeConfig({ epoch }))();

			const parsed = parseSnowflakeId(id, epoch, "edge");
			expect(parsed.datacenterId).toBeNull();
			expect(parsed.workerId).toBeNull();
			expect(parsed.sequence).toBeNull();
			expect(parsed.entropy).toBeGreaterThanOrEqual(0);
			expect(parsed.entropy).toBeLessThanOrEqual(MAX_ENTROPY);
			expect(parsed.timestamp).toBeGreaterThan(epoch);
			expect(parsed.date).toBeInstanceOf(Date);
		});

		it("parseSnowflakeId は default モードでは entropy を null にする", () => {
			const id = generateSnowflakeId({ datacenterId: 1, workerId: 2 });
			const parsed = parseSnowflakeId(id);
			expect(parsed.entropy).toBeNull();
			expect(parsed.datacenterId).toBe(1);
			expect(parsed.workerId).toBe(2);
		});

		it("generateSnowflakeId で edge モードの単発 ID を生成できる", () => {
			const id = generateSnowflakeId(createEdgeConfig());
			expect(id).toMatch(/^\d+$/);
		});
	});
});
