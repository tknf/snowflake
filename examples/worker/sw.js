// Snowflake Service Worker Example
// This Service Worker demonstrates using the Snowflake ID generator in a background context

// Import the Snowflake library (using CDN for Service Worker compatibility)
importScripts("./snowflake.min.js");

// Service Worker state
let backgroundGenerationInterval = null;
let backgroundGenerationCount = 0;

// Helper function to send messages back to the main thread
function sendMessage(type, data = null, error = null, requestId = null) {
	const message = { type, data, error, requestId };

	// Send to all clients
	self.clients.matchAll().then((clients) => {
		for (const client of clients) {
			client.postMessage(message);
		}
	});
}

// Helper function to log messages (for debugging)
function log(message) {
	console.log(`[Service Worker] ${message}`);
}

// Initialize the service worker
self.addEventListener("install", (event) => {
	log("Service Worker installing...");
	// Skip waiting to activate immediately
	self.skipWaiting();
});

self.addEventListener("activate", (event) => {
	log("Service Worker activated");
	// Claim all clients immediately
	event.waitUntil(self.clients.claim());
});

// Handle messages from the main thread
self.addEventListener("message", (event) => {
	const { type, data, requestId } = event.data;

	log(`Received message: ${type}`);

	try {
		switch (type) {
			case "GENERATE_ID":
				handleGenerateId(requestId);
				break;

			case "GENERATE_MULTIPLE_IDS":
				handleGenerateMultipleIds(data.count, requestId);
				break;

			case "GENERATE_WITH_CONFIG":
				handleGenerateWithConfig(data.config, requestId);
				break;

			case "PERFORMANCE_TEST":
				handlePerformanceTest(data.count, requestId);
				break;

			case "PARSE_ID":
				handleParseId(data.id, requestId);
				break;

			case "START_BACKGROUND_GENERATION":
				handleStartBackgroundGeneration(requestId);
				break;

			case "STOP_BACKGROUND_GENERATION":
				handleStopBackgroundGeneration(requestId);
				break;

			default:
				log(`Unknown message type: ${type}`);
		}
	} catch (error) {
		log(`Error handling message ${type}: ${error.message}`);
		sendMessage(`${type}_ERROR`, null, error.message, requestId);
	}
});

function handleGenerateId(requestId) {
	try {
		const id = Snowflake.generateSnowflakeId();
		log(`Generated ID: ${id}`);
		sendMessage("ID_GENERATED", { id }, null, requestId);
	} catch (error) {
		sendMessage("ID_GENERATED", null, error.message, requestId);
	}
}

function handleGenerateMultipleIds(count, requestId) {
	try {
		const generator = Snowflake.createSnowflake();
		const ids = [];

		for (let i = 0; i < count; i++) {
			ids.push(generator());
		}

		log(`Generated ${count} IDs`);
		sendMessage("MULTIPLE_IDS_GENERATED", { ids }, null, requestId);
	} catch (error) {
		sendMessage("MULTIPLE_IDS_GENERATED", null, error.message, requestId);
	}
}

function handleGenerateWithConfig(config, requestId) {
	try {
		const generator = Snowflake.createSnowflake(config);
		const id = generator();

		log(`Generated ID with config: ${id}`);
		sendMessage("CONFIG_ID_GENERATED", { id, config }, null, requestId);
	} catch (error) {
		sendMessage("CONFIG_ID_GENERATED", null, error.message, requestId);
	}
}

function handlePerformanceTest(count, requestId) {
	try {
		log(`Starting performance test with ${count} IDs...`);

		const generator = Snowflake.createSnowflake();
		const startTime = performance.now();

		const ids = [];
		for (let i = 0; i < count; i++) {
			ids.push(generator());
		}

		const endTime = performance.now();
		const duration = endTime - startTime;
		const idsPerSecond = Math.round((count / duration) * 1000);

		// Check uniqueness
		const uniqueIds = new Set(ids);
		const allUnique = uniqueIds.size === ids.length;

		log(`Performance test completed: ${count} IDs in ${duration.toFixed(2)}ms`);

		sendMessage(
			"PERFORMANCE_RESULT",
			{
				count,
				duration,
				idsPerSecond,
				allUnique,
				duplicates: count - uniqueIds.size,
			},
			null,
			requestId
		);
	} catch (error) {
		sendMessage("PERFORMANCE_RESULT", null, error.message, requestId);
	}
}

function handleParseId(id, requestId) {
	try {
		const parsed = Snowflake.parseSnowflakeId(id);

		log(`Parsed ID: ${id}`);
		sendMessage(
			"ID_PARSED",
			{
				originalId: id,
				parsed: {
					timestamp: parsed.timestamp,
					date: parsed.date.toISOString(),
					datacenterId: parsed.datacenterId,
					workerId: parsed.workerId,
					sequence: parsed.sequence,
				},
			},
			null,
			requestId
		);
	} catch (error) {
		sendMessage("ID_PARSED", null, error.message, requestId);
	}
}

function handleStartBackgroundGeneration(requestId) {
	try {
		// Stop any existing background generation
		if (backgroundGenerationInterval) {
			clearInterval(backgroundGenerationInterval);
		}

		backgroundGenerationCount = 0;
		const generator = Snowflake.createSnowflake({
			workerId: 15, // Use a specific worker ID for background generation
			datacenterId: 5,
		});

		// Generate an ID every 500ms
		backgroundGenerationInterval = setInterval(() => {
			try {
				const id = generator();
				backgroundGenerationCount++;

				sendMessage("BACKGROUND_ID", {
					id,
					count: backgroundGenerationCount,
				});

				// Auto-stop after 20 IDs to prevent spam
				if (backgroundGenerationCount >= 20) {
					handleStopBackgroundGeneration(requestId);
				}
			} catch (error) {
				log(`Background generation error: ${error.message}`);
				handleStopBackgroundGeneration(requestId);
			}
		}, 500);

		log("Started background ID generation");
	} catch (error) {
		sendMessage("BACKGROUND_GENERATION_ERROR", null, error.message, requestId);
	}
}

function handleStopBackgroundGeneration(requestId) {
	if (backgroundGenerationInterval) {
		clearInterval(backgroundGenerationInterval);
		backgroundGenerationInterval = null;

		log(`Stopped background generation. Total generated: ${backgroundGenerationCount}`);
		sendMessage(
			"BACKGROUND_STOPPED",
			{
				totalCount: backgroundGenerationCount,
			},
			null,
			requestId
		);

		backgroundGenerationCount = 0;
	}
}

// Handle Service Worker lifecycle events
self.addEventListener("fetch", (event) => {
	// This Service Worker doesn't handle fetch events for this example
	// but we include this listener to make it a valid Service Worker
});

// Cleanup when Service Worker is terminated
self.addEventListener("beforeunload", () => {
	if (backgroundGenerationInterval) {
		clearInterval(backgroundGenerationInterval);
	}
});

// Handle Service Worker updates
self.addEventListener("message", (event) => {
	if (event.data && event.data.type === "SKIP_WAITING") {
		self.skipWaiting();
	}
});

// Test the Snowflake library on Service Worker startup
try {
	const testId = Snowflake.generateSnowflakeId();
	log(`Service Worker initialized successfully. Test ID: ${testId}`);
} catch (error) {
	log(`Service Worker initialization error: ${error.message}`);
}

log("Snowflake Service Worker script loaded and ready");
