import { useState, useEffect, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Card, StatCard, SectionHeader } from '../components/ui/UIComponents';
import TiltedCard from '../components/ui/TiltedCard';
import { useAuth } from '../hooks/useAuth';
import { useQuery } from '@apollo/client';
import { USER_MEDIA_LIST_QUERY, TRENDING_ANIME_QUERY } from '../api/anilistClient';

function Home() {
    const [mediaWindow, setMediaWindow] = useState<string>('Loading...');
    const [error, setError] = useState<string | null>(null);

    // Anime List Logic replaced by useQuery

    const { user, isAuthenticated } = useAuth();

    // Fetch Anime Data with useQuery for instant cache access
    const { data: userData, loading: userLoading } = useQuery(USER_MEDIA_LIST_QUERY, {
        variables: { userId: user?.id, status: 'CURRENT' },
        skip: !isAuthenticated || !user?.id,
        fetchPolicy: 'cache-first'
    });

    const { data: trendingData, loading: trendingLoading } = useQuery(TRENDING_ANIME_QUERY, {
        variables: { page: 1, perPage: 10 },
        skip: isAuthenticated,
        fetchPolicy: 'cache-first'
    });

    const animeLoading = isAuthenticated ? userLoading : trendingLoading;

    // Derived state from queries
    const animeList = useMemo(() => {
        if (isAuthenticated) {
            const updates = userData?.Page?.mediaList || [];
            return updates.map((item: any) => ({
                id: item.media.id,
                title: item.media.title,
                coverImage: item.media.coverImage,
                progress: item.progress,
                nextEpisode: item.media.nextAiringEpisode
            }));
        } else {
            return trendingData?.Page?.media || [];
        }
    }, [isAuthenticated, userData, trendingData]);


    useEffect(() => {
        const fetchMediaWindow = async () => {
            try {
                const result = await invoke<string>('get_active_media_window');
                setMediaWindow(result);
                setError(null);
            } catch (err) {
                console.error('Error fetching media window:', err);
                setError('Failed to get media window');
            }
        };

        fetchMediaWindow();
        const interval = setInterval(fetchMediaWindow, 2000);
        return () => clearInterval(interval);
    }, []);

    const isNoMedia = mediaWindow === 'No media playing' || mediaWindow === 'No active window';

    return (
        <>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <SectionHeader
                    title={isAuthenticated ? `Welcome back, ${user?.name}` : "Dashboard"}
                    subtitle={isAuthenticated ? "Continue watching where you left off" : "Track your anime watching activity"}
                    icon="🏠"
                />

                {/* Stats Grid */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '1.5rem',
                    marginBottom: '2rem',
                }}>
                    <StatCard icon="📺" label="Total Anime" value={animeList.length || 0} color="#C7B8EA" />
                    <StatCard icon="✅" label="Completed" value={12} color="#86EFAC" />
                    <StatCard icon="▶️" label="Watching" value={animeList.length || 0} color="#FFB5C5" />
                    <StatCard icon="⏸️" label="On Hold" value={4} color="#FFE5B4" />
                </div>

                {/* Tilted Cards Anime List */}
                <div className="mb-4">
                    <h3 className="text-xl font-semibold text-gray-700 mb-4 px-4">
                        {isAuthenticated ? "Currently Watching" : "Trending Now"}
                    </h3>
                    <div className="flex justify-center items-center gap-8 overflow-x-auto py-8">
                        {animeLoading ? (
                            <p className="text-gray-400">Loading anime covers...</p>
                        ) : animeList.length > 0 ? (
                            animeList.map((anime) => {
                                const title = anime.title.english || anime.title.romaji;
                                // For authenticated user, show progress
                                const caption = isAuthenticated
                                    ? `Ep ${anime.progress + 1} • ${anime.nextEpisode ? `Airing in ${Math.ceil(anime.nextEpisode.timeUntilAiring / 86400)}d` : 'Next ep soon'}`
                                    : title;

                                return (
                                    <TiltedCard
                                        key={anime.id}
                                        imageSrc={anime.coverImage.extraLarge || anime.coverImage.large}
                                        altText={title}
                                        captionText={caption}
                                        containerHeight="260px"
                                        containerWidth="180px"
                                        imageHeight="260px"
                                        imageWidth="180px"
                                        rotateAmplitude={12}
                                        scaleOnHover={1.15}
                                        showMobileWarning={false}
                                        showTooltip={true}
                                        displayOverlayContent={true}
                                        overlayContent={
                                            <div className="p-4 w-full h-full flex items-end justify-center bg-gradient-to-t from-black/80 via-transparent to-transparent rounded-[15px]">
                                                <div>
                                                    <p className="text-white font-bold text-center text-sm drop-shadow-md">
                                                        {title}
                                                    </p>
                                                    {isAuthenticated && (
                                                        <p className="text-xs text-green-300 text-center mt-1 font-mono">
                                                            Ep {anime.progress} Watched
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        }
                                    />
                                );
                            })
                        ) : (
                            <p className="text-gray-400">No anime found.</p>
                        )}
                    </div>
                </div>

                {/* Currently Playing Section */}
                <div style={{ marginBottom: '2rem' }}>
                    <h3 style={{
                        fontSize: '1.5rem',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '1rem',
                    }}>
                        🎬 Now Playing
                    </h3>

                    <Card gradient={isNoMedia
                        ? 'linear-gradient(135deg, rgba(156, 163, 175, 0.1) 0%, rgba(107, 114, 128, 0.1) 100%)'
                        : 'linear-gradient(135deg, rgba(199, 184, 234, 0.1) 0%, rgba(184, 164, 232, 0.1) 100%)'
                    }>
                        <div style={{ textAlign: 'center', padding: '2rem' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
                                {isNoMedia ? '⏸️' : '▶️'}
                            </div>

                            {error ? (
                                <p style={{ fontSize: '1.1rem', color: '#EF4444', fontFamily: 'monospace' }}>
                                    {error}
                                </p>
                            ) : (
                                <>
                                    <p style={{
                                        fontSize: '1.1rem',
                                        color: isNoMedia ? '#9CA3AF' : '#374151',
                                        fontFamily: 'monospace',
                                        fontStyle: isNoMedia ? 'italic' : 'normal',
                                        marginBottom: '1rem',
                                    }}>
                                        {mediaWindow}
                                    </p>

                                    {!isNoMedia && (
                                        <div style={{
                                            display: 'inline-block',
                                            padding: '0.5rem 1rem',
                                            background: 'rgba(134, 239, 172, 0.3)',
                                            borderRadius: '12px',
                                            border: '1px solid rgba(134, 239, 172, 0.5)',
                                        }}>
                                            <span style={{ fontSize: '0.9rem', color: '#15803D', fontWeight: '600' }}>
                                                ✓ Media player detected
                                            </span>
                                        </div>
                                    )}
                                </>
                            )}

                            <p style={{
                                fontSize: '0.85rem',
                                color: '#9CA3AF',
                                marginTop: '1rem',
                                fontStyle: 'italic',
                            }}>
                                Updates every 2 seconds • Filters non-media windows
                            </p>
                        </div>
                    </Card>
                </div>
            </div>
        </>
    );
}

export default Home;
