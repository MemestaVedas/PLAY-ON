/**
 * Toast Context
 * 
 * Global toast notification system for user feedback.
 * Usage: const { toast } = useToast();
 *        toast.success('Saved!');
 *        toast.error('Failed to save');
 *        toast.info('Loading...');
 */

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
    id: string;
    type: ToastType;
    message: string;
    duration?: number;
}

interface ToastContextValue {
    toasts: Toast[];
    addToast: (type: ToastType, message: string, duration?: number) => void;
    removeToast: (id: string) => void;
    toast: {
        success: (message: string, duration?: number) => void;
        error: (message: string, duration?: number) => void;
        info: (message: string, duration?: number) => void;
        warning: (message: string, duration?: number) => void;
    };
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const toastIdCounter = useRef(0);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const addToast = useCallback((type: ToastType, message: string, duration = 4000) => {
        const id = `toast-${++toastIdCounter.current}`;
        const newToast: Toast = { id, type, message, duration };

        setToasts(prev => [...prev, newToast]);

        // Auto-dismiss
        if (duration > 0) {
            setTimeout(() => removeToast(id), duration);
        }
    }, [removeToast]);

    // Convenience methods
    const toast = {
        success: (message: string, duration?: number) => addToast('success', message, duration),
        error: (message: string, duration?: number) => addToast('error', message, duration ?? 6000),
        info: (message: string, duration?: number) => addToast('info', message, duration),
        warning: (message: string, duration?: number) => addToast('warning', message, duration ?? 5000),
    };

    return (
        <ToastContext.Provider value={{ toasts, addToast, removeToast, toast }}>
            {children}
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}
