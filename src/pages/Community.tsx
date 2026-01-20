import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchFollowingActivity } from '../api/anilistClient';
import { useAuth } from '../hooks/useAuth';
import { SkeletonGrid, FadeIn } from '../components/ui/SkeletonLoader';

import RefreshButton from '../components/ui/RefreshButton';

interface ActivityItem {
    id: number;
    status: string;
    progress: string | null;
    createdAt: number;
    user: {
        id: number;
        name: string;
        avatar?: { medium?: string };
    };
    media: {
        id: number;
        type: 'ANIME' | 'MANGA';
        title: { english?: string; romaji?: string };
        coverImage?: { medium?: string };
    };
}

function Community() {
    const navigate = useNavigate();
    const { isAuthenticated, loading: authLoading } = useAuth();
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (authLoading) return;
        if (!isAuthenticated) {
            setLoading(false);
            return;
        }

        const load = async () => {
            try {
                const data = await fetchFollowingActivity(1, 30);
                setActivities(data);
            } catch (e: any) {
                console.error('Failed to load community activity:', e);
                setError('Failed to load activity feed.');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [isAuthenticated, authLoading]);

    const formatTime = (timestamp: number) => {
        const diff = Date.now() / 1000 - timestamp;
        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return `${Math.floor(diff / 86400)}d ago`;
    };

    const getActionText = (status: string, progress: string | null) => {
        const progressText = progress ? ` ${progress}` : '';
        switch (status) {
            case 'watched episode': return `Watched episode${progressText} of`;
            case 'read chapter': return `Read chapter${progressText} of`;
            case 'completed': return 'Completed';
            case 'plans to watch': return 'Plans to watch';
            case 'plans to read': return 'Plans to read';
            case 'paused': return 'Paused';
            case 'dropped': return 'Dropped';
            case 'rewatched episode': return `Rewatched episode${progressText} of`;
            case 'reread chapter': return `Reread chapter${progressText} of`;
            default: return status;
        }
    };

    if (!isAuthenticated && !authLoading) {
        return (
            <div style={{
                padding: '2rem',
                textAlign: 'center',
                color: 'var(--color-text-muted)',
            }}>
                <h2 style={{ color: 'var(--color-text-main)', marginBottom: '1rem' }}>Community</h2>
                <p>Login with AniList to see what your friends are watching.</p>
            </div>
        );
    }

    return (
        <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto', minHeight: '100%' }}>
            <div style={{
                display: 'flex',
                justifyContent: 'between',
                alignItems: 'center',
                marginBottom: '2rem',
                flexWrap: 'wrap',
                gap: '1rem'
            }}>
                <div style={{ flex: 1 }}>
                    <h1 style={{
                        fontSize: '2rem',
                        fontWeight: 900,
                        color: 'var(--color-text-main)',
                        margin: 0,
                        fontFamily: 'var(--font-rounded)',
                        letterSpacing: '-0.02em'
                    }}>
                        Community
                    </h1>
                    <p style={{
                        color: 'var(--color-text-muted)',
                        margin: '4px 0 0 0',
                        fontSize: '0.9rem',
                        fontWeight: 500
                    }}>
                        Recent activity from your AniList circle
                    </p>
                </div>

                <RefreshButton
                    onClick={() => {
                        setLoading(true);
                        const load = async () => {
                            try {
                                const data = await fetchFollowingActivity(1, 40);
                                setActivities(data);
                            } catch (e: any) {
                                console.error('Failed to load community activity:', e);
                                setError('Failed to load activity feed.');
                            } finally {
                                setLoading(false);
                            }
                        };
                        load();
                    }}
                    loading={loading}
                    title="Refresh Feed"
                />
            </div>

            {loading && activities.length === 0 ? (
                <SkeletonGrid count={8} />
            ) : error ? (
                <div style={{
                    padding: '3rem',
                    textAlign: 'center',
                    background: 'rgba(255, 0, 0, 0.05)',
                    borderRadius: '16px',
                    border: '1px solid rgba(255, 0, 0, 0.1)',
                }}>
                    <p style={{ color: '#ff4444', fontWeight: 600 }}>{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            marginTop: '1rem',
                            padding: '8px 16px',
                            background: 'var(--color-bg-glass-hover)',
                            border: '1px solid var(--color-border-subtle)',
                            borderRadius: '8px',
                            color: 'var(--color-text-main)',
                            cursor: 'pointer'
                        }}
                    >
                        Try Again
                    </button>
                </div>
            ) : activities.length === 0 ? (
                <div style={{
                    padding: '4rem 2rem',
                    textAlign: 'center',
                    background: 'var(--color-bg-glass)',
                    borderRadius: '24px',
                    border: '1px solid var(--color-border-subtle)',
                }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👋</div>
                    <h3 style={{ color: 'var(--color-text-main)', marginBottom: '0.5rem' }}>Silence in the feed...</h3>
                    <p style={{ color: 'var(--color-text-muted)', maxWidth: '400px', margin: '0 auto' }}>
                        Follow more users on AniList to see their latest updates here!
                    </p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {activities.map((activity) => (
                        <FadeIn key={activity.id}>
                            <div
                                style={{
                                    display: 'flex',
                                    gap: '1.25rem',
                                    padding: '1.25rem',
                                    background: 'var(--color-bg-glass)',
                                    borderRadius: '16px',
                                    border: '1px solid var(--color-border-subtle)',
                                    alignItems: 'center',
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    cursor: 'pointer',
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}
                                onClick={() => {
                                    const path = activity.media.type === 'ANIME'
                                        ? `/anime/${activity.media.id}`
                                        : `/manga/${activity.media.id}`;
                                    navigate(path);
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'var(--color-bg-glass-hover)';
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.borderColor = 'var(--color-border-main)';
                                    e.currentTarget.style.boxShadow = '0 10px 30px -10px rgba(0,0,0,0.3)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'var(--color-bg-glass)';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.borderColor = 'var(--color-border-subtle)';
                                    e.currentTarget.style.boxShadow = 'none';
                                }}
                            >
                                {/* Media Background Glow */}
                                <div style={{
                                    position: 'absolute',
                                    right: -20,
                                    top: -20,
                                    width: '150px',
                                    height: '150px',
                                    background: activity.media.type === 'MANGA'
                                        ? 'radial-gradient(circle, rgba(74, 222, 128, 0.05) 0%, transparent 70%)'
                                        : 'radial-gradient(circle, rgba(59, 130, 246, 0.05) 0%, transparent 70%)',
                                    pointerEvents: 'none',
                                    zIndex: 0
                                }} />

                                {/* User Avatar */}
                                <div style={{ position: 'relative', zIndex: 1 }}>
                                    <img
                                        src={activity.user.avatar?.medium || '/default-avatar.png'}
                                        alt={activity.user.name}
                                        style={{
                                            width: 48,
                                            height: 48,
                                            borderRadius: '50%',
                                            objectFit: 'cover',
                                            flexShrink: 0,
                                            cursor: 'pointer',
                                            border: '2px solid var(--color-bg-glass)',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                        }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigate(`/user/${activity.user.name}`);
                                        }}
                                    />
                                    <div style={{
                                        position: 'absolute',
                                        bottom: -2,
                                        right: -2,
                                        width: 14,
                                        height: 14,
                                        background: activity.media.type === 'MANGA' ? '#4ade80' : '#3b82f6',
                                        borderRadius: '50%',
                                        border: '2px solid var(--color-bg-glass)',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                    }} />
                                </div>

                                {/* Activity Content */}
                                <div style={{ flex: 1, minWidth: 0, zIndex: 1 }}>
                                    <div style={{
                                        fontSize: '0.95rem',
                                        color: 'var(--color-text-main)',
                                        marginBottom: '6px',
                                        lineHeight: 1.4
                                    }}>
                                        <span
                                            style={{
                                                fontWeight: 700,
                                                color: 'var(--color-zen-accent)',
                                                cursor: 'pointer',
                                            }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigate(`/user/${activity.user.name}`);
                                            }}
                                        >
                                            {activity.user.name}
                                        </span>
                                        {' '}
                                        <span style={{
                                            color: activity.media.type === 'MANGA' ? '#4ade80' : 'rgba(255,255,255,0.7)',
                                            fontWeight: activity.media.type === 'MANGA' ? 600 : 400
                                        }}>
                                            {getActionText(activity.status, activity.progress)}
                                        </span>
                                        {' '}
                                        <span style={{
                                            fontWeight: 700,
                                            color: activity.media.type === 'MANGA' ? '#4ade80' : 'var(--color-text-main)'
                                        }}>
                                            {activity.media.title.english || activity.media.title.romaji}
                                        </span>
                                    </div>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        fontSize: '0.75rem',
                                        color: 'var(--color-text-muted)',
                                        fontWeight: 600,
                                        letterSpacing: '0.02em',
                                        textTransform: 'uppercase'
                                    }}>
                                        <span>{formatTime(activity.createdAt)}</span>
                                        <span style={{ opacity: 0.3 }}>•</span>
                                        <span style={{
                                            color: activity.media.type === 'MANGA' ? '#4ade80' : '#3b82f6',
                                            opacity: 0.8
                                        }}>
                                            {activity.media.type}
                                        </span>
                                    </div>
                                </div>

                                {/* Media Cover */}
                                {activity.media.coverImage?.medium && (
                                    <div style={{
                                        position: 'relative',
                                        zIndex: 1,
                                        borderRadius: '10px',
                                        overflow: 'hidden',
                                        boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
                                        border: '1px solid rgba(255,255,255,0.05)'
                                    }}>
                                        <img
                                            src={activity.media.coverImage.medium}
                                            alt={activity.media.title.english || activity.media.title.romaji}
                                            style={{
                                                width: 52,
                                                height: 76,
                                                objectFit: 'cover',
                                                flexShrink: 0,
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                        </FadeIn>
                    ))}
                </div>
            )}
        </div>
    );
}

export default Community;
