# Snowflake Service Worker Example

This example demonstrates how to use the Snowflake ID generator library inside a Service Worker. Service Workers run in the background, separate from the main browser thread, making them ideal for tasks that shouldn't block the user interface.

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

4. Register Service Worker:
   Click "Register Service Worker" to initialize the worker

## Features Demonstrated

### Basic ID Generation
- Generate single Snowflake IDs
- Generate multiple IDs in batch
- Verify ID uniqueness

### Custom Configuration
- Set custom datacenter ID (0-31)
- Set custom worker ID (0-31)
- Generate IDs with specific configuration

### Performance Testing
- Generate large numbers of IDs (100-10,000)
- Measure generation performance
- Verify uniqueness at scale
- Background performance testing

### ID Analysis
- Parse Snowflake IDs into components
- Extract timestamps and dates
- Display detailed ID breakdown

### Background Generation
- Continuous ID generation in background
- Non-blocking operation
- Automatic rate limiting
- Stop/start controls

## Browser Compatibility

Service Workers are supported in:
- Chrome 40+
- Firefox 44+
- Safari 11.1+
- Edge 17+

Requirements:
- HTTPS or localhost environment
- Modern browser with Service Worker support
- ES2020 features (BigInt support)

## Security Considerations

- Service Workers run in a secure context (HTTPS required)
- No access to localStorage (uses different storage mechanisms)
- Limited API access compared to main thread
- Cross-origin restrictions apply

## Development Notes

### Debugging
- Use browser DevTools → Application → Service Workers
- Console logs appear in Service Worker DevTools context
- Network tab shows Service Worker network activity

### Lifecycle
- Service Workers persist between page visits
- Automatic updates when `sw.js` changes
- Manual unregistration available

### Performance
- Service Workers add minimal overhead
- ID generation performance similar to main thread
- Message passing has small latency cost
- Background generation doesn't block UI

## Common Issues

1. **HTTPS Requirement**: Service Workers require HTTPS (except localhost)
2. **Caching**: Browser may cache Service Worker script
3. **Scope**: Service Worker scope affects what it can control
4. **Registration**: Must wait for registration completion

## Integration

To integrate Service Worker ID generation in your application:

```javascript
// Register Service Worker
const registration = await navigator.serviceWorker.register('/sw.js');

// Wait for activation
await navigator.serviceWorker.ready;

// Generate ID
navigator.serviceWorker.controller.postMessage({
    type: 'GENERATE_ID'
});

// Handle response
navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data.type === 'ID_GENERATED') {
        console.log('Generated ID:', event.data.data.id);
    }
});
```
