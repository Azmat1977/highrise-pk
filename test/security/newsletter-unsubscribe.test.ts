import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── Mock every side-effecting dependency BEFORE importing the handler ─────────
vi.mock('@/lib/dbConnect', () => ({ default: vi.fn(async () => {}) }));
vi.mock('@/models/SecurityEvent', () => ({ default: { create: vi.fn(async () => ({})) } }));
vi.mock('@/models/NewsletterSubscriber', () => ({ default: { findOne: vi.fn() } }));
vi.mock('@/lib/rateLimit', () => ({
  rateLimitApi: vi.fn(async () => ({ ok: true, limit: 100, remaining: 99, reset: Date.now() + 60_000 })),
  setRateLimitHeaders: vi.fn(),
  sendRateLimitResponse: vi.fn(),
}));

import handler from '@/pages/api/newsletter/unsubscribe';
import NewsletterSubscriber from '@/models/NewsletterSubscriber';
import { createReq, createRes, execChain } from './helpers';

const VALID_TOKEN = 'a'.repeat(64);

function subscriber(over: Record<string, unknown> = {}) {
  return {
    status: 'active',
    normalizedEmail: 'user@example.com',
    unsubscribeToken: VALID_TOKEN,
    unsubscribedAt: undefined as Date | undefined,
    save: vi.fn(async () => {}),
    ...over,
  };
}

function findOneReturns(doc: unknown) {
  (NewsletterSubscriber.findOne as any).mockReturnValue(execChain(doc));
}

describe('SEC-01 · newsletter unsubscribe (token-only)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findOneReturns(null);
  });

  it('GET with email but no token → missing_token and NO lookup or write', async () => {
    const doc = subscriber();
    findOneReturns(doc);
    const res = createRes();

    await handler(createReq({ method: 'GET', query: { email: 'user@example.com' } }), res as any);

    expect(res.redirectUrl).toContain('error=missing_token');
    expect(NewsletterSubscriber.findOne).not.toHaveBeenCalled();
    expect(doc.save).not.toHaveBeenCalled();
  });

  it('POST with email but no token → 400 and NO lookup or write', async () => {
    const doc = subscriber();
    findOneReturns(doc);
    const res = createRes();

    await handler(
      createReq({ method: 'POST', query: {}, body: { email: 'user@example.com' } }),
      res as any,
    );

    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({ success: false, message: 'Unsubscribe token is required' });
    expect(NewsletterSubscriber.findOne).not.toHaveBeenCalled();
    expect(doc.save).not.toHaveBeenCalled();
  });

  it('GET with no token at all → missing_token', async () => {
    const res = createRes();
    await handler(createReq({ method: 'GET', query: {} }), res as any);
    expect(res.redirectUrl).toContain('error=missing_token');
  });

  it('malformed token → invalid_token (GET) / 400 (POST), no lookup', async () => {
    const getRes = createRes();
    await handler(createReq({ method: 'GET', query: { token: 'abc' } }), getRes as any);
    expect(getRes.redirectUrl).toContain('error=invalid_token');

    const postRes = createRes();
    await handler(createReq({ method: 'POST', body: { token: 'abc' } }), postRes as any);
    expect(postRes.statusCode).toBe(400);
    expect(postRes.body).toMatchObject({ success: false, message: 'Invalid unsubscribe token' });

    expect(NewsletterSubscriber.findOne).not.toHaveBeenCalled();
  });

  it('valid-format but unknown token → 404', async () => {
    findOneReturns(null);
    const res = createRes();

    await handler(createReq({ method: 'POST', body: { token: VALID_TOKEN } }), res as any);

    expect(res.statusCode).toBe(404);
    expect(res.body).toMatchObject({ success: false });
  });

  it('valid token unsubscribes an active subscriber (POST)', async () => {
    const doc = subscriber();
    findOneReturns(doc);
    const res = createRes();

    await handler(createReq({ method: 'POST', body: { token: VALID_TOKEN } }), res as any);

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ success: true });
    expect(doc.status).toBe('unsubscribed');
    expect(doc.unsubscribedAt).toBeInstanceOf(Date);
    expect(doc.save).toHaveBeenCalledTimes(1);
  });

  it('valid token unsubscribes an active subscriber (GET → redirect success)', async () => {
    const doc = subscriber();
    findOneReturns(doc);
    const res = createRes();

    await handler(createReq({ method: 'GET', query: { token: VALID_TOKEN } }), res as any);

    expect(res.redirectUrl).toContain('success=true');
    expect(doc.status).toBe('unsubscribed');
    expect(doc.save).toHaveBeenCalledTimes(1);
  });

  it('already-unsubscribed is idempotent (no second write)', async () => {
    const doc = subscriber({ status: 'unsubscribed' });
    findOneReturns(doc);
    const res = createRes();

    await handler(createReq({ method: 'POST', body: { token: VALID_TOKEN } }), res as any);

    expect(res.statusCode).toBe(200);
    expect(String((res.body as any).message)).toMatch(/already/i);
    expect(doc.save).not.toHaveBeenCalled();
  });
});
