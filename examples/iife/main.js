// Snowflake IIFE Example - Main JavaScript

// Utility function to safely append content to output
function appendToOutput(elementId, content, isError = false) {
	const element = document.getElementById(elementId);
	if (!element) return;

	const timestamp = new Date().toLocaleTimeString();
	const prefix = isError ? "❌ ERROR" : "✅";
	const className = isError ? "error" : "";

	const line = document.createElement("div");
	line.className = className;
	line.textContent = `[${timestamp}] ${prefix} ${content}`;

	element.appendChild(line);
	element.scrollTop = element.scrollHeight;
}

// Utility function to clear output
function clearOutput(elementId) {
	const element = document.getElementById(elementId);
	if (element) {
		element.innerHTML = "";
	}
}

// Utility function to show status messages
function showStatus(elementId, message, isError = false) {
	const element = document.getElementById(elementId);
	if (!element) return;

	element.className = isError ? "error" : "success";
	element.textContent = message;

	// Clear after 3 seconds
	setTimeout(() => {
		element.textContent = "";
		element.className = "";
	}, 3000);
}

// Basic ID Generation Functions
function generateBasicId() {
	try {
		const id = Snowflake.generateSnowflakeId();
		appendToOutput("basic-output", `Generated ID: ${id}`);
	} catch (error) {
		appendToOutput("basic-output", `Error: ${error.message}`, true);
	}
}

function generateMultipleIds() {
	try {
		const generator = Snowflake.createSnowflake();
		const ids = [];

		for (let i = 0; i < 10; i++) {
			ids.push(generator());
		}

		appendToOutput("basic-output", "Generated 10 IDs:");
		ids.forEach((id, index) => {
			appendToOutput("basic-output", `  ${index + 1}: ${id}`);
		});
	} catch (error) {
		appendToOutput("basic-output", `Error: ${error.message}`, true);
	}
}

// Browser Configuration Functions
function showBrowserFingerprint() {
	try {
		const fingerprint = Snowflake.getBrowserFingerprint();
		const element = document.getElementById("browser-fingerprint");

		element.innerHTML = `
            <div><strong>Datacenter ID:</strong> ${fingerprint.datacenterId}</div>
            <div><strong>Worker ID:</strong> ${fingerprint.workerId}</div>
            <div><strong>Timezone:</strong> ${fingerprint.timezone}</div>
            <div><strong>User Agent:</strong> ${fingerprint.userAgent.substring(0, 50)}...</div>
            <div><strong>Screen:</strong> ${fingerprint.screen.width}x${fingerprint.screen.height} (${fingerprint.screen.colorDepth}bit)</div>
            <div><strong>Language:</strong> ${fingerprint.navigator.language}</div>
            <div><strong>Hardware Concurrency:</strong> ${fingerprint.navigator.hardwareConcurrency}</div>
        `;

		appendToOutput("browser-output", "Browser fingerprint displayed above");
	} catch (error) {
		appendToOutput("browser-output", `Error: ${error.message}`, true);
	}
}

function generateFromBrowserConfig() {
	try {
		const config = Snowflake.generateBrowserConfig();
		const generator = Snowflake.createSnowflake(config);
		const id = generator();

		appendToOutput("browser-output", `Generated with browser config: ${id}`);
		appendToOutput(
			"browser-output",
			`Config: DC=${config.datacenterId}, Worker=${config.workerId}`
		);
	} catch (error) {
		appendToOutput("browser-output", `Error: ${error.message}`, true);
	}
}

// LocalStorage Configuration Functions
function saveConfigToStorage() {
	try {
		const config = {};

		const epoch = document.getElementById("epoch-input").value;
		const datacenterId = document.getElementById("datacenter-input").value;
		const workerId = document.getElementById("worker-input").value;

		if (epoch) config.epoch = Number.parseInt(epoch, 10);
		if (datacenterId) config.datacenterId = Number.parseInt(datacenterId, 10);
		if (workerId) config.workerId = Number.parseInt(workerId, 10);

		if (Object.keys(config).length === 0) {
			showStatus("storage-status", "No configuration provided", true);
			return;
		}

		Snowflake.saveConfigToStorage(config);
		showStatus("storage-status", "Configuration saved to localStorage");

		appendToOutput("storage-output", `Saved config: ${JSON.stringify(config)}`);
	} catch (error) {
		showStatus("storage-status", `Error: ${error.message}`, true);
		appendToOutput("storage-output", `Error: ${error.message}`, true);
	}
}

