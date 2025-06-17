# Snowflake Node.js Example

This example demonstrates how to use the Snowflake ID generator library in a Node.js environment with comprehensive testing of all available features.

## Setup

1. Build the Snowflake library first (from the project root):
   ```bash
   pnpm run build
   ```
   This automatically copies the built files to `node_modules/@tknf/snowflake/dist/` for this example.

2. Run the example:
   ```bash
   npx tsx main.ts
   ```

## Features Demonstrated

### Basic ID Generation
- Generate single Snowflake IDs
- Generate multiple IDs with the same generator
- Verify ID uniqueness
- Basic error handling

### Environment Variable Configuration
- Load configuration from environment variables
- Support for `SNOWFLAKE_EPOCH`, `SNOWFLAKE_DATACENTER_ID`, `SNOWFLAKE_WORKER_ID`
- Dynamic environment variable testing
- Configuration validation

### Custom Configuration
- Set custom epoch, datacenter ID, and worker ID
- Configuration validation testing
- Error handling for invalid configurations

### ID Analysis and Parsing
- Parse Snowflake IDs into components
- Extract timestamps from IDs
- Convert IDs to dates
- Support for custom epochs

### Performance Testing
- Generate large numbers of IDs (1K, 10K, 100K)
- Measure generation performance
- Verify ID uniqueness at scale
- Performance metrics and reporting

### Concurrency Testing
- Simulate multiple concurrent generators
- Test with different worker IDs
- Verify uniqueness across concurrent workers
- Performance testing under load

### Node.js Specific Features
- Process-based worker ID generation
- Platform-specific datacenter ID assignment
- Environment variable testing scenarios
- Process information logging

### Error Handling
- Configuration validation
- Invalid ID parsing
- Environment variable validation
- Comprehensive error testing

## Environment Variables

The library supports the following environment variables:

```bash
# Custom epoch timestamp (milliseconds)
export SNOWFLAKE_EPOCH=1577836800000

# Datacenter ID (0-31)
export SNOWFLAKE_DATACENTER_ID=5

# Worker ID (0-31)
export SNOWFLAKE_WORKER_ID=10
```

## Example Usage

```typescript
import { createSnowflake, generateSnowflakeId } from "@tknf/snowflake";
import { loadConfigFromEnv, generateFromEnv } from "@tknf/snowflake/node";

// Basic usage
const id = generateSnowflakeId();

// Using environment configuration
const envId = generateFromEnv();

// Custom configuration
const generator = createSnowflake({
  epoch: 1609459200000, // 2021-01-01
  datacenterId: 1,
  workerId: 1
});
const customId = generator();
```

## Performance Expectations

On a typical modern machine, you can expect:
- **1,000 IDs**: ~1-2ms
- **10,000 IDs**: ~5-10ms  
- **100,000 IDs**: ~50-100ms
- **Performance**: 1-2 million IDs/second

## Output Format

The example provides structured logging with timestamps and categories:
```
[2024-06-17T10:00:00.000Z] ✅ [BASIC] Generated single ID: 1234567890123456789
[2024-06-17T10:00:00.001Z] ✅ [PERF] Generated 10,000 IDs in 5.23ms
[2024-06-17T10:00:00.002Z] ✅ [PERF] Performance: 1,912,046 IDs/second
```

## Testing Scenarios

The example includes comprehensive testing for:
- Single and batch ID generation
- Environment variable configuration
- Custom configuration validation
- ID parsing and analysis
- Performance under different loads
- Concurrent generation scenarios
- Error conditions and edge cases

## Requirements

- Node.js 18+ (for ES modules and performance.now())
- TypeScript support via tsx
- Built Snowflake library (automatically copied during build)
