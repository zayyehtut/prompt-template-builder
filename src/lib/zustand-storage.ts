import { PersistStorage, StorageValue } from 'zustand/middleware';

/**
 * A storage adapter for Zustand's persist middleware that uses chrome.storage.local.
 * This allows storing state in the browser extension's local storage, which is
 * asynchronous and requires careful handling of the object serialization.
 */
export const chromeStorageAdapter: PersistStorage<any> = {
  getItem: async (name) => {
    const data = await chrome.storage.local.get(name);
    if (data[name]) {
        try {
            return JSON.parse(data[name]) as StorageValue<any>;
        } catch (e) {
            console.error('Error parsing stored json:', e);
            // If parsing fails, return null to reset state.
            return null;
        }
    }
    return null;
  },
  setItem: async (name, value) => {
    await chrome.storage.local.set({ [name]: JSON.stringify(value) });
  },
  removeItem: async (name) => {
    await chrome.storage.local.remove(name);
  },
}; 