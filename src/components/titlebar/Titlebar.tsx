import { getCurrentWindow } from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/core';
import { exit } from '@tauri-apps/plugin-process';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../hooks/useAuth';
import { useAniListNotifications } from '../../hooks/useAniListNotifications';
import { HistoryIcon, BellIcon, SettingsIcon } from '../ui/Icons';

// Detect if running on macOS
const isMacOS = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

/**
 * Custom Titlebar Component
 * 
 * Replaces the default OS titlebar with a custom one.
 * Includes project title and window controls with premium hover effects.
 * Platform-aware: controls on left for macOS, right for Windows.
 */
function Titlebar() {
    const appWindow = getCurrentWindow();
    const { settings } = useSettings();
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();
    const { unreadCount } = useAniListNotifications();

    const handleMinimize = async () => { await appWindow.minimize(); };
    const handleMaximize = async () => { await appWindow.toggleMaximize(); };
    const handleClose = async () => {
        if (settings.closeToTray) {
            // Hide to tray instead of closing
            await invoke('hide_window');
        } else {
            // Quit completely
            await exit(0);
        }
    };

    // Button styles
    const buttonStyle = (bg: string) => ({
        width: '12px',
        height: '12px',
        borderRadius: '50%',
        border: 'none',
        background: bg,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0px',
        padding: 0,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    });

    const createHoverHandlers = (icon: string, glowColor: string) => ({
        onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => {
            e.currentTarget.style.fontSize = icon === '◻' ? '8px' : '10px';
            e.currentTarget.textContent = icon;
            e.currentTarget.style.color = 'rgba(0,0,0,0.5)';
            e.currentTarget.style.boxShadow = `0 0 12px 2px ${glowColor}`;
            e.currentTarget.style.transform = 'scale(1.1)';
        },
        onMouseLeave: (e: React.MouseEvent<HTMLButtonElement>) => {
            e.currentTarget.style.fontSize = '0px';
            e.currentTarget.textContent = '';
            e.currentTarget.style.boxShadow = 'none';
            e.currentTarget.style.transform = 'scale(1)';
        },
    });

    const CloseButton = (
        <button
            onClick={handleClose}
            title="Close"
            style={buttonStyle('#ff6991ff')}
            {...createHoverHandlers('×', 'rgba(255, 105, 105, 0.4)')}
        />
    );

    const MinimizeButton = (
        <button
            onClick={handleMinimize}
            title="Minimize"
            style={buttonStyle('#fbb9dc')}
            {...createHoverHandlers('−', 'rgba(219, 197, 243, 0.4)')}
        />
    );

    const MaximizeButton = (
        <button
            onClick={handleMaximize}
            title="Maximize"
            style={buttonStyle('#6a6a9e')}
            {...createHoverHandlers('◻', 'rgba(133, 255, 161, 0.4)')}
        />
    );

    const NavIcons = (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            marginRight: '12px',
            WebkitAppRegion: 'no-drag',
        } as React.CSSProperties}>
            {/* History Icon */}
            <button
                onClick={() => navigate('/history')}
                style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--color-text-muted)',
                    cursor: 'pointer',
                    padding: '6px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--color-bg-glass-hover)';
                    e.currentTarget.style.color = 'var(--color-text-main)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--color-text-muted)';
                }}
                title="History"
            >
                <HistoryIcon size={16} />
            </button>

            {/* Notifications Icon */}
            {isAuthenticated && (
                <button
                    onClick={() => navigate('/notifications')}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--color-text-muted)',
                        cursor: 'pointer',
                        padding: '6px',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s',
                        position: 'relative',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--color-bg-glass-hover)';
                        e.currentTarget.style.color = 'var(--color-text-main)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = 'var(--color-text-muted)';
                    }}
                    title={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
                >
                    <BellIcon size={16} />
                    {unreadCount > 0 && (
                        <span style={{
                            position: 'absolute',
                            top: 2,
                            right: 2,
                            background: 'var(--color-zen-accent)',
                            color: '#000',
                            borderRadius: '50%',
                            width: 12,
                            height: 12,
                            fontSize: '0.5rem',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </button>
            )}

            {/* Settings Icon */}
            <button
                onClick={() => navigate('/settings')}
                style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--color-text-muted)',
                    cursor: 'pointer',
                    padding: '6px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--color-bg-glass-hover)';
                    e.currentTarget.style.color = 'var(--color-text-main)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--color-text-muted)';
                }}
                title="Settings"
            >
                <SettingsIcon size={16} />
            </button>
        </div>
    );

    const AppTitle = (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            WebkitAppRegion: 'no-drag',
        } as React.CSSProperties}>
            <span style={{
                fontSize: '0.85rem',
                fontWeight: '800',
                color: 'var(--color-text-main)',
                letterSpacing: '1px',
                textTransform: 'uppercase'
            }}>
                PLAY-ON!
            </span>
        </div>
    );

    const WindowControls = (
        <div style={{
            display: 'flex',
            alignItems: 'center', // Ensure alignment
            gap: '8px',
            WebkitAppRegion: 'no-drag',
        } as React.CSSProperties}>
            {isMacOS ? (
                // macOS: Close, Minimize, Maximize (left to right)
                <>{CloseButton}{MinimizeButton}{MaximizeButton}</>
            ) : (
                // Windows: NavIcons, Minimize, Maximize, Close
                <>{NavIcons}{MinimizeButton}{MaximizeButton}{CloseButton}</>
            )}
        </div>
    );

    return (
        <div
            data-tauri-drag-region
            style={{
                height: '32px',
                background: 'transparent',
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
                WebkitAppRegion: 'drag',
            } as React.CSSProperties}
        >
            {isMacOS ? (
                // macOS: Controls left, title right (Added NavIcons to title side for balance if desired, or keep hidden? User asked for next to minimize on Windows mainly)
                // Let's keep NavIcons hidden on macOS for now unless requested, or put them right.
                // Actually user said "next to the minimise button", which on macOS is on the left.
                // Let's stick to Windows request specifically first.
                <>{WindowControls}{AppTitle}</>
            ) : (
                // Windows: Title left, controls right
                <>{AppTitle}{WindowControls}</>
            )}
        </div>
    );
}

export default Titlebar;
