import { logger } from '../utils/logger';

export interface CompressionResult {
  data: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
}

class CompressionService {
  private encoder = new TextEncoder();
  private decoder = new TextDecoder();

  async compress(data: any): Promise<CompressionResult> {
    const jsonString = JSON.stringify(data);
    const originalSize = this.encoder.encode(jsonString).length;

    try {
      if (typeof CompressionStream !== 'undefined') {
        const compressedData = await this.compressWithStream(jsonString);
        const compressedSize = compressedData.length;
        
        return {
          data: this.arrayBufferToBase64(compressedData),
          originalSize,
          compressedSize,
          compressionRatio: compressedSize / originalSize
        };
      } else {
        const minified = this.minifyJSON(data);
        const minifiedSize = this.encoder.encode(minified).length;
        
        return {
          data: btoa(encodeURIComponent(minified)),
          originalSize,
          compressedSize: minifiedSize,
          compressionRatio: minifiedSize / originalSize
        };
      }
    } catch (error) {
      logger.error('Compression failed, using fallback:', error);
      const base64Data = btoa(encodeURIComponent(jsonString));
      return {
        data: base64Data,
        originalSize,
        compressedSize: base64Data.length,
        compressionRatio: 1
      };
    }
  }

  async decompress(compressedData: string, useNativeCompression: boolean = true): Promise<any> {
    try {
      if (useNativeCompression && typeof DecompressionStream !== 'undefined') {
        const buffer = this.base64ToArrayBuffer(compressedData);
        const decompressedData = await this.decompressWithStream(buffer);
        return JSON.parse(this.decoder.decode(decompressedData));
      } else {
        const jsonString = decodeURIComponent(atob(compressedData));
        return JSON.parse(jsonString);
      }
    } catch (error) {
      logger.error('Decompression failed:', error);
      throw error;
    }
  }

  private async compressWithStream(data: string): Promise<Uint8Array> {
    const stream = new Blob([data]).stream();
    const compressedStream = stream.pipeThrough(new CompressionStream('gzip'));
    const reader = compressedStream.getReader();
    const chunks: Uint8Array[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    return result;
  }

  private async decompressWithStream(data: Uint8Array): Promise<Uint8Array> {
    const stream = new Blob([data as unknown as BlobPart]).stream();
    const decompressedStream = stream.pipeThrough(new DecompressionStream('gzip'));
    const reader = decompressedStream.getReader();
    const chunks: Uint8Array[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    return result;
  }

  private minifyJSON(data: any): string {
    return JSON.stringify(data, (_key, value) => {
      if (value === null || value === undefined) {
        return undefined;
      }
      if (typeof value === 'string' && value.trim() === '') {
        return undefined;
      }
      return value;
    });
  }

  private arrayBufferToBase64(buffer: Uint8Array): string {
    let binary = '';
    const len = buffer.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(buffer[i]);
    }
    return btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): Uint8Array {
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  async compressBatch<T>(items: T[]): Promise<CompressionResult> {
    return this.compress(items);
  }

  async decompressBatch<T>(compressedData: string, useNativeCompression: boolean = true): Promise<T[]> {
    return this.decompress(compressedData, useNativeCompression);
  }

  estimateCompressionBenefit(data: any): boolean {
    const jsonString = JSON.stringify(data);
    const size = this.encoder.encode(jsonString).length;
    return size > 1024;
  }

  shouldCompress(data: any): boolean {
    if (Array.isArray(data) && data.length > 10) {
      return true;
    }
    
    const jsonString = JSON.stringify(data);
    return jsonString.length > 2048;
  }
}

export const compressionService = new CompressionService();
