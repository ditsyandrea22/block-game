// Global polyfills to prevent SSR errors with browser APIs

// Polyfill for indexedDB during SSR
if (typeof globalThis.indexedDB === 'undefined') {
  (globalThis as any).indexedDB = {
    open: () => ({
      onupgradeneeded: null,
      onsuccess: null,
      onerror: null,
      result: {
        createObjectStore: () => ({}),
        transaction: () => ({
          objectStore: () => ({
            add: () => ({}),
            put: () => ({}),
            get: () => ({}),
            delete: () => ({}),
            clear: () => ({}),
          }),
        }),
      },
    }),
    deleteDatabase: () => ({}),
  };
}

// Polyfill for localStorage during SSR
if (typeof globalThis.localStorage === 'undefined') {
  const memoryStorage = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (key: string) => memoryStorage.get(key) || null,
    setItem: (key: string, value: string) => memoryStorage.set(key, value),
    removeItem: (key: string) => memoryStorage.delete(key),
    clear: () => memoryStorage.clear(),
    get length() { return memoryStorage.size; },
    key: (index: number) => {
      const keys = Array.from(memoryStorage.keys());
      return keys[index] || null;
    }
  };
}

// Polyfill for sessionStorage during SSR
if (typeof globalThis.sessionStorage === 'undefined') {
  const memorySessionStorage = new Map<string, string>();
  (globalThis as any).sessionStorage = {
    getItem: (key: string) => memorySessionStorage.get(key) || null,
    setItem: (key: string, value: string) => memorySessionStorage.set(key, value),
    removeItem: (key: string) => memorySessionStorage.delete(key),
    clear: () => memorySessionStorage.clear(),
    get length() { return memorySessionStorage.size; },
    key: (index: number) => {
      const keys = Array.from(memorySessionStorage.keys());
      return keys[index] || null;
    }
  };
}

// Polyfill for crypto during SSR
if (typeof globalThis.crypto === 'undefined') {
  (globalThis as any).crypto = {
    randomUUID: () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    }),
    getRandomValues: (array: Uint8Array) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
      return array;
    }
  };
}