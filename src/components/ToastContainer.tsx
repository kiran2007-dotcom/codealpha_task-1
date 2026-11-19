import { X } from 'lucide-react';
import { useStore } from '../context/StoreContext';

export function ToastContainer() {
  const { toasts, dismissToast } = useStore();
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto rounded-2xl px-4 py-3 text-xs font-medium flex items-center justify-between gap-3 ${
            toast.tone === 'error'
              ? 'bg-red-50/90 backdrop-blur-xl border border-red-200 text-red-900 shadow-lg'
              : toast.tone === 'success'
              ? 'glass-dark text-white'
              : 'glass-panel-strong text-zinc-900'
          }`}
        >
          <span>{toast.text}</span>
          <button
            type="button"
            onClick={() => dismissToast(toast.id)}
            aria-label="Dismiss message"
            className="opacity-70 hover:opacity-100 cursor-pointer shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