function loadConfigFromStorage() {
	try {
		const config = Snowflake.loadConfigFromStorage();

		if (Object.keys(config).length === 0) {
			showStatus("storage-status", "No configuration found in localStorage");
			appendToOutput("storage-output", "No stored configuration found");
			return;
		}

		// Populate input fields
		if (config.epoch) document.getElementById("epoch-input").value = config.epoch;
		if (config.datacenterId !== undefined)
			document.getElementById("datacenter-input").value = config.datacenterId;
		if (config.workerId !== undefined)
			document.getElementById("worker-input").value = config.workerId;

		showStatus("storage-status", "Configuration loaded from localStorage");
		appendToOutput("storage-output", `Loaded config: ${JSON.stringify(config)}`);
	} catch (error) {
		showStatus("storage-status", `Error: ${error.message}`, true);
		appendToOutput("storage-output", `Error: ${error.message}`, true);
	}
}

function clearStoredConfig() {
	try {
		Snowflake.clearStoredConfig();

		// Clear input fields
		document.getElementById("epoch-input").value = "";
		document.getElementById("datacenter-input").value = "";
		document.getElementById("worker-input").value = "";

		showStatus("storage-status", "Stored configuration cleared");
		appendToOutput("storage-output", "Cleared stored configuration");
	} catch (error) {
		showStatus("storage-status", `Error: ${error.message}`, true);
		appendToOutput("storage-output", `Error: ${error.message}`, true);
	}
}

function generateFromStorage() {
	try {
		const id = Snowflake.generateFromStorage();
		const config = Snowflake.loadConfigFromStorage();

		appendToOutput("storage-output", `Generated from storage: ${id}`);
		appendToOutput("storage-output", `Using config: ${JSON.stringify(config)}`);
	} catch (error) {
		appendToOutput("storage-output", `Error: ${error.message}`, true);
	}
}

// Custom Configuration Functions
function generateWithCustomConfig() {
	try {
		const config = {};

		const epoch = document.getElementById("custom-epoch").value;
		const datacenterId = document.getElementById("custom-datacenter").value;
		const workerId = document.getElementById("custom-worker").value;

		if (epoch) config.epoch = Number.parseInt(epoch, 10);
		if (datacenterId) config.datacenterId = Number.parseInt(datacenterId, 10);
		if (workerId) config.workerId = Number.parseInt(workerId, 10);

		const generator = Snowflake.createSnowflake(config);
		const id = generator();

		appendToOutput("custom-output", `Generated with custom config: ${id}`);
		appendToOutput("custom-output", `Config used: ${JSON.stringify(config)}`);
	} catch (error) {
		appendToOutput("custom-output", `Error: ${error.message}`, true);
	}
}

// ID Analysis Functions
function parseSnowflakeId() {
	try {
		const idInput = document.getElementById("parse-input").value.trim();
		const epochInput = document.getElementById("parse-epoch").value;

		if (!idInput) {
			appendToOutput("parse-output", "Please enter a Snowflake ID", true);
			return;
		}

		const epoch = epochInput ? Number.parseInt(epochInput, 10) : undefined;
		const parsed = Snowflake.parseSnowflakeId(idInput, epoch);

		appendToOutput("parse-output", `Parsed ID: ${idInput}`);
		appendToOutput("parse-output", `  Timestamp: ${parsed.timestamp}`);
		appendToOutput("parse-output", `  Date: ${parsed.date.toISOString()}`);
		appendToOutput("parse-output", `  Datacenter ID: ${parsed.datacenterId}`);
		appendToOutput("parse-output", `  Worker ID: ${parsed.workerId}`);
		appendToOutput("parse-output", `  Sequence: ${parsed.sequence}`);
	} catch (error) {
		appendToOutput("parse-output", `Error: ${error.message}`, true);
	}
}

function getIdTimestamp() {
	try {
		const idInput = document.getElementById("parse-input").value.trim();
		const epochInput = document.getElementById("parse-epoch").value;

		if (!idInput) {
			appendToOutput("parse-output", "Please enter a Snowflake ID", true);
			return;
		}

		const epoch = epochInput ? Number.parseInt(epochInput, 10) : undefined;
		const timestamp = Snowflake.getSnowflakeTimestamp(idInput, epoch);

		appendToOutput("parse-output", `ID: ${idInput}`);
		appendToOutput("parse-output", `Timestamp: ${timestamp}`);
	} catch (error) {
		appendToOutput("parse-output", `Error: ${error.message}`, true);
	}
}

