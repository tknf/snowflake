# Snowflake Browser Example

This example demonstrates how to use the Snowflake ID generator library in a modern browser environment using Vite and TypeScript. It showcases all browser-specific utilities including localStorage integration, browser fingerprinting, and performance optimization.

## Setup

1. Build the Snowflake library first (from the project root):
   ```bash
   pnpm run build
   ```
   This automatically copies the built files to `node_modules/@tknf/snowflake/dist/` for this example.

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Start the development server:
   ```bash
   pnpm run start
   ```

4. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

## Features Demonstrated

### Basic ID Generation
- Generate single Snowflake IDs
- Generate multiple IDs with the same generator
- Custom configuration with epoch, datacenter ID, and worker ID
- Real-time ID generation with validation

### Browser-Specific Features
- **Browser Fingerprinting**: Automatic datacenter/worker ID assignment based on browser characteristics
- **Consistent Configuration**: Same browser environment generates consistent worker/datacenter IDs
- **Device Information**: Display detailed browser and device information
- **Automatic Initialization**: Browser-specific configuration with optional persistence

### LocalStorage Integration
- Save and load configuration from localStorage
- Persistent configuration across browser sessions
- Fallback to browser fingerprinting when storage is empty
- Configuration validation and error handling
- Clear stored configuration utility

### ID Analysis and Parsing
- Parse Snowflake IDs into components (timestamp, datacenter, worker, sequence)
- Extract timestamps and convert to dates
- Support for custom epochs
- ID comparison and chronological sorting demonstration
- Visual representation of ID structure

### Performance Testing
- Generate large numbers of IDs (1K-100K)
- Measure generation performance in IDs/second
- Verify uniqueness at scale
- Benchmark different configurations
- Memory usage analysis
- Garbage collection pressure testing

### Advanced Features
- **Tabbed Interface**: Organized feature demonstration
- **Real-time Statistics**: Performance metrics display
- **Memory Monitoring**: Browser memory usage tracking (Chrome)
- **Error Handling**: Comprehensive error reporting
- **Keyboard Shortcuts**: Quick access to common operations

## Technology Stack

- **Vite**: Fast development server and build tool
- **TypeScript**: Type-safe development with full intellisense
- **ES Modules**: Modern JavaScript module system
- **Browser APIs**: localStorage, performance.memory, navigator APIs

## Browser Compatibility

Modern browsers with ES2020 support:
- Chrome 80+
- Firefox 74+
- Safari 13.1+
- Edge 80+

Requirements:
- BigInt support
- ES2020 features
- Performance API
- localStorage (optional, with graceful fallback)

## Performance Expectations

On a typical modern machine:
- **1,000 IDs**: ~1-2ms
- **10,000 IDs**: ~5-15ms
- **100,000 IDs**: ~50-150ms
- **Performance**: 500K-2M IDs/second

Memory usage is minimal with automatic garbage collection.

## Development Features

### Hot Module Replacement
Vite provides instant updates during development without page refresh.

### TypeScript Integration
Full type safety with the Snowflake library types.

### Source Maps
Debug support with original TypeScript source mapping.

### Build Optimization
Production builds are optimized and tree-shaken.

## Example Usage

The example demonstrates all major browser patterns:

```typescript
import { 
  createSnowflakeFromStorage,
  initializeBrowserConfig,
  getBrowserFingerprint 
} from '@tknf/snowflake/browser';

// Initialize browser-specific configuration
const config = initializeBrowserConfig({ 
  save: true,
  config: { epoch: 1577836800000 }
});

// Create generator with storage + fingerprint fallback
const generator = createSnowflakeFromStorage();

// Generate IDs
const id1 = generator();
const id2 = generator();

// Get browser fingerprint for debugging
const fingerprint = getBrowserFingerprint();
console.log('Browser fingerprint:', fingerprint);
```

## Available Scripts

```bash
# Development server with hot reload
pnpm run dev

# Production build
pnpm run build

# Preview production build
pnpm run preview

# Start development server (alias for dev)
pnpm run start
```

## Browser-Specific Utilities

### Automatic Configuration
- Browser fingerprinting for consistent worker/datacenter IDs
- Timezone-based datacenter assignment
- Hardware characteristics for worker ID generation

### Storage Management
- localStorage persistence with validation
- Graceful fallback when storage is unavailable
- Configuration migration and cleanup utilities

### Performance Optimization
- Efficient ID generation without blocking the UI
- Memory-conscious implementation
- Garbage collection friendly

## Integration

To integrate this pattern in your application:

```typescript
// App initialization
import { initializeBrowserConfig } from '@tknf/snowflake/browser';

const config = initializeBrowserConfig({ save: true });

// In your components
import { generateFromStorage } from '@tknf/snowflake/browser';

function createRecord() {
  const id = generateFromStorage();
  // Use the ID in your application
  return { id, ...recordData };
}
```

## Troubleshooting

### Common Issues

1. **Module Resolution**: Ensure proper import paths for browser utilities
2. **Storage Errors**: localStorage may be disabled in private/incognito mode
3. **Performance**: Large ID generation may block the UI thread
4. **Memory**: Monitor memory usage when generating many IDs

### Debug Information

The example provides extensive debug information:
- Browser fingerprint details
- Configuration sources and values
- Performance metrics and timing
- Memory usage statistics

## Requirements

- Node.js 18+ (for development)
- Modern browser with ES2020 support
- Vite 5.0+
- TypeScript 5.8+
- Built Snowflake library (automatically copied during build)
