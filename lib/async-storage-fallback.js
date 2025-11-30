// Fallback for @react-native-async-storage/async-storage in web environments
const AsyncStorage = {
  getItem: async (key) => {
    if (typeof window !== 'undefined') {
      return window.localStorage.getItem(key)
    }
    return null
  },
  setItem: async (key, value) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(key, value)
    }
  },
  removeItem: async (key) => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(key)
    }
  },
  getAllKeys: async () => {
    if (typeof window !== 'undefined') {
      return Object.keys(window.localStorage)
    }
    return []
  },
  clear: async () => {
    if (typeof window !== 'undefined') {
      window.localStorage.clear()
    }
  },
  multiGet: async (keys) => {
    if (typeof window !== 'undefined') {
      return keys.map(key => [key, window.localStorage.getItem(key)])
    }
    return keys.map(key => [key, null])
  },
  multiSet: async (keyValuePairs) => {
    if (typeof window !== 'undefined') {
      keyValuePairs.forEach(([key, value]) => {
        window.localStorage.setItem(key, value)
      })
    }
  },
  multiRemove: async (keys) => {
    if (typeof window !== 'undefined') {
      keys.forEach(key => {
        window.localStorage.removeItem(key)
      })
    }
  },
}

module.exports = AsyncStorage