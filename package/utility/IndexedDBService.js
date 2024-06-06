// IndexedDBService.js
import { Profile } from '../classes/Profile';
const dbName = 'NostrAppDB';
const storeName = 'userData';
const profileId = 'userProfile'; // Fixed ID for your profile object

const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, 1);

    request.onupgradeneeded = event => {
      let db = event.target.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName);
      }
    };

    request.onsuccess = event => resolve(event.target.result);
    request.onerror = event => reject(event.target.error);
  });
};

export const updateUserProfile = async profile => {
  const db = await initDB();
  const transaction = db.transaction([storeName], 'readwrite');
  const objectStore = transaction.objectStore(storeName);
  objectStore.put(profile, profileId); // Use put with a fixed ID for the profile object
};

export const clearUserProfile = async () => {
  const db = await initDB();
  const transaction = db.transaction([storeName], 'readwrite');
  const objectStore = transaction.objectStore(storeName);
  objectStore.delete(profileId);
};

export const fetchUserProfile = async () => {
  const db = await initDB();
  const transaction = db.transaction([storeName], 'readonly');
  const objectStore = transaction.objectStore(storeName);
  const request = objectStore.get(profileId);
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(new Profile(request.result));
    request.onerror = () => reject(request.error);
  });
};
