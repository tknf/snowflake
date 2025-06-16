import { defineConfig } from "tsup";

export default defineConfig([
	// Main library (ESM/CJS)
	{
		entry: ["src/index.ts", "src/node.ts", "src/browser.ts"],
		format: ["esm", "cjs"],
		dts: true,
		clean: true,
		target: "es2020",
		platform: "neutral",
	},
	// Browser IIFE build
	{
		entry: {
			snowflake: "src/iife.ts",
		},
		outExtension: () => ({ js: ".min.js" }),
		format: ["iife"],
		globalName: "Snowflake",
		clean: false,
		target: "es2020",
		platform: "browser",
		outDir: "dist",
		minify: true,
	},
]);
