// types/next-auth.d.ts
// Highrise.pk - NextAuth Type Augmentation
// Synced with pages/api/auth/[...nextauth].ts JWT & session callbacks
// Strict mode compliant - no silent undefined fields

import { DefaultSession, DefaultUser } from "next-auth";
import { DefaultJWT } from "next-auth/jwt";

// Session & User Augmentation

declare module "next-auth" {
  interface Session {
    user: {
      // Core identity
      id: string;

      // Role system - use this, not isDeveloper/isAgent flags
      role?: string;

      // Account state - set by JWT callback from User model
      status?: string;
      isEmailVerified?: boolean;

      // Token versioning - for forced re-login after role change
      tokenVersion?: number;

      // Contact
      phone?: string;

      // Inherited from DefaultSession["user"]:
      // name, email, image
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    // Core identity - id comes from DefaultUser
    role?: string;
    status?: string;
    isEmailVerified?: boolean;
    tokenVersion?: number;
    phone?: string;
  }
}

// JWT Token Augmentation

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    // Core identity
    id?: string;

    // Role system
    role?: string;

    // Account state
    status?: string;
    isEmailVerified?: boolean;
    isDeleted?: boolean;
    accountLocked?: boolean;

    // Token versioning - increment forces re-login
    tokenVersion?: number;

    // Contact
    phone?: string;

    // Inherited from DefaultJWT:
    // name, email, picture, sub, iat, exp, jti
  }
}
export {};