// lib/aiCache.ts

/**
 * 🔐 ENTERPRISE AI RESPONSE CACHING
 * 
 * Features:
 * ├── In-memory LRU cache (can be replaced with Redis)
 * ├── TTL-based expiration
 * ├── Cache key generation
 * ├── Hit/miss tracking
 * └── Memory-safe (max 1000 entries)
 */

import crypto from 'crypto';

// ═══════════════════════════════════════════════════════════════
// 🔒 TYPES
// ═══════════════════════════════════════════════════════════════

interface CacheEntry {
  response: string;
  timestamp: number;
  ttl: number;
  hits: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
}

// ═══════════════════════════════════════════════════════════════
// 🗄️ IN-MEMORY CACHE STORE
// ═══════════════════════════════════════════════════════════════

class AICache {
  private cache: Map<string, CacheEntry>;
  private maxSize: number;
  private stats: { hits: number; misses: number };

  constructor(maxSize: number = 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.stats = { hits: 0, misses: 0 };
  }

  /**
   * Generate cache key from message
   */
  private generateKey(message: string): string {
    // Normalize message (lowercase, trim, remove extra spaces)
    const normalized = message
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[?!.,]/g, ''); // Remove punctuation

    // Create hash
    return crypto
      .createHash('sha256')
      .update(normalized)
      .digest('hex')
      .slice(0, 32);
  }

  /**
   * Get TTL based on query type
   */
  private getTTL(message: string): number {
    const lowerMessage = message.toLowerCase();

    // Price queries: 1 hour (prices change frequently)
    if (
      lowerMessage.includes('price') ||
      lowerMessage.includes('cost') ||
      lowerMessage.includes('rate')
    ) {
      return 60 * 60 * 1000; // 1 hour
    }

    // Market/investment queries: 6 hours
    if (
      lowerMessage.includes('invest') ||
      lowerMessage.includes('market') ||
      lowerMessage.includes('trend')
    ) {
      return 6 * 60 * 60 * 1000; // 6 hours
    }

    // General information: 24 hours
    if (
      lowerMessage.includes('how to') ||
      lowerMessage.includes('what is') ||
      lowerMessage.includes('process') ||
      lowerMessage.includes('guide')
    ) {
      return 24 * 60 * 60 * 1000; // 24 hours
    }

    // Default: 3 hours
    return 3 * 60 * 60 * 1000;
  }

  /**
   * Check if entry is expired
   */
  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  /**
   * Enforce max size using LRU (Least Recently Used)
   */
  private enforceMaxSize(): void {
    if (this.cache.size <= this.maxSize) return;

    // Find least recently used entry (oldest timestamp, lowest hits)
    let oldestKey: string | null = null;
    let oldestScore = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      // Score = age + (1 / hits) - lower score = older and less used
      const age = Date.now() - entry.timestamp;
      const score = age + (1000000 / (entry.hits + 1));

      if (score < oldestScore) {
        oldestScore = score;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Get cached response
   */
  get(message: string): string | null {
    const key = this.generateKey(message);
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // Update hits
    entry.hits++;
    entry.timestamp = Date.now(); // Update timestamp for LRU
    this.stats.hits++;

    return entry.response;
  }

  /**
   * Set cached response
   */
  set(message: string, response: string): void {
    const key = this.generateKey(message);
    const ttl = this.getTTL(message);

    this.cache.set(key, {
      response,
      timestamp: Date.now(),
      ttl,
      hits: 0,
    });

    this.enforceMaxSize();
  }

  /**
   * Clear expired entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      size: this.cache.size,
      hitRate: total > 0 ? (this.stats.hits / total) * 100 : 0,
    };
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0 };
  }
}

// ═══════════════════════════════════════════════════════════════
// 🌍 SINGLETON INSTANCE
// ═══════════════════════════════════════════════════════════════

const aiCache = new AICache(1000);

// Run cleanup every 10 minutes
setInterval(() => {
  aiCache.cleanup();
}, 10 * 60 * 1000);

export default aiCache;
