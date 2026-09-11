// ========== FILE: lib/dbConnect.ts ==========
// 🔒 ENTERPRISE DATABASE CONNECTION - HIGHRISE.PK
// Security Level: MAXIMUM | Connection Pooling | SSL/TLS | Retry Logic
// ═══════════════════════════════════════════════════════════════

import mongoose from "mongoose";

// ═══════════════════════════════════════════════════════════════
// 🔐 CONFIGURATION CONSTANTS
// ═══════════════════════════════════════════════════════════════

const MONGODB_URI = process.env.MONGODB_URI;

// ✅ Connection pool settings
const POOL_SIZE = parseInt(process.env.MONGODB_POOL_SIZE || "10", 10);
const MIN_POOL_SIZE = parseInt(process.env.MONGODB_MIN_POOL_SIZE || "2", 10);

// ✅ Timeout settings (milliseconds)
const SERVER_SELECTION_TIMEOUT = parseInt(
  process.env.MONGODB_SERVER_SELECTION_TIMEOUT || "10000",
  10
);
const CONNECT_TIMEOUT = parseInt(
  process.env.MONGODB_CONNECT_TIMEOUT || "30000",
  10
);
const SOCKET_TIMEOUT = parseInt(
  process.env.MONGODB_SOCKET_TIMEOUT || "45000",
  10
);

// ✅ Retry settings
const MAX_RETRY_ATTEMPTS = parseInt(
  process.env.MONGODB_MAX_RETRY_ATTEMPTS || "5",
  10
);
const RETRY_DELAY_MS = parseInt(
  process.env.MONGODB_RETRY_DELAY_MS || "1000",
  10
);

// ✅ Validate environment
if (!MONGODB_URI) {
  throw new Error(
    "🚨 MONGODB_URI is not defined. Add it to .env.local\n" +
    "Set MONGODB_URI to the Atlas connection string stored only in your local/server environment."
  );
}

// ✅ Type narrowing: URI is guaranteed to be string
const uri: string = MONGODB_URI;

// ═══════════════════════════════════════════════════════════════
// 🔐 CONNECTION CACHE (Serverless Optimization)
// ═══════════════════════════════════════════════════════════════

interface CachedConnection {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  isConnecting: boolean;
  lastConnectedAt: Date | null;
  connectionAttempts: number;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: CachedConnection | undefined;
}

const defaultCache: CachedConnection = {
  conn: null,
  promise: null,
  isConnecting: false,
  lastConnectedAt: null,
  connectionAttempts: 0,
};

let cached: CachedConnection = global.mongooseCache || { ...defaultCache };
global.mongooseCache = cached;

// ═══════════════════════════════════════════════════════════════
// 🔐 CONNECTION OPTIONS (Enterprise Configuration)
// ═══════════════════════════════════════════════════════════════

/**
 * ✅ Get MongoDB connection options based on environment
 */
function getConnectionOptions(): mongoose.ConnectOptions {
  const isProduction = process.env.NODE_ENV === "production";

  const options: mongoose.ConnectOptions = {
    // ✅ Connection Pool
    maxPoolSize: POOL_SIZE,
    minPoolSize: MIN_POOL_SIZE,

    // ✅ Timeouts
    serverSelectionTimeoutMS: SERVER_SELECTION_TIMEOUT,
    connectTimeoutMS: CONNECT_TIMEOUT,
    socketTimeoutMS: SOCKET_TIMEOUT,

    // ✅ Buffer settings (disable for serverless)
    bufferCommands: false,

    // ✅ Heartbeat (connection health check)
    heartbeatFrequencyMS: 10000,

    // ✅ Retry settings
    retryWrites: true,
    retryReads: true,

    // ✅ Write concern (data durability)
    w: "majority",
    journal: true,

    // ✅ Read preference
    // Transactions REQUIRE primary - primaryPreferred breaks withTransaction
    // ("Read preference in a transaction must be primary"). Do not change
    // without per-query secondary reads on heavy analytics paths.
    readPreference: "primary",

    // ✅ Compression (performance)
    compressors: ["zlib"],

    // ✅ App name (for monitoring in Atlas)
    appName: "Highrise.pk",

    // ✅ Auto-indexing (disable in production for performance)
    autoIndex: !isProduction,
    autoCreate: !isProduction,
  };

  // ✅ SSL/TLS (enforce in production)
  if (isProduction) {
    options.ssl = true;
    options.tls = true;
    options.tlsAllowInvalidCertificates = false;
    options.tlsAllowInvalidHostnames = false;
  }

  return options;
}

