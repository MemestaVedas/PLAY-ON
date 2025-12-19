import { useNavigate, useLocation } from 'react-router-dom';
import colors from '../styles/colors';

/**
 * Sidebar Component - Discord-style left navigation
 * 
 * Contains:
 * - Main navigation items (Anime List, History, Statistics)
 * - Profile section at bottom
 */

interface SidebarItem {
    label: string;
    path: string;
    icon: string;
}

const sidebarItems: SidebarItem[] = [
    { label: 'Anime List', path: '/anime-list', icon: '📚' },
    { label: 'History', path: '/history', icon: '🕒' },
    { label: 'Statistics', path: '/statistics', icon: '📊' },
];

function Sidebar() {
    const navigate = useNavigate();
    const location = useLocation();

    const handleNavClick = (path: string) => {
        navigate(path);
    };

    return (
        <div style={{
            width: '240px',
            height: '100vh',
            background: '#2B2D31',
            display: 'flex',
            flexDirection: 'column',
            position: 'fixed',
            left: 0,
            top: 0,
            zIndex: 100,
        }}>
            {/* App Logo/Title */}
            <div style={{
                padding: '1rem 1rem 0.5rem 1rem',
                borderBottom: '2px solid #1E1F22',
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem',
                }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '12px',
                        background: colors.pastelPurple,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.5rem',
                    }}>
                        🎬
                    </div>
                    <div>
                        <div style={{
                            fontSize: '1.1rem',
                            fontWeight: '700',
                            color: '#FFFFFF',
                        }}>
                            PLAY-ON!
                        </div>
                        <div style={{
                            fontSize: '0.75rem',
                            color: '#B5BAC1',
                        }}>
                            Anime Tracker
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation Items */}
            <div style={{
                flex: 1,
                padding: '1rem 0.5rem',
                overflowY: 'auto',
            }}>
                {sidebarItems.map((item) => {
                    const isActive = location.pathname === item.path ||
                        (item.path === '/anime-list' && location.pathname.startsWith('/anime/'));

                    return (
                        <button
                            key={item.path}
                            onClick={() => handleNavClick(item.path)}
                            style={{
                                width: '100%',
                                padding: '0.75rem 1rem',
                                marginBottom: '0.25rem',
                                borderRadius: '8px',
                                border: 'none',
                                background: isActive ? '#404249' : 'transparent',
                                color: isActive ? '#FFFFFF' : '#B5BAC1',
                                fontSize: '1rem',
                                fontWeight: isActive ? '600' : '500',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                textAlign: 'left',
                            }}
                            onMouseEnter={(e) => {
                                if (!isActive) {
                                    e.currentTarget.style.background = '#35373C';
                                    e.currentTarget.style.color = '#DBDEE1';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!isActive) {
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.color = '#B5BAC1';
                                }
                            }}
                        >
                            <span style={{ fontSize: '1.25rem' }}>{item.icon}</span>
                            <span>{item.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Profile Section */}
            <div style={{
                padding: '0.75rem',
                borderTop: '2px solid #1E1F22',
                background: '#232428',
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.5rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'background 0.2s ease',
                }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#35373C';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                    }}
                >
                    {/* Avatar */}
                    <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: colors.pastelPink,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.25rem',
                        flexShrink: 0,
                    }}>
                        👤
                    </div>

                    {/* User Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                            fontSize: '0.9rem',
                            fontWeight: '600',
                            color: '#FFFFFF',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}>
                            Anime Fan
                        </div>
                        <div style={{
                            fontSize: '0.75rem',
                            color: '#B5BAC1',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}>
                            Online
                        </div>
                    </div>

                    {/* Settings Icon */}
                    <div style={{
                        width: '20px',
                        height: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#B5BAC1',
                        fontSize: '1rem',
                    }}>
                        ⚙️
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Sidebar;
