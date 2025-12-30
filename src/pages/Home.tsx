import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatCard, SectionHeader, PageTransition } from '../components/ui/UIComponents';
import AnimeCard from '../components/ui/AnimeCard';
import NowPlaying from '../components/ui/NowPlaying';
import { useAuth } from '../hooks/useAuth';
import { useQuery } from '@apollo/client';
import { USER_MEDIA_LIST_QUERY, TRENDING_ANIME_QUERY, USER_STATS_QUERY } from '../api/anilistClient';

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

    // Fetch User Stats
    const { data: statsData } = useQuery(USER_STATS_QUERY, {
        variables: { userId: user?.id },
        skip: !isAuthenticated || !user?.id,
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

    // Format stats for display
    const stats = useMemo(() => {
        if (!isAuthenticated || !statsData?.User?.statistics?.anime) {
            return {
                total: 0,
                completed: 0,
                watching: 0,
                onHold: 0
            };
        }

        const animeStats = statsData.User.statistics.anime;
        const total = animeStats.count;

        const statuses = animeStats.statuses || [];
        const completed = statuses.find((s: any) => s.status === 'COMPLETED')?.count || 0;
        const watching = (statuses.find((s: any) => s.status === 'CURRENT')?.count || 0) +
            (statuses.find((s: any) => s.status === 'REPEATING')?.count || 0);
        const onHold = statuses.find((s: any) => s.status === 'PAUSED')?.count || 0;

        return { total, completed, watching, onHold };
    }, [isAuthenticated, statsData]);

    const handleAnimeClick = (id: number) => {
        navigate(`/anime/${id}`);
    };

    const handleStatClick = (status?: string) => {
        if (status) {
            navigate(`/anime-list?status=${status}`);
        } else {
            navigate('/anime-list');
        }
    };

    return (
        <PageTransition>
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
                    <StatCard
                        icon="📺"
                        label="Total Anime"
                        value={stats.total}
                        color="#C7B8EA"
                        onClick={() => handleStatClick()}
                    />
                    <StatCard
                        icon="✅"
                        label="Completed"
                        value={stats.completed}
                        color="#86EFAC"
                        onClick={() => handleStatClick('Completed')}
                    />
                    <StatCard
                        icon="▶️"
                        label="Watching"
                        value={stats.watching}
                        color="#FFB5C5"
                        onClick={() => handleStatClick('Watching')}
                    />
                    <StatCard
                        icon="⏸️"
                        label="On Hold"
                        value={stats.onHold}
                        color="#FFE5B4"
                        onClick={() => handleStatClick('Paused')}
                    />
                </div>

                {/* Anime Cards Section */}
                <div className="mb-10">
                    <h3 className="text-xl font-bold text-white mb-6 px-2 flex items-center gap-3">
                        <span className="w-2 h-8 bg-mint-tonic rounded-full"></span>
                        {isAuthenticated ? "Currently Watching" : "Trending Now"}
                    </h3>

                    {animeLoading ? (
                        <div className="flex justify-center items-center py-10">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-mint-tonic"></div>
                        </div>
                    ) : animeList.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                            {animeList.map((anime: any) => (
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
