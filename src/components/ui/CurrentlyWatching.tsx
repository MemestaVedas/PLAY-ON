/**
 * Sidebar Component - Discord-style left navigation
 * 
 * Contains:
 * - Main navigation items (Media List, History, Statistics)
 * - Profile section at bottom
 */

import { useAuth } from '../../hooks/useAuth';
import { useState } from 'react';

/**
 * Mock data for the generic shell
 */
const MOCK_ANIME_LIST = [
    {
        id: 1,
        progress: 9,
        media: {
            id: 1,
            title: { romaji: 'Solo Leveling', english: 'Solo Leveling' },
            coverImage: { medium: '/brain/d4275da3-9954-484c-802f-296cee8f613a/anime_mock_3_1766682294612.png' },
            episodes: 12,
        }
    },
    {
        id: 2,
        progress: 24,
        media: {
            id: 2,
            title: { romaji: 'Sousou no Frieren', english: 'Frieren: Beyond Journey\'s End' },
            coverImage: { medium: '/brain/d4275da3-9954-484c-802f-296cee8f613a/anime_mock_4_1766682324192.png' },
            episodes: 28,
        }
    }
];

function CurrentlyWatching() {
    const { isAuthenticated, user, login, loading: authLoading } = useAuth();
    const [animeList, setAnimeList] = useState(MOCK_ANIME_LIST);
    const [updating, setUpdating] = useState(false);

    // Show login button if not authenticated
    if (!isAuthenticated) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
                <h2>Login to see your anime list</h2>
                <button
                    onClick={login}
                    style={{
                        padding: '0.75rem 1.5rem',
                        fontSize: '1rem',
                        background: '#02A9FF',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                    }}
                >
                    Login to Tracker
                </button>
            </div>
        );
    }

    // Show loading state
    if (authLoading) {
        return <div style={{ padding: '2rem' }}>Loading...</div>;
    }

    // Handle progress increment (Mocked)
    async function incrementProgress(mediaId: number) {
        setUpdating(true);
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500));

        setAnimeList(prev => prev.map(entry => {
            if (entry.media.id === mediaId) {
                return { ...entry, progress: entry.progress + 1 };
            }
            return entry;
        }));

        setUpdating(false);
    }

    return (
        <div style={{ padding: '2rem' }}>
            <h2>Currently Watching - {user?.name}</h2>

            {animeList.length === 0 ? (
                <p>No titles currently watching</p>
            ) : (
                <div style={{ display: 'grid', gap: '1rem' }}>
                    {animeList.map((entry) => (
                        <div
                            key={entry.id}
                            style={{
                                display: 'flex',
                                gap: '1rem',
                                padding: '1rem',
                                background: '#f5f5f5',
                                borderRadius: '8px',
                            }}
                        >
                            {/* Placeholder Cover Image */}
                            <img
                                src={entry.media.coverImage.medium}
                                alt={entry.media.title.romaji}
                                style={{
                                    width: '80px',
                                    height: '120px',
                                    objectFit: 'cover',
                                    borderRadius: '4px',
                                }}
                            />

                            {/* Info */}
                            <div style={{ flex: 1 }}>
                                <h3 style={{ margin: '0 0 0.5rem 0' }}>
                                    {entry.media.title.english || entry.media.title.romaji}
                                </h3>

                                <p style={{ margin: '0.25rem 0' }}>
                                    Progress: {entry.progress} / {entry.media.episodes || '?'}
                                </p>

                                {/* Update Button */}
                                <button
                                    onClick={() => incrementProgress(entry.media.id)}
                                    disabled={updating}
                                    style={{
                                        marginTop: '0.5rem',
                                        padding: '0.5rem 1rem',
                                        background: '#02A9FF',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: updating ? 'not-allowed' : 'pointer',
                                        opacity: updating ? 0.6 : 1,
                                    }}
                                >
                                    {updating ? 'Updating...' : '+1 Unit'}
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
