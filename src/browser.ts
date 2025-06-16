import type { SnowflakeConfig } from "./index.js";
import { createSnowflake } from "./index.js";

/**
 * Browser-specific configuration keys for localStorage
 */
export const BROWSER_CONFIG_KEYS = {
	EPOCH: "snowflake.epoch",
	DATACENTER_ID: "snowflake.datacenterId",
	WORKER_ID: "snowflake.workerId",
} as const;

/**
 * Generate a browser-specific worker ID based on various browser characteristics
 */
const generateBrowserWorkerId = (): number => {
	const navigator = globalThis.navigator;
	const screen = globalThis.screen;

	if (!navigator || !screen) {
		// Fallback for environments without navigator/screen
		return Math.floor(Math.random() * 32);
	}

	// Create a simple hash from browser characteristics
	const characteristics = [
		navigator.userAgent || "",
		navigator.language || "",
		screen.width?.toString() || "",
		screen.height?.toString() || "",
		screen.colorDepth?.toString() || "",
		navigator.hardwareConcurrency?.toString() || "",
	].join("|");

	// Simple hash function to convert string to number 0-31
	let hash = 0;
	for (let i = 0; i < characteristics.length; i++) {
		const char = characteristics.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash; // Convert to 32-bit integer
	}

	return Math.abs(hash) % 32;
};

/**
 * Generate a datacenter ID based on timezone and other factors
 */
const generateBrowserDatacenterId = (): number => {
	const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

	// Simple hash of timezone to generate datacenter ID
	let hash = 0;
	for (let i = 0; i < timezone.length; i++) {
		const char = timezone.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash;
	}

	return Math.abs(hash) % 32;
};

/**
 * Parse value from localStorage as integer with validation
 * Exported for testing purposes
 */
export const parseLocalStorageInt = (key: string, min: number, max: number): number | undefined => {
	if (typeof localStorage === "undefined") {
		return undefined;
	}

	const value = localStorage.getItem(key);
	if (!value) return undefined;

	const parsed = Number.parseInt(value, 10);
	if (Number.isNaN(parsed)) {
		console.warn(`localStorage value for ${key} must be a valid integer`);
		return undefined;
	}
	if (parsed < min || parsed > max) {
		console.warn(`localStorage value for ${key} must be between ${min} and ${max}`);
		return undefined;
	}
	return parsed;
};

/**
 * Load Snowflake configuration from localStorage
 */
export const loadConfigFromStorage = (): SnowflakeConfig => {
	const config: SnowflakeConfig = {};

	if (typeof localStorage === "undefined") {
		return config;
	}

	// Load epoch from localStorage
	const epochStr = localStorage.getItem(BROWSER_CONFIG_KEYS.EPOCH);
	if (epochStr) {
		const epoch = Number.parseInt(epochStr, 10);
		if (!Number.isNaN(epoch)) {
			config.epoch = epoch;
		} else {
			console.warn(
				`localStorage value for ${BROWSER_CONFIG_KEYS.EPOCH} must be a valid integer timestamp`
			);
		}
	}

	// Load datacenter ID from localStorage (0-31)
	config.datacenterId = parseLocalStorageInt(BROWSER_CONFIG_KEYS.DATACENTER_ID, 0, 31);

	// Load worker ID from localStorage (0-31)
	config.workerId = parseLocalStorageInt(BROWSER_CONFIG_KEYS.WORKER_ID, 0, 31);

	return config;
};

/**
 * Save Snowflake configuration to localStorage
 */
export const saveConfigToStorage = (config: SnowflakeConfig): void => {
	if (typeof localStorage === "undefined") {
		console.warn("localStorage is not available");
		return;
	}

	if (config.epoch !== undefined) {
		localStorage.setItem(BROWSER_CONFIG_KEYS.EPOCH, config.epoch.toString());
	}
	if (config.datacenterId !== undefined) {
		localStorage.setItem(BROWSER_CONFIG_KEYS.DATACENTER_ID, config.datacenterId.toString());
	}
	if (config.workerId !== undefined) {
		localStorage.setItem(BROWSER_CONFIG_KEYS.WORKER_ID, config.workerId.toString());
	}
};

/**
 * Generate browser-specific configuration automatically
 */
export const generateBrowserConfig = (): SnowflakeConfig => {
	return {
		datacenterId: generateBrowserDatacenterId(),
		workerId: generateBrowserWorkerId(),
	};
};

/**
 * Create a Snowflake ID generator with configuration loaded from localStorage,
 * with automatic browser-specific fallbacks
 */
export const createSnowflakeFromStorage = (overrides: SnowflakeConfig = {}) => {
	const storageConfig = loadConfigFromStorage();
	const browserConfig = generateBrowserConfig();

	// Merge configs: overrides > localStorage > browser-generated > defaults
	const finalConfig: SnowflakeConfig = {
		...browserConfig,
		...storageConfig,
		...overrides,
	};

	return createSnowflake(finalConfig);
};

/**
 * Generate a single Snowflake ID with configuration from localStorage and browser characteristics
 */
export const generateFromStorage = (overrides: SnowflakeConfig = {}): string => {
	const generator = createSnowflakeFromStorage(overrides);
	return generator();
};

/**
 * Initialize browser-specific configuration and optionally save to localStorage
 */
export const initializeBrowserConfig = (
	options: {
		save?: boolean;
		config?: Partial<SnowflakeConfig>;
	} = {}
): SnowflakeConfig => {
	const { save = false, config: userConfig = {} } = options;

	const browserConfig = generateBrowserConfig();
	const finalConfig = { ...browserConfig, ...userConfig };

	if (save) {
		saveConfigToStorage(finalConfig);
	}

	return finalConfig;
};

/**
 * Clear stored Snowflake configuration from localStorage
 */
export const clearStoredConfig = (): void => {
	if (typeof localStorage === "undefined") {
		return;
	}

	localStorage.removeItem(BROWSER_CONFIG_KEYS.EPOCH);
	localStorage.removeItem(BROWSER_CONFIG_KEYS.DATACENTER_ID);
	localStorage.removeItem(BROWSER_CONFIG_KEYS.WORKER_ID);
};

/**
 * Get current browser fingerprint for debugging
 */
export const getBrowserFingerprint = (): {
	datacenterId: number;
	workerId: number;
	timezone: string;
	userAgent: string;
	screen: {
		width: number;
		height: number;
		colorDepth: number;
	};
	navigator: {
		language: string;
		hardwareConcurrency: number;
	};
} => {
	const navigator = globalThis.navigator;
	const screen = globalThis.screen;

	return {
		datacenterId: generateBrowserDatacenterId(),
		workerId: generateBrowserWorkerId(),
		timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
		userAgent: navigator?.userAgent || "",
		screen: {
			width: screen?.width || 0,
			height: screen?.height || 0,
			colorDepth: screen?.colorDepth || 0,
		},
		navigator: {
			language: navigator?.language || "",
			hardwareConcurrency: navigator?.hardwareConcurrency || 0,
		},
	};
};
