import { useMemo, useCallback, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AnimeCard from '../components/ui/AnimeCard';
import RefreshButton from '../components/ui/RefreshButton';
import { useAuth } from '../hooks/useAuth';
import { useQuery } from '@apollo/client';
import { USER_MANGA_LIST_QUERY, TRENDING_ANIME_QUERY, USER_STATUS_ANIME_COLLECTION_QUERY } from '../api/anilistClient';
import { useMangaMappings } from '../hooks/useMangaMappings';
import { useFolderMappings } from '../hooks/useFolderMappings';
import { getMangaEntryByAnilistId, updateMangaCache } from '../lib/localMangaDb';
import { ExtensionManager } from '../services/ExtensionManager';
import { getStats, formatTime, getActivityStreak, UserStats } from '../services/StatsService';
import { useViewTransition } from '../hooks/useViewTransition';
import { SkeletonGrid, FadeIn } from '../components/ui/SkeletonLoader';



function Home() {
    const navigate = useNavigate();
    const navigateWithTransition = useViewTransition();
    const { user, isAuthenticated } = useAuth();
    const { mappings: mangaMappings } = useMangaMappings();
    const { mappings: folderMappings } = useFolderMappings();
    const [resumingMangaId, setResumingMangaId] = useState<number | null>(null);
    const [stats, setStats] = useState<UserStats | null>(null);
    // const { settings } = useSettings(); // Removed

    useEffect(() => {
        setStats(getStats());
    }, []);

    // Fetch Anime Data with useQuery for instant cache access
    const { data: userData, loading: userLoading, refetch: refetchUser } = useQuery(USER_STATUS_ANIME_COLLECTION_QUERY, {
        variables: { userId: user?.id, status: 'CURRENT' },
        skip: !isAuthenticated || !user?.id,
        notifyOnNetworkStatusChange: true,
        fetchPolicy: 'cache-and-network'
    });

    // Fetch PLANNING anime for Upcoming Episodes section
    const { data: planningData } = useQuery(USER_STATUS_ANIME_COLLECTION_QUERY, {
        variables: { userId: user?.id, status: 'PLANNING' },
        skip: !isAuthenticated || !user?.id,
        fetchPolicy: 'cache-and-network'
    });

    // Fetch Manga Data for Currently Reading
    const { data: mangaData, loading: mangaLoading, refetch: refetchManga } = useQuery(USER_MANGA_LIST_QUERY, {
        variables: { userId: user?.id, status: 'CURRENT' },
        skip: !isAuthenticated || !user?.id,
        notifyOnNetworkStatusChange: true,
        fetchPolicy: 'cache-and-network'
    });

    const { data: trendingData, loading: trendingLoading } = useQuery(TRENDING_ANIME_QUERY, {
        variables: { page: 1, perPage: 12 },
        skip: isAuthenticated,
        fetchPolicy: 'cache-and-network'
    });

    const animeLoading = isAuthenticated ? userLoading : trendingLoading;

    // Derived state from queries - include folder mapping for resume button
    const animeList = useMemo(() => {
        if (isAuthenticated && userData?.MediaListCollection?.lists) {
            const updates = userData.MediaListCollection.lists.flatMap((l: any) => l.entries);
            return updates.map((item: any) => {
                // Check if anime has a linked local folder
                const folderMapping = folderMappings.find(m => m.anilistId === item.media.id);
                return {
                    id: item.media.id,
                    title: item.media.title,
                    coverImage: item.media.coverImage,
                    progress: item.progress,
                    episodes: item.media.episodes,
                    format: item.media.format,
                    averageScore: item.media.averageScore,
                    nextEpisode: item.media.nextAiringEpisode,
                    status: item.media.status, // RELEASING, FINISHED, etc.
                    // Resume data
                    hasFolder: !!folderMapping,
                    folderPath: folderMapping?.folderPath
                };
            });
        } else if (!isAuthenticated) {
            return trendingData?.Page?.media || [];
        }
        return [];
    }, [isAuthenticated, userData, trendingData, folderMappings]);

    // Manga list for Currently Reading - include mapping info
    // Using mappings array directly for stable dependency reference
    const mangaList = useMemo(() => {
        if (isAuthenticated && mangaData?.Page?.mediaList) {
            const updates = mangaData.Page.mediaList;
            return updates.map((item: any) => {
                // Look up mapping directly from array to avoid callback dependency issues
                const mapping = mangaMappings.find((m: any) => m.anilistId === item.media.id);
                const localEntry = getMangaEntryByAnilistId(item.media.id);
                return {
                    id: item.media.id,
                    title: item.media.title,
                    coverImage: item.media.coverImage,
                    progress: item.progress,
                    episodes: item.media.chapters,
                    format: item.media.format,
                    averageScore: item.media.averageScore,
                    hasMapping: !!mapping,
                    sourceId: mapping?.sourceId,
                    sourceMangaId: mapping?.sourceMangaId,
                    lastReadChapterId: localEntry?.lastReadChapterId
                };
            });
        }
        return [];
    }, [isAuthenticated, mangaData, mangaMappings]);

    // Upcoming Episodes - Combine CURRENT + PLANNING, filter for RELEASING anime
    const upcomingEpisodes = useMemo(() => {
        if (!isAuthenticated) return [];

        // Map planning anime same as current anime
        const planningAnime = planningData?.MediaListCollection?.lists?.flatMap((l: any) => l.entries)?.map((item: any) => ({
            id: item.media.id,
            title: item.media.title,
            coverImage: item.media.coverImage,
            nextEpisode: item.media.nextAiringEpisode,
            status: item.media.status,
            fromPlanning: true // Mark as from planning list
        })) || [];

        // Combine current (animeList) + planning
        const combined = [...animeList, ...planningAnime];

        // Filter for RELEASING or NOT_YET_RELEASED (upcoming premieres), dedupe by id
        const seen = new Set<number>();
        return combined
            .filter((anime: any) => {
                if (seen.has(anime.id)) return false;
                seen.add(anime.id);
                return (
                    (anime.status === 'RELEASING' || anime.status === 'NOT_YET_RELEASED') &&
                    anime.nextEpisode &&
                    anime.nextEpisode.timeUntilAiring
                );
            })
            .sort((a: any, b: any) => a.nextEpisode.timeUntilAiring - b.nextEpisode.timeUntilAiring)
            .slice(0, 6);
    }, [isAuthenticated, animeList, planningData]);

    const handleAnimeClick = (id: number) => {
        navigateWithTransition(`/anime/${id}`);
    };

    // Resume button handler for anime with linked folders
    const handleAnimeResume = useCallback((anime: any) => {
        if (anime.folderPath) {
            // Navigate to the local folder to continue watching
            navigate(`/local/${encodeURIComponent(anime.folderPath)}`);
        }
    }, [navigate]);

    const handleMangaClick = (id: number) => {
        navigateWithTransition(`/manga-details/${id}`);
    };

    const handleMangaResume = useCallback(async (manga: any) => {
        if (manga.sourceId && manga.sourceMangaId) {
            // 1. Optimistic: If we have a specific last read chapter ID from the list item, try that first?
            // Actually, querying the DB for the FULL entry is safer to get the chapter list.

            setResumingMangaId(manga.id);
            try {
                // Fetch full local entry to access cached chapters
                const localEntry = getMangaEntryByAnilistId(manga.id);
                let chapters = localEntry?.chapters;

                // If no cached chapters, we must fetch
                if (!chapters || chapters.length === 0) {
                    const source = ExtensionManager.getSource(manga.sourceId);
                    if (!source) throw new Error('Source not found');

                    const chaptersData = await source.getChapters(manga.sourceMangaId);
                    chapters = chaptersData;

                    // Update cache so next time it's instant
                    if (localEntry) {
                        updateMangaCache(localEntry.id, {
                            chapters: chaptersData
                        });
                    }
                }

                if (chapters && chapters.length > 0) {
                    // Smart Resume Logic: Find first chapter with number > current progress
                    // Ensure chapters are sorted ASC for finding 'next'
                    const sorted = [...chapters].sort((a, b) => a.number - b.number);

                    // Current progress (chapters read)
                    const progress = manga.progress || 0;

                    // Find the first chapter that is AFTER the progress
                    // e.g. read ch 1 (progress 1). Next is 2. (2 > 1)
                    let targetChapter = sorted.find(c => c.number > progress);

                    // If no "next" chapter found (caught up?), maybe open the last one?
                    if (!targetChapter) {
                        // If progress is 0, start at beginning
                        if (progress === 0) targetChapter = sorted[0];
                        // Else open the last available chapter (caught up)
                        else targetChapter = sorted[sorted.length - 1];
                    }

                    if (targetChapter) {
                        const title = manga.title.english || manga.title.romaji || '';
                        navigate(`/read/${manga.sourceId}/${targetChapter.id}?mangaId=${manga.sourceMangaId}&title=${encodeURIComponent(title)}`);
                        return; // Success
                    }
                }

                // Fallback to details if logic fails
                navigate(`/manga/${manga.sourceId}/${manga.sourceMangaId}`);

            } catch (err) {
                console.error('Smart resume failed:', err);
                // Fallback to details on error
                navigate(`/manga/${manga.sourceId}/${manga.sourceMangaId}`);
            } finally {
                setResumingMangaId(null);
            }
        }
    }, [navigate]);

    // Discord RPC - Set browsing activity when on Home
    useEffect(() => {
        // Dynamic import to avoid SSR issues if any, and keep bundle size manageable
        import('../services/discordRPC').then(({ setBrowsingActivity }) => {
            setBrowsingActivity('full', user?.avatar?.medium || null, user?.name ? `Logged in as ${user.name}` : null);
        });
    }, [user]);



    // Focus Mode Layout (Default)
    // - Lists side-by-side on LG screens (1024px+) to fit 1200px window
    // - Stats below
    return (
        <div className="h-full flex flex-col" style={{ maxWidth: '1800px', margin: '0 auto', height: 'calc(100vh - 120px)' }}>
            <div className="flex flex-col gap-6 pb-2 px-2 overflow-y-auto">
                {/* Lists Row - Force side-by-side on LG screens (1024px+) to fit 1200px window */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 shrink-0 focus-mode">

                    {/* Anime List Box */}
                    <div className="bg-black/20 backdrop-blur-xl border border-white/5 rounded-2xl p-5 shadow-lg relative group h-fit">
                        <div className="flex items-center justify-between mb-4 shrink-0 z-10 relative">
                            <div className="flex items-center gap-4">
                                <h3 className="text-base font-bold flex items-center gap-2" style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.05em', color: 'var(--color-text-main)' }}>
                                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-zen-accent)] shadow-[0_0_8px_var(--color-zen-accent)]"></div>
                                    {isAuthenticated ? "WATCHING" : "TRENDING"}
                                </h3>
                                {isAuthenticated && (
                                    <RefreshButton
                                        onClick={() => refetchUser()}
                                        loading={userLoading}
                                        title="Refresh"
                                        iconSize={14}
                                    />
                                )}
                            </div>

                            <button
                                onClick={() => navigate('/anime-list?status=Watching')}
                                className="text-xs font-bold tracking-wide hover:text-white transition-colors flex items-center gap-1 opacity-60 hover:opacity-100"
                                style={{
                                    color: 'var(--color-zen-accent)',
                                    fontFamily: 'var(--font-rounded)',
                                }}
                            >
                                VIEW ALL <span className="text-[10px]">↗</span>
                            </button>
                        </div>

                        {!userData && animeLoading ? (
                            <SkeletonGrid count={8} />
                        ) : animeList.length > 0 ? (
                            <FadeIn className="">
                                {/* Responsive Grid: 
                                    - Default (Windowed 1200px): 2 cols (Large posters), 4 items visible
                                    - Fullscreen (1536px+): 4 cols (Normal posters), 8 items visible ("Bento" style)
                                */}
                                <div className="grid grid-cols-2 2xl:grid-cols-4 gap-4 2xl:gap-3">
                                    {animeList.slice(0, 8).map((anime: any, index: number) => (
                                        <div key={anime.id} className={index >= 4 ? 'hidden 2xl:block' : ''}>
                                            <AnimeCard
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
                                                onResume={anime.hasFolder ? () => handleAnimeResume(anime) : undefined}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </FadeIn>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-white/30 border border-dashed border-white/5 rounded-xl bg-white/5 p-8">
                                <p className="text-sm">No anime in list</p>
                            </div>
                        )}
                    </div>

                    {/* Manga List Box - Always show if authenticated */}
                    {isAuthenticated && (
                        <div className="bg-black/20 backdrop-blur-xl border border-white/5 rounded-2xl p-5 shadow-lg relative group h-fit">
                            <div className="flex items-center justify-between mb-4 shrink-0 z-10 relative">
                                <div className="flex items-center gap-4">
                                    <h3 className="text-base font-bold flex items-center gap-2" style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.05em', color: 'var(--color-text-main)' }}>
                                        <div className="w-1.5 h-1.5 rounded-full bg-[#38bdf8] shadow-[0_0_8px_#38bdf8]"></div>
                                        READING
                                    </h3>
                                    <RefreshButton
                                        onClick={() => refetchManga()}
                                        loading={mangaLoading}
                                        title="Refresh"
                                        iconSize={14}
                                    />
                                </div>

                                <button
                                    onClick={() => navigate('/manga-list?status=Reading')}
                                    className="text-xs font-bold tracking-wide hover:text-white transition-colors flex items-center gap-1 opacity-60 hover:opacity-100"
                                    style={{
                                        color: '#38bdf8',
                                        fontFamily: 'var(--font-rounded)',
                                    }}
                                >
                                    VIEW ALL <span className="text-[10px]">↗</span>
                                </button>
                            </div>

                            {!mangaData && mangaLoading ? (
                                <SkeletonGrid count={8} />
                            ) : mangaList.length > 0 ? (
                                <FadeIn className="">
                                    {/* Responsive Grid: 2 cols (Windowed) -> 4 cols (Fullscreen) */}
                                    <div className="grid grid-cols-2 2xl:grid-cols-4 gap-4 2xl:gap-3">
                                        {mangaList.slice(0, 8).map((manga: any, index: number) => (
                                            <div key={manga.id} className={index >= 4 ? 'hidden 2xl:block' : ''}>
                                                <AnimeCard
                                                    anime={{
                                                        id: manga.id,
                                                        title: manga.title,
                                                        coverImage: manga.coverImage,
                                                        episodes: manga.episodes,
                                                        format: manga.format,
                                                        averageScore: manga.averageScore
                                                    }}
                                                    progress={manga.progress}
                                                    onClick={() => handleMangaClick(manga.id)}
                                                    onResume={manga.hasMapping ? () => handleMangaResume(manga) : undefined}
                                                    isResuming={resumingMangaId === manga.id}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </FadeIn>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-white/30 border border-dashed border-white/5 rounded-xl bg-white/5 p-8">
                                    <p className="text-sm">No manga in list</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Stats Row - Bottom (Visible in both modes, but effectively 'below' lists) */}
                {isAuthenticated && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 shrink-0">
                        {/* Anime Stats */}
                        <div className="bg-black/20 backdrop-blur-xl border border-white/5 rounded-2xl p-4 shadow-lg">
                            <div className="grid grid-cols-3 gap-3">
                                <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-600/5 border border-emerald-500/10 dark:from-emerald-500/5 dark:to-teal-600/5 flex flex-col items-center justify-center text-center">
                                    <div className="text-[10px] font-mono uppercase tracking-wider mb-1 text-emerald-500/80">Watch Time</div>
                                    <div className="text-xl font-bold text-white leading-none">
                                        {formatTime(stats?.anime.totalMinutesWatched || 0).replace('h', 'h ')}
                                    </div>
                                </div>
                                <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex flex-col items-center justify-center text-center">
                                    <div className="text-[10px] font-mono uppercase tracking-wider mb-1 text-white/40">Episodes</div>
                                    <div className="text-xl font-bold text-white leading-none">{stats?.anime.episodesWatched || 0}</div>
                                </div>
                                <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex flex-col items-center justify-center text-center">
                                    <div className="text-[10px] font-mono uppercase tracking-wider mb-1 text-white/40">Streak</div>
                                    <div className="text-xl font-bold text-white leading-none">
                                        {stats?.daily ? getActivityStreak(stats.daily) : 0} <span className="text-xs font-normal text-white/50">days</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Manga Stats */}
                        <div className="bg-black/20 backdrop-blur-xl border border-white/5 rounded-2xl p-4 shadow-lg">
                            <div className="grid grid-cols-3 gap-3">
                                <div className="p-3 rounded-xl bg-gradient-to-br from-rose-500/10 to-pink-600/5 border border-rose-500/10 dark:from-rose-500/5 dark:to-pink-600/5 flex flex-col items-center justify-center text-center">
                                    <div className="text-[10px] font-mono uppercase tracking-wider mb-1 text-rose-500/80">Read Time</div>
                                    <div className="text-xl font-bold text-white leading-none">
                                        {formatTime(stats?.manga.totalMinutesRead || 0).replace('h', 'h ')}
                                    </div>
                                </div>
                                <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex flex-col items-center justify-center text-center">
                                    <div className="text-[10px] font-mono uppercase tracking-wider mb-1 text-white/40">Chapters</div>
                                    <div className="text-xl font-bold text-white leading-none">{stats?.manga.chaptersRead || 0}</div>
                                </div>
                                <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex flex-col items-center justify-center text-center">
                                    <div className="text-[10px] font-mono uppercase tracking-wider mb-1 text-white/40">Sessions</div>
                                    <div className="text-xl font-bold text-white leading-none">{stats?.manga.sessionsCount || 0}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Upcoming Episodes Section */}
                {isAuthenticated && upcomingEpisodes.length > 0 && (
                    <div className="shrink-0">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-xs font-bold tracking-wider uppercase flex items-center gap-2"
                                style={{
                                    color: 'var(--theme-accent-primary)',
                                    fontFamily: 'var(--font-rounded)'
                                }}
                            >
                                <div className="w-1.5 h-1.5 rounded-full bg-[var(--theme-accent-primary)] shadow-[0_0_8px_var(--theme-accent-primary)]"></div>
                                UPCOMING EPISODES
                            </h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {upcomingEpisodes.map((anime: any) => {
                                const timeUntil = anime.nextEpisode.timeUntilAiring;
                                const days = Math.floor(timeUntil / 86400);
                                const hours = Math.floor((timeUntil % 86400) / 3600);
                                const mins = Math.floor((timeUntil % 3600) / 60);

                                let timeStr = '';
                                if (days > 0) timeStr = `${days}d ${hours}h`;
                                else if (hours > 0) timeStr = `${hours}h ${mins}m`;
                                else timeStr = `${mins}m`;

                                return (
                                    <div
                                        key={anime.id}
                                        onClick={() => handleAnimeClick(anime.id)}
                                        className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer group"
                                    >
                                        <img
                                            src={anime.coverImage?.medium || anime.coverImage?.large}
                                            alt={anime.title?.english || anime.title?.romaji}
                                            className="w-12 h-16 rounded-lg object-cover flex-shrink-0"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-white truncate group-hover:text-[var(--theme-accent-primary)] transition-colors">
                                                {anime.title?.english || anime.title?.romaji}
                                            </p>
                                            <p className="text-xs text-white/50 mt-0.5">
                                                Episode {anime.nextEpisode.episode}
                                            </p>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <p className="text-xs font-bold text-[var(--theme-accent-primary)]">{timeStr}</p>
                                            <p className="text-[10px] text-white/40 uppercase">until air</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Home;
