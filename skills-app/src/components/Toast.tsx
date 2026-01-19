import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle, Info, AlertTriangle, AlertCircle } from 'lucide-react';
import type { Toast as ToastType, ToastType as ToastVariant } from '../hooks/useToast';
import './Toast.css';

interface ToastProps {
  toasts: ToastType[];
  onRemove: (id: string) => void;
}

const icons: Record<ToastVariant, React.ReactNode> = {
  success: <CheckCircle size={18} />,
  info: <Info size={18} />,
  warning: <AlertTriangle size={18} />,
  error: <AlertCircle size={18} />,
};

export function Toast({ toasts, onRemove }: ToastProps) {
  return (
    <div className="toast-container">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            className={`toast toast-${toast.type}`}
            initial={{ opacity: 0, x: 100, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.8 }}
            transition={{
              type: 'spring',
              stiffness: 400,
              damping: 30,
            }}
            layout
          >
            <div className="toast-glow" />
            <div className="toast-icon">{icons[toast.type]}</div>
            <span className="toast-message">{toast.message}</span>
            <button
              className="toast-close"
              onClick={() => onRemove(toast.id)}
              aria-label="Dismiss notification"
            >
              <X size={14} />
            </button>
            <motion.div
              className="toast-progress"
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: (toast.duration || 3000) / 1000, ease: 'linear' }}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
