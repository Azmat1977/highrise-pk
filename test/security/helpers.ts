/**
 * Shared, dependency-free test doubles for Next.js API route handlers.
 * No Next runtime is required — handlers only use `res.setHeader/status/json/
 * send/end/redirect` and read `req.method/query/body/headers`.
 */

export interface FakeResponse {
  statusCode?: number;
  body: any;
  headers: Record<string, unknown>;
  redirectUrl?: string;
  ended: boolean;
  setHeader(name: string, value: unknown): FakeResponse;
  status(code: number): FakeResponse;
  json(payload: unknown): FakeResponse;
  send(payload: unknown): FakeResponse;
  end(payload?: unknown): FakeResponse;
  redirect(url: string): FakeResponse;
}

export function createRes(): FakeResponse {
  const res: FakeResponse = {
    statusCode: undefined,
    body: undefined,
    headers: {},
    redirectUrl: undefined,
    ended: false,
    setHeader(name, value) {
      res.headers[name] = value;
      return res;
    },
    status(code) {
      res.statusCode = code;
      return res;
    },
    json(payload) {
      res.body = payload;
      return res;
    },
    send(payload) {
      res.body = payload;
      return res;
    },
    end(payload) {
      res.body = payload;
      res.ended = true;
      return res;
    },
    redirect(url) {
      res.redirectUrl = url;
      res.statusCode = 302;
      return res;
    },
  };
  return res;
}

export function createReq(overrides: Record<string, unknown> = {}): any {
  return {
    method: 'GET',
    query: {},
    body: {},
    headers: {},
    socket: { remoteAddress: '127.0.0.1' },
    ...overrides,
  };
}

/**
 * A Mongoose-style awaitable chain: `.maxTimeMS(n).exec()`.
 * Used by models queried via `findOne(...).maxTimeMS(...).exec()`.
 */
export function execChain<T>(value: T) {
  return { maxTimeMS: () => ({ exec: async () => value }) };
}

/**
 * A Mongoose-style query chain used by `find(...).sort().limit().select()
 * .populate().lean()`.
 */
export function leanChain<T>(value: T) {
  const chain: any = {};
  for (const method of ['sort', 'limit', 'select', 'populate']) {
    chain[method] = () => chain;
  }
  chain.lean = async () => value;
  return chain;
}

/** The canonical escaping implemented by the fixes (spec, not the SUT helper). */
export function escapeRegexSpec(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
