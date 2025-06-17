import {
	type SnowflakeConfig,
	createSnowflake,
	generateSnowflakeId,
	getSnowflakeTimestamp,
	parseSnowflakeId,
	snowflakeToDate,
} from "@tknf/snowflake";

import {
	clearStoredConfig,
	createSnowflakeFromStorage,
	generateBrowserConfig,
	generateFromStorage,
	getBrowserFingerprint,
	initializeBrowserConfig,
	loadConfigFromStorage,
	saveConfigToStorage,
} from "@tknf/snowflake/browser";

// Global app object for HTML access
declare global {
	interface Window {
		app: typeof app;
	}
}

class SnowflakeBrowserApp {
	private generatedIds: string[] = [];

	constructor() {
		this.initializeApp();
		this.setupEventListeners();
	}

	private initializeApp() {
		// Initialize tabs
		this.setupTabs();

		// Auto-generate a sample ID for parsing
		setTimeout(() => {
			try {
				const sampleId = generateSnowflakeId();
				const parseInput = document.getElementById("parse-input") as HTMLInputElement;
				if (parseInput) {
					parseInput.placeholder = sampleId;
				}
			} catch (error) {
				console.warn("Could not generate sample ID:", error);
			}
		}, 100);

		// Show browser fingerprint on load
		setTimeout(() => {
			this.showBrowserFingerprint();
		}, 200);

		this.log("basic-output", "Welcome! Snowflake browser example loaded successfully.");
	}

	private setupTabs() {
		const tabs = document.querySelectorAll(".tab");
		const tabContents = document.querySelectorAll(".tab-content");

		for (const tab of tabs) {
			tab.addEventListener("click", () => {
				const targetTab = (tab as HTMLElement).dataset.tab;

				// Remove active class from all tabs and contents
				for (const t of tabs) {
					t.classList.remove("active");
				}
				for (const tc of tabContents) {
					tc.classList.remove("active");
				}

				// Add active class to clicked tab and corresponding content
				tab.classList.add("active");
				const targetContent = document.getElementById(`${targetTab}-tab`);
				if (targetContent) {
					targetContent.classList.add("active");
				}
			});
		}
	}

