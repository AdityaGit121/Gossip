/**
 * AES-256-GCM Backup Encryption & Decryption Engine
 * Uses Web Crypto API (crypto.subtle) with PBKDF2 key derivation for secure password-protected offline backups.
 */

export interface EncryptedBackupBundle {
  type: 'GOSSIP_AES_ENCRYPTED_BACKUP' | 'CONVO_AES_ENCRYPTED_BACKUP';
  version: string;
  salt: string;
  iv: string;
  ciphertext: string;
  exportedAt: string;
  userId?: string;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  const importedKey = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    importedKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptBackup(backupData: any, password: string, userId?: string): Promise<EncryptedBackupBundle> {
  if (!password || password.trim().length < 4) {
    throw new Error('Encryption password must be at least 4 characters long.');
  }

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);

  const jsonString = JSON.stringify(backupData);
  const encoder = new TextEncoder();
  const plaintextBuffer = encoder.encode(jsonString);

  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    plaintextBuffer
  );

  return {
    type: 'GOSSIP_AES_ENCRYPTED_BACKUP',
    version: '1.0',
    salt: arrayBufferToBase64(salt.buffer),
    iv: arrayBufferToBase64(iv.buffer),
    ciphertext: arrayBufferToBase64(ciphertextBuffer),
    exportedAt: new Date().toISOString(),
    userId,
  };
}

export async function decryptBackup(bundle: EncryptedBackupBundle, password: string): Promise<any> {
  if (bundle.type !== 'GOSSIP_AES_ENCRYPTED_BACKUP' && bundle.type !== 'CONVO_AES_ENCRYPTED_BACKUP') {
    throw new Error('Invalid or unencrypted backup file structure.');
  }
  if (!password) {
    throw new Error('Password is required to decrypt this backup file.');
  }

  const salt = new Uint8Array(base64ToArrayBuffer(bundle.salt));
  const iv = new Uint8Array(base64ToArrayBuffer(bundle.iv));
  const ciphertext = base64ToArrayBuffer(bundle.ciphertext);

  const key = await deriveKey(password, salt);

  let decryptedBuffer: ArrayBuffer;
  try {
    decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );
  } catch (err) {
    throw new Error('Decryption failed! Incorrect password or corrupted backup file.');
  }

  const decoder = new TextDecoder();
  const jsonString = decoder.decode(decryptedBuffer);
  return JSON.parse(jsonString);
}
