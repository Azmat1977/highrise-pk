import React, { useEffect, useMemo } from "react";
import { createPortal } from "react-dom";

type ConfirmVariant = "default" | "danger";

export type ConfirmActionModalProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;

  // Optional “extra warning” line (e.g., irreversible notice)
  warning?: string;

  // Optional typed confirmation for destructive actions (e.g. require typing DELETE)
  requireText?: string;
  requireTextLabel?: string;

  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
};

function useMountedPortal() {
  const el = useMemo(() => {
    if (typeof document === "undefined") return null;
    const div = document.createElement("div");
    div.setAttribute("data-confirm-modal-root", "true");
    return div;
  }, []);

  useEffect(() => {
    if (!el || typeof document === "undefined") return;
    document.body.appendChild(el);
    return () => {
      try {
        document.body.removeChild(el);
      } catch {}
    };
  }, [el]);

  return el;
}

export const ENTERPRISE_CONFIRM_COPY = {
  trash: {
    title: "Move listing to Trash?",
    message:
      "This will remove the listing from public visibility and active results. You can restore it later from Trash.",
    confirmLabel: "Move to Trash",
    warning:
      "Tip: Use Trash for temporary removal. Permanent deletion is irreversible.",
  },
  restore: {
    title: "Restore this listing?",
    message:
      "This will restore the listing back to its previous state and make it available according to its current approval status.",
    confirmLabel: "Restore",
    warning: "If the listing requires approval, it may remain pending after restore.",
  },
  permanentDelete: {
    title: "Permanently delete this listing?",
    message:
      "This action will permanently delete the listing and associated media references. This cannot be undone.",
    confirmLabel: "Permanently Delete",
    warning:
      "This is irreversible. If you proceed, the listing cannot be recovered.",
    requireText: "DELETE",
    requireTextLabel: 'Type "DELETE" to confirm',
  },
} as const;

export default function ConfirmActionModal(props: ConfirmActionModalProps) {
  const {
    open,
    title,
    message,
    confirmLabel,
    cancelLabel = "Cancel",
    variant = "default",
    warning,
    requireText,
    requireTextLabel,
    loading = false,
    onConfirm,
    onCancel,
  } = props;

  const portalEl = useMountedPortal();

  // Lock background scroll when modal is open (defense-in-depth UX)
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!open) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  // ESC to close (safe UX)
  useEffect(() => {
    if (!open) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onCancel]);

  const [typed, setTyped] = React.useState("");
  useEffect(() => {
    if (open) setTyped("");
  }, [open]);

  const canConfirm = useMemo(() => {
    if (loading) return false;
    if (!requireText) return true;
    return typed.trim() === requireText;
  }, [loading, requireText, typed]);

  if (!open) return null;
  if (!portalEl) return null;

  const confirmBtnBase =
    "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed";
  const confirmBtn =
    variant === "danger"
      ? `${confirmBtnBase} bg-red-600 text-white hover:bg-red-700 focus:ring-red-600`
      : `${confirmBtnBase} bg-black text-white hover:bg-neutral-800 focus:ring-black`;

  const cancelBtn =
    "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold border border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2";

  const overlay = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      aria-modal="true"
      role="dialog"
      aria-label={title}
    >
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => {
          // Click outside closes (enterprise standard)
          if (!loading) onCancel();
        }}
      />
      <div className="relative w-[92vw] max-w-md rounded-2xl bg-white shadow-xl">
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-neutral-900">{title}</h2>
              <p className="mt-2 text-sm text-neutral-700 leading-relaxed">
                {message}
              </p>
            </div>

            <button
              type="button"
              className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 focus:outline-none focus:ring-2 focus:ring-black"
              onClick={() => {
                if (!loading) onCancel();
              }}
              aria-label="Close"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M18 6L6 18M6 6L18 18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

          {warning ? (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm text-amber-900 leading-relaxed">{warning}</p>
            </div>
          ) : null}

          {requireText ? (
            <div className="mt-4">
              <label className="block text-sm font-semibold text-neutral-900">
                {requireTextLabel || `Type "${requireText}" to confirm`}
              </label>
              <input
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                disabled={loading}
                className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black disabled:opacity-60"
                autoComplete="off"
                spellCheck={false}
                inputMode="text"
              />
            </div>
          ) : null}

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              className={cancelBtn}
              onClick={() => {
                if (!loading) onCancel();
              }}
              disabled={loading}
            >
              {cancelLabel}
            </button>

            <button
              type="button"
              className={confirmBtn}
              onClick={() => {
                if (!canConfirm) return;
                onConfirm();
              }}
              disabled={!canConfirm}
            >
              {loading ? "Please wait…" : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, portalEl);
}
