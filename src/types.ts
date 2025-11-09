import type { RedisOptions } from 'ioredis';

/**
 * Configuration for ValkeyContext store.
 * Extends RedisOptions from ioredis to support all connection options.
 *
 * NOTE: This configuration is typically shared with node-red-storage-valkey
 * by referencing the same 'valkey' config object in settings.js
 */
export interface ValkeyContextConfig extends RedisOptions {
  /**
   * Prefix for all Redis keys (default: "nodered:")
   * Context keys will be stored as: {keyPrefix}context:{scope}:{key}
   */
  keyPrefix?: string;

  /**
   * Enable gzip compression for values larger than 1KB (default: false)
   * Reduces memory usage in Redis at the cost of CPU for compression/decompression
   */
  enableCompression?: boolean;

  /**
   * Timeout in milliseconds for Redis operations (default: 5000)
   */
  timeout?: number;
}

/**
 * Node-RED Context Store interface.
 * All context stores must implement these methods.
 */
export interface ContextStore {
  /**
   * Initialize the context store and establish connections
   * Called once during Node-RED startup
   * @returns Promise that resolves when the store is ready
   */
  open(): Promise<void>;

  /**
   * Close the context store and cleanup resources
   * Called during Node-RED shutdown
   * @returns Promise that resolves when cleanup is complete
   */
  close(): Promise<void>;

  /**
   * Get one or more values from the context store
   * @param scope - Context scope identifier (e.g., "global", "flow:flow-id", "node:node-id")
   * @param key - Single key or array of keys to retrieve (supports nested properties like "user.name")
   * @param callback - Error-first callback with the retrieved value(s)
   */
  get(scope: string, key: string | string[], callback: (err: Error | null, value?: any) => void): void;

  /**
   * Set a value in the context store
   * @param scope - Context scope identifier
   * @param key - Key to set (supports nested properties like "user.name")
   * @param value - Value to store (will be JSON serialized)
   * @param callback - Error-first callback
   */
  set(scope: string, key: string, value: any, callback: (err: Error | null) => void): void;

  /**
   * Get all keys for a given scope
   * @param scope - Context scope identifier
   * @param callback - Error-first callback with array of keys
   */
  keys(scope: string, callback: (err: Error | null, keys?: string[]) => void): void;

  /**
   * Delete all data for a given scope
   * @param scope - Context scope identifier to delete
   * @returns Promise that resolves when deletion is complete
   */
  delete(scope: string): Promise<void>;

  /**
   * Clean up context data for nodes that no longer exist (optional method)
   * @param activeNodes - Array of currently active node IDs
   * @returns Promise that resolves when cleanup is complete
   */
  clean?(activeNodes: string[]): Promise<void>;
}

/**
 * Internal structure for managing nested property access
 */
export interface PropertyPath {
  parts: string[];
  isNested: boolean;
}
