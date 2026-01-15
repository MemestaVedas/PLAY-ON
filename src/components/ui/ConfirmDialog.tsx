/**
 * ConfirmDialog Component
 * 
 * Reusable confirmation modal for destructive actions.
 * Keyboard accessible: Escape to cancel, Enter to confirm.
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    confirmVariant?: 'danger' | 'primary';
    onConfirm: () => void;
    onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    isOpen,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    confirmVariant = 'danger',
    onConfirm,
    onCancel,
}) => {
    const confirmButtonRef = useRef<HTMLButtonElement>(null);
    const cancelButtonRef = useRef<HTMLButtonElement>(null);

    // Focus management
    useEffect(() => {
        if (isOpen) {
            // Focus cancel button by default (safer option)
            cancelButtonRef.current?.focus();
        }
    }, [isOpen]);

    // Keyboard handlers
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (!isOpen) return;

        if (e.key === 'Escape') {
            e.preventDefault();
            onCancel();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            // Only confirm if confirm button is focused
            if (document.activeElement === confirmButtonRef.current) {
                onConfirm();
            }
        } else if (e.key === 'Tab') {
            // Trap focus within dialog
            const focusableElements = [cancelButtonRef.current, confirmButtonRef.current];
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            if (e.shiftKey && document.activeElement === firstElement) {
                e.preventDefault();
                lastElement?.focus();
            } else if (!e.shiftKey && document.activeElement === lastElement) {
                e.preventDefault();
                firstElement?.focus();
            }
        }
    }, [isOpen, onCancel, onConfirm]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    const confirmButtonStyles = confirmVariant === 'danger'
        ? {
            background: 'linear-gradient(135deg, rgba(252, 165, 165, 0.2), rgba(252, 100, 100, 0.3))',
            border: '1px solid rgba(252, 165, 165, 0.4)',
            color: '#FCA5A5',
        }
        : {
            background: 'var(--theme-gradient-primary)',
            border: '1px solid rgba(180, 162, 246, 0.4)',
            color: '#1a1a1e',
        };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={onCancel}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'rgba(0, 0, 0, 0.6)',
                            backdropFilter: 'blur(4px)',
                            WebkitBackdropFilter: 'blur(4px)',
                            zIndex: 9998,
                        }}
                        aria-hidden="true"
                    />

                    {/* Dialog */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                        role="alertdialog"
                        aria-modal="true"
                        aria-labelledby="confirm-dialog-title"
                        aria-describedby="confirm-dialog-message"
                        style={{
                            position: 'fixed',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            zIndex: 9999,
                            width: '100%',
                            maxWidth: '400px',
                            padding: '24px',
                            background: 'rgba(20, 20, 25, 0.95)',
                            backdropFilter: 'blur(20px)',
                            WebkitBackdropFilter: 'blur(20px)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '16px',
                            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
                        }}
                    >
                        <h2
                            id="confirm-dialog-title"
                            style={{
                                fontSize: '1.25rem',
                                fontWeight: 700,
                                color: 'var(--theme-text-main)',
                                marginBottom: '12px',
                            }}
                        >
                            {title}
                        </h2>

                        <p
                            id="confirm-dialog-message"
                            style={{
                                fontSize: '0.9rem',
                                color: 'var(--theme-text-muted)',
                                lineHeight: 1.5,
                                marginBottom: '24px',
                            }}
                        >
                            {message}
                        </p>

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button
                                ref={cancelButtonRef}
                                onClick={onCancel}
                                style={{
                                    padding: '10px 20px',
                                    borderRadius: '10px',
                                    fontSize: '0.875rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    color: 'var(--theme-text-muted)',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                }}
                            >
                                {cancelText}
                            </button>

                            <button
                                ref={confirmButtonRef}
                                onClick={onConfirm}
                                style={{
                                    padding: '10px 20px',
                                    borderRadius: '10px',
                                    fontSize: '0.875rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    ...confirmButtonStyles,
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'scale(1.02)';
                                    e.currentTarget.style.boxShadow = confirmVariant === 'danger'
                                        ? '0 4px 20px rgba(252, 165, 165, 0.3)'
                                        : '0 4px 20px rgba(180, 162, 246, 0.3)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'scale(1)';
                                    e.currentTarget.style.boxShadow = 'none';
                                }}
                            >
                                {confirmText}
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default ConfirmDialog;
