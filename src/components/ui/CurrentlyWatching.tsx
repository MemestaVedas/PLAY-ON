/**
 * Sidebar Component - Discord-style left navigation
 * 
 * Contains:
 * - Main navigation items (Media List, History, Statistics)
 * - Profile section at bottom
 */

import { useAuth } from '../../hooks/useAuth';
import { useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { USER_MEDIA_LIST_QUERY } from '../../api/anilistClient';
import { useNavigate } from 'react-router-dom';

function CurrentlyWatching() {
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();

    const { data, loading: listLoading, error } = useQuery(USER_MEDIA_LIST_QUERY, {
        variables: { userId: user?.id, status: 'CURRENT' },
        skip: !user?.id,
        fetchPolicy: 'cache-first'
    });

    const animeList = useMemo(() => {
        if (!data?.Page?.mediaList) return [];
        return data.Page.mediaList;
    }, [data]);

    const handleIncrement = async (mediaId: number, currentProgress: number) => {
        // Optimistic UI updates are handled by Apollo Client cache if mutation is set up correctly
        // But for now we just use the mutation function
        try {
            const { updateMediaProgress } = await import('../../api/anilistClient');
            await updateMediaProgress(mediaId, currentProgress + 1);
        } catch (e) {
            console.error("Failed to update progress", e);
        }
    };

    if (authLoading || (listLoading && !data)) {
        return <div style={{ padding: '2rem', color: '#B5BAC1' }}>Loading...</div>;
    }

    if (!user) return null;

    return (
        <div style={{ padding: '2rem' }}>
            <h2 style={{ color: '#374151', marginBottom: '1.5rem' }}>
                📺 Currently Watching - {user.name}
            </h2>

            {!animeList || animeList.length === 0 ? (
                <p style={{ color: '#6B7280' }}>No titles currently watching</p>
            ) : (
                <div style={{ display: 'grid', gap: '1rem' }}>
                    {animeList.map((entry: any) => (
                        <div
                            key={entry.id}
                            style={{
                                display: 'flex',
                                gap: '1.5rem',
                                padding: '1.25rem',
                                background: 'rgba(255, 255, 255, 0.8)',
                                borderRadius: '16px',
                                border: '1px solid rgba(255, 255, 255, 0.3)',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                                backdropFilter: 'blur(10px)',
                                cursor: 'pointer'
                            }}
                            onClick={() => navigate(`/anime/details/${entry.media.id}`)}
                        >
                            {/* Poster Cover Image */}
                            <img
                                src={entry.media.coverImage?.medium || entry.media.coverImage?.large}
                                alt={entry.media.title?.romaji}
                                style={{
                                    width: '80px',
                                    height: '110px',
                                    objectFit: 'cover',
                                    borderRadius: '12px',
                                    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                                }}
                            />

                            {/* Info */}
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                <h3 style={{ margin: '0 0 0.5rem 0', color: '#1F2937', fontSize: '1.1rem' }}>
                                    {entry.media.title?.english || entry.media.title?.romaji}
                                </h3>

                                <div style={{ marginBottom: '1rem' }}>
                                    <div style={{
                                        height: '6px',
                                        width: '100%',
                                        background: '#E5E7EB',
                                        borderRadius: '3px',
                                        overflow: 'hidden',
                                        marginBottom: '0.5rem',
                                    }}>
                                        <div style={{
                                            height: '100%',
                                            width: `${(entry.progress / (entry.media.episodes || 1)) * 100}%`,
                                            background: 'linear-gradient(90deg, #C7B8EA, #FFB5C5)',
                                            borderRadius: '3px',
                                            transition: 'width 0.3s ease',
                                        }} />
                                    </div>
                                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#6B7280', fontWeight: '500' }}>
                                        Progress: <span style={{ color: '#C7B8EA' }}>{entry.progress}</span> / {entry.media.episodes || '?'}
                                    </p>
                                </div>

                                {/* Update Button */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleIncrement(entry.media.id, entry.progress);
                                    }}
                                    style={{
                                        alignSelf: 'flex-start',
                                        padding: '0.5rem 1rem',
                                        background: 'linear-gradient(135deg, #C7B8EA 0%, #B8A4E8 100%)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontSize: '0.85rem',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        boxShadow: '0 2px 4px rgba(199, 184, 234, 0.3)',
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
                                    onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
                                >
                                    +1 Episode
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default CurrentlyWatching;

/**
 * USAGE IN YOUR APP:
 * ==================
 * 
 * // In Home.tsx or any page
 * import CurrentlyWatching from '../components/CurrentlyWatching';
 * 
 * function Home() {
 *     return (
 *         <Layout>
 *             <CurrentlyWatching />
 *         </Layout>
 *     );
 * }
 */
