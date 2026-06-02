import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite-plus";

// Copy the built library into the examples that consume it via node_modules
const copyToPackageExamples = () => {
	const examples = ["examples/browser", "examples/node"];
	const jsFiles = readdirSync("dist").filter((file) => file.endsWith(".js"));
	const dtsFiles = readdirSync("dist").filter((file) => file.endsWith(".d.ts"));

	for (const example of examples) {
		const nodeModulesDir = resolve(example, "node_modules/@tknf/snowflake");
		const destDir = resolve(nodeModulesDir, "dist");
		if (!existsSync(destDir)) {
			mkdirSync(destDir, { recursive: true });
		}
		for (const file of [...jsFiles, ...dtsFiles]) {
			copyFileSync(resolve("dist", file), resolve(destDir, file));
		}
		copyFileSync("package.json", resolve(nodeModulesDir, "package.json"));
	}
};

// Copy the minified IIFE bundle into the examples that load it via <script>
const copyToIifeExamples = () => {
	const iifeExamples = ["examples/iife", "examples/worker"];
	const srcFile = "dist/snowflake.min.js";
	if (!existsSync(srcFile)) {
		return;
	}
	for (const example of iifeExamples) {
		copyFileSync(srcFile, resolve(example, "snowflake.min.js"));
	}
};

export default defineConfig({
	// Pre-commit hook (vp staged) auto-fixes staged files
	staged: {
		"*": "vp check --fix",
	},
	// Follow the previous Biome style to minimize reformatting churn.
	// Biome only formatted JS/TS (JSON disabled, no MD/HTML), so restrict oxfmt the same way.
	fmt: {
		useTabs: true,
		tabWidth: 2,
		printWidth: 100,
		singleQuote: false,
		semi: true,
		trailingComma: "es5",
		ignorePatterns: [
			"**/*.md",
			"**/*.mdx",
			"**/*.html",
			"**/*.json",
			"**/*.jsonc",
			"**/*.json5",
			"**/*.yaml",
			"**/*.yml",
			"**/*.css",
			"**/*.toml",
			"dist/**",
			"coverage/**",
			"examples/**/snowflake.min.js",
			"examples/**/node_modules/**",
		],
	},
	lint: {
		ignorePatterns: ["dist/**", "coverage/**", "examples/**"],
		jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
		rules: { "vite-plus/prefer-vite-plus-imports": "error" },
		options: { typeAware: true, typeCheck: true },
	},
	test: {
		coverage: {
			provider: "v8",
			reporter: ["text", "html"],
			include: ["src/**/*.ts"],
			exclude: ["src/iife.ts", "src/**/*.test.ts"],
			thresholds: {
				lines: 100,
				functions: 100,
				branches: 100,
				statements: 100,
			},
		},
	},
	pack: [
		// Main library (ESM/CJS) + type declarations
		{
			entry: ["src/index.ts", "src/node.ts", "src/browser.ts"],
			format: ["esm", "cjs"],
			dts: true,
			clean: true,
			platform: "neutral",
			hooks: {
				"build:done": () => copyToPackageExamples(),
			},
		},
		// Browser IIFE build (minified, global `Snowflake`)
		{
			entry: { snowflake: "src/iife.ts" },
			format: ["iife"],
			platform: "browser",
			minify: true,
			clean: false,
			outputOptions: { name: "Snowflake", entryFileNames: "snowflake.min.js" },
			hooks: {
				"build:done": () => copyToIifeExamples(),
			},
		},
	],
});
