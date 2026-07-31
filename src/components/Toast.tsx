import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

export type ToastVariant = "info" | "success" | "warning" | "error";

export type ToastAction = {
  label: string;
  onClick: () => void;
};

export type ToastInput = {
  message: string;
  variant?: ToastVariant; // default "info"
  durationMs?: number; // default 3200; 0 = sticky until dismiss
  action?: ToastAction; // optional button e.g. "View release"
};

export type ToastItem = ToastInput & { id: string };

const DEFAULT_DURATION_MS = 3200;
const MAX_VISIBLE = 3;

let toastSeq = 0;

function nextToastId(): string {
  toastSeq += 1;
  return `toast-${Date.now()}-${toastSeq}`;
}

/**
 * Local toast queue for a page (settings).
 * Pair with `<ToastViewport />` near the root of the view.
 */
export function useToast(): {
  toasts: ToastItem[];
  showToast: (input: ToastInput | string) => string;
  dismissToast: (id: string) => void;
  clearToasts: () => void;
} {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  const clearTimer = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer !== undefined) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const dismissToast = useCallback(
    (id: string) => {
      clearTimer(id);
      setToasts((prev) => prev.filter((t) => t.id !== id));
    },
    [clearTimer],
  );

  const clearToasts = useCallback(() => {
    for (const timer of timersRef.current.values()) {
      clearTimeout(timer);
    }
    timersRef.current.clear();
    setToasts([]);
  }, []);

  const showToast = useCallback(
    (input: ToastInput | string): string => {
      const normalized: ToastInput =
        typeof input === "string" ? { message: input } : input;

      const id = nextToastId();
      const item: ToastItem = {
        ...normalized,
        id,
        variant: normalized.variant ?? "info",
        durationMs:
          normalized.durationMs === undefined
            ? DEFAULT_DURATION_MS
            : normalized.durationMs,
      };

      setToasts((prev) => {
        const next = [...prev, item];
        // Drop oldest when over the visible cap.
        if (next.length > MAX_VISIBLE) {
          const overflow = next.length - MAX_VISIBLE;
          for (let i = 0; i < overflow; i += 1) {
            clearTimer(next[i].id);
          }
          return next.slice(overflow);
        }
        return next;
      });

      const duration = item.durationMs ?? DEFAULT_DURATION_MS;
      if (duration > 0) {
        const timer = setTimeout(() => {
          dismissToast(id);
        }, duration);
        timersRef.current.set(id, timer);
      }

      return id;
    },
    [clearTimer, dismissToast],
  );

  useEffect(() => {
    return () => {
      for (const timer of timersRef.current.values()) {
        clearTimeout(timer);
      }
      timersRef.current.clear();
    };
  }, []);

  return { toasts, showToast, dismissToast, clearToasts };
}

/**
 * Fixed bottom-right stack. Place once near root of settings (or side panel later).
 * Newest sits on top of the stack (above older toasts).
 */
export function ToastViewport(props: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}): JSX.Element {
  const { toasts, onDismiss } = props;

  return (
    <div className="toast-viewport" aria-live="polite" aria-relevant="additions">
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}): JSX.Element {
  const variant = toast.variant ?? "info";

  const handleAction = () => {
    toast.action?.onClick();
  };

  return (
    <div
      className={`toast toast--${variant}`}
      role="status"
      aria-live="polite"
    >
      <div className="toast__body">
        <p className="toast__message">{toast.message}</p>
        {toast.action ? (
          <button
            type="button"
            className="toast__action"
            onClick={handleAction}
          >
            {toast.action.label}
          </button>
        ) : null}
      </div>
      <button
        type="button"
        className="toast__close"
        aria-label="Dismiss"
        onClick={() => onDismiss(toast.id)}
      >
        <X size={14} strokeWidth={2} aria-hidden />
      </button>
    </div>
  );
}
