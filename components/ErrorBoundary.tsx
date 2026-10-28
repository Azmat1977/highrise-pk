// components/ErrorBoundary.tsx
// Highrise.pk — React error boundary + client error beacon
// Safe fallback UI (brand colors). No stack traces shown to users.

import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

type BoundaryProps = {
  children: React.ReactNode;
  /** Short label for logs, e.g. "app-shell" | "aleem-widget" */
  name?: string;
  /** Compact fallback for floating widgets (no full-page card) */
  variant?: 'page' | 'widget';
  onError?: (error: Error, info: React.ErrorInfo) => void;
};

type BoundaryState = {
  hasError: boolean;
  message: string;
};

function reportClientError(payload: {
  source: 'error_boundary' | 'manual';
  message: string;
  name?: string;
  component?: string;
  fingerprint?: string;
  route?: string;
}): void {
  if (typeof window === 'undefined') return;

  const body = JSON.stringify({
    source: payload.source,
    message: payload.message.slice(0, 300),
    name: payload.name?.slice(0, 120),
    component: payload.component?.slice(0, 120),
    fingerprint: payload.fingerprint?.slice(0, 160),
    route: (payload.route ?? window.location.pathname).slice(0, 200),
  });

  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'application/json' });
      const ok = navigator.sendBeacon('/api/observability/client-error', blob);
      if (ok) return;
    }
  } catch {
    // fall through to fetch
  }

  void fetch('/api/observability/client-error', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {
    // swallow — monitoring must never break UX
  });
}

export default class ErrorBoundary extends React.Component<BoundaryProps, BoundaryState> {
  constructor(props: BoundaryProps) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): BoundaryState {
    return {
      hasError: true,
      message: error?.message ? String(error.message).slice(0, 120) : 'Something went wrong',
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    const component = this.props.name ?? 'unknown';
    const fingerprint = `${error?.name ?? 'Error'}:${(error?.message ?? '').slice(0, 80)}`;

    reportClientError({
      source: 'error_boundary',
      message: (error?.message || 'React render error').slice(0, 300),
      name: error?.name,
      component,
      fingerprint,
    });

    this.props.onError?.(error, info);

    if (process.env.NODE_ENV !== 'production') {
      console.error(`[ErrorBoundary:${component}]`, error, info?.componentStack);
    }
  }

  private handleReload = (): void => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  private handleHome = (): void => {
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  private handleDismissWidget = (): void => {
    this.setState({ hasError: false, message: '' });
  };

  render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    if (this.props.variant === 'widget') {
      return (
        <div className="fixed bottom-4 right-4 z-50 max-w-xs rounded-2xl border border-gray-200 bg-white p-4 shadow-xl">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#ef4444]/10">
              <AlertTriangle className="h-4 w-4 text-[#ef4444]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-[#004063]">Widget unavailable</p>
              <p className="mt-1 text-xs text-gray-600">
                Kuch technical issue aa gaya. Page use karte rahiye — baad mein dobara try karein.
              </p>
              <button
                type="button"
                onClick={this.handleDismissWidget}
                className="mt-3 text-xs font-semibold text-[#029bba] hover:underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex min-h-[50vh] w-full items-center justify-center bg-gray-50 px-4 py-16">
        <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-8 shadow-sm text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#ef4444]/10">
            <AlertTriangle className="h-7 w-7 text-[#ef4444]" />
          </div>
          <h1 className="text-xl font-black text-[#004063]">Something went wrong</h1>
          <p className="mt-2 text-sm text-gray-600 leading-relaxed">
            Page load karte waqt masla aa gaya. Aap refresh kar ke dobara try kar sakte hain —
            aapka data safe hai.
          </p>
          {process.env.NODE_ENV !== 'production' && this.state.message ? (
            <p className="mt-3 rounded-xl bg-gray-50 px-3 py-2 text-left text-xs font-mono text-gray-500 break-words">
              {this.state.message}
            </p>
          ) : null}
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={this.handleReload}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#029bba] px-4 py-3 text-sm font-bold text-white hover:bg-[#027a94] transition-colors active:scale-[0.98]"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh page
            </button>
            <button
              type="button"
              onClick={this.handleHome}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-[#004063] hover:bg-gray-50 transition-colors active:scale-[0.98]"
            >
              <Home className="h-4 w-4" />
              Go to Home
            </button>
          </div>
        </div>
      </div>
    );
  }
}