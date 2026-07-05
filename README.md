<div align="center">
  <img src="https://raw.githubusercontent.com/tknf/snowflake/main/docs/snowflake.png" alt="Snowflake Logo" width="250" height="auto">
  <h1>@tknf/snowflake</h1>
  <p>A zero-dependency TypeScript library for generating sortable unique IDs for distributed systems</p>
</div>

<hr />

[![Github Workflow Status](https://img.shields.io/github/actions/workflow/status/tknf/snowflake/ci.yaml?branch=main)](https://github.com/tknf/snowflake/actions)
[![Github](https://img.shields.io/github/license/tknf/snowflake)](https://github.com/tknf/snowflake/blob/main/LICENSE)
[![npm](https://img.shields.io/npm/v/@tknf/snowflake)](https://www.npmjs.com/package/@tknf/snowflake)
[![npm bundle size](https://img.shields.io/bundlephobia/min/@tknf/snowflake)](https://bundlephobia.com/package/@tknf/snowflake)
[![npm bundle size](https://img.shields.io/bundlephobia/minzip/@tknf/snowflake)](https://bundlephobia.com/package/@tknf/snowflake)
[![Github commit activity](https://img.shields.io/github/commit-activity/m/tknf/snowflake)](https://github.com/tknf/snowflake/pulse)
[![GitHub last commit](https://img.shields.io/github/last-commit/tknf/snowflake)](https://github.com/tknf/snowflake/commits/main)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/tknf/snowflake)

## ✨ Features

- **Multi-platform Support**: Works in browsers, Node.js, Service Workers, and Edge Workers (Cloudflare Workers, etc.)
- **Edge Mode (Entropy)**: Optional `mode: 'edge'` generates IDs with cryptographic randomness — no worker-id assignment needed for serverless/edge runtimes
- **Zero Dependencies**: Lightweight with no external dependencies
- **Functional Style**: Pure functions without classes
- **Time-sortable**: IDs are chronologically sortable
- **High Performance**: Fast ID generation with built-in sequence handling
- **TypeScript**: Full type support with comprehensive type definitions
- **Service Worker Support**: Generate IDs in background contexts without blocking the main thread

## 📦 Installation

```bash
npm install @tknf/snowflake
```

## 🚀 Quick Start

### Basic Usage

```typescript
import { createSnowflake, generateSnowflakeId } from '@tknf/snowflake';

// Create a generator function
const generateId = createSnowflake();
const id1 = generateId(); // "1234567890123456789"
const id2 = generateId(); // "1234567890123456790"

// Or generate a single ID
const id = generateSnowflakeId(); // "1234567890123456791"
```

### Custom Configuration

```typescript
import { createSnowflake } from '@tknf/snowflake';

const generateId = createSnowflake({
  epoch: 1640995200000,     // Custom epoch (2022-01-01)
  datacenterId: 1,          // Datacenter ID (0-31)
  workerId: 5               // Worker ID (0-31)
});

const id = generateId();
```

### Edge Mode (Entropy)

For serverless / edge runtimes (e.g. Cloudflare Workers) where you **cannot assign a stable
`workerId`** to each ephemeral isolate, use `mode: 'edge'`. Instead of an assigned
`(datacenterId, workerId)` + sequence, the 22 non-timestamp bits are filled with
**cryptographic randomness** (`crypto.getRandomValues`). This removes the need for any
worker-id assignment and ensures uniqueness **probabilistically** via "timestamp + 22-bit entropy".

```typescript
import { createSnowflake } from '@tknf/snowflake';

// No datacenterId / workerId required
const generateId = createSnowflake({ mode: 'edge', epoch: 1640995200000 });
const id = generateId(); // "1843927461029384756" (numeric string, chronologically sortable)
```

- `mode` defaults to `'default'` (the existing assigned worker-id behavior). `'edge'` is opt-in.
- In edge mode `datacenterId` / `workerId` are **ignored** (even if provided).
- The output is unchanged: a numeric string that fits a 63-bit positive integer (storable in a
  SQLite / Turso `INTEGER` column) and remains chronologically sortable at millisecond granularity.

> **Uniqueness is probabilistic.** 22 bits = 4,194,304 possibilities per millisecond. When
> generating `k` IDs within the same millisecond the collision probability (birthday bound) is
> approximately `k² / (2·2²²)` (e.g. ~0.12% at 100 IDs/ms). Because of this, consumers **should add
> a DB `UNIQUE` constraint and retry-on-collision as a backstop** so that even a theoretical
> collision causes no actual harm.

#### Clock-backwards behavior

- **`default` mode**: if the system clock moves backwards, `createSnowflake()` **throws** an
  error (`"Clock moved backwards. Refusing to generate id"`) to avoid emitting a duplicate or
  out-of-order ID.
- **`edge` mode**: clock-backwards is **not** checked, and generation **continues** regardless.
  This is intentional — edge mode's whole purpose is to keep working in ephemeral/serverless
  environments without throwing, and the 22 bits of entropy already make the resulting
  collision risk negligible.

Approximate collision probability for `n` IDs generated within the same millisecond in edge
mode (birthday approximation, `p ≈ n² / 2²³`):

| IDs per millisecond | Collision probability |
| -------------------- | ---------------------- |
| 10                    | ~0.001%                |
| 100                   | ~0.12%                 |
| 1,000                 | ~11%                   |

If you need to generate a large volume of IDs from a single long-lived process, prefer
`default` mode (with an assigned `datacenterId` / `workerId`), which avoids this probabilistic
risk entirely. A monotonic edge mode that restores clock-backwards safety without requiring a
stable worker id is planned (see [#17](https://github.com/tknf/snowflake/issues/17)).

### Node.js Environment Variables

```typescript
// src/node.ts - Node.js specific utilities
import { createSnowflakeFromEnv, generateFromEnv } from '@tknf/snowflake/node';

// Set environment variables
process.env.SNOWFLAKE_EPOCH = '1640995200000';
process.env.SNOWFLAKE_DATACENTER_ID = '1';
process.env.SNOWFLAKE_WORKER_ID = '5';

// Create generator from environment
const generateId = createSnowflakeFromEnv();
const id1 = generateId();

// Or generate single ID from environment
const id2 = generateFromEnv();

// Override environment with custom config
const id3 = generateFromEnv({ workerId: 10 });
```

### Browser Usage

```typescript
// src/browser.ts - Browser specific utilities
import { 
  createSnowflakeFromStorage, 
  generateFromStorage,
  initializeBrowserConfig,
  saveConfigToStorage 
} from '@tknf/snowflake/browser';

// Initialize browser-specific config (auto-generated from browser characteristics)
const config = initializeBrowserConfig({ 
  save: true, // Save to localStorage
  config: { epoch: 1640995200000 } // Optional custom config
});

// Create generator using localStorage + browser fingerprint
const generateId = createSnowflakeFromStorage();
const id1 = generateId();

// Or generate single ID from storage
const id2 = generateFromStorage();

// Manual config management
saveConfigToStorage({ datacenterId: 5, workerId: 10 });
const id3 = generateFromStorage();
```

## 📚 API Reference

### Core Functions

#### `createSnowflake(config?)`

Creates a Snowflake ID generator function.

**Parameters:**
- `config` (optional): Configuration object
  - `epoch` (number): Custom epoch timestamp in milliseconds (default: 2020-01-01)
  - `datacenterId` (number): Datacenter ID (0-31, default: 0). Ignored when `mode` is `'edge'`.
  - `workerId` (number): Worker ID (0-31, default: 0). Ignored when `mode` is `'edge'`.
  - `mode` (`'default' | 'edge'`): Generation mode (default: `'default'`). See [Edge Mode (Entropy)](#edge-mode-entropy).

**Returns:** Function that generates Snowflake IDs as strings

```typescript
const generator = createSnowflake({
  epoch: 1577836800000,
  datacenterId: 1,
  workerId: 2
});

const id = generator(); // "1234567890123456789"
```

#### `generateSnowflakeId(config?)`

Generates a single Snowflake ID.

**Parameters:**
- `config` (optional): Same as `createSnowflake`

**Returns:** Snowflake ID as string

```typescript
const id = generateSnowflakeId({
  datacenterId: 1,
  workerId: 2
});
```

#### `parseSnowflakeId(id, epoch?, mode?)`

Parses a Snowflake ID into its components.

**Parameters:**
- `id` (string): Snowflake ID to parse
- `epoch` (number, optional): Epoch used for generation (default: 2020-01-01)
- `mode` (`'default' | 'edge'`, optional): Mode the ID was generated with (default: `'default'`). Edge IDs are bit-indistinguishable from default IDs, so you must pass the mode you generated with.

**Returns (default mode):** Object containing:
- `timestamp` (number): Generation timestamp
- `datacenterId` (number): Datacenter ID
- `workerId` (number): Worker ID
- `sequence` (number): Sequence number
- `entropy` (null): Always `null` in default mode
- `date` (Date): Generation date

**Returns (edge mode):** In edge mode the non-timestamp bits are random, so the worker fields are
**meaningless**. They are returned as `null` and the raw 22-bit value is returned as `entropy`:
- `timestamp` (number): Generation timestamp
- `datacenterId` / `workerId` / `sequence` (null): Not meaningful in edge mode
- `entropy` (number): The 22-bit random value (0–4,194,303)
- `date` (Date): Generation date

```typescript
// default mode
const parsed = parseSnowflakeId("1234567890123456789");
// { timestamp: 1640995200123, datacenterId: 1, workerId: 2, sequence: 0, entropy: null, date: ... }

// edge mode
const edgeParsed = parseSnowflakeId("1843927461029384756", 1640995200000, "edge");
// { timestamp: ..., datacenterId: null, workerId: null, sequence: null, entropy: 4194301, date: ... }
```

> `getSnowflakeTimestamp` and `snowflakeToDate` read only the timestamp bits, so they work
> identically for both default and edge IDs (no `mode` argument needed).

#### `getSnowflakeTimestamp(id, epoch?)`

Extracts timestamp from a Snowflake ID.

**Parameters:**
- `id` (string): Snowflake ID
- `epoch` (number, optional): Epoch used for generation

**Returns:** Timestamp in milliseconds

```typescript
const timestamp = getSnowflakeTimestamp("1234567890123456789");
console.log(timestamp); // 1640995200123
```

#### `snowflakeToDate(id, epoch?)`

Converts a Snowflake ID to a Date object.

**Parameters:**
- `id` (string): Snowflake ID
- `epoch` (number, optional): Epoch used for generation

**Returns:** Date object

```typescript
const date = snowflakeToDate("1234567890123456789");
console.log(date); // 2022-01-01T00:00:00.123Z
```

### Node.js Utilities

Import from `@tknf/snowflake/node` for Node.js-specific features:

#### Environment Variables

- `SNOWFLAKE_EPOCH`: Custom epoch timestamp
- `SNOWFLAKE_DATACENTER_ID`: Datacenter ID (0-31)
- `SNOWFLAKE_WORKER_ID`: Worker ID (0-31)

#### `loadConfigFromEnv()`

Loads configuration from environment variables.

```typescript
const config = loadConfigFromEnv();
// Returns SnowflakeConfig object based on environment variables
```

#### `createSnowflakeFromEnv(overrides?)`

Creates a generator with environment configuration.

```typescript
const generator = createSnowflakeFromEnv({ workerId: 5 });
```

#### `generateFromEnv(overrides?)`

Generates a single ID with environment configuration.

```typescript
const id = generateFromEnv({ datacenterId: 2 });
```

### Browser Utilities

Import from `@tknf/snowflake/browser` for browser-specific features:

> Fingerprint-derived IDs (datacenter/worker) can collide across multiple tabs of the
> same browser or environments with identical characteristics, since sequence state is
> independent per tab. If you generate IDs from multiple concurrent contexts, prefer
> `mode: 'edge'` instead. See [Edge Mode (Entropy)](#edge-mode-entropy).

#### LocalStorage Keys

- `snowflake.epoch`: Custom epoch timestamp
- `snowflake.datacenterId`: Datacenter ID (0-31)
- `snowflake.workerId`: Worker ID (0-31)

#### `generateBrowserConfig()`

Generates browser-specific configuration based on browser characteristics (user agent, timezone, screen properties, etc.).

```typescript
const config = generateBrowserConfig();
// Returns consistent config for the same browser environment
```

#### `loadConfigFromStorage()`

Loads configuration from localStorage.

```typescript
const config = loadConfigFromStorage();
// Returns SnowflakeConfig object from localStorage
```

#### `saveConfigToStorage(config)`

Saves configuration to localStorage.

```typescript
saveConfigToStorage({ datacenterId: 5, workerId: 10 });
```

#### `createSnowflakeFromStorage(overrides?)`

Creates a generator with localStorage configuration and browser fingerprinting fallback.

```typescript
const generator = createSnowflakeFromStorage({ epoch: 1640995200000 });
```

#### `generateFromStorage(overrides?)`

Generates a single ID with localStorage configuration.

```typescript
const id = generateFromStorage({ workerId: 15 });
```

#### `initializeBrowserConfig(options?)`

Initializes browser-specific configuration with optional localStorage persistence.

**Parameters:**
- `options.save` (boolean): Whether to save to localStorage (default: false)
- `options.config` (SnowflakeConfig): Custom configuration to merge

```typescript
const config = initializeBrowserConfig({
  save: true,
  config: { epoch: 1640995200000 }
});
```

#### `clearStoredConfig()`

Clears all stored configuration from localStorage.

```typescript
clearStoredConfig();
```

#### `getBrowserFingerprint()`

Gets detailed browser fingerprint for debugging purposes.

```typescript
const fingerprint = getBrowserFingerprint();
// Returns object with datacenterId, workerId, timezone, userAgent, screen info, etc.
```

## ID Format

Snowflake IDs are 64-bit integers composed of:

```
 1 bit   |  41 bits  |  5 bits   |  5 bits  | 12 bits
unused   | timestamp | datacenter| worker   | sequence
```

- **Timestamp (41 bits)**: Milliseconds since custom epoch
- **Datacenter ID (5 bits)**: Identifies the datacenter (0-31)
- **Worker ID (5 bits)**: Identifies the worker process (0-31)  
- **Sequence (12 bits)**: Counter for same-millisecond generation (0-4095)

In **edge mode** (`mode: 'edge'`), the `datacenter | worker | sequence` block is replaced by 22 bits
of cryptographic randomness:

```
 1 bit   |  41 bits  |        22 bits
unused   | timestamp |   random entropy (crypto)
  0      |  ms-epoch |   getRandomValues
```

- **Timestamp (41 bits)**: Milliseconds since custom epoch (same position as default mode)
- **Entropy (22 bits)**: `crypto.getRandomValues` (0-4,194,303)

## 💡 Examples

### High-Frequency Generation

```typescript
const generator = createSnowflake({ workerId: 1 });

// Generate 1000 IDs quickly
const ids = [];
for (let i = 0; i < 1000; i++) {
  ids.push(generator());
}

// All IDs are unique and sortable
console.log(ids.length === new Set(ids).size); // true
```

### Multiple Workers

```typescript
const worker1 = createSnowflake({ workerId: 1 });
const worker2 = createSnowflake({ workerId: 2 });

const id1 = worker1(); // From worker 1
const id2 = worker2(); // From worker 2

// IDs from different workers are still unique
console.log(id1 !== id2); // true
```

### Browser Application

```typescript
// React/Vue/etc. application
import { initializeBrowserConfig, createSnowflakeFromStorage } from '@tknf/snowflake/browser';

// Initialize on app startup
const config = initializeBrowserConfig({ 
  save: true, // Persist across browser sessions
  config: { epoch: 1640995200000 }
});

const generator = createSnowflakeFromStorage();

// Use in your app
function createNewRecord() {
  const id = generator();
  console.log('New record ID:', id);
  return id;
}
```

### Service Workers

```typescript
// Service Worker example
// sw.js
importScripts('https://unpkg.com/@tknf/snowflake/dist/snowflake.min.js');

self.addEventListener('message', (event) => {
  if (event.data.type === 'GENERATE_ID') {
    const generator = Snowflake.createSnowflake({
      datacenterId: 1,
      workerId: 5
    });
    
    const id = generator();
    
    // Send back to main thread
    self.clients.matchAll().then(clients => {
      for (const client of clients) {
        client.postMessage({
          type: 'ID_GENERATED',
          data: { id }
        });
      }
    });
  }
});

// Main thread
navigator.serviceWorker.controller.postMessage({
  type: 'GENERATE_ID'
});
```

### Cloudflare Workers (Edge Mode)

In Workers your code runs across many ephemeral isolates, so you cannot assign a stable `workerId`
(reading `env.WORKER_ID` gives every isolate the same value, which risks collisions). Use
`mode: 'edge'` so uniqueness comes from cryptographic entropy instead of an assigned worker number:

```typescript
import { createSnowflake } from '@tknf/snowflake';

const generator = createSnowflake({ mode: 'edge', epoch: 1640995200000 });

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const id = generator();

    return new Response(JSON.stringify({ id }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
```

> Edge mode is probabilistic — pair it with a DB `UNIQUE` constraint and retry-on-collision
> (e.g. when using a single-writer Turso/SQLite). See [Edge Mode (Entropy)](#edge-mode-entropy).

### Browser Fingerprinting

```typescript
import { getBrowserFingerprint, generateBrowserConfig } from '@tknf/snowflake/browser';

// Get detailed browser information
const fingerprint = getBrowserFingerprint();
console.log('Browser fingerprint:', fingerprint);

// Consistent config for same browser
const config1 = generateBrowserConfig();
const config2 = generateBrowserConfig();
console.log(config1.workerId === config2.workerId); // true - same browser = same workerId
```

## Example Usage

The library includes comprehensive examples for different environments:

- **`examples/iife/`**: IIFE browser example with localStorage integration
- **`examples/node/`**: Node.js example with environment variables
- **`examples/worker/`**: Service Worker example with background generation

Each example includes:
- Complete working code
- Performance testing
- Error handling
- Detailed README with setup instructions

### Running Examples

```bash
# IIFE Browser Example
cd examples/iife
pnpm install
pnpm run start

# Node.js Example  
cd examples/node
pnpm install
pnpm run start

# Service Worker Example
cd examples/worker
pnpm install
pnpm run start
```

## 🛠️ Development

This project uses [Vite+](https://viteplus.dev) as its unified toolchain — bundling with tsdown, linting with Oxlint, formatting with Oxfmt, and testing with Vitest, all driven by the `vp` CLI.

### Setup

```bash
git clone git@github.com:tknf/snowflake.git
cd snowflake
vp install
```

### Commands

```bash
# Build the library
vp pack

# Run tests
vp test run

# Run tests with coverage
vp test run --coverage

# Format + lint + type-check in one pass
vp check

# Lint only / format only
vp lint
vp fmt
```

### Project Structure

```
src/
├── index.ts         # Core Snowflake logic (platform-agnostic)
├── node.ts          # Node.js-specific utilities
├── browser.ts       # Browser-specific utilities
├── iife.ts          # IIFE build for browser usage
├── index.test.ts    # Core functionality tests
├── node.test.ts     # Node.js utilities tests
└── browser.test.ts  # Browser utilities tests

examples/
├── iife/            # IIFE browser example
├── node/            # Node.js example
└── worker/          # Service Worker example
```

## 🔧 Requirements

- **Runtime**: No runtime dependencies
- **Development**: Node.js 18+ for building and testing
- **TypeScript**: Full type support included

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Ensure checks pass: `vp check`
5. Ensure tests pass: `vp test`
6. Submit a pull request

## 🙏 Acknowledgments

This implementation follows the distributed ID generation pattern, designed for high-performance unique ID generation in distributed systems.
