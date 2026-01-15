import { useState, useEffect, useCallback, useRef } from 'react';

interface MousePosition {
    x: number;
    y: number;
}

/**
 * A hook that tracks the mouse position globally.
 * Uses throttling for performance optimization.
 */
export function useMousePosition(throttleMs: number = 16): MousePosition {
    const [position, setPosition] = useState<MousePosition>({ x: 0, y: 0 });
    const lastUpdate = useRef<number>(0);

    const updatePosition = useCallback((e: MouseEvent) => {
        const now = Date.now();
        if (now - lastUpdate.current >= throttleMs) {
            lastUpdate.current = now;
            setPosition({ x: e.clientX, y: e.clientY });
        }
    }, [throttleMs]);

    useEffect(() => {
        window.addEventListener('mousemove', updatePosition, { passive: true });
        return () => window.removeEventListener('mousemove', updatePosition);
    }, [updatePosition]);

    return position;
}

export default useMousePosition;