	private setupEventListeners() {
		// Keyboard shortcuts
		document.addEventListener("keydown", (event) => {
			// Ctrl+Enter or Cmd+Enter to generate basic ID
			if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
				event.preventDefault();
				this.generateBasicId();
			}

			// Escape to clear all outputs
			if (event.key === "Escape") {
				event.preventDefault();
				this.clearAllOutputs();
			}
		});
	}

	private log(elementId: string, message: string, isError = false) {
		const element = document.getElementById(elementId);
		if (!element) return;

		const timestamp = new Date().toLocaleTimeString();
		const prefix = isError ? "❌ ERROR" : "✅";

		const line = document.createElement("div");
		line.style.color = isError ? "#dc2626" : "#059669";
		line.style.marginBottom = "4px";
		line.textContent = `[${timestamp}] ${prefix} ${message}`;

		element.appendChild(line);
		element.scrollTop = element.scrollHeight;
	}

	private showStatus(
		elementId: string,
		message: string,
		type: "success" | "error" | "warning" = "success"
	) {
		const element = document.getElementById(elementId);
		if (!element) return;

		element.className = `status ${type}`;
		element.textContent = message;

		// Clear after 3 seconds
		setTimeout(() => {
			element.textContent = "";
			element.className = "status";
		}, 3000);
	}

	public clearOutput(elementId: string) {
		const element = document.getElementById(elementId);
		if (element) {
			element.innerHTML = "";
		}
	}

	private clearAllOutputs() {
		const outputs = [
			"basic-output",
			"custom-output",
			"browser-output",
			"init-output",
			"storage-output",
			"storage-gen-output",
			"parse-output",
			"compare-output",
			"performance-output",
			"memory-output",
		];
		for (const id of outputs) {
			this.clearOutput(id);
		}
	}

	// Basic ID Generation
	public generateBasicId() {
		try {
			const id = generateSnowflakeId();
			this.generatedIds.push(id);
			this.log("basic-output", `Generated ID: ${id}`);
		} catch (error) {
			this.log(
				"basic-output",
				`Error: ${error instanceof Error ? error.message : String(error)}`,
				true
			);
		}
	}

	public generateMultipleIds() {
		try {
			const generator = createSnowflake();
			const ids: string[] = [];

			for (let i = 0; i < 10; i++) {
				ids.push(generator());
			}

			this.generatedIds.push(...ids);
			this.log("basic-output", "Generated 10 IDs:");
			ids.forEach((id, index) => {
				this.log("basic-output", `  ${index + 1}: ${id}`);
			});

			// Verify uniqueness
			const uniqueIds = new Set(ids);
			if (uniqueIds.size === ids.length) {
				this.log("basic-output", "✅ All IDs are unique");
			} else {
				this.log("basic-output", "❌ Found duplicate IDs", true);
			}
		} catch (error) {
			this.log(
				"basic-output",
				`Error: ${error instanceof Error ? error.message : String(error)}`,
				true
			);
		}
	}

	public generateWithCustomConfig() {
		try {
			const config: SnowflakeConfig = {};

			const epochInput = document.getElementById("custom-epoch") as HTMLInputElement;
			const datacenterInput = document.getElementById("custom-datacenter") as HTMLInputElement;
			const workerInput = document.getElementById("custom-worker") as HTMLInputElement;

			if (epochInput.value) config.epoch = Number.parseInt(epochInput.value, 10);
			if (datacenterInput.value) config.datacenterId = Number.parseInt(datacenterInput.value, 10);
			if (workerInput.value) config.workerId = Number.parseInt(workerInput.value, 10);

			const generator = createSnowflake(config);
			const id = generator();

			this.generatedIds.push(id);
			this.log("custom-output", `Generated with custom config: ${id}`);
			this.log("custom-output", `Config used: ${JSON.stringify(config)}`);
		} catch (error) {
			this.log(
				"custom-output",
				`Error: ${error instanceof Error ? error.message : String(error)}`,
				true
			);
		}
	}

	// Browser Features
	public showBrowserFingerprint() {
		try {
			const fingerprint = getBrowserFingerprint();
			const element = document.getElementById("browser-fingerprint");

			if (element) {
				element.innerHTML = `
					<div><strong>Datacenter ID:</strong> ${fingerprint.datacenterId}</div>
					<div><strong>Worker ID:</strong> ${fingerprint.workerId}</div>
					<div><strong>Timezone:</strong> ${fingerprint.timezone}</div>
					<div><strong>User Agent:</strong> ${fingerprint.userAgent.substring(0, 60)}...</div>
					<div><strong>Screen:</strong> ${fingerprint.screen.width}x${fingerprint.screen.height} (${fingerprint.screen.colorDepth}bit)</div>
					<div><strong>Language:</strong> ${fingerprint.navigator.language}</div>
					<div><strong>Hardware Concurrency:</strong> ${fingerprint.navigator.hardwareConcurrency}</div>
				`;
			}

			this.log("browser-output", "Browser fingerprint displayed above");
		} catch (error) {
			this.log(
				"browser-output",
				`Error: ${error instanceof Error ? error.message : String(error)}`,
				true
			);
		}
	}

	public generateFromBrowserConfig() {
		try {
			const config = generateBrowserConfig();
			const generator = createSnowflake(config);
			const id = generator();

			this.generatedIds.push(id);
			this.log("browser-output", `Generated with browser config: ${id}`);
			this.log("browser-output", `Config: DC=${config.datacenterId}, Worker=${config.workerId}`);
		} catch (error) {
			this.log(
				"browser-output",
				`Error: ${error instanceof Error ? error.message : String(error)}`,
				true
			);
		}
	}

	public initializeBrowserConfig(save: boolean) {
		try {
			const config = initializeBrowserConfig({
				save,
				config: { epoch: 1577836800000 },
			});

			this.log("init-output", `Initialized browser config: ${JSON.stringify(config)}`);
			this.log("init-output", `Saved to localStorage: ${save ? "Yes" : "No"}`);

			// Generate an ID with this config
			const generator = createSnowflake(config);
			const id = generator();
			this.generatedIds.push(id);
			this.log("init-output", `Generated ID: ${id}`);
		} catch (error) {
			this.log(
				"init-output",
				`Error: ${error instanceof Error ? error.message : String(error)}`,
				true
			);
		}
	}

	// Storage Management
	public saveConfigToStorage() {
		try {
			const config: SnowflakeConfig = {};

			const epochInput = document.getElementById("storage-epoch") as HTMLInputElement;
			const datacenterInput = document.getElementById("storage-datacenter") as HTMLInputElement;
			const workerInput = document.getElementById("storage-worker") as HTMLInputElement;

			if (epochInput.value) config.epoch = Number.parseInt(epochInput.value, 10);
			if (datacenterInput.value) config.datacenterId = Number.parseInt(datacenterInput.value, 10);
			if (workerInput.value) config.workerId = Number.parseInt(workerInput.value, 10);

			if (Object.keys(config).length === 0) {
				this.showStatus("storage-status", "No configuration provided", "warning");
				return;
			}

			saveConfigToStorage(config);
			this.showStatus("storage-status", "Configuration saved to localStorage");
			this.log("storage-output", `Saved config: ${JSON.stringify(config)}`);
		} catch (error) {
			this.showStatus(
				"storage-status",
				`Error: ${error instanceof Error ? error.message : String(error)}`,
				"error"
			);
			this.log(
				"storage-output",
				`Error: ${error instanceof Error ? error.message : String(error)}`,
				true
			);
		}
	}

	public loadConfigFromStorage() {
		try {
			const config = loadConfigFromStorage();

			if (Object.keys(config).length === 0) {
				this.showStatus("storage-status", "No configuration found in localStorage", "warning");
				this.log("storage-output", "No stored configuration found");
				return;
			}

			// Populate input fields
			if (config.epoch) {
				(document.getElementById("storage-epoch") as HTMLInputElement).value =
					config.epoch.toString();
			}
			if (config.datacenterId !== undefined) {
				(document.getElementById("storage-datacenter") as HTMLInputElement).value =
					config.datacenterId.toString();
			}
			if (config.workerId !== undefined) {
				(document.getElementById("storage-worker") as HTMLInputElement).value =
					config.workerId.toString();
			}

			this.showStatus("storage-status", "Configuration loaded from localStorage");
			this.log("storage-output", `Loaded config: ${JSON.stringify(config)}`);
		} catch (error) {
			this.showStatus(
				"storage-status",
				`Error: ${error instanceof Error ? error.message : String(error)}`,
				"error"
			);
			this.log(
				"storage-output",
				`Error: ${error instanceof Error ? error.message : String(error)}`,
				true
			);
		}
	}

	public clearStoredConfig() {
		try {
			clearStoredConfig();

			// Clear input fields
			(document.getElementById("storage-epoch") as HTMLInputElement).value = "";
			(document.getElementById("storage-datacenter") as HTMLInputElement).value = "";
			(document.getElementById("storage-worker") as HTMLInputElement).value = "";

			this.showStatus("storage-status", "Stored configuration cleared");
			this.log("storage-output", "Cleared stored configuration");
		} catch (error) {
			this.showStatus(
				"storage-status",
				`Error: ${error instanceof Error ? error.message : String(error)}`,
				"error"
			);
			this.log(
				"storage-output",
				`Error: ${error instanceof Error ? error.message : String(error)}`,
				true
			);
		}
	}

	public generateFromStorage() {
		try {
			const id = generateFromStorage();
			const config = loadConfigFromStorage();

			this.generatedIds.push(id);
			this.log("storage-gen-output", `Generated from storage: ${id}`);
			this.log("storage-gen-output", `Using config: ${JSON.stringify(config)}`);
		} catch (error) {
			this.log(
				"storage-gen-output",
				`Error: ${error instanceof Error ? error.message : String(error)}`,
				true
			);
		}
	}

	public createGeneratorFromStorage() {
		try {
			const generator = createSnowflakeFromStorage();
			const ids: string[] = [];

			for (let i = 0; i < 5; i++) {
				ids.push(generator());
			}

			this.generatedIds.push(...ids);
			this.log("storage-gen-output", "Created generator from storage, generated 5 IDs:");
			ids.forEach((id, index) => {
				this.log("storage-gen-output", `  ${index + 1}: ${id}`);
			});
		} catch (error) {
			this.log(
				"storage-gen-output",
				`Error: ${error instanceof Error ? error.message : String(error)}`,
				true
			);
		}
	}

	// ID Analysis
	public parseSnowflakeId() {
		try {
			const idInput = document.getElementById("parse-input") as HTMLInputElement;
			const epochInput = document.getElementById("parse-epoch") as HTMLInputElement;

			const id = idInput.value.trim();
			if (!id) {
				this.log("parse-output", "Please enter a Snowflake ID", true);
				return;
			}

			const epoch = epochInput.value ? Number.parseInt(epochInput.value, 10) : undefined;
			const parsed = parseSnowflakeId(id, epoch);

			this.log("parse-output", `Parsed ID: ${id}`);
			this.log("parse-output", `  Timestamp: ${parsed.timestamp}`);
			this.log("parse-output", `  Date: ${parsed.date.toISOString()}`);
			this.log("parse-output", `  Datacenter ID: ${parsed.datacenterId}`);
			this.log("parse-output", `  Worker ID: ${parsed.workerId}`);
			this.log("parse-output", `  Sequence: ${parsed.sequence}`);
		} catch (error) {
			this.log(
				"parse-output",
				`Error: ${error instanceof Error ? error.message : String(error)}`,
				true
			);
		}
	}

	public getIdTimestamp() {
		try {
			const idInput = document.getElementById("parse-input") as HTMLInputElement;
			const epochInput = document.getElementById("parse-epoch") as HTMLInputElement;

			const id = idInput.value.trim();
			if (!id) {
				this.log("parse-output", "Please enter a Snowflake ID", true);
				return;
			}

			const epoch = epochInput.value ? Number.parseInt(epochInput.value, 10) : undefined;
			const timestamp = getSnowflakeTimestamp(id, epoch);

			this.log("parse-output", `ID: ${id}`);
			this.log("parse-output", `Timestamp: ${timestamp}`);
		} catch (error) {
			this.log(
				"parse-output",
				`Error: ${error instanceof Error ? error.message : String(error)}`,
				true
			);
		}
	}

	public convertToDate() {
		try {
			const idInput = document.getElementById("parse-input") as HTMLInputElement;
			const epochInput = document.getElementById("parse-epoch") as HTMLInputElement;

			const id = idInput.value.trim();
			if (!id) {
				this.log("parse-output", "Please enter a Snowflake ID", true);
				return;
			}

			const epoch = epochInput.value ? Number.parseInt(epochInput.value, 10) : undefined;
			const date = snowflakeToDate(id, epoch);

			this.log("parse-output", `ID: ${id}`);
			this.log("parse-output", `Date: ${date.toISOString()}`);
			this.log("parse-output", `Local: ${date.toLocaleString()}`);
		} catch (error) {
			this.log(
				"parse-output",
				`Error: ${error instanceof Error ? error.message : String(error)}`,
				true
			);
		}
	}

	public compareIds() {
		try {
			const generator = createSnowflake();
			const ids: string[] = [];

			// Generate IDs with small delays to show time ordering
			for (let i = 0; i < 3; i++) {
				ids.push(generator());
				// Small delay to ensure different timestamps
				const start = performance.now();
				while (performance.now() - start < 2) {
					// Busy wait
				}
			}

			this.log("compare-output", "Generated IDs with time delays:");
			ids.forEach((id, index) => {
				const parsed = parseSnowflakeId(id);
				this.log("compare-output", `  ${index + 1}: ${id} (${parsed.date.toISOString()})`);
			});

			// Show that they're sortable
			const sorted = [...ids].sort();
			this.log(
				"compare-output",
				`IDs are naturally sorted: ${JSON.stringify(ids) === JSON.stringify(sorted)}`
			);
		} catch (error) {
			this.log(
				"compare-output",
				`Error: ${error instanceof Error ? error.message : String(error)}`,
				true
			);
		}
	}

	public demonstrateSorting() {
		try {
			if (this.generatedIds.length < 2) {
				this.log("compare-output", "Generate some IDs first to demonstrate sorting", true);
				return;
			}

			const shuffled = [...this.generatedIds].sort(() => Math.random() - 0.5);
			const sorted = [...shuffled].sort();

			this.log("compare-output", "Shuffled IDs:");
			shuffled.slice(0, 5).forEach((id, index) => {
				this.log("compare-output", `  ${index + 1}: ${id}`);
			});

			this.log("compare-output", "Sorted IDs (chronological):");
			sorted.slice(0, 5).forEach((id, index) => {
				const parsed = parseSnowflakeId(id);
				this.log("compare-output", `  ${index + 1}: ${id} (${parsed.date.toISOString()})`);
			});
		} catch (error) {
			this.log(
				"compare-output",
				`Error: ${error instanceof Error ? error.message : String(error)}`,
				true
			);
		}
	}

	// Performance Testing
	public performanceTest() {
		try {
			const countInput = document.getElementById("perf-count") as HTMLInputElement;
			const count = Number.parseInt(countInput.value, 10) || 10000;

			this.log(
				"performance-output",
				`Starting performance test with ${count.toLocaleString()} IDs...`
			);

			const generator = createSnowflake();
			const startTime = performance.now();

			const ids: string[] = [];
			for (let i = 0; i < count; i++) {
				ids.push(generator());
			}

			const endTime = performance.now();
			const duration = endTime - startTime;
			const idsPerSecond = Math.round((count / duration) * 1000);

			// Check uniqueness
			const uniqueIds = new Set(ids);
			const duplicates = count - uniqueIds.size;

			this.log(
				"performance-output",
				`Generated ${count.toLocaleString()} IDs in ${duration.toFixed(2)}ms`
			);
			this.log("performance-output", `Performance: ${idsPerSecond.toLocaleString()} IDs/second`);

			if (duplicates === 0) {
				this.log("performance-output", `✅ All ${count.toLocaleString()} IDs are unique`);
			} else {
				this.log("performance-output", `❌ Found ${duplicates} duplicate IDs`, true);
			}

			// Update performance stats
			this.updatePerformanceStats({
				count,
				duration,
				idsPerSecond,
				duplicates,
			});

			// Show sample IDs
			this.log("performance-output", `First 3 IDs: ${ids.slice(0, 3).join(", ")}`);
			this.log("performance-output", `Last 3 IDs: ${ids.slice(-3).join(", ")}`);
		} catch (error) {
			this.log(
				"performance-output",
				`Error: ${error instanceof Error ? error.message : String(error)}`,
				true
			);
		}
	}

	private updatePerformanceStats(stats: {
		count: number;
		duration: number;
		idsPerSecond: number;
		duplicates: number;
	}) {
		const statsElement = document.getElementById("perf-stats");
		if (!statsElement) return;

		statsElement.innerHTML = `
			<div class="stat-card">
				<div class="stat-value">${stats.count.toLocaleString()}</div>
				<div class="stat-label">IDs Generated</div>
			</div>
			<div class="stat-card">
				<div class="stat-value">${stats.duration.toFixed(2)}ms</div>
				<div class="stat-label">Duration</div>
			</div>
			<div class="stat-card">
				<div class="stat-value">${stats.idsPerSecond.toLocaleString()}</div>
				<div class="stat-label">IDs/Second</div>
			</div>
			<div class="stat-card">
				<div class="stat-value">${stats.duplicates}</div>
				<div class="stat-label">Duplicates</div>
			</div>
		`;
	}

	public benchmarkDifferentConfigs() {
		try {
			const configs = [
				{ name: "Default", config: {} },
				{ name: "Custom Epoch", config: { epoch: 1609459200000 } },
				{ name: "Different Worker", config: { workerId: 15, datacenterId: 5 } },
			];

			this.log("performance-output", "Benchmarking different configurations...");

			for (const { name, config } of configs) {
				const generator = createSnowflake(config);
				const testCount = 5000;
				const startTime = performance.now();

				for (let i = 0; i < testCount; i++) {
					generator();
				}

				const endTime = performance.now();
				const duration = endTime - startTime;
				const idsPerSecond = Math.round((testCount / duration) * 1000);

				this.log("performance-output", `${name}: ${idsPerSecond.toLocaleString()} IDs/second`);
			}
		} catch (error) {
			this.log(
				"performance-output",
				`Error: ${error instanceof Error ? error.message : String(error)}`,
				true
			);
		}
	}

	public memoryUsageTest() {
		try {
			// @ts-ignore - performance.memory is not in TypeScript types but available in Chrome
			// biome-ignore lint/suspicious/noExplicitAny:
			const memory = (performance as any).memory;
			if (!memory) {
				this.log("memory-output", "Memory API not available in this browser", true);
				return;
			}

			const beforeUsed = memory.usedJSHeapSize;
			this.log("memory-output", `Memory before test: ${(beforeUsed / 1024 / 1024).toFixed(2)} MB`);

			// Generate many IDs to test memory usage
			const generator = createSnowflake();
			const ids: string[] = [];

			for (let i = 0; i < 50000; i++) {
				ids.push(generator());
			}

			const afterUsed = memory.usedJSHeapSize;
			const memoryIncrease = afterUsed - beforeUsed;

			this.log("memory-output", "Generated 50,000 IDs");
			this.log("memory-output", `Memory after test: ${(afterUsed / 1024 / 1024).toFixed(2)} MB`);
			this.log("memory-output", `Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB`);
			this.log(
				"memory-output",
				`Average per ID: ${(memoryIncrease / ids.length).toFixed(2)} bytes`
			);
		} catch (error) {
			this.log(
				"memory-output",
				`Error: ${error instanceof Error ? error.message : String(error)}`,
				true
			);
		}
	}

	public garbageCollectionTest() {
		try {
			this.log("memory-output", "Running GC pressure test...");

			// Create many generators to test GC pressure
			for (let round = 0; round < 10; round++) {
				const generators = [];
				for (let i = 0; i < 1000; i++) {
					generators.push(createSnowflake({ workerId: i % 32 }));
				}

				// Generate some IDs with each
				for (const gen of generators) {
					for (let j = 0; j < 10; j++) {
						gen();
					}
				}

				this.log(
					"memory-output",
					`Round ${round + 1}: Created 1000 generators, generated 10000 IDs`
				);
			}

			this.log("memory-output", "GC pressure test completed - check dev tools for memory usage");
		} catch (error) {
			this.log(
				"memory-output",
				`Error: ${error instanceof Error ? error.message : String(error)}`,
				true
			);
		}
	}
}

// Initialize the app
const app = new SnowflakeBrowserApp();

// Make app globally available for HTML event handlers
window.app = app;

console.log("🔥 Snowflake Browser Example initialized");
console.log(
	"Available global methods:",
	Object.getOwnPropertyNames(Object.getPrototypeOf(app)).filter((name) => name !== "constructor")
);
