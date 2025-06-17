import { openDB } from 'idb';
import { 
  Shift, Worker, Part, Task, TaskNote, 
  TaskTimeLog, ShiftReport, StartOfShiftChecklist,
  EndOfShiftCleanup, CalibrationRecord
} from '../types';

const DB_NAME = 'cncShopDB';
const DB_VERSION = 1;

const STORES = {
  SHIFTS: 'shifts',
  WORKERS: 'workers',
  PARTS: 'parts',
  TASKS: 'tasks',
  TASK_NOTES: 'taskNotes',
  TIME_LOGS: 'timeLogs',
  SHIFT_REPORTS: 'shiftReports',
  START_CHECKLISTS: 'startChecklists',
  END_CLEANUPS: 'endCleanups',
  CALIBRATIONS: 'calibrations'
} as const;

// Database initialization promise
let dbPromise: Promise<IDBDatabase> | null = null;

export const initDB = async () => {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Create object stores if they don't exist
        Object.values(STORES).forEach(storeName => {
          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName, { keyPath: 'id' });
          }
        });
      },
    });
  }
  return dbPromise;
};

// Ensure DB is initialized before any operation
const getDB = async () => {
  return await initDB();
};

export const saveData = async <T extends { id: string }>(
  storeName: keyof typeof STORES,
  data: T
): Promise<void> => {
  const db = await getDB();
  const tx = db.transaction(storeName, 'readwrite');
  await tx.store.put(data);
  await tx.done;
};

export const getData = async <T>(
  storeName: keyof typeof STORES,
  id: string
): Promise<T | undefined> => {
  const db = await getDB();
  const tx = db.transaction(storeName, 'readonly');
  return tx.store.get(id);
};

export const getAllData = async <T>(storeName: keyof typeof STORES): Promise<T[]> => {
  const db = await getDB();
  const tx = db.transaction(storeName, 'readonly');
  return tx.store.getAll();
};

export const deleteData = async (
  storeName: keyof typeof STORES,
  id: string
): Promise<void> => {
  const db = await getDB();
  const tx = db.transaction(storeName, 'readwrite');
  await tx.store.delete(id);
  await tx.done;
};

export const clearStore = async (storeName: keyof typeof STORES): Promise<void> => {
  const db = await getDB();
  const tx = db.transaction(storeName, 'readwrite');
  await tx.store.clear();
  await tx.done;
};

export const saveInitialData = async (
  shifts: Shift[],
  workers: Worker[],
  parts: Part[],
  tasks: Task[],
  taskNotes: TaskNote[],
  timeLogs: TaskTimeLog[],
  shiftReports: ShiftReport[]
): Promise<void> => {
  const db = await getDB();
  const tx = db.transaction(Object.values(STORES), 'readwrite');

  await Promise.all([
    ...shifts.map(shift => tx.objectStore(STORES.SHIFTS).put(shift)),
    ...workers.map(worker => tx.objectStore(STORES.WORKERS).put(worker)),
    ...parts.map(part => tx.objectStore(STORES.PARTS).put(part)),
    ...tasks.map(task => tx.objectStore(STORES.TASKS).put(task)),
    ...taskNotes.map(note => tx.objectStore(STORES.TASK_NOTES).put(note)),
    ...timeLogs.map(log => tx.objectStore(STORES.TIME_LOGS).put(log)),
    ...shiftReports.map(report => tx.objectStore(STORES.SHIFT_REPORTS).put(report))
  ]);

  await tx.done;
};

export const loadAllData = async () => {
  const db = await getDB();
  
  try {
    const results = await Promise.all(
      Object.values(STORES).map(async (storeName) => {
        const tx = db.transaction(storeName, 'readonly');
        return tx.store.getAll();
      })
    );

    const [
      shifts,
      workers,
      parts,
      tasks,
      taskNotes,
      timeLogs,
      shiftReports,
      startChecklists,
      endCleanups,
      calibrations
    ] = results;

    return {
      shifts,
      workers,
      parts,
      tasks,
      taskNotes,
      timeLogs,
      shiftReports,
      startChecklists,
      endCleanups,
      calibrations
    };
  } catch (error) {
    console.error('Error loading data:', error);
    return {};
  }
};