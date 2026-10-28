import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/dbConnect', () => ({ default: vi.fn(async () => {}) }));
vi.mock('@/models/Blog', () => ({ default: { find: vi.fn() } }));

import handler from '@/pages/api/blogs/rss';
import Blog from '@/models/Blog';
import { createReq, createRes, leanChain } from './helpers';

function capturedCategoryQuery(): RegExp | undefined {
  const query = (Blog.find as any).mock.calls[0][0] as { category?: RegExp };
  return query.category;
}

const sampleBlog = {
  title: 'Hello World',
  slug: 'hello-world',
  excerpt: 'An excerpt',
  content: '<p>body</p>',
  category: 'news',
  publishedAt: new Date('2026-01-01T00:00:00Z'),
  tags: ['tag1'],
};

describe('SEC-04 · blog RSS category filter (escaped, anchored, length-capped)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (Blog.find as any).mockReturnValue(leanChain([]));
  });

  it('normal category: anchored, case-insensitive exact match', async () => {
    const res = createRes();
    await handler(createReq({ method: 'GET', query: { category: 'market-trends' } }), res as any);

    expect(res.statusCode).toBe(200);
    expect(String(res.headers['Content-Type'])).toContain('application/xml');

    const rx = capturedCategoryQuery();
    expect(rx).toBeInstanceOf(RegExp);
    expect(rx!.source).toBe('^market-trends$');
    expect(rx!.flags).toBe('i');
    expect(rx!.test('market-trends')).toBe(true);
    expect(rx!.test('MARKET-TRENDS')).toBe(true); // case-insensitive
    expect(rx!.test('market-trends-extra')).toBe(false); // anchored exact
  });

  it('regex metacharacters are escaped (literal match preserved)', async () => {
    const res = createRes();
    await handler(createReq({ method: 'GET', query: { category: '(a+)+$' } }), res as any);

    const rx = capturedCategoryQuery()!;
    expect(rx.source).toContain('\\(');
    const re = new RegExp(rx.source, rx.flags);
    expect(re.test('(a+)+$')).toBe(true);
    expect(re.test('a'.repeat(40))).toBe(false);
  });

  it('> 64 characters: no DB query, valid empty RSS, oversized value not echoed', async () => {
    const big = 'z'.repeat(65);
    const res = createRes();
    await handler(createReq({ method: 'GET', query: { category: big } }), res as any);

    expect(Blog.find).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
    expect(String(res.headers['Content-Type'])).toContain('application/xml');

    const xml = String(res.body);
    expect(xml).toContain('<rss');
    expect(xml).not.toContain(big);
    expect((xml.match(/<item>/g) || []).length).toBe(0);
  });

  it('no matching blogs → valid empty RSS with zero items', async () => {
    const res = createRes();
    await handler(createReq({ method: 'GET', query: { category: 'news' } }), res as any);

    expect(res.statusCode).toBe(200);
    const xml = String(res.body);
    expect(xml).toContain('<rss');
    expect((xml.match(/<item>/g) || []).length).toBe(0);
  });

  it('regression: matching blogs still render items', async () => {
    (Blog.find as any).mockReturnValue(leanChain([sampleBlog]));
    const res = createRes();
    await handler(createReq({ method: 'GET', query: { category: 'news' } }), res as any);

    const xml = String(res.body);
    expect((xml.match(/<item>/g) || []).length).toBe(1);
    expect(xml).toContain('Hello World');
  });
});
