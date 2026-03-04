import { useEffect, useState, useCallback } from 'react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ToastItem extends ToastMessage {
  exiting: boolean;
}

let toastListeners: Array<(toast: ToastMessage) => void> = [];

export function showToast(type: ToastMessage['type'], message: string) {
  const toast: ToastMessage = {
    id: Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
    type,
    message,
  };
  toastListeners.forEach((listener) => listener(toast));
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const startExit = useCallback((id: string) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
    );
    setTimeout(() => removeToast(id), 300);
  }, [removeToast]);

  useEffect(() => {
    const listener = (toast: ToastMessage) => {
      setToasts((prev) => [...prev, { ...toast, exiting: false }]);
      setTimeout(() => startExit(toast.id), 3500);
    };
    toastListeners.push(listener);
    return () => {
      toastListeners = toastListeners.filter((l) => l !== listener);
    };
  }, [startExit]);

  if (toasts.length === 0) return null;

  const typeStyles: Record<string, string> = {
    success: 'bg-emerald-500 text-white',
    error: 'bg-red-500 text-white',
    info: 'bg-brand-blue text-white',
  };

  const icons: Record<string, string> = {
    success: '\u2713',
    error: '\u2715',
    info: '\u2139',
  };

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`${typeStyles[toast.type]} px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 min-w-[280px] max-w-[420px] ${
            toast.exiting ? 'animate-slide-out-right' : 'animate-slide-in-right'
          }`}
        >
          <span className="text-lg font-bold">{icons[toast.type]}</span>
          <span className="text-sm">{toast.message}</span>
        </div>
      ))}
    </div>
  );
}