// ═══════════════════════════════════════════════════════════════
// 🔐 HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * ✅ Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * ✅ Calculate exponential backoff delay
 */
function getRetryDelay(attempt: number): number {
  // Exponential backoff: 1s, 2s, 4s, 8s, 16s (capped at 30s)
  const delay = Math.min(RETRY_DELAY_MS * Math.pow(2, attempt), 30000);
  // Add jitter (±20%) to prevent thundering herd
  const jitter = delay * 0.2 * (Math.random() - 0.5);
  return Math.round(delay + jitter);
}

/**
 * ✅ Log connection events (structured for monitoring)
 */
function logConnectionEvent(
  event: string,
  details?: Record<string, any>
): void {
  const timestamp = new Date().toISOString();
  const logData = {
    timestamp,
    service: "mongodb",
    event,
    ...details,
  };

  if (process.env.NODE_ENV === "development") {
    console.log(`[MongoDB] ${event}:`, logData);
  } else {
    // In production, use structured logging
    console.log(JSON.stringify(logData));
  }
}

// ═══════════════════════════════════════════════════════════════
// 🔐 CONNECTION EVENT HANDLERS
// ═══════════════════════════════════════════════════════════════

let eventHandlersRegistered = false;

/**
 * ✅ Register MongoDB connection event handlers
 */
function registerEventHandlers(): void {
  if (eventHandlersRegistered) return;
  eventHandlersRegistered = true;

  const connection = mongoose.connection;

  connection.on("connected", () => {
    cached.lastConnectedAt = new Date();
    cached.connectionAttempts = 0;
    logConnectionEvent("connected", {
      poolSize: POOL_SIZE,
      database: connection.db?.databaseName,
    });
  });

  connection.on("disconnected", () => {
    logConnectionEvent("disconnected", {
      lastConnectedAt: cached.lastConnectedAt?.toISOString(),
    });
  });

  connection.on("reconnected", () => {
    cached.lastConnectedAt = new Date();
    logConnectionEvent("reconnected");
  });

  connection.on("error", (error) => {
    logConnectionEvent("error", {
      message: error.message,
      code: (error as any).code,
    });
  });

  connection.on("close", () => {
    logConnectionEvent("close");
  });

  // ✅ Handle process termination gracefully
  const gracefulShutdown = async (signal: string) => {
    logConnectionEvent("shutdown_initiated", { signal });

    try {
      await mongoose.connection.close();
      logConnectionEvent("shutdown_complete", { signal });
      process.exit(0);
    } catch (error) {
      logConnectionEvent("shutdown_error", {
        signal,
        error: (error as Error).message,
      });
      process.exit(1);
    }
  };

  // Register shutdown handlers (only once)
  if (process.env.NODE_ENV !== "test") {
    process.once("SIGINT", () => gracefulShutdown("SIGINT"));
    process.once("SIGTERM", () => gracefulShutdown("SIGTERM"));
  }
}

// ═══════════════════════════════════════════════════════════════
// 🔐 MAIN CONNECTION FUNCTION
// ═══════════════════════════════════════════════════════════════

/**
 * ✅ Connect to MongoDB with retry logic and connection pooling
 * 
 * Features:
 * - Connection caching (serverless optimization)
 * - Exponential backoff retry
 * - SSL/TLS in production
 * - Connection pool management
 * - Event logging
 * - Graceful shutdown
 */
