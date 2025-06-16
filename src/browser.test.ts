import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	BROWSER_CONFIG_KEYS,
	clearStoredConfig,
	createSnowflakeFromStorage,
	generateBrowserConfig,
	generateFromStorage,
	getBrowserFingerprint,
	initializeBrowserConfig,
	loadConfigFromStorage,
	parseLocalStorageInt,
	saveConfigToStorage,
} from "./browser.js";

// Mock global objects for testing
const mockNavigator = {
	userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
	language: "en-US",
	hardwareConcurrency: 8,
};

const mockScreen = {
	width: 1920,
	height: 1080,
	colorDepth: 24,
};

const mockIntl = {
	DateTimeFormat: () => ({
		resolvedOptions: () => ({ timeZone: "America/New_York" }),
	}),
};

// Mock localStorage
const localStorageMock = (() => {
	let store: Record<string, string> = {};
	return {
		getItem: (key: string) => store[key] || null,
		setItem: (key: string, value: string) => {
			store[key] = value;
		},
		removeItem: (key: string) => {
			delete store[key];
		},
		clear: () => {
			store = {};
		},
	};
})();

describe("Browser Utilities", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		// Setup global mocks
		Object.defineProperty(globalThis, "navigator", {
			value: mockNavigator,
			writable: true,
		});
		Object.defineProperty(globalThis, "screen", {
			value: mockScreen,
			writable: true,
		});
		Object.defineProperty(globalThis, "Intl", {
			value: mockIntl,
			writable: true,
		});
		Object.defineProperty(globalThis, "localStorage", {
			value: localStorageMock,
			writable: true,
		});
	});

	afterEach(() => {
		localStorageMock.clear();
	});

	describe("BROWSER_CONFIG_KEYS", () => {
		it("should export correct config keys", () => {
			expect(BROWSER_CONFIG_KEYS.EPOCH).toBe("snowflake.epoch");
			expect(BROWSER_CONFIG_KEYS.DATACENTER_ID).toBe("snowflake.datacenterId");
			expect(BROWSER_CONFIG_KEYS.WORKER_ID).toBe("snowflake.workerId");
		});
	});

	describe("generateBrowserConfig", () => {
		it("should generate consistent config for same browser characteristics", () => {
			const config1 = generateBrowserConfig();
			const config2 = generateBrowserConfig();

			expect(config1.datacenterId).toBe(config2.datacenterId);
			expect(config1.workerId).toBe(config2.workerId);
			expect(config1.datacenterId).toBeGreaterThanOrEqual(0);
			expect(config1.datacenterId).toBeLessThanOrEqual(31);
			expect(config1.workerId).toBeGreaterThanOrEqual(0);
			expect(config1.workerId).toBeLessThanOrEqual(31);
		});

		it("should generate different config for different browser characteristics", () => {
			const config1 = generateBrowserConfig();

			// Change navigator characteristics
			Object.defineProperty(globalThis, "navigator", {
				value: { ...mockNavigator, userAgent: "Different UserAgent" },
				writable: true,
			});

			const config2 = generateBrowserConfig();

			// Should generate different worker ID
			expect(config1.workerId).not.toBe(config2.workerId);
		});

		it("should handle missing navigator/screen gracefully", () => {
			Object.defineProperty(globalThis, "navigator", {
				value: undefined,
				writable: true,
			});
			Object.defineProperty(globalThis, "screen", {
				value: undefined,
				writable: true,
			});

			const config = generateBrowserConfig();
			expect(config.datacenterId).toBeGreaterThanOrEqual(0);
			expect(config.datacenterId).toBeLessThanOrEqual(31);
			expect(config.workerId).toBeGreaterThanOrEqual(0);
			expect(config.workerId).toBeLessThanOrEqual(31);
		});

		it("should handle partial navigator/screen properties", () => {
			// Test navigator with missing properties
			Object.defineProperty(globalThis, "navigator", {
				value: {
					userAgent: undefined,
					language: undefined,
					hardwareConcurrency: undefined,
				},
				writable: true,
			});

			// Test screen with missing properties
			Object.defineProperty(globalThis, "screen", {
				value: {
					width: undefined,
					height: undefined,
					colorDepth: undefined,
				},
				writable: true,
			});

			const config = generateBrowserConfig();
			expect(config.workerId).toBeGreaterThanOrEqual(0);
			expect(config.workerId).toBeLessThanOrEqual(31);
		});

		it("should handle null values in navigator/screen properties", () => {
			// Test navigator with null properties
			Object.defineProperty(globalThis, "navigator", {
				value: {
					userAgent: null,
					language: null,
					hardwareConcurrency: null,
				},
				writable: true,
			});

			// Test screen with null properties
			Object.defineProperty(globalThis, "screen", {
				value: {
					width: null,
					height: null,
					colorDepth: null,
				},
				writable: true,
			});

			const config = generateBrowserConfig();
			expect(config.workerId).toBeGreaterThanOrEqual(0);
			expect(config.workerId).toBeLessThanOrEqual(31);
		});
	});

	describe("saveConfigToStorage", () => {
		it("should save config to localStorage", () => {
			const config = {
				epoch: 1234567890000,
				datacenterId: 5,
				workerId: 10,
			};

			saveConfigToStorage(config);

			expect(localStorageMock.getItem(BROWSER_CONFIG_KEYS.EPOCH)).toBe("1234567890000");
			expect(localStorageMock.getItem(BROWSER_CONFIG_KEYS.DATACENTER_ID)).toBe("5");
			expect(localStorageMock.getItem(BROWSER_CONFIG_KEYS.WORKER_ID)).toBe("10");
		});

		it("should handle partial config", () => {
			const config = { datacenterId: 5 };

			saveConfigToStorage(config);

			expect(localStorageMock.getItem(BROWSER_CONFIG_KEYS.DATACENTER_ID)).toBe("5");
			expect(localStorageMock.getItem(BROWSER_CONFIG_KEYS.EPOCH)).toBeNull();
			expect(localStorageMock.getItem(BROWSER_CONFIG_KEYS.WORKER_ID)).toBeNull();
		});

		it("should handle missing localStorage gracefully", () => {
			Object.defineProperty(globalThis, "localStorage", {
				value: undefined,
				writable: true,
			});

			const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

			saveConfigToStorage({ datacenterId: 5 });

			expect(consoleSpy).toHaveBeenCalledWith("localStorage is not available");

			consoleSpy.mockRestore();
		});
	});

	describe("parseLocalStorageInt", () => {
		it("should return undefined when localStorage is undefined", () => {
			Object.defineProperty(globalThis, "localStorage", {
				value: undefined,
				writable: true,
			});

			const result = parseLocalStorageInt("test-key", 0, 31);
			expect(result).toBeUndefined();
		});

		it("should parse valid values correctly", () => {
			localStorageMock.setItem("test-key", "15");

			const result = parseLocalStorageInt("test-key", 0, 31);
			expect(result).toBe(15);
		});

		it("should return undefined for missing values", () => {
			const result = parseLocalStorageInt("missing-key", 0, 31);
			expect(result).toBeUndefined();
		});

		it("should handle invalid numbers", () => {
			localStorageMock.setItem("test-key", "invalid");
			const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

			const result = parseLocalStorageInt("test-key", 0, 31);
			expect(result).toBeUndefined();
			expect(consoleSpy).toHaveBeenCalledWith(
				"localStorage value for test-key must be a valid integer"
			);

			consoleSpy.mockRestore();
		});

		it("should handle out of range values", () => {
			localStorageMock.setItem("test-key", "50");
			const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

			const result = parseLocalStorageInt("test-key", 0, 31);
			expect(result).toBeUndefined();
			expect(consoleSpy).toHaveBeenCalledWith(
				"localStorage value for test-key must be between 0 and 31"
			);

			consoleSpy.mockRestore();
		});
	});

	describe("loadConfigFromStorage", () => {
		it("should load config from localStorage", () => {
			localStorageMock.setItem(BROWSER_CONFIG_KEYS.EPOCH, "1234567890000");
			localStorageMock.setItem(BROWSER_CONFIG_KEYS.DATACENTER_ID, "5");
			localStorageMock.setItem(BROWSER_CONFIG_KEYS.WORKER_ID, "10");

			const config = loadConfigFromStorage();

			expect(config.epoch).toBe(1234567890000);
			expect(config.datacenterId).toBe(5);
			expect(config.workerId).toBe(10);
		});

		it("should return empty config when localStorage is empty", () => {
			const config = loadConfigFromStorage();
			expect(config).toEqual({});
		});

		it("should handle invalid values gracefully", () => {
			localStorageMock.setItem(BROWSER_CONFIG_KEYS.EPOCH, "invalid");
			localStorageMock.setItem(BROWSER_CONFIG_KEYS.DATACENTER_ID, "invalid");
			localStorageMock.setItem(BROWSER_CONFIG_KEYS.WORKER_ID, "32"); // out of range

			const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

			const config = loadConfigFromStorage();

			expect(config.epoch).toBeUndefined();
			expect(config.datacenterId).toBeUndefined();
			expect(config.workerId).toBeUndefined();
			expect(consoleSpy).toHaveBeenCalledTimes(3);

			consoleSpy.mockRestore();
		});

		it("should handle missing localStorage gracefully", () => {
			Object.defineProperty(globalThis, "localStorage", {
				value: undefined,
				writable: true,
			});

			const config = loadConfigFromStorage();
			expect(config).toEqual({});
		});
	});

	describe("clearStoredConfig", () => {
		it("should clear all stored config", () => {
			localStorageMock.setItem(BROWSER_CONFIG_KEYS.EPOCH, "1234567890000");
			localStorageMock.setItem(BROWSER_CONFIG_KEYS.DATACENTER_ID, "5");
			localStorageMock.setItem(BROWSER_CONFIG_KEYS.WORKER_ID, "10");

			clearStoredConfig();

			expect(localStorageMock.getItem(BROWSER_CONFIG_KEYS.EPOCH)).toBeNull();
			expect(localStorageMock.getItem(BROWSER_CONFIG_KEYS.DATACENTER_ID)).toBeNull();
			expect(localStorageMock.getItem(BROWSER_CONFIG_KEYS.WORKER_ID)).toBeNull();
		});

		it("should handle missing localStorage gracefully", () => {
			Object.defineProperty(globalThis, "localStorage", {
				value: undefined,
				writable: true,
			});

			expect(() => clearStoredConfig()).not.toThrow();
		});
	});

	describe("initializeBrowserConfig", () => {
		it("should initialize browser config without saving", () => {
			const config = initializeBrowserConfig();

			expect(config.datacenterId).toBeGreaterThanOrEqual(0);
			expect(config.datacenterId).toBeLessThanOrEqual(31);
			expect(config.workerId).toBeGreaterThanOrEqual(0);
			expect(config.workerId).toBeLessThanOrEqual(31);

			// Should not save to localStorage by default
			expect(localStorageMock.getItem(BROWSER_CONFIG_KEYS.DATACENTER_ID)).toBeNull();
		});

		it("should initialize and save browser config", () => {
			const config = initializeBrowserConfig({ save: true });

			expect(config.datacenterId).toBeGreaterThanOrEqual(0);
			expect(config.workerId).toBeGreaterThanOrEqual(0);

			// Should save to localStorage
			expect(localStorageMock.getItem(BROWSER_CONFIG_KEYS.DATACENTER_ID)).toBe(
				config.datacenterId?.toString()
			);
			expect(localStorageMock.getItem(BROWSER_CONFIG_KEYS.WORKER_ID)).toBe(
				config.workerId?.toString()
			);
		});

		it("should merge user config with browser config", () => {
			const config = initializeBrowserConfig({
				config: { epoch: 1234567890000, datacenterId: 15 },
			});

			expect(config.epoch).toBe(1234567890000);
			expect(config.datacenterId).toBe(15);
			expect(config.workerId).toBeGreaterThanOrEqual(0);
		});
	});

	describe("createSnowflakeFromStorage", () => {
		it("should create generator with storage and browser config", async () => {
			localStorageMock.setItem(BROWSER_CONFIG_KEYS.DATACENTER_ID, "5");

			const generator = createSnowflakeFromStorage();
			const id = generator();

			expect(typeof id).toBe("string");
			expect(id.length).toBeGreaterThan(0);

			// Verify config was applied
			const { parseSnowflakeId } = await import("./index.js");
			const parsed = parseSnowflakeId(id);
			expect(parsed.datacenterId).toBe(5);
		});

		it("should apply overrides correctly", async () => {
			localStorageMock.setItem(BROWSER_CONFIG_KEYS.DATACENTER_ID, "5");

			const generator = createSnowflakeFromStorage({ datacenterId: 20 });
			const id = generator();

			const { parseSnowflakeId } = await import("./index.js");
			const parsed = parseSnowflakeId(id);
			expect(parsed.datacenterId).toBe(20); // Override applied
		});
	});

	describe("generateFromStorage", () => {
		it("should generate single ID from storage", async () => {
			localStorageMock.setItem(BROWSER_CONFIG_KEYS.DATACENTER_ID, "7");
			localStorageMock.setItem(BROWSER_CONFIG_KEYS.WORKER_ID, "12");

			const id = generateFromStorage();
			expect(typeof id).toBe("string");

			const { parseSnowflakeId } = await import("./index.js");
			const parsed = parseSnowflakeId(id);
			expect(parsed.datacenterId).toBe(7);
			expect(parsed.workerId).toBe(12);
		});

		it("should apply overrides to storage config", async () => {
			localStorageMock.setItem(BROWSER_CONFIG_KEYS.DATACENTER_ID, "7");

			const id = generateFromStorage({ datacenterId: 25 });

			const { parseSnowflakeId } = await import("./index.js");
			const parsed = parseSnowflakeId(id);
			expect(parsed.datacenterId).toBe(25); // Override applied
		});
	});

	describe("getBrowserFingerprint", () => {
		it("should return browser fingerprint", () => {
			const fingerprint = getBrowserFingerprint();

			expect(fingerprint.datacenterId).toBeGreaterThanOrEqual(0);
			expect(fingerprint.datacenterId).toBeLessThanOrEqual(31);
			expect(fingerprint.workerId).toBeGreaterThanOrEqual(0);
			expect(fingerprint.workerId).toBeLessThanOrEqual(31);
			expect(fingerprint.timezone).toBe("America/New_York");
			expect(fingerprint.userAgent).toBe(mockNavigator.userAgent);
			expect(fingerprint.screen.width).toBe(1920);
			expect(fingerprint.screen.height).toBe(1080);
			expect(fingerprint.screen.colorDepth).toBe(24);
			expect(fingerprint.navigator.language).toBe("en-US");
			expect(fingerprint.navigator.hardwareConcurrency).toBe(8);
		});

		it("should handle missing navigator/screen gracefully", () => {
			Object.defineProperty(globalThis, "navigator", {
				value: undefined,
				writable: true,
			});
			Object.defineProperty(globalThis, "screen", {
				value: undefined,
				writable: true,
			});

			const fingerprint = getBrowserFingerprint();

			expect(fingerprint.userAgent).toBe("");
			expect(fingerprint.screen.width).toBe(0);
			expect(fingerprint.screen.height).toBe(0);
			expect(fingerprint.screen.colorDepth).toBe(0);
			expect(fingerprint.navigator.language).toBe("");
			expect(fingerprint.navigator.hardwareConcurrency).toBe(0);
		});

		it("should handle null navigator/screen properties in fingerprint", () => {
			Object.defineProperty(globalThis, "navigator", {
				value: {
					userAgent: null,
					language: null,
					hardwareConcurrency: null,
				},
				writable: true,
			});
			Object.defineProperty(globalThis, "screen", {
				value: {
					width: null,
					height: null,
					colorDepth: null,
				},
				writable: true,
			});

			const fingerprint = getBrowserFingerprint();

			expect(fingerprint.userAgent).toBe("");
			expect(fingerprint.screen.width).toBe(0);
			expect(fingerprint.screen.height).toBe(0);
			expect(fingerprint.screen.colorDepth).toBe(0);
			expect(fingerprint.navigator.language).toBe("");
			expect(fingerprint.navigator.hardwareConcurrency).toBe(0);
		});

		it("should handle undefined navigator/screen properties in fingerprint", () => {
			Object.defineProperty(globalThis, "navigator", {
				value: {
					userAgent: undefined,
					language: undefined,
					hardwareConcurrency: undefined,
				},
				writable: true,
			});
			Object.defineProperty(globalThis, "screen", {
				value: {
					width: undefined,
					height: undefined,
					colorDepth: undefined,
				},
				writable: true,
			});

			const fingerprint = getBrowserFingerprint();

			expect(fingerprint.userAgent).toBe("");
			expect(fingerprint.screen.width).toBe(0);
			expect(fingerprint.screen.height).toBe(0);
			expect(fingerprint.screen.colorDepth).toBe(0);
			expect(fingerprint.navigator.language).toBe("");
			expect(fingerprint.navigator.hardwareConcurrency).toBe(0);
		});
	});

	describe("Integration tests", () => {
		it("should work end-to-end with localStorage", async () => {
			// Initialize config and save to localStorage
			const config = initializeBrowserConfig({
				save: true,
				config: { epoch: 1600000000000 },
			});

			// Generate IDs using storage
			const generator = createSnowflakeFromStorage();
			const ids: string[] = [];

			for (let i = 0; i < 10; i++) {
				ids.push(generator());
			}

			// All should be unique
			const uniqueIds = new Set(ids);
			expect(uniqueIds.size).toBe(10);

			// Check first ID has correct config
			const { parseSnowflakeId } = await import("./index.js");
			const parsed = parseSnowflakeId(ids[0], 1600000000000);
			expect(parsed.datacenterId).toBe(config.datacenterId);
			expect(parsed.workerId).toBe(config.workerId);
		});

		it("should maintain consistency across browser sessions", () => {
			const config1 = generateBrowserConfig();
			const fingerprint1 = getBrowserFingerprint();

			// Simulate same browser session
			const config2 = generateBrowserConfig();
			const fingerprint2 = getBrowserFingerprint();

			// Should be identical
			expect(config1.datacenterId).toBe(config2.datacenterId);
			expect(config1.workerId).toBe(config2.workerId);
			expect(fingerprint1.datacenterId).toBe(fingerprint2.datacenterId);
			expect(fingerprint1.workerId).toBe(fingerprint2.workerId);
		});
	});
});
