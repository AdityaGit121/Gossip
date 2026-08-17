/**
 * Manual Caesar Cipher Implementation
 * Encrypts and Decrypts strings by shifting uppercase letters, lowercase letters, and digits.
 * Special characters and whitespace remain unchanged.
 */

import bcrypt from 'bcryptjs';

/**
 * Encrypts input string using Caesar Cipher shift
 * @param text The plaintext message
 * @param shift Shift value (integer from 1 to 25)
 */
export function caesarCipherEncrypt(text: string, shift: number): string {
  // Normalize shift to positive 0..25 for letters, 0..9 for digits
  const letterShift = ((shift % 26) + 26) % 26;
  const digitShift = ((shift % 10) + 10) % 10;

  let result = '';

  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);

    // Uppercase A-Z (65 - 90)
    if (charCode >= 65 && charCode <= 90) {
      const shifted = ((charCode - 65 + letterShift) % 26) + 65;
      result += String.fromCharCode(shifted);
    }
    // Lowercase a-z (97 - 122)
    else if (charCode >= 97 && charCode <= 122) {
      const shifted = ((charCode - 97 + letterShift) % 26) + 97;
      result += String.fromCharCode(shifted);
    }
    // Digits 0-9 (48 - 57)
    else if (charCode >= 48 && charCode <= 57) {
      const shifted = ((charCode - 48 + digitShift) % 10) + 48;
      result += String.fromCharCode(shifted);
    }
    // Special characters / space / emojis remain untouched
    else {
      result += text[i];
    }
  }

  return result;
}

/**
 * Decrypts Caesar Cipher encrypted string back to plaintext
 * @param cipherText Encrypted string
 * @param shift Shift value used during encryption
 */
export function caesarCipherDecrypt(cipherText: string, shift: number): string {
  // Decryption is encryption with negative shift
  return caesarCipherEncrypt(cipherText, -shift);
}

/**
 * Creates a hashed passkey signature for storing with the encrypted message
 * so we can verify if the user entered the correct passkey upon decryption
 */
export async function hashPasskey(passkey: string): Promise<string> {
  const salt = await bcrypt.genSalt(6);
  return bcrypt.hash(passkey, salt);
}

/**
 * Synchronous hash passkey for quick verification
 */
export function hashPasskeySync(passkey: string): string {
  const salt = bcrypt.genSaltSync(6);
  return bcrypt.hashSync(passkey, salt);
}

/**
 * Verifies if entered passkey matches the stored passkey hash
 */
export async function verifyPasskey(passkey: string, storedHash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(passkey, storedHash);
  } catch {
    return false;
  }
}

/**
 * Synchronous passkey verification
 */
export function verifyPasskeySync(passkey: string, storedHash: string): boolean {
  try {
    return bcrypt.compareSync(passkey, storedHash);
  } catch {
    return false;
  }
}

/**
 * Generate a basic User ID
 */
export function generateUserID(): string {
  return 'USER-' + Date.now().toString().slice(-4);
}
