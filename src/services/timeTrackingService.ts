import { openDB } from 'idb';
import { TaskTimeLog } from '../types';

const DB_NAME = 'taskTimeTracking';
const STORE_NAME = 'timeLogs';

export const initTimeTrackingDB = async () => {
  const db = await openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    },
  });
  return db;
};

export const saveTimeLog = async (timeLog: TaskTimeLog) => {
  const db = await initTimeTrackingDB();
  await db.put(STORE_NAME, timeLog);
};

export const getUnsynced = async () => {
  const db = await initTimeTrackingDB();
  return db.getAll(STORE_NAME);
};

export const clearUnsynced = async () => {
  const db = await initTimeTrackingDB();
  await db.clear(STORE_NAME);
};

export const syncTimeLogs = async (timeLogs: TaskTimeLog[]) => {
  // In a real app, this would sync with your backend
  console.log('Syncing time logs:', timeLogs);
  await clearUnsynced();
};

let idleTimer: number | null = null;
const IDLE_TIMEOUT = 30 * 60 * 1000; // 30 minutes

export const startIdleDetection = (onIdle: () => void) => {
  const resetTimer = () => {
    if (idleTimer) {
      window.clearTimeout(idleTimer);
    }
    idleTimer = window.setTimeout(onIdle, IDLE_TIMEOUT);
  };

  // Reset timer on user activity
  ['mousemove', 'keydown', 'click', 'scroll'].forEach(event => {
    window.addEventListener(event, resetTimer);
  });

  // Start initial timer
  resetTimer();

  // Return cleanup function
  return () => {
    if (idleTimer) {
      window.clearTimeout(idleTimer);
    }
    ['mousemove', 'keydown', 'click', 'scroll'].forEach(event => {
      window.removeEventListener(event, resetTimer);
    });
  };
};