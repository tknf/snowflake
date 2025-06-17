import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
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
		onSuccess: async () => {
			// Copy built files to all examples directories
			const examples = ["examples/browser", "examples/node"];
			const jsFiles = readdirSync("dist").filter((file) => file.endsWith(".js"));
			const dtsFiles = readdirSync("dist").filter((file) => file.endsWith(".d.ts"));

			for (const example of examples) {
				const nodeModulesDir = resolve(example, "node_modules/@tknf/snowflake");
				if (!existsSync(nodeModulesDir)) {
					mkdirSync(nodeModulesDir, { recursive: true });
				}
				const destDir = resolve(nodeModulesDir, "dist");
				if (!existsSync(destDir)) {
					mkdirSync(destDir, { recursive: true });
				}
				for (const file of jsFiles) {
					const srcPath = resolve("dist", file);
					const destPath = resolve(destDir, file);
					copyFileSync(srcPath, destPath);
				}
				for (const file of dtsFiles) {
					const srcPath = resolve("dist", file);
					const destPath = resolve(destDir, file);
					copyFileSync(srcPath, destPath);
				}
				copyFileSync("package.json", resolve(nodeModulesDir, "package.json"));
			}
		},
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
		onSuccess: async () => {
			// Copy IIFE build to all examples that need it
			const iifeExamples = ["examples/iife", "examples/worker"];

			for (const example of iifeExamples) {
				const srcFile = "dist/snowflake.min.js";
				const destFile = resolve(example, "snowflake.min.js");

				if (existsSync(srcFile)) {
					copyFileSync(srcFile, destFile);
				}
			}
		},
	},
]);