function convertToDate() {
	try {
		const idInput = document.getElementById("parse-input").value.trim();
		const epochInput = document.getElementById("parse-epoch").value;

		if (!idInput) {
			appendToOutput("parse-output", "Please enter a Snowflake ID", true);
			return;
		}

		const epoch = epochInput ? Number.parseInt(epochInput, 10) : undefined;
		const date = Snowflake.snowflakeToDate(idInput, epoch);

		appendToOutput("parse-output", `ID: ${idInput}`);
		appendToOutput("parse-output", `Date: ${date.toISOString()}`);
		appendToOutput("parse-output", `Local: ${date.toLocaleString()}`);
	} catch (error) {
		appendToOutput("parse-output", `Error: ${error.message}`, true);
	}
}

// Performance Test Function
function performanceTest() {
	try {
		const count = Number.parseInt(document.getElementById("perf-count").value, 10) || 10000;

		appendToOutput("performance-output", `Starting performance test with ${count} IDs...`);

		const generator = Snowflake.createSnowflake();
		const startTime = performance.now();

		const ids = [];
		for (let i = 0; i < count; i++) {
			ids.push(generator());
		}

		const endTime = performance.now();
		const duration = endTime - startTime;
		const idsPerSecond = Math.round((count / duration) * 1000);

		appendToOutput("performance-output", `Generated ${count} IDs in ${duration.toFixed(2)}ms`);
		appendToOutput(
			"performance-output",
			`Performance: ${idsPerSecond.toLocaleString()} IDs/second`
		);

		// Check for uniqueness
		const uniqueIds = new Set(ids);
		const duplicates = count - uniqueIds.size;

		if (duplicates === 0) {
			appendToOutput("performance-output", `✅ All ${count} IDs are unique`);
		} else {
			appendToOutput("performance-output", `❌ Found ${duplicates} duplicate IDs`, true);
		}

		// Show first and last few IDs
		appendToOutput("performance-output", `First 3 IDs: ${ids.slice(0, 3).join(", ")}`);
		appendToOutput("performance-output", `Last 3 IDs: ${ids.slice(-3).join(", ")}`);
	} catch (error) {
		appendToOutput("performance-output", `Error: ${error.message}`, true);
	}
}

// Initialize browser fingerprint on page load
document.addEventListener("DOMContentLoaded", () => {
	showBrowserFingerprint();

	// Auto-generate a sample ID to show it works
	setTimeout(() => {
		generateBasicId();
		appendToOutput("basic-output", "Welcome! The library is working correctly.");
	}, 500);
});

// Auto-fill some example values
document.addEventListener("DOMContentLoaded", () => {
	// Set default epoch to library default
	document.getElementById("epoch-input").placeholder = "1577836800000 (2020-01-01)";
	document.getElementById("custom-epoch").placeholder = "1577836800000 (2020-01-01)";
	document.getElementById("parse-epoch").placeholder = "1577836800000 (2020-01-01)";

	// Generate a sample ID for parsing
	setTimeout(() => {
		try {
			const sampleId = Snowflake.generateSnowflakeId();
			document.getElementById("parse-input").placeholder = sampleId;
		} catch (error) {
			console.warn("Could not generate sample ID:", error);
		}
	}, 100);
});

// Keyboard shortcuts
document.addEventListener("keydown", (event) => {
	// Ctrl+Enter or Cmd+Enter to generate basic ID
	if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
		event.preventDefault();
		generateBasicId();
	}

	// Escape to clear all outputs
	if (event.key === "Escape") {
		event.preventDefault();
		[
			"basic-output",
			"browser-output",
			"storage-output",
			"custom-output",
			"parse-output",
			"performance-output",
		].forEach(clearOutput);
	}
});

// Add some helpful tooltips
document.addEventListener("DOMContentLoaded", () => {
	const tooltips = {
		"epoch-input": "Custom epoch timestamp in milliseconds (default: 1577836800000 = 2020-01-01)",
		"datacenter-input": "Datacenter identifier (0-31)",
		"worker-input": "Worker identifier (0-31)",
		"parse-input": "Enter a Snowflake ID to analyze its components",
		"perf-count": "Number of IDs to generate for performance testing",
	};

	for (const [id, tooltip] of Object.entries(tooltips)) {
		const element = document.getElementById(id);
		if (element) {
			element.title = tooltip;
		}
	}
});
