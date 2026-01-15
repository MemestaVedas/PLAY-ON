import { useState } from 'react';

import { useNavigate, useLocation } from 'react-router-dom';
import colors from '../../styles/colors';
import { useAuth } from '../../hooks/useAuth'; // Our custom hook that asks Context for data
import { useLocalMedia } from '../../context/LocalMediaContext';
import SidebarItem from './SidebarItem';
import { HomeIcon, FolderIcon, LibraryIcon, CompassIcon, ChartIcon, CalendarIcon, FilmIcon, BookOpenIcon } from '../ui/Icons';
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
    const { addFolder, animeFolders, mangaFolders } = useLocalMedia();
    console.log("Sidebar: animeFolders:", animeFolders, "mangaFolders:", mangaFolders);

    // Navigation Sections
    const homeItem: SidebarNavItem[] = [
        { label: 'Home', path: '/home', icon: <HomeIcon size={20} /> },
        { label: 'Statistics', path: '/statistics', icon: <ChartIcon size={20} /> },];

    const calendarItem: SidebarNavItem = { label: 'Calendar', path: '/calendar', icon: <CalendarIcon size={20} /> };

    const animeSection: SidebarNavItem[] = [
        { label: 'Watch Anime', path: '/local-anime', icon: <FilmIcon size={20} /> },
        { label: 'Browse Anime', path: '/anime-browse', icon: <CompassIcon size={20} /> },
    ];

    const mangaSection: SidebarNavItem[] = [
        { label: 'Read Manga', path: '/local-manga', icon: <BookOpenIcon size={20} /> },
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
            role="navigation"
            aria-label="Main navigation"
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
                scrollbarWidth: 'thin', // Firefox
                scrollbarColor: 'var(--color-bg-glass-hover) transparent', // Firefox
            }}
                className="custom-scrollbar" // We can target this class if needed in CSS
            >
                {/* Home - Top Level */}
                <div style={{ marginBottom: '0.5rem' }}>
                    {homeItem.map(renderLink)}
                </div>

                {/* My List & Calendar */}
                <div style={{ marginBottom: '0.5rem' }}>
                    {/* My List goes HERE above Calendar */}
                    {renderLink({ label: 'My List', path: '/my-list', icon: <LibraryIcon size={20} /> })}
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
                        aria-label="Add Anime Folder"
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
                        aria-label="Add Manga Folder"
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

            {/* Profile Section (Discord-style footer) */}
            <div style={{
                padding: '0.8rem',
                borderTop: '1px solid var(--color-border-subtle)',
            }}>
                {/* User Card Container */}
                <div style={{
                    borderRadius: '16px',
                    overflow: 'hidden',
                    background: user?.bannerImage
                        ? `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.7)), url("${user.bannerImage}")`
                        : 'rgba(255, 255, 255, 0.03)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    transition: 'all 0.2s ease',
                }}>
                    {/* Clickable Area */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.8rem',
                            cursor: 'pointer',
                            padding: '12px',
                            transition: 'background 0.2s',
                            background: 'transparent',
                        }}
                        onClick={() => {
                            if (isAuthenticated && user?.name) {
                                navigate(`/user/${user.name}`);
                            } else {
                                navigate('/settings');
                            }
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                        }}
                        title={user?.name ? `View ${user.name}'s Profile` : 'Settings'}
                    >
                        <div
                            style={{
                                width: '42px',
                                height: '42px',
                                borderRadius: '10px',
                                background: loading ? 'var(--color-bg-glass-hover)' : 'transparent',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.4rem',
                                flexShrink: 0,
                                overflow: 'hidden',
                                boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                            }}
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

                        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', justifyContent: 'center', minWidth: 0 }}>
                            <span style={{
                                fontSize: '0.9rem',
                                fontWeight: '700',
                                color: '#fff',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                            }}>
                                {isAuthenticated && user?.name ? user.name : 'Guest'}
                            </span>
                            <span style={{
                                fontSize: '0.75rem',
                                color: 'rgba(255,255,255,0.8)',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                            }}>
                                {isAuthenticated ? 'Online' : 'Not Logged In'}
                            </span>
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

        </div >
    );
}

export default Sidebar;
