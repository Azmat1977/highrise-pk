import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/dbConnect', () => ({ default: vi.fn(async () => {}) }));
vi.mock('@/models/Society', () => ({ default: { find: vi.fn() } }));
vi.mock('@/models/Projects', () => ({ default: { find: vi.fn() } }));
vi.mock('@/lib/rateLimit', () => ({
  rateLimitSearch: vi.fn(async () => ({ ok: true, limit: 60, remaining: 59, reset: Date.now() + 60_000 })),
  setRateLimitHeaders: vi.fn(),
  sendRateLimitResponse: vi.fn(),
}));

import handler from '@/pages/api/risk-alerts';
import Society from '@/models/Society';
import Project from '@/models/Projects';
import dbConnect from '@/lib/dbConnect';
import { createReq, createRes, leanChain } from './helpers';

function capturedCityMatch(): { $regex: string; $options: string } {
  const query = (Society.find as any).mock.calls[0][0] as {
    city: { $regex: string; $options: string };
  };
  return query.city;
}

describe('SEC-03 · risk-alerts city filter (escaped, substring, length-capped)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (Society.find as any).mockReturnValue(leanChain([]));
    (Project.find as any).mockReturnValue(leanChain([]));
  });

  it('normal city keeps substring semantics (no anchors)', async () => {
    const res = createRes();
    await handler(createReq({ method: 'GET', query: { city: 'Lahore', page: '2', limit: '5' } }), res as any);

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      pagination: { page: 2, limit: 5 },
    });

    const city = capturedCityMatch();
    expect(city.$options).toBe('i');
    expect(city.$regex).toBe('lahore');
    expect(city.$regex.startsWith('^')).toBe(false);
    expect(city.$regex.endsWith('$')).toBe(false);

    const re = new RegExp(city.$regex, city.$options);
    expect(re.test('Lahore')).toBe(true);
    expect(re.test('Lahore Cantt')).toBe(true); // substring preserved
  });

  it('regex metacharacters are escaped (literal match preserved)', async () => {
    const res = createRes();
    await handler(createReq({ method: 'GET', query: { city: '(a+)+$' } }), res as any);

    const city = capturedCityMatch();
    expect(city.$regex).toContain('\\(');
    expect(city.$regex).toContain('\\+');

    const re = new RegExp(city.$regex, city.$options);
    expect(re.test('(a+)+$')).toBe(true); // literal city text matches → escaped
    expect(re.test('a'.repeat(40))).toBe(false); // catastrophic pattern no longer active
  });

  it('64 characters is allowed (boundary)', async () => {
    const res = createRes();
    await handler(createReq({ method: 'GET', query: { city: 'y'.repeat(64) } }), res as any);
    expect(Society.find).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(200);
  });

  it('> 64 characters short-circuits: empty envelope, zero DB calls', async () => {
    const res = createRes();
    await handler(
      createReq({ method: 'GET', query: { city: 'x'.repeat(65), page: '3', limit: '7' } }),
      res as any,
    );

    expect(Society.find).not.toHaveBeenCalled();
    expect(Project.find).not.toHaveBeenCalled();
    expect(dbConnect).not.toHaveBeenCalled();

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      alerts: [],
      pagination: { page: 3, limit: 7, total: 0, totalPages: 0, hasMore: false },
      stats: {
        activeCount: 0,
        criticalCount: 0,
        highCount: 0,
        societyAlerts: 0,
        projectAlerts: 0,
        resolvedCount: 0,
      },
    });
  });
});
