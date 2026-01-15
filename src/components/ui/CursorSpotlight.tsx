import { useMousePosition } from '../../hooks/useMousePosition';

interface CursorSpotlightProps {
    /** Color in RGB format, e.g., "180, 162, 246" */
    color?: string;
    /** Size of the spotlight gradient in pixels */
    size?: number;
    /** Opacity of the spotlight (0-1) */
    opacity?: number;
    /** Whether to show the spotlight */
    enabled?: boolean;
}

/**
 * A global cursor spotlight effect that follows the mouse.
 * Adds a subtle radial gradient glow that follows cursor movement.
 */
export function CursorSpotlight({
    color = '180, 162, 246', // Default lavender accent
    size = 600,
    opacity = 0.06,
    enabled = true
}: CursorSpotlightProps) {
    const { x, y } = useMousePosition();

    if (!enabled) return null;

    return (
        <div
            className="cursor-spotlight"
            aria-hidden="true"
            style={{
                position: 'fixed',
                inset: 0,
                pointerEvents: 'none',
                zIndex: 1,
                background: `radial-gradient(${size}px circle at ${x}px ${y}px, rgba(${color}, ${opacity}), transparent 40%)`,
                transition: 'background 0.05s ease-out'
            }}
        />
    );
}

export default CursorSpotlight;
