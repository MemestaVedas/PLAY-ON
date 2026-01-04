import { useMemo, useCallback, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AnimeCard from '../components/ui/AnimeCard';
import RefreshButton from '../components/ui/RefreshButton';
import Loading from '../components/ui/Loading';
import { useAuth } from '../hooks/useAuth';
import { useQuery } from '@apollo/client';
import { USER_MEDIA_LIST_QUERY, USER_MANGA_LIST_QUERY, TRENDING_ANIME_QUERY } from '../api/anilistClient';
import { useMangaMappings } from '../hooks/useMangaMappings';
import { useFolderMappings } from '../hooks/useFolderMappings';
import { getMangaEntryByAnilistId } from '../lib/localMangaDb';

function Home() {
    const navigate = useNavigate();
    const { user, isAuthenticated } = useAuth();
    const { mappings: mangaMappings } = useMangaMappings();
    const { mappings: folderMappings } = useFolderMappings();

    // Fetch Anime Data with useQuery for instant cache access
    const { data: userData, loading: userLoading, refetch: refetchUser } = useQuery(USER_MEDIA_LIST_QUERY, {
        variables: { userId: user?.id, status: 'CURRENT' },
        skip: !isAuthenticated || !user?.id,
        notifyOnNetworkStatusChange: true,
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
        if (isAuthenticated && userData?.Page?.mediaList) {
            const updates = userData.Page.mediaList;
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

    const handleAnimeClick = (id: number) => {
        navigate(`/anime/${id}`);
    };

    // Resume button handler for anime with linked folders
    const handleAnimeResume = useCallback((anime: any) => {
        if (anime.folderPath) {
            // Navigate to the local folder to continue watching
            navigate(`/local/${encodeURIComponent(anime.folderPath)}`);
        }
    }, [navigate]);

    const handleMangaClick = (id: number) => {
        navigate(`/manga-details/${id}`);
    };

    const handleMangaResume = useCallback((manga: any) => {
        if (manga.sourceId && manga.sourceMangaId) {
            // If we have a last read chapter ID, open the reader directly at that chapter
            // (The reader will let user continue or go to next chapter)
            if (manga.lastReadChapterId) {
                const title = manga.title.english || manga.title.romaji || '';
                navigate(`/read/${manga.sourceId}/${manga.lastReadChapterId}?mangaId=${manga.sourceMangaId}&title=${encodeURIComponent(title)}`);
            } else {
                // No chapter history, go to manga source details to pick a chapter
                navigate(`/manga/${manga.sourceId}/${manga.sourceMangaId}`);
            }
        }
    }, [navigate]);

    // Responsive item count based on window width
    // XL breakpoint is 1280px. Below that, we stack and show 1 row (4 items). Above that, 2 rows (8 items).
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);

    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Discord RPC - Set browsing activity when on Home
    useEffect(() => {
        // Dynamic import to avoid SSR issues if any, and keep bundle size manageable
        import('../services/discordRPC').then(({ setBrowsingActivity }) => {
            setBrowsingActivity('full');
        });
    }, []);

    const itemCount = windowWidth >= 1280 ? 8 : 4;

    return (
        <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
            <div className="mb-8 mt-6 px-4">
                <h1 className="text-4xl font-bold mb-2" style={{ fontFamily: 'var(--font-rounded)', letterSpacing: '-0.02em', textShadow: '0 4px 12px rgba(0,0,0,0.1)', color: 'var(--color-text-main)' }}>
                    {isAuthenticated ? `Welcome back, ${user?.name}` : "Dashboard"}
                </h1>
                <p className="text-lg font-medium" style={{ fontFamily: 'var(--font-rounded)', color: 'var(--color-text-muted)' }}>
                    {isAuthenticated ? "Ready to dive back in?" : "Track your anime journey"}
                </p>
            </div>

            {/* Bento Grid layout */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 px-4 pb-10">

                {/* Anime Bento Box */}
                <div className="bg-black/20 backdrop-blur-xl border border-white/5 rounded-3xl p-6 overflow-hidden flex flex-col h-full shadow-xl">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold flex items-center gap-3" style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.05em', color: 'var(--color-text-main)' }}>
                            <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-zen-accent)] shadow-[0_0_8px_var(--color-zen-accent)]"></div>
                            {isAuthenticated ? "WATCHING" : "TRENDING"}
                        </h3>
                        {isAuthenticated && (
                            <RefreshButton
                                onClick={() => refetchUser()}
                                loading={userLoading}
                                title="Refresh List"
                                iconSize={16}
                            />
                        )}
                    </div>

                    {!userData && animeLoading ? (
                        <div className="flex-1 flex items-center justify-center"><Loading inline /></div>
                    ) : animeList.length > 0 ? (
                        <>
                            {/* Denser Grid for 'Smaller' look */}
                            <div className="grid grid-cols-4 md:grid-cols-5 xl:grid-cols-4 gap-4">
                                {animeList.slice(0, itemCount).map((anime: any) => (
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
                                        onResume={anime.hasFolder ? () => handleAnimeResume(anime) : undefined}
                                    />
                                ))}
                            </div>

                            <div className="mt-auto pt-6 flex justify-center">
                                <button
                                    onClick={() => navigate('/anime-list?status=Watching')}
                                    className="w-full py-3 rounded-xl transition-all text-sm font-bold tracking-wide hover:brightness-125"
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        color: 'var(--color-zen-accent)',
                                        border: '1px solid rgba(255, 255, 255, 0.05)',
                                        fontFamily: 'var(--font-rounded)',
                                    }}
                                >
                                    VIEW ALL
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center py-10 text-white/30 border border-dashed border-white/5 rounded-xl bg-white/5">
                            <p>No anime in list</p>
                        </div>
                    )}
                </div>

                {/* Manga Bento Box */}
                {isAuthenticated && (
                    <div className="bg-black/20 backdrop-blur-xl border border-white/5 rounded-3xl p-6 overflow-hidden flex flex-col h-full shadow-xl">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold flex items-center gap-3" style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.05em', color: 'var(--color-text-main)' }}>
                                <div className="w-1.5 h-1.5 rounded-full bg-[#38bdf8] shadow-[0_0_8px_#38bdf8]"></div>
                                READING
                            </h3>
                            <RefreshButton
                                onClick={() => refetchManga()}
                                loading={mangaLoading}
                                title="Refresh List"
                                iconSize={16}
                            />
                        </div>

                        {!mangaData && mangaLoading ? (
                            <div className="flex-1 flex items-center justify-center"><Loading inline /></div>
                        ) : mangaList.length > 0 ? (
                            <>
                                {/* Denser Grid */}
                                <div className="grid grid-cols-4 md:grid-cols-5 xl:grid-cols-4 gap-4">
                                    {mangaList.slice(0, itemCount).map((manga: any) => (
                                        <AnimeCard
                                            key={manga.id}
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
                                        />
                                    ))}
                                </div>

                                <div className="mt-auto pt-6 flex justify-center">
                                    <button
                                        onClick={() => navigate('/manga-list?status=Reading')}
                                        className="w-full py-3 rounded-xl transition-all text-sm font-bold tracking-wide hover:brightness-125"
                                        style={{
                                            background: 'rgba(255, 255, 255, 0.05)',
                                            color: '#38bdf8',
                                            border: '1px solid rgba(255, 255, 255, 0.05)',
                                            fontFamily: 'var(--font-rounded)',
                                        }}
                                    >
                                        VIEW ALL
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center py-10 text-white/30 border border-dashed border-white/5 rounded-xl bg-white/5">
                                <p>No manga in list</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default Home;
