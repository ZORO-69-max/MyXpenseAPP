import { logger } from '../utils/logger';
import { getFirestoreSync } from './firestoreSync';
import { isFirebaseConfigured } from '../config/firebase';
import { compressionService } from './compressionService';
import type { SecretVault, VaultTransaction } from '../utils/db';

interface EncryptedVaultData {
  id: string;
  userId: string;
  encryptedPayload: string;
  encryptionMetadata: EncryptionMetadata;
  // PIN credentials stored so users can authenticate on any device
  pinHash: string;
  pinSalt: string;
  // Recovery fields stored unencrypted so users can reset PIN on any device
  secretQuestion: string;
  secretAnswerHash: string;
  secretAnswerSalt: string;
  createdAt: Date;
  updatedAt: Date;
  syncVersion: number;
}

interface EncryptionMetadata {
  algorithm: string;
  keyDerivation: string;
  iterations: number;
  saltHex: string;
  ivHex: string;
  version: number;
}

interface DecryptedVaultPayload {
  balance: number;
  history: VaultTransaction[];
  // Legacy: these were previously in payload but now stored unencrypted for recovery
  secretQuestion?: string;
  secretAnswerHash?: string;
  secretAnswerSalt?: string;
}

class EncryptedVaultSyncService {
  private static readonly ALGORITHM = 'AES-GCM';
  private static readonly KEY_DERIVATION = 'PBKDF2';
  private static readonly ITERATIONS = 100000;
  private static readonly VERSION = 1;

