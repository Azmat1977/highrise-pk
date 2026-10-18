// ========== FILE: lib/dbGuard.js ==========
// Phase 0 — database write-safety guard (fail-closed).
//
// Read paths are NOT affected. Every database-WRITING operation (demo seed
// endpoint, cleanup scripts, live migrations) must refuse to run unless it is
// pointed at an explicitly configured, clearly non-production database
// (test / fixture / demo / dev naming), using MONGODB_URI_TEST where a
// dedicated test target is required.
//
// Messages never include credentials or host names — only the target
// database name and a local/remote classification.
// ============================================================

'use strict';

const NON_PROD_DB_PATTERN =
  /(?:^|[._-])(test(?:ing|s)?|fixture(?:s)?|demo|dev(?:elopment)?|mock|sandbox|local)(?:[._-]|$)/i;

/**
 * @param {string} name
 * @returns {boolean} true when the database name is clearly non-production
 */
function isNonProductionDbName(name) {
  return typeof name === 'string' && NON_PROD_DB_PATTERN.test(name);
}

/**
 * Parse a MongoDB connection string WITHOUT exposing credentials.
 * @param {string} uri
 * @returns {{ scheme: string, host: string, isLocal: boolean, isAtlas: boolean, dbName: string }}
 */
function parseMongoTarget(uri) {
  if (typeof uri !== 'string' || !/^mongodb(\+srv)?:\/\//i.test(uri.trim())) {
    throw new Error('Not a valid MongoDB connection string.');
  }

  const trimmed = uri.trim();
  const scheme = /^mongodb\+srv:\/\//i.test(trimmed) ? 'mongodb+srv' : 'mongodb';
  const rest = trimmed.replace(/^mongodb(\+srv)?:\/\//i, '');

  const at = rest.lastIndexOf('@');
  const hostAndPath = at === -1 ? rest : rest.slice(at + 1);

  const slash = hostAndPath.indexOf('/');
  const hosts = slash === -1 ? hostAndPath : hostAndPath.slice(0, slash);

  let dbName = '';
  if (slash !== -1) {
    let after = hostAndPath.slice(slash + 1);
    const q = after.indexOf('?');
    if (q !== -1) after = after.slice(0, q);
    try {
      dbName = decodeURIComponent(after);
    } catch {
      dbName = after;
    }
  }

  const firstHost = (hosts.split(',')[0] || '').trim().toLowerCase();
  const host = firstHost.replace(/:\d+$/, '');
  const isLocal =
    ['localhost', '127.0.0.1', '::1', '0.0.0.0'].includes(host) ||
    host.endsWith('.localhost');
  const isAtlas = scheme === 'mongodb+srv' && host.endsWith('.mongodb.net');

  return { scheme, host, isLocal, isAtlas, dbName };
}

/**
 * Safe human-readable description of a target (never includes credentials or host).
 * @param {string} uri
 * @returns {string}
 */
function describeTarget(uri) {
  const target = parseMongoTarget(uri);
  const where = target.isLocal ? 'local host' : 'remote host';
  return `database "${target.dbName || '(none specified)'}" on a ${where}`;
}

/**
 * Fail-closed validation for database-writing operations.
 * @param {string} uri
 * @param {{ purpose?: string }} [options]
 * @returns {{ scheme: string, host: string, isLocal: boolean, isAtlas: boolean, dbName: string }}
 */
function assertWriteAllowed(uri, options = {}) {
  const purpose = options.purpose || 'database write';

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      `Refusing ${purpose}: NODE_ENV=production is never allowed for guarded write tooling.`
    );
  }

  const target = parseMongoTarget(uri);

  if (!target.dbName) {
    throw new Error(
      `Refusing ${purpose}: the connection string does not name an explicit non-production database (test/fixture/demo/dev).`
    );
  }

  if (!isNonProductionDbName(target.dbName)) {
    throw new Error(
      `Refusing ${purpose}: database "${target.dbName}" is not marked as non-production (expected test/fixture/demo/dev naming). Guarded writes are fail-closed.`
    );
  }

  return target;
}

/**
 * Resolve the dedicated non-production database used by guarded write tooling.
 * @returns {string}
 */
function resolveTestUri() {
  const uri = process.env.MONGODB_URI_TEST;
  if (!uri) {
    throw new Error(
      'MONGODB_URI_TEST is not configured. Database-writing operations are disabled (fail-closed). ' +
        'Point MONGODB_URI_TEST at an isolated test database (a local MongoDB server is recommended), never at production.'
    );
  }
  return uri;
}

module.exports = {
  isNonProductionDbName,
  parseMongoTarget,
  describeTarget,
  assertWriteAllowed,
  resolveTestUri,
};

// ========== END OF FILE ==========
