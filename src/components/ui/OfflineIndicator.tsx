/**
 * Offline Indicator Component
 * 
 * Shows a subtle indicator when the user is offline,
 * and a success message when they come back online.
 */

import { motion, AnimatePresence } from 'motion/react';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

export function OfflineIndicator() {
    const { isOnline, wasOffline } = useNetworkStatus();

    return (
        <AnimatePresence>
            {/* Offline Banner */}
            {!isOnline && (
                <motion.div
                    initial={{ y: -50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -50, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        zIndex: 9999,
                        padding: '10px 20px',
                        background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 100%)',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        fontSize: '13px',
                        fontWeight: 500,
                        boxShadow: '0 4px 20px rgba(244, 0, 53, 0.3)'
                    }}
                >
                    {/* Offline Icon */}
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <line x1="1" y1="1" x2="23" y2="23" />
                        <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
                        <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
                        <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
                        <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
                        <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
                        <line x1="12" y1="20" x2="12.01" y2="20" />
                    </svg>
                    You're offline — Some features may be unavailable
                </motion.div>
            )}

            {/* Back Online Toast */}
            {isOnline && wasOffline && (
                <motion.div
                    initial={{ y: -50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -50, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        zIndex: 9999,
                        padding: '10px 20px',
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        fontSize: '13px',
                        fontWeight: 500,
                        boxShadow: '0 4px 20px rgba(16, 185, 129, 0.3)'
                    }}
                >
                    {/* Online Icon */}
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="M5 12.55a11 11 0 0 1 14.08 0" />
                        <path d="M1.42 9a16 16 0 0 1 21.16 0" />
                        <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
                        <line x1="12" y1="20" x2="12.01" y2="20" />
                    </svg>
                    Back online!
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export default OfflineIndicator;
