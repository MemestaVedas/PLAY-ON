import { useState } from 'react';
// @ts-ignore
import { open } from '@tauri-apps/plugin-opener';
import { useNavigate, useLocation } from 'react-router-dom';
import colors from '../../styles/colors';
import { useAuth } from '../../hooks/useAuth'; // Our custom hook that asks Context for data
import { useLocalMedia } from '../../context/LocalMediaContext';
import SidebarItem from './SidebarItem';
import { ListIcon, HistoryIcon, HomeIcon } from '../ui/Icons';
import UserProfileDialog from '../ui/UserProfileDialog';

interface SidebarNavItem {
    label: string;
    path: string;
    icon: React.ReactNode;
}

interface SidebarProps {
    width: number;
}

function Sidebar({ width }: SidebarProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const [showProfileModal, setShowProfileModal] = useState(false);

    // Fetch public user data from global context
    const { user, loading, error, isAuthenticated } = useAuth();
    // Fetch local folder data
    const { folders: localItems, addFolder } = useLocalMedia();

    const mainItems: SidebarNavItem[] = [
        { label: 'Home', path: '/home', icon: <HomeIcon /> },
        { label: 'Media List', path: '/anime-list', icon: <ListIcon /> },
        { label: 'History', path: '/history', icon: <HistoryIcon /> },
    ];

    const handleNavClick = (path: string) => {
        navigate(path);
    };

    return (
        <div style={{
            width: `${width}px`,
            height: '100vh',
            background: 'transparent', // Match shell area (transparent to show background)
            display: 'flex',
            flexDirection: 'column',
            position: 'fixed',
            left: 0,
            top: 0,
            zIndex: 100,
            paddingTop: '32px', // Space for transparent titlebar
        }}>
            {/* Navigation Items */}
            <div style={{
                flex: 1,
                padding: '1rem 0.5rem',
                overflowY: 'auto',
            }}>
                {/* Main Group */}
                <div style={{ marginBottom: '1.5rem' }}>
                    {mainItems.map((item) => {
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

                {/* Local Group */}
                <div>
                    <div style={{
                        padding: '0 0.75rem',
                        marginBottom: '0.5rem',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: '#6B6F76',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <span>Local</span>
                        <div style={{ flex: 1, height: '1px', background: '#313338' }}></div>
                    </div>

                    {localItems.map((item) => (
                        <div
                            key={item.path}
                            onClick={() => handleNavClick(`/local/${encodeURIComponent(item.path)}`)}
                            style={{
                                padding: '0.5rem 0.75rem',
                                borderRadius: '4px',
                                color: '#949BA4',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                transition: 'all 0.2s',
                                marginLeft: '0.5rem'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.color = '#FFFFFF'}
                            onMouseLeave={(e) => e.currentTarget.style.color = '#949BA4'}
                        >
                            📁 {item.label}
                        </div>
                    ))}

                    {/* Add Folder Button */}
                    <div
                        onClick={addFolder}
                        style={{
                            padding: '0.5rem 0.75rem',
                            borderRadius: '4px',
                            color: colors.pastelPink, // Accent color
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            transition: 'all 0.2s',
                            marginLeft: '0.5rem',
                            marginTop: '0.25rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                    >
                        + Add folder
                    </div>
                </div>
            </div>

            {/* Login Button (Visible if not authenticated) */}
            {!isAuthenticated && (
                <div style={{ padding: '0 0.75rem 0.75rem' }}>
                    <button
                        onClick={async () => {
                            // REPLACE WITH YOUR ACTUAL ANILIST CLIENT ID
                            const CLIENT_ID = '24967'; // Placeholder ID (example)
                            const redirectUri = 'playon://auth';
                            const authUrl = `https://anilist.co/api/v2/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${redirectUri}&response_type=token`;

                            try {
                                // @ts-ignore - plugin-opener might have strict types
                                await open(authUrl);
                            } catch (error) {
                                console.error('Failed to open auth URL:', error);
                            }
                        }}
                        style={{
                            width: '100%',
                            padding: '0.75rem',
                            borderRadius: '8px',
                            background: colors.pastelPink,
                            color: '#1a1b1e',
                            fontWeight: '600',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            transition: 'transform 0.2s',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.02)')}
                        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                    >
                        Login with AniList
                    </button>
                </div>
            )}

            {/* Profile Section */}
            <div style={{
                padding: '0.75rem',
                borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                background: 'transparent',
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
                    onClick={() => setShowProfileModal(true)}
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
                            <div style={{
                                width: '100%',
                                height: '100%',
                                backgroundImage: 'linear-gradient(90deg, #404249 0%, #4f5159 50%, #404249 100%)',
                                backgroundSize: '200% 100%',
                                animation: 'pulse 1.5s ease-in-out infinite',
                            }} />
                        ) : !isAuthenticated || error || !user?.avatar?.large ? (
                            '👤'
                        ) : (
                            <img
                                src={user.avatar.large}
                                alt={`${user?.name}'s avatar`}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
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
                            {loading ? '...' : 'Public Profile'}
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

            {/* User Profile Dialog */}
            <UserProfileDialog
                isOpen={showProfileModal}
                onClose={() => setShowProfileModal(false)}
                user={user}
                isAuthenticated={isAuthenticated}
            />

        </div>
    );
}

export default Sidebar;
