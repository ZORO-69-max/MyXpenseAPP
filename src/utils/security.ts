// Security utilities for PIN hashing and data encryption using Web Crypto API

// Generate a random salt
export const generateSalt = (): string => {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

// Hash a PIN with salt using PBKDF2 with high iterations
export const hashPIN = async (pin: string, salt: string): Promise<string> => {
  const encoder = new TextEncoder();
  const pinData = encoder.encode(pin);
  const saltData = encoder.encode(salt);
  
  // Import PIN as key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    pinData,
    'PBKDF2',
    false,
    ['deriveBits']
  );
  
  // Derive hash with 100,000 iterations (OWASP recommendation for PBKDF2)
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltData,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );
  
  const hashArray = Array.from(new Uint8Array(derivedBits));
  return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
};

// Verify PIN against stored hash
export const verifyPIN = async (pin: string, salt: string, storedHash: string): Promise<boolean> => {
  const hash = await hashPIN(pin, salt);
  // Constant time comparison to prevent timing attacks
  if (hash.length !== storedHash.length) return false;
  
  let result = 0;
  for (let i = 0; i < hash.length; i++) {
    result |= hash.charCodeAt(i) ^ storedHash.charCodeAt(i);
  }
  return result === 0;
};

// Generate encryption key from PIN (NOT from salt)
const getEncryptionKey = async (pin: string, salt: string): Promise<CryptoKey> => {
  const encoder = new TextEncoder();
  const pinData = encoder.encode(pin);
  const saltData = encoder.encode(salt);
  
  const baseKey = await crypto.subtle.importKey(
    'raw',
    pinData,
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );
  
  // Use the user's salt for key derivation with high iteration count
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltData,
      iterations: 100000,
      hash: 'SHA-256'
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
};

// Encrypt data using PIN (requires PIN to decrypt)
export const encryptData = async (data: string, pin: string, salt: string): Promise<string> => {
  const encoder = new TextEncoder();
  const key = await getEncryptionKey(pin, salt);
  
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encodedData = encoder.encode(data);
  
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    encodedData
  );
  
  const encryptedArray = new Uint8Array(encryptedBuffer);
  const combined = new Uint8Array(iv.length + encryptedArray.length);
  combined.set(iv);
  combined.set(encryptedArray, iv.length);
  
  return Array.from(combined, byte => byte.toString(16).padStart(2, '0')).join('');
};

// Decrypt data using PIN (requires correct PIN to decrypt)
export const decryptData = async (encryptedHex: string, pin: string, salt: string): Promise<string> => {
  const decoder = new TextDecoder();
  const key = await getEncryptionKey(pin, salt);
  
  const encryptedArray = new Uint8Array(
    encryptedHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
  );
  
  const iv = encryptedArray.slice(0, 12);
  const data = encryptedArray.slice(12);
  
  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    data
  );
  
  return decoder.decode(decryptedBuffer);
};

// Rate limiting for PIN attempts
interface PINAttempt {
  count: number;
  timestamp: number;
}

const PIN_ATTEMPT_KEY = 'pin_attempts';
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

export const checkPINAttempts = (): { allowed: boolean; remainingAttempts?: number; lockoutEndsAt?: number } => {
  const stored = localStorage.getItem(PIN_ATTEMPT_KEY);
  
  if (!stored) {
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS };
  }
  
  const attempt: PINAttempt = JSON.parse(stored);
  const now = Date.now();
  
  if (attempt.count >= MAX_ATTEMPTS) {
    const lockoutEndsAt = attempt.timestamp + LOCKOUT_DURATION;
    if (now < lockoutEndsAt) {
      return { allowed: false, lockoutEndsAt };
    } else {
      // Reset after lockout period
      localStorage.removeItem(PIN_ATTEMPT_KEY);
      return { allowed: true, remainingAttempts: MAX_ATTEMPTS };
    }
  }
  
  return { allowed: true, remainingAttempts: MAX_ATTEMPTS - attempt.count };
};

export const recordPINAttempt = (success: boolean) => {
  if (success) {
    localStorage.removeItem(PIN_ATTEMPT_KEY);
    return;
  }
  
  const stored = localStorage.getItem(PIN_ATTEMPT_KEY);
  const attempt: PINAttempt = stored 
    ? JSON.parse(stored)
    : { count: 0, timestamp: Date.now() };
  
  attempt.count += 1;
  attempt.timestamp = Date.now();
  
  localStorage.setItem(PIN_ATTEMPT_KEY, JSON.stringify(attempt));
};
