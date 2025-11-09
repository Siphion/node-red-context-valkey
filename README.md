# node-red-context-valkey

A Node-RED context store implementation using Valkey/Redis for clustering support.

## Overview

`node-red-context-valkey` provides a context storage backend for Node-RED that stores all context data in Valkey/Redis. This enables **true clustering** of Node-RED instances, where multiple instances can share the same context data in real-time.

### Key Features

- **Always stores in Valkey/Redis** - No optional parameters, ensuring cluster consistency
- **Atomic operations** - Uses Lua scripts for nested property updates to prevent race conditions
- **Shared configuration** - Uses the same `valkey` config object as `node-red-storage-valkey`
- **High availability** - Supports Redis Sentinel for automatic failover
- **Optional compression** - Automatically compresses large values (>1KB) to save memory
- **Full context API** - Supports global, flow, and node-scoped contexts
- **TypeScript** - Written in TypeScript with full type definitions

## Installation

```bash
npm install node-red-context-valkey
```

## Configuration

### Basic Setup

Add to your Node-RED `settings.js`:

```javascript
module.exports = {
  // Optional: Storage API using Valkey
  storageModule: require('node-red-storage-valkey'),

  // Context API configuration
  contextStorage: {
    default: {
      module: require('node-red-context-valkey')
    }
  },

  // Shared Valkey configuration (used by both storage and context modules)
  valkey: {
    host: 'localhost',
    port: 6379,
    password: 'your-password',  // Optional
    db: 0,                       // Optional, default: 0
    keyPrefix: 'nodered:',       // Optional, default: 'nodered:'
    enableCompression: true,     // Optional, default: false
  }
}
```

**Note:** Both the storage module and context module automatically use the `valkey` configuration object from `settings.js`. There's no need to specify `config: "valkey"` explicitly.

### Advanced Configuration

#### With Redis Sentinel (High Availability)

```javascript
module.exports = {
  contextStorage: {
    default: {
      module: require('node-red-context-valkey')
    }
  },

  valkey: {
    sentinels: [
      { host: 'sentinel1.example.com', port: 26379 },
      { host: 'sentinel2.example.com', port: 26379 },
      { host: 'sentinel3.example.com', port: 26379 }
    ],
    name: 'mymaster',           // Sentinel master name
    password: 'your-password',
    keyPrefix: 'nodered:',
    enableCompression: true,
  }
}
```

#### With Explicit Configuration Object

```javascript
module.exports = {
  contextStorage: {
    default: "memory",  // Use memory for default
    valkey: {
      module: require('node-red-context-valkey'),
      config: {
        host: '127.0.0.1',
        port: 6379,
        password: 'your-password',
        db: 0,
        keyPrefix: 'nodered:',
        enableCompression: true,

        // ioredis connection options
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        connectTimeout: 10000,
        maxRetriesPerRequest: 3,
      }
    }
  }
}
```

## Usage

### In Function Nodes

Once configured, use Node-RED's context API normally. All operations automatically go to Valkey/Redis:

```javascript
// Global context (shared across all flows and instances)
global.set("userCount", 42);
const count = global.get("userCount");

// Flow context (shared across nodes in the same flow)
flow.set("temperature", 72.5);
const temp = flow.get("temperature");

// Node context (private to this node instance)
context.set("counter", 1);
const counter = context.get("counter");

// Nested properties
global.set("user.profile.name", "Alice");
const name = global.get("user.profile.name");

// Get multiple keys at once
const [name, age] = global.get(["user.name", "user.age"]);
```

### Context Scopes

- **Global** - Shared across all flows and all Node-RED instances in the cluster
- **Flow** - Shared across all nodes in a flow tab, and across all instances in the cluster
- **Node** - Private to a specific node, but shared across all instances in the cluster

## Complete Clustering Solution

This module works seamlessly with `node-red-storage-valkey` to provide a **complete clustering solution** for Node-RED:

