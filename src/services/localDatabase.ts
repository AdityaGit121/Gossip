/**
 * Local Storage Engine using IndexedDB & OPFS
 * Supports offline-first APK/Extension authentication, local storage, and version-proof portable backups.
 */

import { User } from '../types.js';

const DB_NAME = 'GossipLocalDB';
const DB_VERSION = 2;

export interface LocalMessage {
  id: string;
  chatId: string;
  senderID: string;
  text: string;
  timestamp: number;
  mediaUrl?: string;
  mediaType?: string;
  isSynced?: boolean;
}

export interface LocalChat {
  id: string;
  participants: any[];
  lastMessage?: LocalMessage;
  updatedAt: number;
  isGroup: boolean;
  name?: string;
}

export interface PortableBackupBundle {
  version: string;
  schemaVersion: number;
  appName: string;
  exportedAt: string;
  userProfile?: User;
  chats: any[];
  messages: any[];
}

export class LocalDatabaseEngine {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains('messages')) {
          const msgStore = db.createObjectStore('messages', { keyPath: 'id' });
          msgStore.createIndex('chatId', 'chatId', { unique: false });
        }

        if (!db.objectStoreNames.contains('chats')) {
          db.createObjectStore('chats', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('mediaStorage')) {
          db.createObjectStore('mediaStorage', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('users')) {
          const userStore = db.createObjectStore('users', { keyPath: 'id' });
          userStore.createIndex('username', 'username', { unique: true });
          userStore.createIndex('email', 'email', { unique: true });
        }
      };
    });
  }

  // --- Users Store for Offline Auth Fallback ---
  async saveUser(user: User, passwordHash?: string): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['users'], 'readwrite');
      const store = transaction.objectStore('users');
      const record = { ...user, passwordHash: passwordHash || '' };
      const request = store.put(record);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getUserByIdentifier(identifier: string): Promise<any | null> {
    if (!this.db) await this.init();
    const cleanId = identifier.trim().toLowerCase();
    const cleanDigits = identifier.replace(/[^0-9]/g, '');
    return new Promise((resolve) => {
      const transaction = this.db!.transaction(['users'], 'readonly');
      const store = transaction.objectStore('users');
      const request = store.getAll();
      request.onsuccess = () => {
        const users = request.result || [];
        const match = users.find(
          (u: any) =>
            u.id === identifier ||
            u.userID?.toLowerCase() === cleanId ||
            u.username?.toLowerCase() === cleanId.replace(/^@/, '') ||
            u.email?.toLowerCase() === cleanId ||
            (u.phoneNumber && u.phoneNumber.replace(/[^0-9]/g, '') === cleanDigits) ||
            (u.contactNumber && u.contactNumber.replace(/[^0-9]/g, '') === cleanDigits)
        );
        resolve(match || null);
      };
      request.onerror = () => resolve(null);
    });
  }

  // --- Messages Store ---
  async saveMessage(message: LocalMessage): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['messages'], 'readwrite');
      const store = transaction.objectStore('messages');
      const request = store.put(message);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getMessagesForChat(chatId: string): Promise<LocalMessage[]> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['messages'], 'readonly');
      const store = transaction.objectStore('messages');
      const index = store.index('chatId');
      const request = index.getAll(chatId);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllMessages(): Promise<LocalMessage[]> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['messages'], 'readonly');
      const store = transaction.objectStore('messages');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // --- Chats Store ---
  async saveChat(chat: LocalChat): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['chats'], 'readwrite');
      const store = transaction.objectStore('chats');
      const request = store.put(chat);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getAllChats(): Promise<LocalChat[]> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['chats'], 'readonly');
      const store = transaction.objectStore('chats');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // --- Universal Version-Independent Portable Backup Engine ---
  async exportPortableBackup(user?: User | null): Promise<PortableBackupBundle> {
    const chats = await this.getAllChats();
    const messages = await this.getAllMessages();

    return {
      version: '2.0.0',
      schemaVersion: 2,
      appName: 'Gossip',
      exportedAt: new Date().toISOString(),
      userProfile: user || undefined,
      chats,
      messages,
    };
  }

  async restorePortableBackup(backupData: any): Promise<{ chatsRestored: number; messagesRestored: number }> {
    if (!backupData) throw new Error('Empty backup file provided.');

    let chatsToRestore: any[] = [];
    let messagesToRestore: any[] = [];

    // Support multiple format versions (legacy or portable)
    if (Array.isArray(backupData.chats)) {
      chatsToRestore = backupData.chats;
    } else if (Array.isArray(backupData.backup?.chats)) {
      chatsToRestore = backupData.backup.chats;
    }

    if (Array.isArray(backupData.messages)) {
      messagesToRestore = backupData.messages;
    } else if (Array.isArray(backupData.backup?.messages)) {
      messagesToRestore = backupData.backup.messages;
    }

    let chatsRestored = 0;
    let messagesRestored = 0;

    for (const chat of chatsToRestore) {
      if (chat && chat.id) {
        await this.saveChat({
          id: chat.id,
          participants: chat.participants || [],
          updatedAt: chat.updatedAt || Date.now(),
          isGroup: !!chat.isGroup,
          name: chat.name,
          lastMessage: chat.lastMessage,
        });
        chatsRestored++;
      }
    }

    for (const msg of messagesToRestore) {
      if (msg && msg.id && msg.chatId) {
        await this.saveMessage({
          id: msg.id,
          chatId: msg.chatId,
          senderID: msg.senderID || msg.senderId || 'unknown',
          text: msg.text || '',
          timestamp: msg.timestamp || Date.now(),
          mediaUrl: msg.mediaUrl || msg.mediaURL,
          mediaType: msg.mediaType,
          isSynced: true,
        });
        messagesRestored++;
      }
    }

    // Also restore local user profile if included
    const userProfile = backupData.userProfile || backupData.backup?.userProfile;
    if (userProfile && userProfile.id) {
      await this.saveUser(userProfile);
      localStorage.setItem('gossip_offline_user_' + userProfile.id, JSON.stringify(userProfile));
    }

    return { chatsRestored, messagesRestored };
  }
}

export const localDB = new LocalDatabaseEngine();
