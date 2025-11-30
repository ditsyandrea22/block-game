// Safe storage wrapper that handles browser APIs gracefully during SSR
import { isIndexedDBAvailable } from './indexeddb-polyfill';

export type StorageType = 'localStorage' | 'indexedDB' | 'memory';

interface StorageItem {
  value: string;
  timestamp: number;
}

class MemoryStorage {
  private store = new Map<string, string>();
  readonly length = 0;

  key(index: number): string | null {
    const keys = Array.from(this.store.keys());
    return keys[index] || null;
  }

  getItem(key: string): string | null {
    return this.store.get(key) || null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  getAllKeys(): string[] {
    return Array.from(this.store.keys());
  }
}

class SafeStorage {
  private storage: Storage;
  private type: StorageType;

  constructor() {
    if (typeof window === 'undefined') {
      // Server-side: use memory storage
      this.storage = new MemoryStorage();
      this.type = 'memory';
    } else {
      // Client-side: try to use the best available storage
      try {
        // First try localStorage
        const testKey = '__storage_test__';
        window.localStorage.setItem(testKey, 'test');
        window.localStorage.removeItem(testKey);
        this.storage = window.localStorage;
        this.type = 'localStorage';
      } catch {
        try {
          // Fallback to indexedDB if available
          if (isIndexedDBAvailable()) {
            // For simplicity, we'll still use localStorage as fallback
            // but mark it as indexedDB preference
            this.storage = window.localStorage;
            this.type = 'indexedDB';
          } else {
            // Ultimate fallback: memory storage
            this.storage = new MemoryStorage();
            this.type = 'memory';
          }
        } catch {
          // Final fallback: memory storage
          this.storage = new MemoryStorage();
          this.type = 'memory';
        }
      }
    }
  }

  getItem(key: string): string | null {
    try {
      return this.storage.getItem(key);
    } catch {
      return null;
    }
  }

  setItem(key: string, value: string): void {
    try {
      this.storage.setItem(key, value);
    } catch (error) {
      console.warn(`Failed to store item ${key}:`, error);
    }
  }

  removeItem(key: string): void {
    try {
      this.storage.removeItem(key);
    } catch (error) {
      console.warn(`Failed to remove item ${key}:`, error);
    }
  }

  clear(): void {
    try {
      this.storage.clear();
    } catch (error) {
      console.warn('Failed to clear storage:', error);
    }
  }

  getAllKeys(): string[] {
    try {
      if ('getAllKeys' in this.storage) {
        return (this.storage as any).getAllKeys();
      }
      // For localStorage, we need to simulate getAllKeys
      if (this.type === 'localStorage') {
        const keys: string[] = [];
        for (let i = 0; i < (this.storage as any).length; i++) {
          const key = (this.storage as any).key(i);
          if (key) keys.push(key);
        }
        return keys;
      }
      return [];
    } catch {
      return [];
    }
  }

  // Enhanced methods for complex data
  setJSON<T>(key: string, value: T): void {
    try {
      const item: StorageItem = {
        value: JSON.stringify(value),
        timestamp: Date.now(),
      };
      this.setItem(key, JSON.stringify(item));
    } catch (error) {
      console.warn(`Failed to store JSON item ${key}:`, error);
    }
  }

  getJSON<T>(key: string): T | null {
    try {
      const itemStr = this.getItem(key);
      if (!itemStr) return null;

      const item: StorageItem = JSON.parse(itemStr);
      return JSON.parse(item.value);
    } catch (error) {
      console.warn(`Failed to parse JSON item ${key}:`, error);
      return null;
    }
  }

  // Storage type getter
  getStorageType(): StorageType {
    return this.type;
  }

  // Check if storage is available
  isAvailable(): boolean {
    return this.type !== 'memory' || typeof window === 'undefined';
  }
}

// Export singleton instance
export const safeStorage = new SafeStorage();

// Utility functions
export const safeGetItem = (key: string): string | null => safeStorage.getItem(key);
export const safeSetItem = (key: string, value: string): void => safeStorage.setItem(key, value);
export const safeRemoveItem = (key: string): void => safeStorage.removeItem(key);
export const safeClear = (): void => safeStorage.clear();
export const safeGetJSON = <T>(key: string): T | null => safeStorage.getJSON(key);
export const safeSetJSON = <T>(key: string, value: T): void => safeStorage.setJSON(key, value);