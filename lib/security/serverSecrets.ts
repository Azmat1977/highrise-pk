// ========== FILE: lib/security/serverSecrets.ts ==========

const MIN_SECRET_LENGTH = 32;

export function requireServerSecret(
  names: readonly string[],
  purpose: string,
  minLength: number = MIN_SECRET_LENGTH
): string {
  for (const name of names) {
    const value = process.env[name];
    if (typeof value === "string" && value.length >= minLength) {
      return value;
    }
  }

  throw new Error(
    `${purpose} is not configured. Set ${names.join(" or ")} to at least ${minLength} characters.`
  );
}

// ========== END OF FILE ==========
