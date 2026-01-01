import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageTransition } from '../components/ui/UIComponents';
import AnimeCard from '../components/ui/AnimeCard';
import NowPlaying from '../components/ui/NowPlaying';
import { useAuth } from '../hooks/useAuth';
import { useQuery } from '@apollo/client';
import { USER_MEDIA_LIST_QUERY, TRENDING_ANIME_QUERY } from '../api/anilistClient';

function Home() {
    const navigate = useNavigate();
    const { user, isAuthenticated } = useAuth();

    // Fetch Anime Data with useQuery for instant cache access
    const { data: userData, loading: userLoading } = useQuery(USER_MEDIA_LIST_QUERY, {
        variables: { userId: user?.id, status: 'CURRENT' },
        skip: !isAuthenticated || !user?.id,
        fetchPolicy: 'cache-first'
    });

    const { data: trendingData, loading: trendingLoading } = useQuery(TRENDING_ANIME_QUERY, {
        variables: { page: 1, perPage: 12 },
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
                episodes: item.media.episodes,
                format: item.media.format,
                averageScore: item.media.averageScore,
                nextEpisode: item.media.nextAiringEpisode
            }));
        } else {
            return trendingData?.Page?.media || [];
        }
    }, [isAuthenticated, userData, trendingData]);



    const handleAnimeClick = (id: number) => {
        navigate(`/anime/${id}`);
    };



    return (
        <PageTransition>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <div className="mb-10 mt-6 px-2">
                    <h1 className="text-4xl font-bold text-white mb-2" style={{ fontFamily: 'var(--font-rounded)', letterSpacing: '-0.02em', textShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
                        {isAuthenticated ? `Welcome back, ${user?.name}` : "Dashboard"}
                    </h1>
                    <p className="text-white/40 text-lg font-medium" style={{ fontFamily: 'var(--font-rounded)' }}>
                        {isAuthenticated ? "Ready to dive back in?" : "Track your anime journey"}
                    </p>
                </div>



                {/* Anime Cards Section */}
                <div className="mb-10">
                    <h3 className="text-lg font-bold text-white mb-6 px-2 flex items-center gap-3" style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}>
                        <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-zen-accent)] shadow-[0_0_8px_var(--color-zen-accent)]"></div>
                        {isAuthenticated ? "CURRENTLY_WATCHING" : "TRENDING_NOW"}
                    </h3>

                    {animeLoading ? (
                        <div className="flex justify-center items-center py-10">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-mint-tonic"></div>
                        </div>
                    ) : animeList.length > 0 ? (
                        <>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                                {animeList.slice(0, 5).map((anime: any) => (
                                    <AnimeCard
                                        key={anime.id}
                                        anime={isAuthenticated ? {
                                            id: anime.id,
                                            title: anime.title,
                                            coverImage: anime.coverImage,
                                            episodes: anime.episodes,
                                            format: anime.format,
                                            averageScore: anime.averageScore
                                        } : anime}
                                        progress={isAuthenticated ? anime.progress : undefined}
                                        onClick={() => handleAnimeClick(anime.id)}
                                    />
                                ))}
                            </div>
                            {animeList.length > 5 && (
                                <div className="flex justify-center mt-6">
                                    <button
                                        onClick={() => navigate('/anime-list')}
                                        className="px-8 py-3 rounded-xl transition-all text-sm font-bold tracking-wide"
                                        style={{
                                            background: 'rgba(180, 162, 246, 0.1)',
                                            color: 'var(--color-zen-accent)',
                                            border: '1px solid rgba(180, 162, 246, 0.2)',
                                            backdropFilter: 'blur(10px)',
                                            fontFamily: 'var(--font-rounded)',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = 'var(--color-zen-accent)';
                                            e.currentTarget.style.color = '#000';
                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                            e.currentTarget.style.boxShadow = '0 6px 20px rgba(180, 162, 246, 0.3)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'rgba(180, 162, 246, 0.1)';
                                            e.currentTarget.style.color = 'var(--color-zen-accent)';
                                            e.currentTarget.style.transform = 'translateY(0)';
                                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                                        }}
                                    >
                                        SEE MORE
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-center py-10 bg-white/5 rounded-2xl border border-dashed border-white/10">
                            <p className="text-text-secondary">No anime found in your list.</p>
                        </div>
                    )}
                </div>

                {/* Now Playing Section - Enhanced with anime detection */}
                <div style={{ marginBottom: '2rem' }}>
                    <NowPlaying />
                </div>
            </div>
        </PageTransition>
    );
}

export default Home;
