import { getCurrentWindow } from '@tauri-apps/api/window';
import colors from '../styles/colors';

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
                background: colors.discordDarker,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0 1rem',
                userSelect: 'none',
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 9999,
                borderBottom: `1px solid rgba(255, 181, 197, 0.1)`,
                WebkitAppRegion: 'drag',
            } as React.CSSProperties}
        >
            {/* App Title */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.85rem',
                fontWeight: '600',
                color: colors.pastelPink,
                pointerEvents: 'none',
            }}>
                <span style={{ fontSize: '1rem' }}>🎬</span>
                PLAY-ON!
            </div>

            {/* Window Controls */}
            <div style={{
                display: 'flex',
                gap: '0.5rem',
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
