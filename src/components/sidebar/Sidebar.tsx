import { useState } from 'react';

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

function Sidebar({ width: _width }: SidebarProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const [showProfileModal, setShowProfileModal] = useState(false);

    // Fetch public user data from global context
    const { user, loading, error, isAuthenticated, login, loginWithCode } = useAuth();
    // Fetch local folder data
    const { folders: localItems, addFolder } = useLocalMedia();

    const mainItems: SidebarNavItem[] = [
        { label: 'Home', path: '/home', icon: <HomeIcon /> },
        { label: 'Anime List', path: '/anime-list', icon: <ListIcon /> },
        { label: 'History', path: '/history', icon: <HistoryIcon /> },
    ];

    const handleNavClick = (path: string) => {
        navigate(path);
    };

    return (
        <div
            style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                paddingTop: '64px', // Keep padding for titlebar
                background: 'rgba(0, 0, 0, 0.2)',
                borderRight: '1px solid rgba(255, 255, 255, 0.03)',
                backdropFilter: 'blur(10px)',
            }}
        >
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
                        marginBottom: '0.75rem',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        color: 'var(--color-text-secondary)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontFamily: 'var(--font-rounded)',
                    }}>
                        <span>Local Sources</span>
                        <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.05)' }}></div>
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
                            padding: '0.6rem 1rem',
                            borderRadius: '12px',
                            background: 'rgba(255, 255, 255, 0.03)',
                            color: 'var(--color-zen-accent)',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                            marginLeft: '0.5rem',
                            marginTop: '0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            fontFamily: 'var(--font-rounded)',
                            fontWeight: '600',
                            letterSpacing: '0.02em',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                            e.currentTarget.style.transform = 'translateY(0)';
                        }}
                    >
                        <span>+ Add Source</span>
                    </div>
                </div>
            </div>

            {/* Login Button (Visible if not authenticated) */}
            {!isAuthenticated && (
                <div style={{ padding: '0 0.75rem 0.75rem' }}>
                    <button
                        onClick={async () => {
                            try {
                                await login();
                            } catch (error) {
                                console.error('Failed to initiate login:', error);
                            }
                        }}
                        style={{
                            width: '100%',
                            padding: '0.8rem',
                            borderRadius: '14px',
                            background: 'linear-gradient(135deg, var(--color-zen-accent) 0%, #9FA5FE 100%)',
                            color: '#000',
                            fontWeight: '700',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                            fontFamily: 'var(--font-rounded)',
                            boxShadow: '0 4px 15px rgba(180, 162, 246, 0.3)',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'scale(1.02)';
                            e.currentTarget.style.boxShadow = '0 6px 20px rgba(180, 162, 246, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'scale(1)';
                            e.currentTarget.style.boxShadow = '0 4px 15px rgba(180, 162, 246, 0.3)';
                        }}
                    >
                        Login with AniList
                    </button>
                    <button
                        onClick={() => {
                            const code = window.prompt("Paste the 'code' from the AniList URL here:");
                            if (code) {
                                loginWithCode(code);
                            }
                        }}
                        style={{
                            width: '100%',
                            background: 'none',
                            border: 'none',
                            color: colors.lavenderMist,
                            fontSize: '0.75rem',
                            marginTop: '0.5rem',
                            cursor: 'pointer',
                            opacity: 0.6,
                            textDecoration: 'underline'
                        }}
                    >
                        Trouble logging in?
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
                        background: loading ? '#404249' : (!isAuthenticated || error || !user?.avatar?.large) ? colors.lavenderMist : 'transparent',
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
