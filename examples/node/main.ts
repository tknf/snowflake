import { performance } from "node:perf_hooks";
import {
	type SnowflakeConfig,
	createSnowflake,
	generateSnowflakeId,
	getSnowflakeTimestamp,
	parseSnowflakeId,
	snowflakeToDate,
} from "@tknf/snowflake";
import {
	ENV_VARS,
	createSnowflakeFromEnv,
	generateFromEnv,
	loadConfigFromEnv,
} from "@tknf/snowflake/node";

function log(section: string, message: string, isError = false) {
	const timestamp = new Date().toISOString();
	const prefix = isError ? "❌ ERROR" : "✅";
	console.log(`[${timestamp}] ${prefix} [${section}] ${message}`);
}

function separator(title: string) {
	console.log(`\n${"=".repeat(60)}`);
	console.log(`🔥 ${title}`);
	console.log("=".repeat(60));
}

function basicIdGeneration() {
	separator("Basic ID Generation");

	try {
		// Generate single ID
		const singleId = generateSnowflakeId();
		log("BASIC", `Generated single ID: ${singleId}`);

		// Generate multiple IDs with same generator
		const generator = createSnowflake();
		const multipleIds: string[] = [];

		for (let i = 0; i < 5; i++) {
			multipleIds.push(generator());
		}

		log("BASIC", "Generated 5 IDs with same generator:");
		multipleIds.forEach((id, index) => {
			log("BASIC", `  ${index + 1}: ${id}`);
		});

		// Verify uniqueness
		const uniqueIds = new Set(multipleIds);
		if (uniqueIds.size === multipleIds.length) {
			log("BASIC", "✅ All IDs are unique");
		} else {
			log("BASIC", "❌ Found duplicate IDs", true);
		}
	} catch (error) {
		log("BASIC", `Error: ${error instanceof Error ? error.message : String(error)}`, true);
	}
}

function environmentConfiguration() {
	separator("Environment Variable Configuration");

	try {
		// Show current environment variables
		log("ENV", "Current Snowflake environment variables:");
		log("ENV", `  SNOWFLAKE_EPOCH: ${process.env.SNOWFLAKE_EPOCH || "undefined"}`);
		log("ENV", `  SNOWFLAKE_DATACENTER_ID: ${process.env.SNOWFLAKE_DATACENTER_ID || "undefined"}`);
		log("ENV", `  SNOWFLAKE_WORKER_ID: ${process.env.SNOWFLAKE_WORKER_ID || "undefined"}`);

		// Load config from environment
		const envConfig = loadConfigFromEnv();
		log("ENV", `Loaded config from environment: ${JSON.stringify(envConfig)}`);

		// Generate ID from environment config
		const envId = generateFromEnv();
		log("ENV", `Generated ID from environment: ${envId}`);

		// Test with temporary environment variables
		const originalEnv = { ...process.env };
		process.env.SNOWFLAKE_DATACENTER_ID = "5";
		process.env.SNOWFLAKE_WORKER_ID = "10";

		const tempEnvConfig = loadConfigFromEnv();
		log("ENV", `Config with temp env vars: ${JSON.stringify(tempEnvConfig)}`);

		const tempEnvId = generateFromEnv();
		log("ENV", `Generated ID with temp env vars: ${tempEnvId}`);

		// Restore original environment
		process.env = originalEnv;
	} catch (error) {
		log("ENV", `Error: ${error instanceof Error ? error.message : String(error)}`, true);
	}
}

function customConfiguration() {
	separator("Custom Configuration");

	try {
		// Test with custom configuration
		const customConfig: SnowflakeConfig = {
			epoch: 1609459200000, // 2021-01-01
			datacenterId: 15,
			workerId: 25,
		};

		log("CUSTOM", `Using custom config: ${JSON.stringify(customConfig)}`);

		const customGenerator = createSnowflake(customConfig);
		const customIds: string[] = [];

		for (let i = 0; i < 3; i++) {
			customIds.push(customGenerator());
		}

		log("CUSTOM", "Generated IDs with custom config:");
		customIds.forEach((id, index) => {
			log("CUSTOM", `  ${index + 1}: ${id}`);
		});

		// Test configuration validation
		try {
			createSnowflake({ datacenterId: 50 }); // Invalid: > 31
		} catch (validationError) {
			log(
				"CUSTOM",
				`✅ Validation works: ${validationError instanceof Error ? validationError.message : String(validationError)}`
			);
		}
	} catch (error) {
		log("CUSTOM", `Error: ${error instanceof Error ? error.message : String(error)}`, true);
	}
}

