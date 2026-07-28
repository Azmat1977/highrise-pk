# Signup and email-verification security

Section 1C uses server-only secrets and a distributed rate limiter. Never expose these values to browser code or commit them to Git.

## Required in production

- `NEXTAUTH_SECRET`: at least 32 characters. Existing NextAuth deployments should already have this.
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `TURNSTILE_SECRET_KEY`
- SMTP variables already used by the project: `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASSWORD`, and optionally `EMAIL_FROM` and `EMAIL_SECURE`.

Authentication endpoints fail closed in production when the distributed rate limiter is unavailable.

## Recommended dedicated secrets

- `OTP_PEPPER`: at least 32 characters. Falls back only to the server-side `NEXTAUTH_SECRET`.
- `SIGNUP_TEMP_SECRET`: at least 32 characters. Falls back only to the server-side `NEXTAUTH_SECRET`.
- `RATE_LIMIT_KEY_SECRET`: at least 32 characters. Falls back only to the server-side `NEXTAUTH_SECRET`.

Dedicated values provide key separation. Generate them with a cryptographically secure password or secret generator. Do not reuse passwords, API tokens, or database credentials.

## Operational notes

- Signup OTPs expire after 10 minutes and are stored only as HMAC-SHA-256 digests.
- Temporary signup passwords are encrypted with AES-256-GCM and authenticated before use.
- OTP verification has a persistent five-attempt limit.
- Resends have a 60-second cooldown and five-resend limit.
- Signup, verification, and resend rate limits use both IP and normalized email.
- MongoDB transactions are required for atomic OTP consumption and account creation. MongoDB Atlas supports this.
- Raw client IP addresses are not stored in signup challenge records.
