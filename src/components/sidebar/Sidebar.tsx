import { useNavigate, useLocation } from 'react-router-dom';
import colors from '../../styles/colors';
import { useAuth } from '../../hooks/useAuth';
import SidebarItem from './SidebarItem';
import { ListIcon, HistoryIcon, StatsIcon } from '../ui/Icons';

interface SidebarNavItem {
    label: string;
    path: string;
    icon: React.ReactNode;
}

function Sidebar() {
    const navigate = useNavigate();
    const location = useLocation();

    // Fetch authenticated user data from global context
    const { user, loading, error, isAuthenticated } = useAuth();

    const sidebarItems: SidebarNavItem[] = [
        { label: 'Media List', path: '/anime-list', icon: <ListIcon /> },
        { label: 'History', path: '/history', icon: <HistoryIcon /> },
        { label: 'Statistics', path: '/statistics', icon: <StatsIcon /> },
    ];

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
            paddingTop: '32px', // Space for transparent titlebar
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
                            Media Tracker
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
                        <SidebarItem
                            key={item.path}
                            label={item.label}
                            icon={item.icon}
                            isActive={isActive}
                            onClick={() => handleNavClick(item.path)}
                        />
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
                        background: loading ? '#404249' : (!isAuthenticated || error || !user?.avatar?.large) ? colors.pastelPink : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.25rem',
                        flexShrink: 0,
                        overflow: 'hidden',
                        position: 'relative',
                    }}>
                        {loading ? (
                            // Loading state: Show pulsing animation
                            <div style={{
                                width: '100%',
                                height: '100%',
                                backgroundImage: 'linear-gradient(90deg, #404249 0%, #4f5159 50%, #404249 100%)',
                                backgroundSize: '200% 100%',
                                animation: 'pulse 1.5s ease-in-out infinite',
                            }} />
                        ) : !isAuthenticated || error || !user?.avatar?.large ? (
                            // Error state or no avatar: Show fallback emoji
                            '👤'
                        ) : (
                            // Success state: Show AniList profile picture
                            <img
                                src={user.avatar.large}
                                alt={`${user.name}'s avatar`}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                }}
                                onError={(e) => {
                                    // Fallback if image fails to load
                                    e.currentTarget.style.display = 'none';
                                }}
                            />
                        )}
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
                            {loading ? 'Loading...' : error ? 'Anime Fan' : user?.name || 'Anime Fan'}
                        </div>
                        <div style={{
                            fontSize: '0.75rem',
                            color: '#B5BAC1',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}>
                            {loading ? '...' : error ? 'Offline' : 'Local User'}
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

            {/* CSS Animation for loading state */}
            <style>{`
                @keyframes pulse {
                    0% {
                        background-position: 200% 0;
                    }
                    100% {
                        background-position: -200% 0;
                    }
                }
            `}</style>
        </div>
    );
}

export default Sidebar;
