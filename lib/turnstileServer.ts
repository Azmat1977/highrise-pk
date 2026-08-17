import type { NextApiRequest } from 'next';

interface TurnstileResponse {
  success?: boolean;
  'error-codes'?: string[];
}

export function getRequestIp(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  const value = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return (value || '').split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
}

export async function verifyTurnstileToken(token: string, ip?: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') return false;
    return true;
  }
  if (!token) return false;

  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip && ip !== 'unknown') body.set('remoteip', ip);

    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return false;
    const data = await response.json() as TurnstileResponse;
    return data.success === true;
  } catch {
    return false;
  }
}
