import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import AnimeCard from '../components/ui/AnimeCard';
import Loading from '../components/ui/Loading';
import { useAuth } from '../hooks/useAuth';
import { useQuery } from '@apollo/client';
import { USER_MEDIA_LIST_QUERY, TRENDING_ANIME_QUERY } from '../api/anilistClient';

function Home() {
    const navigate = useNavigate();
    const { user, isAuthenticated } = useAuth();

    // Fetch Anime Data with useQuery for instant cache access
    const { data: userData, loading: userLoading, refetch: refetchUser } = useQuery(USER_MEDIA_LIST_QUERY, {
        variables: { userId: user?.id, status: 'CURRENT' },
        skip: !isAuthenticated || !user?.id,
        notifyOnNetworkStatusChange: true,
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
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div className="mb-10 mt-6 px-2">
                <h1 className="text-4xl font-bold mb-2" style={{ fontFamily: 'var(--font-rounded)', letterSpacing: '-0.02em', textShadow: '0 4px 12px rgba(0,0,0,0.1)', color: 'var(--color-text-main)' }}>
                    {isAuthenticated ? `Welcome back, ${user?.name}` : "Dashboard"}
                </h1>
                <p className="text-lg font-medium" style={{ fontFamily: 'var(--font-rounded)', color: 'var(--color-text-muted)' }}>
                    {isAuthenticated ? "Ready to dive back in?" : "Track your anime journey"}
                </p>
            </div>



            {/* Anime Cards Section */}
            <div className="mb-10">
                <div className="flex items-center justify-between mb-6 px-2">
                    <h3 className="text-lg font-bold flex items-center gap-3" style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.05em', color: 'var(--color-text-main)' }}>
                        <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-zen-accent)] shadow-[0_0_8px_var(--color-zen-accent)]"></div>
                        {isAuthenticated ? "CURRENTLY_WATCHING" : "TRENDING_NOW"}
                    </h3>
                    {isAuthenticated && (
                        <button
                            onClick={() => refetchUser()}
                            className={`p-2 rounded-full transition-all ${userLoading ? 'animate-spin' : ''}`}
                            style={{ color: 'var(--color-text-muted)' }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-text-main)'; e.currentTarget.style.backgroundColor = 'var(--color-bg-glass-hover)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-muted)'; e.currentTarget.style.backgroundColor = 'transparent'; }}
                            title="Refresh List"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6"></path><path d="M1 20v-6h6"></path><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
                        </button>
                    )}
                </div>

                {animeLoading && animeList.length === 0 ? (
                    <Loading inline />
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
                                    onClick={() => navigate('/anime-list?status=Watching')}
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
        </div>
    );
}

export default Home;
