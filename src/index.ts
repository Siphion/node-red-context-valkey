import { ValkeyContext } from './context.js';
import type { ValkeyContextConfig, ContextStore } from './types.js';

/**
 * Factory function for creating a ValkeyContext instance
 * This is the entry point called by Node-RED when loading the context store
 *
 * @param config - Configuration object (can be string reference to shared config or object)
 * @returns A new ValkeyContext instance
 */
export default function (config: ValkeyContextConfig): ContextStore {
  return new ValkeyContext(config);
}

// Export types and class for programmatic usage
export { ValkeyContext } from './context.js';
export type { ValkeyContextConfig, ContextStore, PropertyPath } from './types.js';