  private async deriveKey(pin: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const pinData = encoder.encode(pin);

    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      pinData,
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt as unknown as BufferSource,
        iterations: EncryptedVaultSyncService.ITERATIONS,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  private hexToBytes(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
  }

  private bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes)
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('');
  }

  async encryptVaultForSync(
    vault: SecretVault,
    pin: string
  ): Promise<EncryptedVaultData> {
    const encoder = new TextEncoder();

    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await this.deriveKey(pin, salt);

    // Only encrypt sensitive financial data - recovery info stored separately
    const payload: DecryptedVaultPayload = {
      balance: parseFloat(vault.vaultBalanceEncrypted) || 0,
      history: vault.vaultHistory || []
    };

    const compressed = await compressionService.compress(payload);
    const payloadData = encoder.encode(compressed.data);

    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      payloadData
    );

    const encryptedArray = new Uint8Array(encryptedBuffer);
    const encryptedHex = this.bytesToHex(encryptedArray);

    return {
      id: vault.id,
      userId: vault.userId,
      encryptedPayload: encryptedHex,
      encryptionMetadata: {
        algorithm: EncryptedVaultSyncService.ALGORITHM,
        keyDerivation: EncryptedVaultSyncService.KEY_DERIVATION,
        iterations: EncryptedVaultSyncService.ITERATIONS,
        saltHex: this.bytesToHex(salt),
        ivHex: this.bytesToHex(iv),
        version: EncryptedVaultSyncService.VERSION
      },
      // PIN credentials stored so users can authenticate on any device
      pinHash: vault.pinHash,
      pinSalt: vault.pinSalt,
      // Recovery info stored UNENCRYPTED so users can reset PIN on any device
      secretQuestion: vault.secretQuestion,
      secretAnswerHash: vault.secretAnswerHash,
      secretAnswerSalt: vault.secretAnswerSalt || vault.pinSalt,
      createdAt: vault.createdAt,
      updatedAt: vault.updatedAt,
      syncVersion: Date.now()
    };
  }

  async decryptVaultFromSync(
    encryptedData: EncryptedVaultData,
    pin: string,
    existingVault?: Partial<SecretVault>
  ): Promise<SecretVault> {
    const decoder = new TextDecoder();
    const { encryptedPayload, encryptionMetadata } = encryptedData;

    // Verify encryptionMetadata exists and has required fields
    if (!encryptionMetadata || !encryptionMetadata.saltHex || !encryptionMetadata.ivHex) {
      throw new Error('Invalid cloud vault data: missing encryption metadata. Please re-sync your vault.');
    }

    const salt = this.hexToBytes(encryptionMetadata.saltHex);
    const iv = this.hexToBytes(encryptionMetadata.ivHex);
    const key = await this.deriveKey(pin, salt);

    const encryptedBytes = this.hexToBytes(encryptedPayload);

    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as unknown as BufferSource },
      key,
      encryptedBytes as unknown as BufferSource
    );

    const compressedData = decoder.decode(decryptedBuffer);
    const payload: DecryptedVaultPayload = await compressionService.decompress(compressedData);

    // Use unencrypted recovery info from cloud, fall back to legacy payload if not present
    // Also use cloud PIN hash/salt so users can authenticate on any device
    return {
      id: encryptedData.id,
      userId: encryptedData.userId,
      pinHash: encryptedData.pinHash || existingVault?.pinHash || '',
      pinSalt: encryptedData.pinSalt || existingVault?.pinSalt || '',
      secretQuestion: encryptedData.secretQuestion || payload.secretQuestion || '',
      secretAnswerHash: encryptedData.secretAnswerHash || payload.secretAnswerHash || '',
      secretAnswerSalt: encryptedData.secretAnswerSalt || payload.secretAnswerSalt || '',
      vaultBalanceEncrypted: payload.balance.toString(),
      vaultHistory: payload.history,
      createdAt: encryptedData.createdAt,
      updatedAt: encryptedData.updatedAt
    };
  }

  async syncVaultToFirebase(
    vault: SecretVault,
    pin: string,
    userId: string
  ): Promise<boolean> {
    if (!isFirebaseConfigured()) {
      logger.debug('Firebase not configured, skipping vault sync');
      return false;
    }

    try {
      const encryptedVault = await this.encryptVaultForSync(vault, pin);
      const firestoreSync = getFirestoreSync(userId);

      await firestoreSync.saveDocument('vault' as any, encryptedVault);

      logger.debug('Vault synced to Firebase with encryption');
      return true;
    } catch (error) {
      logger.error('Failed to sync vault to Firebase:', error);
      return false;
    }
  }

  async fetchVaultFromFirebase(
    userId: string
  ): Promise<EncryptedVaultData | null> {
    if (!isFirebaseConfigured()) {
      return null;
    }

    try {
      const firestoreSync = getFirestoreSync(userId);
      const vaults = await firestoreSync.fetchAll<EncryptedVaultData>('vault' as any);

      if (vaults.length > 0) {
        return vaults[0];
      }

      return null;
    } catch (error) {
      logger.error('Failed to fetch vault from Firebase:', error);
      return null;
    }
  }

  async restoreVaultFromFirebase(
    userId: string,
    pin: string,
    existingVault?: Partial<SecretVault>
  ): Promise<SecretVault | null> {
    try {
      const encryptedData = await this.fetchVaultFromFirebase(userId);

      if (!encryptedData) {
        logger.debug('No vault data found in Firebase');
        return null;
      }

      const vault = await this.decryptVaultFromSync(encryptedData, pin, existingVault);

      logger.debug('Vault restored from Firebase successfully');
      return vault;
    } catch (error) {
      logger.error('Failed to restore vault from Firebase:', error);
      throw error;
    }
  }

  async checkVaultExistsInFirebase(userId: string): Promise<boolean> {
    try {
      const encryptedData = await this.fetchVaultFromFirebase(userId);
      return encryptedData !== null;
    } catch {
      return false;
    }
  }

  getVaultSyncMetadata(encryptedData: EncryptedVaultData): {
    lastSynced: Date;
    version: number;
    algorithm: string;
  } {
    return {
      lastSynced: encryptedData.updatedAt,
      version: encryptedData.syncVersion,
      algorithm: encryptedData.encryptionMetadata.algorithm
    };
  }
}

export const encryptedVaultSync = new EncryptedVaultSyncService();
