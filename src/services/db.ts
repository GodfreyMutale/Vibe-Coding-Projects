import { EventRecord, ProcessedMessage, ScanLog, AppSettings } from '../types';

const DB_NAME = 'MeetingScannerDB';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

export function getDatabase(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains('events')) {
        const eventStore = db.createObjectStore('events', { keyPath: 'id' });
        eventStore.createIndex('threadId', 'threadId', { unique: false });
        eventStore.createIndex('status', 'status', { unique: false });
        eventStore.createIndex('start', 'start', { unique: false });
        eventStore.createIndex('messageId', 'messageId', { unique: false });
      }

      if (!db.objectStoreNames.contains('processedMessages')) {
        db.createObjectStore('processedMessages', { keyPath: 'messageId' });
      }

      if (!db.objectStoreNames.contains('scanLogs')) {
        const logStore = db.createObjectStore('scanLogs', { keyPath: 'id' });
        logStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

export async function getAllEvents(): Promise<EventRecord[]> {
  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('events', 'readonly');
    const store = tx.objectStore('events');
    const req = store.getAll();
    req.onsuccess = () => {
      const items = (req.result as EventRecord[]) || [];
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      resolve(items);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getEventById(id: string): Promise<EventRecord | null> {
  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('events', 'readonly');
    const store = tx.objectStore('events');
    const req = store.get(id);
    req.onsuccess = () => resolve((req.result as EventRecord) || null);
    req.onerror = () => reject(req.error);
  });
}

export async function getEventByThreadId(threadId: string): Promise<EventRecord | null> {
  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('events', 'readonly');
    const store = tx.objectStore('events');
    const index = store.index('threadId');
    const req = index.getAll(threadId);
    req.onsuccess = () => {
      const results = (req.result as EventRecord[]) || [];
      const active = results.find(e => e.status !== 'Cancelled') || results[0] || null;
      resolve(active);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function saveEvent(event: EventRecord): Promise<void> {
  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('events', 'readwrite');
    const store = tx.objectStore('events');
    const req = store.put(event);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function deleteEventRecord(id: string): Promise<void> {
  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('events', 'readwrite');
    const store = tx.objectStore('events');
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function isMessageProcessed(messageId: string): Promise<boolean> {
  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('processedMessages', 'readonly');
    const store = tx.objectStore('processedMessages');
    const req = store.get(messageId);
    req.onsuccess = () => resolve(!!req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function markMessageProcessed(message: ProcessedMessage): Promise<void> {
  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('processedMessages', 'readwrite');
    const store = tx.objectStore('processedMessages');
    const req = store.put(message);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getProcessedMessageCount(): Promise<number> {
  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('processedMessages', 'readonly');
    const store = tx.objectStore('processedMessages');
    const req = store.count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function clearProcessedMessages(): Promise<void> {
  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('processedMessages', 'readwrite');
    const store = tx.objectStore('processedMessages');
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function saveScanLog(log: ScanLog): Promise<void> {
  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('scanLogs', 'readwrite');
    const store = tx.objectStore('scanLogs');
    const req = store.put(log);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getAllScanLogs(): Promise<ScanLog[]> {
  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('scanLogs', 'readonly');
    const store = tx.objectStore('scanLogs');
    const req = store.getAll();
    req.onsuccess = () => {
      const logs = (req.result as ScanLog[]) || [];
      logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      resolve(logs);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function clearScanLogs(): Promise<void> {
  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('scanLogs', 'readwrite');
    const store = tx.objectStore('scanLogs');
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getSetting<T>(key: string, defaultValue: T): Promise<T> {
  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('settings', 'readonly');
    const store = tx.objectStore('settings');
    const req = store.get(key);
    req.onsuccess = () => {
      if (req.result && req.result.value !== undefined) {
        resolve(req.result.value as T);
      } else {
        resolve(defaultValue);
      }
    };
    req.onerror = () => reject(req.error);
  });
}

export async function setSetting<T>(key: string, value: T): Promise<void> {
  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('settings', 'readwrite');
    const store = tx.objectStore('settings');
    const req = store.put({ key, value });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getAppSettings(): Promise<AppSettings> {
  const fallbackTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const googleClientId = await getSetting<string>('googleClientId', '');
  const timeZone = await getSetting<string>('timeZone', fallbackTz);
  const scanIntervalMinutes = await getSetting<number>('scanIntervalMinutes', 15);
  const autoScanEnabled = await getSetting<boolean>('autoScanEnabled', true);
  const lookbackDays = await getSetting<number>('lookbackDays', 2);

  return {
    googleClientId,
    timeZone,
    scanIntervalMinutes,
    autoScanEnabled,
    lookbackDays,
  };
}

export async function saveAppSettings(settings: Partial<AppSettings>): Promise<void> {
  if (settings.googleClientId !== undefined) {
    await setSetting('googleClientId', settings.googleClientId);
  }
  if (settings.timeZone !== undefined) {
    await setSetting('timeZone', settings.timeZone);
  }
  if (settings.scanIntervalMinutes !== undefined) {
    await setSetting('scanIntervalMinutes', settings.scanIntervalMinutes);
  }
  if (settings.autoScanEnabled !== undefined) {
    await setSetting('autoScanEnabled', settings.autoScanEnabled);
  }
  if (settings.lookbackDays !== undefined) {
    await setSetting('lookbackDays', settings.lookbackDays);
  }
}

export async function clearAllDatabaseData(): Promise<void> {
  const db = await getDatabase();
  const stores = ['events', 'processedMessages', 'scanLogs'];
  for (const storeName of stores) {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }
}