- **Storage Module** ([node-red-storage-valkey](https://github.com/Siphion/node-red-storage-valkey)) - Manages flows, credentials, and settings with automatic synchronization across instances
- **Context Module** (this package) - Handles shared context data across all instances

Together, these modules enable:

1. **Shared Flows and Credentials** - Storage module keeps all instances in sync
2. **Shared Context Data** - This module ensures consistent state across instances
3. **Auto-reload on Flow Updates** - Workers automatically reload when admin saves flows
4. **True Horizontal Scaling** - Scale to any number of instances seamlessly

### Admin vs Worker Configuration

For optimal clustering, configure different Node-RED instances based on their role:

**Admin Node** (with editor access):
```javascript
module.exports = {
  storageModule: require('node-red-storage-valkey'),

  contextStorage: {
    default: {
      module: require('node-red-context-valkey')
    }
  },

  valkey: {
    host: 'localhost',
    port: 6379,
    keyPrefix: 'nodered:',
    publishOnSave: true,        // Broadcast flow changes
    enableCompression: true
  }
}
```

**Worker Nodes** (load-balanced instances):
```javascript
module.exports = {
  storageModule: require('node-red-storage-valkey'),

  contextStorage: {
    default: {
      module: require('node-red-context-valkey')
    }
  },

  httpAdminRoot: false,  // Disable editor interface

  valkey: {
    host: 'localhost',
    port: 6379,
    keyPrefix: 'nodered:',
    subscribeToUpdates: true,   // Listen for flow updates
    enableCompression: true
  }
}
```

**Key Points:**
- Admin nodes use `publishOnSave: true` to broadcast changes via pub/sub
- Worker nodes use `subscribeToUpdates: true` to receive and auto-reload flows
- Worker nodes should have `httpAdminRoot: false` to disable the editor
- Both modules automatically use the shared `valkey` configuration object

## Clustering Benefits

When running multiple Node-RED instances connected to the same Valkey/Redis:

1. **Shared State** - All instances see the same context data in real-time
2. **Load Balancing** - Distribute work across instances while maintaining state
3. **High Availability** - If one instance fails, others continue with the same data
4. **Horizontal Scaling** - Add more instances without data inconsistency
5. **Automatic Synchronization** - Workers auto-reload when admin updates flows

### Example: Load Balanced API with Shared Counter

```javascript
// In a function node receiving API requests
// All instances share the same counter in Redis
let count = global.get("api_requests") || 0;
count++;
global.set("api_requests", count);

msg.payload = {
  instance: process.env.INSTANCE_ID,
  totalRequests: count
};
return msg;
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `host` | string | `'127.0.0.1'` | Redis/Valkey host |
| `port` | number | `6379` | Redis/Valkey port |
| `password` | string | `undefined` | Redis/Valkey password |
| `db` | number | `0` | Redis database number |
| `keyPrefix` | string | `'nodered:'` | Prefix for all Redis keys |
| `enableCompression` | boolean | `false` | Enable gzip compression for values >1KB |
| `sentinels` | array | `undefined` | Redis Sentinel configuration |
| `name` | string | `undefined` | Sentinel master name |
| `timeout` | number | `5000` | Redis operation timeout (ms) |

All [ioredis options](https://github.com/redis/ioredis#connect-to-redis) are also supported.

## Data Storage Format

Context data is stored in Redis with the following key pattern:

```
{keyPrefix}context:{scope}:{key}
```

Examples:
- `nodered:context:global:userCount`
- `nodered:context:flow:a1b2c3d4:temperature`
- `nodered:context:node:x5y6z7w8:counter`

Values are stored as JSON. Nested properties are stored as complete JSON objects with atomic updates using Lua scripts.

## Performance Considerations

### Compression

Enable compression for applications with large context values:

```javascript
valkey: {
  enableCompression: true  // Compress values > 1KB
}
```

**Trade-offs:**
- **Pros**: Reduces Redis memory usage by 60-90% for large objects
- **Cons**: Additional CPU overhead for gzip compression/decompression

### Connection Pooling

ioredis automatically manages connection pooling. For high-traffic deployments, consider:

```javascript
valkey: {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  enableOfflineQueue: true,
}
```

## Comparison with node-red-context-redis

This module improves upon the original `node-red-context-redis`:

| Feature | node-red-context-redis | node-red-context-valkey |
|---------|------------------------|-------------------------|
| Storage Location | Optional (memory or Redis) | **Always Redis** |
| API | Extra parameter for store selection | Clean, no extra parameters |
| Configuration | Separate config | **Shared with storage module** |
| Clustering | Possible but error-prone | **Designed for clustering** |
| Maintenance | Last updated 4 years ago | **Active development** |
| TypeScript | No | **Yes, with full types** |
| Compression | Basic | **Optimized (>1KB threshold)** |

## Troubleshooting

### Connection Issues

If Node-RED fails to connect to Redis:

1. Check Redis is running: `redis-cli ping`
2. Verify connection details in `settings.js`
3. Check Node-RED logs for error messages
4. Ensure firewall allows connection to Redis port

### Context Data Not Persisting

1. Verify `contextStorage` configuration in `settings.js`
2. Check that `default` is set to `"valkey"` or flows use explicit store name
3. Confirm Redis is not configured with volatile eviction policy

### Memory Usage

If Redis memory grows too large:

1. Enable compression: `enableCompression: true`
2. Implement periodic cleanup using `clean()` method
3. Use appropriate Redis `maxmemory` and eviction policies
4. Monitor with `redis-cli --bigkeys`

## Development

### Build

```bash
npm install
npm run build
```

### Project Structure

```
node-red-context-valkey/
├── src/
│   ├── index.ts       # Entry point
│   ├── context.ts     # ValkeyContext implementation
│   └── types.ts       # TypeScript interfaces
├── dist/              # Compiled output (ESM + CommonJS)
├── package.json
└── README.md
```

## License

Apache-2.0

## Related Projects

- [node-red-storage-valkey](https://github.com/Siphion/node-red-storage-valkey) - Storage API implementation for Valkey/Redis
- [Node-RED](https://nodered.org/) - Low-code programming for event-driven applications

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues and questions:
- GitHub Issues: https://github.com/Siphion/node-red-context-valkey/issues
- Node-RED Forum: https://discourse.nodered.org/
