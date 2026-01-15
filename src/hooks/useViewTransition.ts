/**
 * View Transitions Hook
 * 
 * Enables smooth cross-fade transitions between pages using the
 * native View Transitions API (Chrome 111+, Edge, Safari 18+).
 * Falls back gracefully on unsupported browsers.
 * 
 * Usage: const navigateWithTransition = useViewTransition();
 *        navigateWithTransition('/path');
 */

import { useNavigate } from 'react-router-dom';
import { useCallback } from 'react';

// Check if View Transitions API is supported
const supportsViewTransitions = () =>
    typeof document !== 'undefined' &&
    'startViewTransition' in document;

export function useViewTransition() {
    const navigate = useNavigate();

    const navigateWithTransition = useCallback((to: string, options?: { state?: any }) => {
        // If View Transitions not supported, just navigate normally
        if (!supportsViewTransitions()) {
            navigate(to, options);
            return;
        }

        // Use View Transitions API for smooth animation
        const transition = (document as any).startViewTransition(() => {
            navigate(to, options);
        });

        // Optional: handle transition errors gracefully
        transition.ready.catch(() => {
            // Transition was aborted, no action needed
        });
    }, [navigate]);

    return navigateWithTransition;
}

// Alternative: flushSync version for more control (React 18+)
export function useViewTransitionSync() {
    const navigate = useNavigate();

    const navigateWithTransition = useCallback(async (to: string, options?: { state?: any }) => {
        if (!supportsViewTransitions()) {
            navigate(to, options);
            return;
        }

        const { flushSync } = await import('react-dom');

        (document as any).startViewTransition(() => {
            flushSync(() => {
                navigate(to, options);
            });
        });
    }, [navigate]);

    return navigateWithTransition;
}

export default useViewTransition;
