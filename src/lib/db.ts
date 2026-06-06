/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { openDB, IDBPDatabase } from 'idb';
import { saveQuestionToFirestore } from './firebaseService';
import { Question } from '../types';

const DB_NAME = "TargetExamSuiteDB";
const STORE_NAME = "KeyValStore";
const DB_VERSION = 4;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "key" });
        }
      },
    });
  }
  return dbPromise;
}

export async function getItem<T>(key: string): Promise<T | null> {
  try {
    const db = await getDB();
    const val = await db.get(STORE_NAME, key);
    if (val) {
      return val.value as T;
    }
  } catch (e) {
    console.error("IndexedDB get failed:", e);
  }
  
  // Fallback to localStorage
  try {
    const localVal = localStorage.getItem(key);
    if (localVal) {
      const parsed = JSON.parse(localVal);
      // Migrate to IndexedDB
      setItem(key, parsed).catch(console.error);
      return parsed as T;
    }
  } catch (_) {}
  return null;
}

export async function setItem<T>(key: string, value: T, skipSync: boolean = false): Promise<void> {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (_) {}

  try {
    const db = await getDB();
    await db.put(STORE_NAME, { key, value });
  } catch (e) {
    console.error("IndexedDB set failed:", e);
  }
}

export async function removeItem(key: string): Promise<void> {
  try {
    localStorage.removeItem(key);
  } catch (_) {}

  try {
    const db = await getDB();
    await db.delete(STORE_NAME, key);
  } catch (e) {
    console.error("IndexedDB remove failed:", e);
  }
}

export async function clearAll(): Promise<void> {
  try {
    localStorage.clear();
  } catch (_) {}

  try {
    const db = await getDB();
    await db.clear(STORE_NAME);
  } catch (e) {
    console.error("IndexedDB clear failed:", e);
  }
}
