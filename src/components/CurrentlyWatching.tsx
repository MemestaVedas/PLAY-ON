/**
 * Example Component: Currently Watching Anime
 * 
 * Demonstrates how to use the AniList integration to display
 * and update user's currently watching anime
 */

import { useAuth } from '../hooks/useAuth';
import { useUserAnimeList } from '../hooks/useUserAnimeList';
import { useUpdateAnime } from '../hooks/useUpdateAnime';

function CurrentlyWatching() {
    const { isAuthenticated, user, login, loading: authLoading } = useAuth();
    const { animeList, loading, error, refresh } = useUserAnimeList('CURRENT');
    const { updateAnime, updating } = useUpdateAnime();

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
                    Login with AniList
                </button>
            </div>
        );
    }

    // Show loading state
    if (authLoading || loading) {
        return <div style={{ padding: '2rem' }}>Loading...</div>;
    }

    // Show error state
    if (error) {
        return <div style={{ padding: '2rem', color: 'red' }}>Error: {error}</div>;
    }

    // Handle progress increment
    async function incrementProgress(mediaId: number, currentProgress: number) {
        const result = await updateAnime({
            mediaId,
            progress: currentProgress + 1,
        });

        if (result) {
            refresh(); // Refresh the list after update
        }
    }

    return (
        <div style={{ padding: '2rem' }}>
            <h2>Currently Watching - {user?.name}</h2>

            {animeList.length === 0 ? (
                <p>No anime currently watching</p>
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
                            {/* Cover Image */}
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

                                <p style={{ margin: '0.25rem 0' }}>
                                    Score: {entry.score > 0 ? entry.score : 'Not rated'}
                                </p>

                                {/* Update Button */}
                                <button
                                    onClick={() => incrementProgress(entry.media.id, entry.progress)}
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
                                    {updating ? 'Updating...' : '+1 Episode'}
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