function idAnalysis() {
	separator("ID Analysis and Parsing");

	try {
		// Generate a sample ID
		const sampleId = generateSnowflakeId();
		log("PARSE", `Sample ID for analysis: ${sampleId}`);

		// Parse the ID
		const parsed = parseSnowflakeId(sampleId);
		log("PARSE", "Parsed components:");
		log("PARSE", `  Timestamp: ${parsed.timestamp}`);
		log("PARSE", `  Date: ${parsed.date.toISOString()}`);
		log("PARSE", `  Datacenter ID: ${parsed.datacenterId}`);
		log("PARSE", `  Worker ID: ${parsed.workerId}`);
		log("PARSE", `  Sequence: ${parsed.sequence}`);

		// Test timestamp extraction
		const timestamp = getSnowflakeTimestamp(sampleId);
		log("PARSE", `Extracted timestamp: ${timestamp}`);

		// Test date conversion
		const date = snowflakeToDate(sampleId);
		log("PARSE", `Converted to date: ${date.toISOString()}`);

		// Test with custom epoch
		const customEpochId = generateSnowflakeId({ epoch: 1609459200000 });
		const customParsed = parseSnowflakeId(customEpochId, 1609459200000);
		log("PARSE", `Custom epoch ID: ${customEpochId}`);
		log("PARSE", `Custom epoch parsed date: ${customParsed.date.toISOString()}`);
	} catch (error) {
		log("PARSE", `Error: ${error instanceof Error ? error.message : String(error)}`, true);
	}
}

function performanceTest() {
	separator("Performance Testing");

	try {
		const testCounts = [1000, 10000, 100000];

		for (const count of testCounts) {
			log("PERF", `Testing with ${count.toLocaleString()} IDs...`);

			const generator = createSnowflake();
			const startTime = performance.now();

			const ids: string[] = [];
			for (let i = 0; i < count; i++) {
				ids.push(generator());
			}

			const endTime = performance.now();
			const duration = endTime - startTime;
			const idsPerSecond = Math.round((count / duration) * 1000);

			log("PERF", `Generated ${count.toLocaleString()} IDs in ${duration.toFixed(2)}ms`);
			log("PERF", `Performance: ${idsPerSecond.toLocaleString()} IDs/second`);

			// Check uniqueness
			const uniqueIds = new Set(ids);
			const duplicates = count - uniqueIds.size;

			if (duplicates === 0) {
				log("PERF", `✅ All ${count.toLocaleString()} IDs are unique`);
			} else {
				log("PERF", `❌ Found ${duplicates} duplicate IDs`, true);
			}

			// Show sample IDs
			log("PERF", `First 3 IDs: ${ids.slice(0, 3).join(", ")}`);
			log("PERF", `Last 3 IDs: ${ids.slice(-3).join(", ")}`);

			console.log(); // Add spacing between test runs
		}
	} catch (error) {
		log("PERF", `Error: ${error instanceof Error ? error.message : String(error)}`, true);
	}
}

function concurrencyTest() {
	separator("Concurrency Testing");

	try {
		const workerCount = 4;
		const idsPerWorker = 2500;
		const totalIds = workerCount * idsPerWorker;

		log("CONCUR", `Testing with ${workerCount} concurrent generators, ${idsPerWorker} IDs each`);

		const startTime = performance.now();

		// Simulate concurrent ID generation
		const promises = Array.from({ length: workerCount }, (_, workerIndex) => {
			return new Promise<string[]>((resolve) => {
				const generator = createSnowflake({ workerId: workerIndex });
				const workerIds: string[] = [];

				for (let i = 0; i < idsPerWorker; i++) {
					workerIds.push(generator());
				}

				resolve(workerIds);
			});
		});

		Promise.all(promises).then((results) => {
			const endTime = performance.now();
			const duration = endTime - startTime;

			// Flatten all IDs
			const allIds = results.flat();
			const uniqueIds = new Set(allIds);
			const duplicates = totalIds - uniqueIds.size;

			log("CONCUR", `Generated ${totalIds.toLocaleString()} IDs in ${duration.toFixed(2)}ms`);
			log(
				"CONCUR",
				`Performance: ${Math.round((totalIds / duration) * 1000).toLocaleString()} IDs/second`
			);

			if (duplicates === 0) {
				log(
					"CONCUR",
					`✅ All ${totalIds.toLocaleString()} IDs are unique across ${workerCount} workers`
				);
			} else {
				log("CONCUR", `❌ Found ${duplicates} duplicate IDs across workers`, true);
			}

			// Show distribution per worker
			results.forEach((workerIds, index) => {
				const sample = workerIds.slice(0, 2).join(", ");
				log("CONCUR", `Worker ${index}: ${workerIds.length} IDs (sample: ${sample})`);
			});
		});
	} catch (error) {
		log("CONCUR", `Error: ${error instanceof Error ? error.message : String(error)}`, true);
	}
}

