import React, { useRef, useEffect } from 'react';
import colors from '../../styles/colors';
import { useAuth } from '../../hooks/useAuth';
import { clearAllCache } from '../../lib/cacheUtils';
import { relaunch } from '@tauri-apps/plugin-process';

interface UserProfileDialogProps {
    isOpen: boolean;
    onClose: () => void;
    user: any;
    isAuthenticated: boolean;
}

const UserProfileDialog: React.FC<UserProfileDialogProps> = ({
    isOpen,
    onClose,
    user,
    isAuthenticated
}) => {
    const { logout } = useAuth();
    const dialogRef = useRef<HTMLDivElement>(null);

    // Close dialog when clicking outside
    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (event: MouseEvent) => {
            if (dialogRef.current && !dialogRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        // Add listener with a small delay to prevent immediate closing
        const timeoutId = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
        }, 10);

        return () => {
            clearTimeout(timeoutId);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleViewOnAniList = () => {
        if (user?.name) {
            window.open(`https://anilist.co/user/${user.name}`, '_blank');
        }
    };

    return (
        <>
            <div ref={dialogRef} style={{
                position: 'fixed',
                left: '10px',
                bottom: '85px',
                width: '220px',
                background: '#1E1F22',
                borderRadius: '12px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                padding: '1.25rem',
                zIndex: 1000,
                border: '1px solid #313338',
                animation: 'slideUp 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28)',
            }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '1rem',
                }}>
                    <h3 style={{ color: '#FFFFFF', margin: 0, fontSize: '1.1rem' }}>User Profile</h3>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#B5BAC1',
                            cursor: 'pointer',
                            fontSize: '1.2rem'
                        }}
                    >×</button>
                </div>

                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                    <div style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '50%',
                        background: colors.pastelPink,
                        margin: '0 auto 1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '2.5rem',
                        overflow: 'hidden',
                    }}>
                        {!isAuthenticated || !user?.avatar?.large ? '👤' : (
                            <img
                                src={user.avatar.large}
                                alt={user?.name}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                        )}
                    </div>
                    <div style={{ color: '#FFFFFF', fontWeight: '700', fontSize: '1.2rem' }}>
                        {user?.name || 'Guest User'}
                    </div>
                    <div style={{ color: '#B5BAC1', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                        {isAuthenticated ? 'AniList Member' : 'Guest'}
                    </div>
                </div>

                <div style={{ display: 'grid', gap: '0.75rem' }}>
                    <button
                        onClick={handleViewOnAniList}
                        disabled={!user?.name}
                        style={{
                            padding: '0.75rem',
                            background: colors.pastelPurple,
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            opacity: user?.name ? 1 : 0.5,
                            transition: 'background 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                            if (user?.name) e.currentTarget.style.background = '#9d9dbf';
                        }}
                        onMouseLeave={(e) => {
                            if (user?.name) e.currentTarget.style.background = colors.pastelPurple;
                        }}
                    >
                        View in AniList
                    </button>

                    {isAuthenticated && (
                        <button
                            onClick={() => {
                                logout();
                                onClose();
                            }}
                            style={{
                                padding: '0.75rem',
                                background: 'transparent',
                                color: '#eb459f', // Pastel Pinkish/Red
                                border: '1px solid #eb459f',
                                borderRadius: '8px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(235, 69, 159, 0.1)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'transparent';
                            }}
                        >
                            Logout
                        </button>
                    )}

                    {/* Divider */}
                    <div style={{
                        height: '1px',
                        background: '#313338',
                        margin: '0.5rem 0'
                    }} />

                    {/* Clear Cache Button */}
                    <button
                        onClick={async () => {
                            await clearAllCache();
                            window.location.reload();
                        }}
                        style={{
                            padding: '0.75rem',
                            background: 'transparent',
                            color: '#949BA4',
                            border: '1px solid #404249',
                            borderRadius: '8px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            fontSize: '0.85rem',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(148, 155, 164, 0.1)';
                            e.currentTarget.style.borderColor = '#949BA4';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.borderColor = '#404249';
                        }}
                    >
                        🗑️ Clear Cache
                    </button>

                    {/* Clear & Restart Button */}
                    <button
                        onClick={async () => {
                            await clearAllCache();
                            await relaunch();
                        }}
                        style={{
                            padding: '0.75rem',
                            background: 'transparent',
                            color: '#f0b232',
                            border: '1px solid #f0b232',
                            borderRadius: '8px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            fontSize: '0.85rem',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(240, 178, 50, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                        }}
                    >
                        🔄 Clear & Restart
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes slideUp {
                    from { 
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    to { 
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `}</style>
        </>
    );
};

export default UserProfileDialog;
