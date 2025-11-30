// Polyfill for indexedDB during SSR to prevent ReferenceError
declare global {
  interface Window {
    indexedDB?: IDBFactory;
  }
}

// Safe indexedDB wrapper that handles SSR gracefully
export const isIndexedDBAvailable = (): boolean => {
  if (typeof window === 'undefined') return false;
  return typeof window.indexedDB !== 'undefined';
};

// Safe indexedDB factory that returns null during SSR
export const getIndexedDB = (): IDBFactory | null => {
  if (typeof window === 'undefined') return null;
  return window.indexedDB || null;
};

// Mock indexedDB for SSR environments
export const createMockIndexedDB = () => {
  const mockDB = {
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

  return mockDB;
};