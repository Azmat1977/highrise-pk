/**
 * hooks/useAuthGate.ts
 *
 * Highrise.pk — Enterprise Auth Gate Hook
 *
 * Purpose:
 *   Central hook for gating any action behind login.
 *   Used by inquiry forms, save actions, etc.
 *
 * Usage:
 *   const { requireAuth, isAuthenticated, session, authGateOpen, closeAuthGate } = useAuthGate();
 *
 *   const handleContact = () => {
 *     requireAuth(() => {
 *       // This callback only runs if user is logged in
 *       setInquiryOpen(true);
 *     });
 *   };
 *
 * SECURITY:
 *   → Uses NextAuth's useSession for real-time session state
 *   → Never trusts client-side flags alone
 *   → Callback stored in ref (not closure) for post-login execution
 *   → Auto-closes gate when session detected
 */

'use client';

import { useSession } from 'next-auth/react';
import { useState, useCallback, useRef, useEffect } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface AuthGateContext {
  /** Action description shown in modal (e.g. "book a site visit") */
  actionDescription?: string;
  /** Entity title for context (e.g. "Al Rehman Arcade") */
  entityTitle?: string;
}

export interface UseAuthGateReturn {
  /** Current session (null if not logged in) */
  session:          ReturnType<typeof useSession>['data'];
  /** Session loading status */
  status:           ReturnType<typeof useSession>['status'];
  /** True if user is logged in */
  isAuthenticated:  boolean;
  /** Whether the auth gate modal should be open */
  authGateOpen:     boolean;
  /** Context info to display in the modal */
  gateContext:      AuthGateContext;
  /** Open auth gate manually (rarely needed) */
  openAuthGate:     (context?: AuthGateContext) => void;
  /** Close auth gate manually */
  closeAuthGate:    () => void;
  /**
   * Main API: requires auth before executing callback.
   * If logged in → runs immediately.
   * If not logged in → shows gate, runs after successful login.
   */
  requireAuth:      (callback: () => void, context?: AuthGateContext) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────────────────────────────────────

export function useAuthGate(): UseAuthGateReturn {
  const { data: session, status } = useSession();
  const isAuthenticated = !!session?.user;

  const [authGateOpen, setAuthGateOpen] = useState(false);
  const [gateContext, setGateContext]   = useState<AuthGateContext>({});

  // Store pending callback in ref (survives re-renders)
  const pendingCallbackRef = useRef<(() => void) | null>(null);

  // ─── Auto-execute pending callback when session becomes available ───
  useEffect(() => {
    if (isAuthenticated && pendingCallbackRef.current) {
      const callback = pendingCallbackRef.current;
      pendingCallbackRef.current = null;
      setAuthGateOpen(false);

      // Delay slightly to let modal close animation finish
      setTimeout(() => {
        callback();
      }, 100);
    }
  }, [isAuthenticated]);

  // ─── Open auth gate manually ───
  const openAuthGate = useCallback((context?: AuthGateContext) => {
    if (context) setGateContext(context);
    setAuthGateOpen(true);
  }, []);

  // ─── Close auth gate manually ───
  const closeAuthGate = useCallback(() => {
    setAuthGateOpen(false);
    pendingCallbackRef.current = null;
  }, []);

  // ─── Main API: require auth before executing callback ───
  const requireAuth = useCallback(
    (callback: () => void, context?: AuthGateContext) => {
      if (isAuthenticated) {
        // Already logged in → execute immediately
        callback();
        return;
      }

      // Not logged in → store callback + open gate
      pendingCallbackRef.current = callback;
      if (context) setGateContext(context);
      setAuthGateOpen(true);
    },
    [isAuthenticated],
  );

  return {
    session,
    status,
    isAuthenticated,
    authGateOpen,
    gateContext,
    openAuthGate,
    closeAuthGate,
    requireAuth,
  };
}