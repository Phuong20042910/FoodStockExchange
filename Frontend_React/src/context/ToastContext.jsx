import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, XCircle, Info } from 'lucide-react';

const ToastContext = createContext();

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  // type: 'success' | 'error' | 'info'
  const addToast = useCallback((message, type = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    
    // Tự động xóa sau 3.5 giây
    setTimeout(() => {
      removeToast(id);
    }, 3500);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none">
        {toasts.map((toast) => (
          <div 
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 min-w-[300px] max-w-[400px] shadow-2xl rounded-xl border animate-slide-in-right backdrop-blur-md transition-all duration-300 ${
              toast.type === 'success' ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-100 shadow-[0_0_15px_rgba(16,185,129,0.2)]' :
              toast.type === 'error' ? 'bg-rose-950/90 border-rose-500/50 text-rose-100 shadow-[0_0_15px_rgba(244,63,94,0.2)]' :
              'bg-sky-950/90 border-sky-500/50 text-sky-100 shadow-[0_0_15px_rgba(14,165,233,0.2)]'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />}
            {toast.type === 'error' && <XCircle className="h-5 w-5 text-rose-400 shrink-0" />}
            {toast.type === 'info' && <Info className="h-5 w-5 text-sky-400 shrink-0" />}
            
            <p className="text-sm font-sans whitespace-pre-line">{toast.message}</p>
            
            <button 
              onClick={() => removeToast(toast.id)}
              className="ml-auto text-slate-400 hover:text-white transition"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
