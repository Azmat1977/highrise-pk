import DOMPurify from 'isomorphic-dompurify';

const BLOG_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export function sanitizeBlogHtml(html: string): string {
  return DOMPurify.sanitize(String(html ?? ''), {
    ADD_TAGS: ['iframe'],
    ADD_ATTR: [
      'allow',
      'allowfullscreen',
      'frameborder',
      'scrolling',
      'loading',
      'referrerpolicy',
    ],
    FORBID_TAGS: ['script', 'object', 'embed'],
    FORBID_ATTR: ['srcdoc'],
  });
}

export function parseBlogImageDataUrl(value: string): {
  buffer: Buffer;
  filename: string;
} | null {
  const match = /^data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=\r\n]+)$/i.exec(
    String(value ?? '').trim(),
  );
  if (!match) return null;

  const subtype = match[1].toLowerCase();
  const ext = subtype === 'jpeg' || subtype === 'jpg' ? 'jpg' : subtype;

  try {
    const buffer = Buffer.from(match[2].replace(/\s+/g, ''), 'base64');
    if (buffer.length === 0 || buffer.length > BLOG_IMAGE_MAX_BYTES) return null;
    return { buffer, filename: `blog-cover.${ext}` };
  } catch {
    return null;
  }
}
