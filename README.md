# @tknf/snowflake

A zero-dependency TypeScript library for generating sortable unique IDs for distributed systems.

## Features

- **Multi-platform Support**: Works in browsers, Node.js, Service Workers, and Edge Workers (Cloudflare Workers, etc.)
- **Zero Dependencies**: Lightweight with no external dependencies
- **Functional Style**: Pure functions without classes
- **Time-sortable**: IDs are chronologically sortable
- **High Performance**: Fast ID generation with built-in sequence handling
- **TypeScript**: Full type support with comprehensive type definitions
- **Service Worker Support**: Generate IDs in background contexts without blocking the main thread

## Installation

```bash
npm install @tknf/snowflake
```

## Quick Start

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

## API Reference

### Core Functions

#### `createSnowflake(config?)`

Creates a Snowflake ID generator function.

**Parameters:**
- `config` (optional): Configuration object
  - `epoch` (number): Custom epoch timestamp in milliseconds (default: 2020-01-01)
  - `datacenterId` (number): Datacenter ID (0-31, default: 0)
  - `workerId` (number): Worker ID (0-31, default: 0)

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

#### `parseSnowflakeId(id, epoch?)`

Parses a Snowflake ID into its components.

**Parameters:**
- `id` (string): Snowflake ID to parse
- `epoch` (number, optional): Epoch used for generation (default: 2020-01-01)

**Returns:** Object containing:
- `timestamp` (number): Generation timestamp
- `datacenterId` (number): Datacenter ID
- `workerId` (number): Worker ID
- `sequence` (number): Sequence number
- `date` (Date): Generation date

```typescript
const parsed = parseSnowflakeId("1234567890123456789");
console.log(parsed);
// {
//   timestamp: 1640995200123,
//   datacenterId: 1,
//   workerId: 2,
//   sequence: 0,
//   date: 2022-01-01T00:00:00.123Z
// }
```

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

## Examples

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

### Cloudflare Workers

```typescript
// Cloudflare Worker example
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const generator = createSnowflake({
      datacenterId: 1,
      workerId: parseInt(env.WORKER_ID) || 0
    });
    
    const id = generator();
    
    return new Response(JSON.stringify({ id }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
```

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

## Examples

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

## Development

### Setup

```bash
git clone git@github.com:tknf/snowflake.git
cd snowflake
pnpm install
```

### Scripts

```bash
# Build the library
pnpm run build

# Run tests
pnpm run test

# Run tests with coverage
pnpm run test:coverage

# Lint code
pnpm run lint

# Format code
pnpm run format

# Type check
pnpm run typecheck
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

## Requirements

- **Runtime**: No runtime dependencies
- **Development**: Node.js 18+ for building and testing
- **TypeScript**: Full type support included

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Ensure tests pass: `pnpm run test`
5. Ensure linting passes: `pnpm run lint`
6. Submit a pull request

## Acknowledgments

This implementation follows the distributed ID generation pattern, designed for high-performance unique ID generation in distributed systems.