async function dbConnect(): Promise<typeof mongoose> {
  // ✅ Return cached connection if available and healthy
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  // ✅ Wait for existing connection attempt
  if (cached.isConnecting && cached.promise) {
    try {
      cached.conn = await cached.promise;
      return cached.conn;
    } catch (error) {
      // Connection failed, will retry below
      cached.promise = null;
      cached.isConnecting = false;
    }
  }

  // ✅ Register event handlers
  registerEventHandlers();

  // ✅ Get connection options
  const options = getConnectionOptions();

  // ✅ Retry loop with exponential backoff
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      cached.isConnecting = true;
      cached.connectionAttempts++;

      logConnectionEvent("connecting", {
        attempt: attempt + 1,
        maxAttempts: MAX_RETRY_ATTEMPTS,
      });

      // ✅ Set mongoose strict settings
      mongoose.set("strictQuery", true);

      // ✅ Create connection promise
      cached.promise = mongoose.connect(uri, options);

      // ✅ Wait for connection
      cached.conn = await cached.promise;
      cached.isConnecting = false;

      logConnectionEvent("connection_success", {
        attempt: attempt + 1,
        readyState: mongoose.connection.readyState,
      });

      return cached.conn;
    } catch (error) {
      lastError = error as Error;
      cached.promise = null;
      cached.isConnecting = false;

      logConnectionEvent("connection_failed", {
        attempt: attempt + 1,
        error: lastError.message,
        code: (lastError as any).code,
      });

      // ✅ Don't retry on certain errors
      const errorCode = (lastError as any).code;
      const nonRetryableCodes = [
        "ENOTFOUND", // DNS not found
        "ECONNREFUSED", // Connection refused (wrong URI)
        18, // Authentication failed
        "MongoServerSelectionError", // Invalid credentials
      ];

      if (nonRetryableCodes.includes(errorCode)) {
        logConnectionEvent("non_retryable_error", {
          code: errorCode,
          message: lastError.message,
        });
        break;
      }

      // ✅ Wait before retry (exponential backoff)
      if (attempt < MAX_RETRY_ATTEMPTS - 1) {
        const delay = getRetryDelay(attempt);
        logConnectionEvent("retry_scheduled", {
          delayMs: delay,
          nextAttempt: attempt + 2,
        });
        await sleep(delay);
      }
    }
  }

  // ✅ All retries exhausted
  const errorMessage =
    `MongoDB connection failed after ${MAX_RETRY_ATTEMPTS} attempts. ` +
    `Last error: ${lastError?.message || "Unknown error"}`;

  logConnectionEvent("connection_exhausted", {
    attempts: MAX_RETRY_ATTEMPTS,
    lastError: lastError?.message,
  });

  throw new Error(errorMessage);
}

// ═══════════════════════════════════════════════════════════════
// 🔐 UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * ✅ Check if database is connected
 */
export function isConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

/**
 * ✅ Get connection status details
 */
export function getConnectionStatus(): {
  isConnected: boolean;
  readyState: number;
  readyStateText: string;
  lastConnectedAt: Date | null;
  connectionAttempts: number;
  host?: string;
  database?: string;
} {
  const readyStateMap: Record<number, string> = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };

  return {
    isConnected: mongoose.connection.readyState === 1,
    readyState: mongoose.connection.readyState,
    readyStateText: readyStateMap[mongoose.connection.readyState] || "unknown",
    lastConnectedAt: cached.lastConnectedAt,
    connectionAttempts: cached.connectionAttempts,
    host: mongoose.connection.host,
    database: mongoose.connection.db?.databaseName,
  };
}

/**
 * ✅ Disconnect from database (for testing/cleanup)
 */
export async function dbDisconnect(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
    cached.conn = null;
    cached.promise = null;
    cached.isConnecting = false;
    logConnectionEvent("manual_disconnect");
  }
}

/**
 * ✅ Health check (for monitoring endpoints)
 */
export async function dbHealthCheck(): Promise<{
  healthy: boolean;
  latencyMs: number;
  details: Record<string, any>;
}> {
  const startTime = Date.now();

  try {
    // Ensure connected
    if (mongoose.connection.readyState !== 1) {
      await dbConnect();
    }

    // Run ping command
    const adminDb = mongoose.connection.db?.admin();
    if (adminDb) {
      await adminDb.ping();
    }

    const latencyMs = Date.now() - startTime;

    return {
      healthy: true,
      latencyMs,
      details: getConnectionStatus(),
    };
  } catch (error) {
    const latencyMs = Date.now() - startTime;

    return {
      healthy: false,
      latencyMs,
      details: {
        error: (error as Error).message,
        ...getConnectionStatus(),
      },
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// 🔐 EXPORTS
// ═══════════════════════════════════════════════════════════════

export default dbConnect;

// ========== END OF FILE ==========
