import { getCurrentWindow } from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/core';
import { exit } from '@tauri-apps/plugin-process';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../../context/SettingsContext';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../hooks/useAuth';
import { useAniListNotifications } from '../../hooks/useAniListNotifications';
import { HistoryIcon, BellIcon, SettingsIcon, UsersIcon } from '../ui/Icons';

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
    const { themeFamily, dynamicColorEnabled } = useTheme();
    const [closeHovered, setCloseHovered] = useState(false);
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

    const controlStyle: React.CSSProperties = {
        width: '16px',
        height: '16px',
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
        opacity: 0.85,
        transition: 'all 0.15s ease',
    };

    const materialRuntimeActive = themeFamily === 'material-you-3' && dynamicColorEnabled;

    const closeColor = materialRuntimeActive ? 'var(--md-sys-color-error)' : 'var(--theme-accent-danger)';
    const minimizeColor = materialRuntimeActive ? 'var(--md-sys-color-tertiary)' : 'var(--theme-accent-warning)';
    const maximizeColor = materialRuntimeActive ? 'var(--md-sys-color-primary)' : 'var(--theme-accent-primary)';

    const closeGlow = materialRuntimeActive ? 'rgba(var(--theme-accent-danger-rgb), 0.45)' : 'rgba(255, 105, 105, 0.4)';
    const minimizeGlow = materialRuntimeActive ? 'rgba(var(--theme-accent-tertiary-rgb), 0.45)' : 'rgba(219, 197, 243, 0.4)';
    const maximizeGlow = materialRuntimeActive ? 'rgba(var(--theme-accent-primary-rgb), 0.45)' : 'rgba(133, 255, 161, 0.4)';

    const CloseButton = (
        <button
            onClick={handleClose}
            onMouseEnter={() => setCloseHovered(true)}
            onMouseLeave={() => setCloseHovered(false)}
            title="Close"
            style={{ ...controlStyle, filter: closeHovered ? `drop-shadow(0 0 6px ${closeGlow})` : 'none' }}
        >
            <svg viewBox="0 0 280 280" className="w-full h-full transition-colors" style={{ color: closeHovered ? closeColor : 'var(--theme-accent-secondary)' }}>
                <path d="M178.73 6.2068C238.87 -19.9132 299.91 41.1269 273.79 101.267L269.47 111.207C261.5 129.577 261.5 150.417 269.47 168.787L273.79 178.727C299.91 238.867 238.87 299.907 178.73 273.787L168.79 269.467C150.42 261.497 129.58 261.497 111.21 269.467L101.27 273.787C41.1281 299.907 -19.9139 238.867 6.20706 178.727L10.5261 168.787C18.5011 150.417 18.5011 129.577 10.5261 111.207L6.20706 101.267C-19.9139 41.1269 41.1281 -19.9132 101.27 6.2068L111.21 10.5269C129.58 18.4969 150.42 18.4969 168.79 10.5269L178.73 6.2068Z" fill="currentColor" />
            </svg>
        </button>
    );

    const MinimizeButton = (
        <button
            onClick={handleMinimize}
            title="Minimize"
            style={controlStyle}
            onMouseEnter={(e) => {
                e.currentTarget.style.filter = `drop-shadow(0 0 6px ${minimizeGlow})`;
                e.currentTarget.style.opacity = '1';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.filter = 'none';
                e.currentTarget.style.opacity = '0.85';
            }}
        >
            <svg viewBox="0 0 316 278" className="w-full h-full transition-colors" style={{ color: minimizeColor }}>
                <path d="M271.57 155.799C257.552 177.379 243.535 198.989 229.517 220.569C220.423 234.579 211.167 248.778 198.872 259.908C186.576 271.058 170.648 278.938 154.316 277.908C139.976 276.988 126.684 269.278 116.191 259.208C105.698 249.138 97.5464 236.738 89.5284 224.458C67.8424 191.278 46.1303 158.098 24.4443 124.898C14.1393 109.138 3.56535 92.6884 0.713353 73.9084C-2.73065 51.2184 6.55235 28.1085 23.0183 13.0185C40.2373 -2.76147 68.1384 -1.48141 89.0984 2.83859C112.075 7.58859 134.541 16.5185 157.975 16.4885C178.047 16.4885 197.446 9.88858 216.979 5.08859C236.485 0.318604 257.445 -2.62152 276.279 4.47849C299.659 13.2685 316.448 38.2684 315.991 63.9284C315.56 87.3384 302.457 108.248 289.839 127.728C283.758 137.078 277.678 146.449 271.597 155.799H271.57Z" fill="currentColor" />
            </svg>
        </button>
    );

    const MaximizeButton = (
        <button
            onClick={handleMaximize}
            title="Maximize"
            style={controlStyle}
            onMouseEnter={(e) => {
                e.currentTarget.style.filter = `drop-shadow(0 0 6px ${maximizeGlow})`;
                e.currentTarget.style.opacity = '1';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.filter = 'none';
                e.currentTarget.style.opacity = '0.85';
            }}
        >
            <svg viewBox="0 0 320 320" className="w-full h-full transition-colors" style={{ color: maximizeColor }}>
                <path d="M136.72 13.1925C147.26 -4.3975 172.74 -4.3975 183.28 13.1925L195.12 32.9625C201.27 43.2125 213.4 48.2425 224.99 45.3325L247.35 39.7325C267.24 34.7525 285.25 52.7626 280.27 72.6526L274.67 95.0126C271.76 106.603 276.79 118.733 287.04 124.883L306.81 136.723C324.4 147.263 324.4 172.743 306.81 183.283L287.04 195.123C276.79 201.273 271.76 213.403 274.67 224.993L280.27 247.353C285.25 267.243 267.24 285.253 247.35 280.273L224.99 274.673C213.4 271.763 201.27 276.793 195.12 287.043L183.28 306.813C172.74 324.403 147.26 324.403 136.72 306.813L124.88 287.043C118.73 276.793 106.6 271.763 95.0102 274.673L72.6462 280.273C52.7632 285.253 34.7472 267.243 39.7292 247.353L45.3332 224.993C48.2382 213.403 43.2143 201.273 32.9603 195.123L13.1873 183.283C-4.39575 172.743 -4.39575 147.263 13.1873 136.723L32.9603 124.883C43.2143 118.733 48.2382 106.603 45.3332 95.0126L39.7292 72.6526C34.7472 52.7626 52.7633 34.7525 72.6453 39.7325L95.0102 45.3332C106.6 48.2425 118.73 43.2125 124.88 32.9625L136.72 13.1925Z" fill="currentColor" />
            </svg>
        </button>
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

            {/* Community Icon */}
            {isAuthenticated && (
                <button
                    onClick={() => navigate('/community')}
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
                    title="Community"
                >
                    <UsersIcon size={16} />
                </button>
            )}

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
                fontSize: '1.0rem',
                fontWeight: '900',
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
