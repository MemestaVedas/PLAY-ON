/**
 * Toast Component
 * 
 * Animated toast notifications with glassmorphic design.
 * Positioned top-right, stacks multiple toasts.
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useToast, Toast as ToastType } from '../../context/ToastContext';

// Icons for each toast type
const ToastIcon: React.FC<{ type: ToastType['type'] }> = ({ type }) => {
    const iconProps = { width: 18, height: 18, strokeWidth: 2, fill: 'none', stroke: 'currentColor' };

    switch (type) {
        case 'success':
            return (
                <svg {...iconProps} viewBox="0 0 24 24">
                    <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            );
        case 'error':
            return (
                <svg {...iconProps} viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M15 9l-6 6M9 9l6 6" strokeLinecap="round" />
                </svg>
            );
        case 'warning':
            return (
                <svg {...iconProps} viewBox="0 0 24 24">
                    <path d="M12 9v4M12 17h.01" strokeLinecap="round" />
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
            );
        case 'info':
        default:
            return (
                <svg {...iconProps} viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4M12 8h.01" strokeLinecap="round" />
                </svg>
            );
    }
};

// Color mapping for toast types
const toastStyles: Record<ToastType['type'], { bg: string; border: string; icon: string }> = {
    success: {
        bg: 'rgba(157, 240, 179, 0.1)',
        border: 'rgba(157, 240, 179, 0.3)',
        icon: '#9DF0B3',
    },
    error: {
        bg: 'rgba(252, 165, 165, 0.1)',
        border: 'rgba(252, 165, 165, 0.3)',
        icon: '#FCA5A5',
    },
    warning: {
        bg: 'rgba(255, 244, 189, 0.1)',
        border: 'rgba(255, 244, 189, 0.3)',
        icon: '#FFF4BD',
    },
    info: {
        bg: 'rgba(165, 219, 248, 0.1)',
        border: 'rgba(165, 219, 248, 0.3)',
        icon: '#A5DBF8',
    },
};

const ToastItem: React.FC<{ toast: ToastType; onDismiss: () => void }> = ({ toast, onDismiss }) => {
    const style = toastStyles[toast.type];

    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            onClick={onDismiss}
            role="alert"
            aria-live="polite"
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                background: style.bg,
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: `1px solid ${style.border}`,
                borderRadius: '12px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                cursor: 'pointer',
                maxWidth: '360px',
                minWidth: '280px',
            }}
        >
            <div style={{ color: style.icon, flexShrink: 0 }}>
                <ToastIcon type={toast.type} />
            </div>
            <span style={{
                flex: 1,
                fontSize: '0.875rem',
                fontWeight: 500,
                color: 'var(--theme-text-main)',
                lineHeight: 1.4,
            }}>
                {toast.message}
            </span>
            <button
                onClick={(e) => { e.stopPropagation(); onDismiss(); }}
                aria-label="Dismiss notification"
                style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--theme-text-muted)',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    opacity: 0.6,
                    transition: 'opacity 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
            >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                </svg>
            </button>
        </motion.div>
    );
};

export const ToastContainer: React.FC = () => {
    const { toasts, removeToast } = useToast();

    return (
        <div
            aria-label="Notifications"
            style={{
                position: 'fixed',
                top: '60px', // Below titlebar
                right: '16px',
                zIndex: 9999,
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                pointerEvents: 'none',
            }}
        >
            <AnimatePresence mode="popLayout">
                {toasts.map(toast => (
                    <div key={toast.id} style={{ pointerEvents: 'auto' }}>
                        <ToastItem
                            toast={toast}
                            onDismiss={() => removeToast(toast.id)}
                        />
                    </div>
                ))}
            </AnimatePresence>
        </div>
    );
};

export default ToastContainer;
