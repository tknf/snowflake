# Snowflake IIFE Example

This example demonstrates how to use the Snowflake ID generator library in a browser environment using the IIFE (Immediately Invoked Function Expression) build.

## Setup

1. Build the Snowflake library first (from the project root):
   ```bash
   pnpm run build
   ```
   This automatically copies the IIFE build (`snowflake.min.js`) to this example directory.

2. Serve the example directory:
   ```bash
   npx serve
   ```

3. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

## Features Demonstrated

### Basic ID Generation
- Generate single Snowflake IDs
- Generate multiple IDs at once
- Real-time ID generation

### Browser Configuration
- Display browser fingerprint information
- Generate IDs using browser-specific configuration
- Automatic datacenter/worker ID assignment based on browser characteristics

### LocalStorage Integration
- Save configuration to localStorage
- Load configuration from localStorage
- Clear stored configuration
- Generate IDs using stored configuration

### Custom Configuration
- Set custom epoch, datacenter ID, and worker ID
- Generate IDs with custom parameters
- Configuration validation

### ID Analysis
- Parse Snowflake IDs into components
- Extract timestamps from IDs
- Convert IDs to dates
- Support for custom epochs

### Performance Testing
- Generate large numbers of IDs
- Measure generation performance
- Verify ID uniqueness
- Performance metrics display

## Browser Compatibility

The IIFE build works in all modern browsers that support:
- ES2020 features
- BigInt
- localStorage (optional)
- Performance API (for timing)

## Usage Notes

- The library automatically detects browser capabilities
- Falls back gracefully when localStorage is unavailable
- Uses browser fingerprinting for automatic worker/datacenter ID assignment
- All browser-specific utilities are included in the IIFE build

## Keyboard Shortcuts

- `Ctrl+Enter` / `Cmd+Enter`: Generate a basic ID
- `Escape`: Clear all output areas
