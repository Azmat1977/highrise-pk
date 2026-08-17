import crypto from 'crypto';

export type UploadAssetResourceType = 'image' | 'video' | 'raw';

export interface UploadAssetTokenPayload {
  v: 1;
  userId: string;
  publicId: string;
  folder: string;
  resourceType: UploadAssetResourceType;
  mimeType: string;
  exp: number;
}

function secret(): string {
  const value = process.env.PROPERTY_HASH_SECRET || process.env.RATE_LIMIT_KEY_SECRET;
  if (!value) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('PROPERTY_HASH_SECRET or RATE_LIMIT_KEY_SECRET is required for upload asset tokens.');
    }
    return 'dev-property-upload-token-secret';
  }
  return value;
}

function sign(encoded: string): string {
  return crypto.createHmac('sha256', secret()).update(encoded).digest('base64url');
}

export function createUploadAssetToken(input: Omit<UploadAssetTokenPayload, 'v' | 'exp'> & { ttlSeconds?: number }): string {
  const payload: UploadAssetTokenPayload = {
    v: 1,
    userId: input.userId,
    publicId: input.publicId,
    folder: input.folder,
    resourceType: input.resourceType,
    mimeType: input.mimeType,
    exp: Math.floor(Date.now() / 1000) + Math.max(60, Math.min(input.ttlSeconds ?? 3600, 24 * 60 * 60)),
  };
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  return `${encoded}.${sign(encoded)}`;
}

export function verifyUploadAssetToken(
  token: unknown,
  expected: Partial<Pick<UploadAssetTokenPayload, 'userId' | 'publicId' | 'folder' | 'resourceType'>> = {},
): UploadAssetTokenPayload | null {
  if (typeof token !== 'string' || token.length < 20 || token.length > 4096) return null;
  const [encoded, signature, extra] = token.split('.');
  if (!encoded || !signature || extra) return null;
  const expectedSig = sign(encoded);
  const a = Buffer.from(signature);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as UploadAssetTokenPayload;
    if (payload.v !== 1 || payload.exp <= Math.floor(Date.now() / 1000)) return null;
    if (expected.userId && payload.userId !== expected.userId) return null;
    if (expected.publicId && payload.publicId !== expected.publicId) return null;
    if (expected.folder && payload.folder !== expected.folder) return null;
    if (expected.resourceType && payload.resourceType !== expected.resourceType) return null;
    return payload;
  } catch {
    return null;
  }
}
