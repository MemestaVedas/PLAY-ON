import { useState } from 'react';

import { useNavigate, useLocation } from 'react-router-dom';
import colors from '../../styles/colors';
import { useAuth } from '../../hooks/useAuth'; // Our custom hook that asks Context for data
import { useLocalMedia } from '../../context/LocalMediaContext';
import SidebarItem from './SidebarItem';
import { HistoryIcon, HomeIcon, FolderIcon, SettingsIcon, LibraryIcon, CompassIcon, FilmIcon, PlayIcon, ChartIcon, BellIcon, CalendarIcon } from '../ui/Icons';
import UserProfileDialog from '../ui/UserProfileDialog';
import { useAniListNotifications } from '../../hooks/useAniListNotifications';

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
    const { addFolder, animeFolders, mangaFolders } = useLocalMedia();
    console.log("Sidebar: animeFolders:", animeFolders, "mangaFolders:", mangaFolders);

    // Fetch AniList notifications
    const { unreadCount } = useAniListNotifications();

    // Navigation Sections
    const homeItem: SidebarNavItem[] = [
        { label: 'Home', path: '/home', icon: <HomeIcon size={20} /> },
        { label: 'Statistics', path: '/statistics', icon: <ChartIcon size={20} /> },];

    const calendarItem: SidebarNavItem = { label: 'Calendar', path: '/calendar', icon: <CalendarIcon size={20} /> };

    const animeSection: SidebarNavItem[] = [
        { label: 'Anime List', path: '/anime-list', icon: <FilmIcon size={20} /> },
        { label: 'Browse Anime', path: '/anime-browse', icon: <CompassIcon size={20} /> },
    ];

    const mangaSection: SidebarNavItem[] = [
        { label: 'My Manga List', path: '/manga-list', icon: <LibraryIcon size={20} /> },
        { label: 'Read Manga', path: '/local-manga', icon: <PlayIcon size={20} /> },
        { label: 'Browse Manga', path: '/manga-browse', icon: <CompassIcon size={20} /> },
    ];


    const handleNavClick = (path: string, state?: any) => {
        navigate(path, { state });
    };

    const renderLink = (item: SidebarNavItem) => {
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
    };

    const renderSectionHeader = (title: string) => (
        <div style={{
            padding: '0 0.75rem',
            marginBottom: '0.5rem',
            marginTop: '1rem',
            fontSize: '0.7rem',
            fontWeight: '800',
            color: 'var(--color-text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            fontFamily: 'var(--font-rounded)',
            opacity: 0.7
        }}>
            {title}
        </div>
    );

    return (
        <div
            style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                paddingTop: '40px', // Keep padding for titlebar
                borderRadius: '0',  // Sidebar shouldn't be rounded
                border: 'none',     // Remove all borders
                background: 'transparent', // Unify with shell
            }}
        >
            {/* Navigation Items */}
            <div style={{
                flex: 1,
                padding: '1rem 0.5rem',
                overflowY: 'auto',
            }}>
                {/* Home - Top Level */}
                <div style={{ marginBottom: '0.5rem' }}>
                    {renderLink(homeItem)}
                </div>
                {/* Calendar - Below Home */}
                <div style={{ marginBottom: '0.5rem' }}>
                    {renderLink(calendarItem)}
                </div>

                {/* Anime Section */}
                {renderSectionHeader('Anime')}
                <div style={{ marginBottom: '0.5rem' }}>
                    {animeSection.map(renderLink)}
                </div>

                {/* Local Anime Folders */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 0.75rem',
                    marginBottom: '0.25rem',
                    marginTop: '0.5rem',
                }}>
                    <span style={{
                        fontSize: '0.65rem',
                        fontWeight: '700',
                        color: 'var(--color-text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        fontFamily: 'var(--font-rounded)',
                        opacity: 0.6
                    }}>Local Anime</span>
                    <button
                        onClick={() => addFolder('anime')}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--color-text-muted)',
                            cursor: 'pointer',
                            padding: '0 4px',
                            fontSize: '1rem',
                            lineHeight: 1,
                            borderRadius: '4px',
                            transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.color = 'var(--color-text-main)';
                            e.currentTarget.style.background = 'var(--color-bg-glass-hover)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.color = 'var(--color-text-muted)';
                            e.currentTarget.style.background = 'transparent';
                        }}
                        title="Add Anime Folder"
                    >
                        +
                    </button>
                </div>
                {animeFolders.map((item) => {
                    const path = `/local/${encodeURIComponent(item.path)}`;
                    const isActive = location.pathname === path;
                    return (
                        <SidebarItem
                            key={item.path}
                            label={item.label}
                            icon={<FolderIcon size={16} />}
                            isActive={isActive}
                            onClick={() => handleNavClick(path, { type: 'ANIME' })}
                        />
                    );
                })}

                {/* Manga Section */}
                {renderSectionHeader('Manga')}
                <div style={{ marginBottom: '0.5rem' }}>
                    {mangaSection.map(renderLink)}
                </div>

                {/* Local Manga Folders */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 0.75rem',
                    marginBottom: '0.25rem',
                    marginTop: '0.5rem',
                }}>
                    <span style={{
                        fontSize: '0.65rem',
                        fontWeight: '700',
                        color: 'var(--color-text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        fontFamily: 'var(--font-rounded)',
                        opacity: 0.6
                    }}>Local Manga</span>
                    <button
                        onClick={() => addFolder('manga')}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--color-text-muted)',
                            cursor: 'pointer',
                            padding: '0 4px',
                            fontSize: '1rem',
                            lineHeight: 1,
                            borderRadius: '4px',
                            transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.color = 'var(--color-text-main)';
                            e.currentTarget.style.background = 'var(--color-bg-glass-hover)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.color = 'var(--color-text-muted)';
                            e.currentTarget.style.background = 'transparent';
                        }}
                        title="Add Manga Folder"
                    >
                        +
                    </button>
                </div>
                {mangaFolders.map((item) => {
                    const path = `/local/${encodeURIComponent(item.path)}`;
                    const isActive = location.pathname === path;
                    return (
                        <SidebarItem
                            key={item.path}
                            label={item.label}
                            icon={<FolderIcon size={16} />}
                            isActive={isActive}
                            onClick={() => handleNavClick(path, { type: 'MANGA' })}
                        />
                    );
                })}
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
                borderTop: '1px solid var(--color-border-subtle)',
                background: 'transparent',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
            }}>
                {/* User Avatar - clicks to profile page */}
                <div
                    style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: loading ? 'var(--color-bg-glass-hover)' : (!isAuthenticated || error || !user?.avatar?.large) ? colors.lavenderMist : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.25rem',
                        flexShrink: 0,
                        overflow: 'hidden',
                        cursor: 'pointer',
                        transition: 'transform 0.2s',
                    }}
                    onClick={() => {
                        if (isAuthenticated && user?.name) {
                            navigate(`/user/${user.name}`);
                        } else {
                            navigate('/settings');
                        }
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    title={user?.name ? `View ${user.name}'s Profile` : 'Settings'}
                >
                    {loading ? (
                        <div style={{
                            width: '100%',
                            height: '100%',
                            backgroundImage: 'linear-gradient(90deg, var(--color-bg-glass-hover) 0%, var(--color-border-subtle) 50%, var(--color-bg-glass-hover) 100%)',
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

                {/* Spacer */}
                <div style={{ flex: 1 }} />

                {/* History Icon */}
                <button
                    onClick={() => navigate('/history')}
                    style={{
                        background: location.pathname === '/history' ? 'var(--color-bg-glass-hover)' : 'transparent',
                        border: 'none',
                        color: location.pathname === '/history' ? 'var(--color-text-main)' : 'var(--color-text-muted)',
                        cursor: 'pointer',
                        padding: '8px',
                        borderRadius: '8px',
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
                        if (location.pathname !== '/history') {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = 'var(--color-text-muted)';
                        }
                    }}
                    title="History"
                >
                    <HistoryIcon size={20} />
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
                            padding: '8px',
                            borderRadius: '8px',
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
                        <BellIcon size={20} />
                        {unreadCount > 0 && (
                            <span style={{
                                position: 'absolute',
                                top: 2,
                                right: 2,
                                background: 'var(--color-zen-accent)',
                                color: '#000',
                                borderRadius: '50%',
                                width: 16,
                                height: 16,
                                fontSize: '0.6rem',
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
                        background: location.pathname === '/settings' ? 'var(--color-bg-glass-hover)' : 'transparent',
                        border: 'none',
                        color: location.pathname === '/settings' ? 'var(--color-text-main)' : 'var(--color-text-muted)',
                        cursor: 'pointer',
                        padding: '8px',
                        borderRadius: '8px',
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
                        if (location.pathname !== '/settings') {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = 'var(--color-text-muted)';
                        }
                    }}
                    title="Settings"
                >
                    <SettingsIcon size={20} />
                </button>
            </div>

            {/* User Profile Dialog */}
            <UserProfileDialog
                isOpen={showProfileModal}
                onClose={() => setShowProfileModal(false)}
                user={user}
                isAuthenticated={isAuthenticated}
            />

        </div >
    );
}

export default Sidebar;
