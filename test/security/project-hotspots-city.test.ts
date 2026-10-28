import { beforeEach, describe, expect, it, vi } from 'vitest';

// Redis is never contacted: the mock returns a harmless in-memory stub, and the
// oversized-input guard must return before any Redis access.
const redisGet = vi.hoisted(() => vi.fn(async () => null));
vi.mock('@upstash/redis', () => ({
  Redis: { fromEnv: () => ({ get: redisGet, setex: vi.fn(async () => 'OK') }) },
}));
vi.mock('@/lib/dbConnect', () => ({ default: vi.fn(async () => {}) }));
vi.mock('@/models/Projects', () => ({ default: { aggregate: vi.fn() } }));

import { getHotspotAreas } from '@/lib/cache/projectAggregations';
import Project from '@/models/Projects';
import dbConnect from '@/lib/dbConnect';
import { escapeRegexSpec } from './helpers';

function capturedCityRegex(): RegExp | undefined {
  const pipeline = (Project.aggregate as any).mock.calls[0][0] as Array<{ $match: { city?: { $regex: RegExp } } }>;
  return pipeline[0]?.$match?.city?.$regex;
}

describe('SEC-05 · project hotspots city filter (escaped, anchored, length-capped)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (Project.aggregate as any).mockReturnValue({ option: async () => [] });
  });

  it('normal city: anchored case-insensitive exact match', async () => {
    const out = await getHotspotAreas('Karachi');
    expect(out).toEqual([]);

    const rx = capturedCityRegex();
    expect(rx).toBeInstanceOf(RegExp);
    expect(rx!.source).toBe('^Karachi$');
    expect(rx!.flags).toBe('i');
    expect(rx!.test('Karachi')).toBe(true);
    expect(rx!.test('Karachi Cantt')).toBe(false); // anchored exact
  });

  it('trims consistently and escapes metacharacters', async () => {
    await getHotspotAreas('  (a+)+$  ');

    const rx = capturedCityRegex()!;
    expect(rx.source).toBe('^' + escapeRegexSpec('(a+)+$') + '$');
    const re = new RegExp(rx.source, rx.flags);
    expect(re.test('(a+)+$')).toBe(true);
    expect(re.test('a'.repeat(40))).toBe(false);
  });

  it('> 64 characters returns [] before Redis, DB connect or aggregation', async () => {
    const out = await getHotspotAreas('q'.repeat(65));

    expect(out).toEqual([]);
    expect(Project.aggregate).not.toHaveBeenCalled();
    expect(dbConnect).not.toHaveBeenCalled();
    expect(redisGet).not.toHaveBeenCalled();
  });
});