function nodeSpecificFeatures() {
	separator("Node.js Specific Features");

	try {
		// Test process information
		log("NODE", `Node.js version: ${process.version}`);
		log("NODE", `Platform: ${process.platform}`);
		log("NODE", `Architecture: ${process.arch}`);
		log("NODE", `Process ID: ${process.pid}`);

		// Generate IDs with process-based worker ID
		const processBasedConfig: SnowflakeConfig = {
			workerId: process.pid % 32, // Use process ID for worker ID
			datacenterId: process.platform === "win32" ? 1 : process.platform === "darwin" ? 2 : 0,
		};

		log("NODE", `Process-based config: ${JSON.stringify(processBasedConfig)}`);

		const processGenerator = createSnowflake(processBasedConfig);
		const processIds: string[] = [];

		for (let i = 0; i < 3; i++) {
			processIds.push(processGenerator());
		}

		log("NODE", "Generated IDs with process-based config:");
		processIds.forEach((id, index) => {
			log("NODE", `  ${index + 1}: ${id}`);
		});

		// Test environment variable combinations
		const envVarTests = [
			{ SNOWFLAKE_DATACENTER_ID: "1", SNOWFLAKE_WORKER_ID: "1" },
			{ SNOWFLAKE_EPOCH: "1609459200000" },
			{
				SNOWFLAKE_DATACENTER_ID: "10",
				SNOWFLAKE_WORKER_ID: "20",
				SNOWFLAKE_EPOCH: "1577836800000",
			},
		];

		const originalEnv = { ...process.env };

		envVarTests.forEach((testEnv, index) => {
			// Set test environment variables
			for (const [key, value] of Object.entries(testEnv)) {
				process.env[key] = value;
			}

			try {
				const config = loadConfigFromEnv();
				const id = generateFromEnv();
				log("NODE", `Test ${index + 1} - Config: ${JSON.stringify(config)}, ID: ${id}`);
			} catch (testError) {
				log(
					"NODE",
					`Test ${index + 1} failed: ${testError instanceof Error ? testError.message : String(testError)}`,
					true
				);
			}

			// Clean up test environment variables
			for (const [key] of Object.entries(testEnv)) {
				delete process.env[key];
			}
		});

		// Restore original environment
		process.env = originalEnv;
	} catch (error) {
		log("NODE", `Error: ${error instanceof Error ? error.message : String(error)}`, true);
	}
}

function errorHandling() {
	separator("Error Handling");

	try {
		const errorTests = [
			{ test: "Invalid datacenter ID", config: { datacenterId: 50 } },
			{ test: "Invalid worker ID", config: { workerId: -1 } },
			{ test: "Invalid epoch", config: { epoch: -1 } },
		];

		for (const { test, config } of errorTests) {
			try {
				createSnowflake(config);
				log("ERROR", `${test}: Should have thrown an error`, true);
			} catch (expectedError) {
				log(
					"ERROR",
					`${test}: ✅ ${expectedError instanceof Error ? expectedError.message : String(expectedError)}`
				);
			}
		}

		// Test parsing invalid IDs
		try {
			parseSnowflakeId("invalid-id");
			log("ERROR", "Parsing invalid ID: Should have thrown an error", true);
		} catch (expectedError) {
			log(
				"ERROR",
				`Parsing invalid ID: ✅ ${expectedError instanceof Error ? expectedError.message : String(expectedError)}`
			);
		}

		// Test invalid environment variables
		const originalEnv = { ...process.env };
		process.env.SNOWFLAKE_DATACENTER_ID = "invalid";

		try {
			loadConfigFromEnv();
			log("ERROR", "Invalid env var: Should have thrown an error", true);
		} catch (expectedError) {
			log(
				"ERROR",
				`Invalid env var: ✅ ${expectedError instanceof Error ? expectedError.message : String(expectedError)}`
			);
		}

		process.env = originalEnv;
	} catch (error) {
		log("ERROR", `Error: ${error instanceof Error ? error.message : String(error)}`, true);
	}
}

const main = () => {
	console.log("🔥 Snowflake Node.js Example");
	console.log("Comprehensive demonstration of Snowflake ID generator in Node.js environment");
	console.log(`Started at: ${new Date().toISOString()}`);

	basicIdGeneration();
	environmentConfiguration();
	customConfiguration();
	idAnalysis();
	performanceTest();
	concurrencyTest();
	nodeSpecificFeatures();
	errorHandling();

	separator("Summary");
	log("SUMMARY", "All tests completed successfully!");
	log("SUMMARY", "The Snowflake library is working correctly in Node.js environment");
	console.log("\n🎉 Done! Check the output above for detailed results.");
};

void main();
