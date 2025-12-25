import { getCurrentWindow } from '@tauri-apps/api/window';
import colors from '../../styles/colors';

/**
 * Custom Titlebar Component
 * 
 * Replaces the default OS titlebar with a custom one
 * Includes window controls (minimize, maximize, close)
 */

function Titlebar() {
    const appWindow = getCurrentWindow();

    const handleMinimize = async () => {
        await appWindow.minimize();
    };

    const handleMaximize = async () => {
        await appWindow.toggleMaximize();
    };

    const handleClose = async () => {
        await appWindow.close();
    };

    return (
        <div
            data-tauri-drag-region
            style={{
                height: '32px',
                background: 'transparent',
                display: 'flex',
                justifyContent: 'flex-end', // Only window controls on the right
                alignItems: 'center',
                padding: '0 0.5rem',
                userSelect: 'none',
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 9999,
                WebkitAppRegion: 'drag',
            } as React.CSSProperties}
        >
            {/* Window Controls */}
            <div style={{
                display: 'flex',
                gap: '2px',
                WebkitAppRegion: 'no-drag',
            } as React.CSSProperties}>
                {/* Minimize */}
                <button
                    onClick={handleMinimize}
                    style={{
                        width: '32px',
                        height: '32px',
                        border: 'none',
                        background: 'transparent',
                        color: colors.mediumGray,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1rem',
                        transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                        e.currentTarget.style.color = colors.white;
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = colors.mediumGray;
                    }}
                >
                    −
                </button>

                {/* Maximize */}
                <button
                    onClick={handleMaximize}
                    style={{
                        width: '32px',
                        height: '32px',
                        border: 'none',
                        background: 'transparent',
                        color: colors.mediumGray,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.9rem',
                        transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                        e.currentTarget.style.color = colors.white;
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = colors.mediumGray;
                    }}
                >
                    ◻
                </button>

                {/* Close */}
                <button
                    onClick={handleClose}
                    style={{
                        width: '32px',
                        height: '32px',
                        border: 'none',
                        background: 'transparent',
                        color: colors.mediumGray,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.2rem',
                        transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#E81123';
                        e.currentTarget.style.color = colors.white;
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = colors.mediumGray;
                    }}
                >
                    ×
                </button>
            </div>
        </div>
    );
}

export default Titlebar;
