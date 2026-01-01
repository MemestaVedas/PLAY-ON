import { useState, useEffect, useMemo, forwardRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import AnimeCard from '../components/ui/AnimeCard';
import { useAuth } from '../hooks/useAuth';
import { USER_ANIME_COLLECTION_QUERY, fetchTrendingAnime } from '../api/anilistClient';
import { Virtuoso, VirtuosoGrid } from 'react-virtuoso';

// Define status types based on AniList
type ListStatus = 'All' | 'Watching' | 'Completed' | 'Paused' | 'Dropped' | 'Planning';

interface AnimeEntry {
    id: number; // Entry ID
    status: string;
    score: number;
    progress: number;
    media: {
        id: number;
        title: {
            english: string;
            romaji: string;
        };
        coverImage: {
            extraLarge: string;
            large: string;
            medium: string;
        };
        episodes: number;
        status: string;
        nextAiringEpisode?: {
            episode: number;
            timeUntilAiring: number;
        };
        averageScore?: number;
        format?: string;
    };
}

// ... (existing imports and interfaces kept the same)

function AnimeList() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user, isAuthenticated, loading: authLoading } = useAuth();

    // Use Apollo Query for automatic caching and loading state management
    const { data, loading: queryLoading, error: queryError } = useQuery(USER_ANIME_COLLECTION_QUERY, {
        variables: { userId: user?.id },
        skip: !user?.id,
        fetchPolicy: 'cache-first', // Use cache if available, don't flash loading
    });

    const [loading, setLoading] = useState(true); // Keep strictly for trending fallback logic
    const [fullAnimeList, setFullAnimeList] = useState<AnimeEntry[]>([]);

    // Initialize status from URL if present
    const initialStatus = (searchParams.get('status') as ListStatus) || 'All';
    const [selectedStatus, setSelectedStatus] = useState<ListStatus>(initialStatus);

    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    useEffect(() => {
        // If we are loading user data via Apollo, sync it to state
        if (queryLoading) {
            setLoading(true);
            return;
        }

        if (isAuthenticated && data?.MediaListCollection?.lists) {
            setLoading(false);
            const lists = data.MediaListCollection.lists;
            // Flatten all lists into one array
            const allEntries = lists.flatMap((list: any) => list.entries);

            // Deduplicate entries
            const uniqueEntriesMap = new Map();
            allEntries.forEach((entry: any) => {
                if (!uniqueEntriesMap.has(entry.id)) {
                    uniqueEntriesMap.set(entry.id, entry);
                }
            });
            const uniqueEntries = Array.from(uniqueEntriesMap.values());

            setFullAnimeList(uniqueEntries as AnimeEntry[]);
        } else if (!isAuthenticated && !authLoading) {
            // Fallback to trending if not logged in
            const loadTrending = async () => {
                setLoading(true);
                try {
                    const tData = await fetchTrendingAnime();
                    if (tData.data?.Page?.media) {
                        setFullAnimeList([]);
                    }
                } catch (e) { }
                setLoading(false);
            };
            loadTrending();
        } else if (data && !data.MediaListCollection) {
            setLoading(false); // Loaded but no lists?
        }
    }, [data, queryLoading, isAuthenticated, authLoading]);

    const error = queryError ? "Failed to fetch anime list." : null;

    const handleAnimeClick = (id: number) => {
        navigate(`/anime/${id}`);
    };



    // Filtered list
    const filteredList = useMemo(() => {
        if (selectedStatus === 'All') return fullAnimeList;

        const statusMap: Record<string, string> = {
            'Watching': 'CURRENT',
            'Completed': 'COMPLETED',
            'Paused': 'PAUSED',
            'Dropped': 'DROPPED',
            'Planning': 'PLANNING'
        };

        const target = statusMap[selectedStatus];

        let result: AnimeEntry[] = [];
        // Handle REPEATING if selected is Watching
        if (selectedStatus === 'Watching') {
            result = fullAnimeList.filter(entry => entry.status === 'CURRENT' || entry.status === 'REPEATING');
        } else {
            result = fullAnimeList.filter(entry => entry.status === target);
        }

        return result;
    }, [fullAnimeList, selectedStatus]);


    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center h-full text-text-secondary">
                <div className="animate-pulse">Loading Anime List...</div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-text-secondary">
                <h2 className="text-2xl font-bold text-white mb-4">Please Login</h2>
                <p>Log in with your AniList account to view your anime list.</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-full text-red-400">
                {error}
            </div>
        );
    }

    return (
        <div className="max-w-[1600px] mx-auto pb-10 px-6 min-h-screen">


            {/* Header / Stats Bar */}
            {/* Floating Filter Pill */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6 py-2 px-3 sticky top-[-28px] z-30 bg-black/60 backdrop-blur-2xl border border-white/10 rounded-full shadow-2xl mx-auto w-fit transition-all duration-300 -mt-10">
                <div className="flex flex-wrap items-center gap-1">
                    {(['All', 'Watching', 'Completed', 'Paused', 'Dropped', 'Planning'] as ListStatus[]).map((status) => (
                        <button
                            key={status}
                            onClick={() => setSelectedStatus(status)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all duration-200 border ${selectedStatus === status
                                ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.3)]'
                                : 'bg-transparent text-white/60 border-transparent hover:bg-white/10 hover:text-white'
                                } `}
                            style={{ fontFamily: 'var(--font-rounded)' }}
                        >
                            <span>{status}</span>
                        </button>
                    ))}
                </div>

                {/* View Toggle - Divider included */}
                <div className="flex items-center gap-2 pl-2 border-l border-white/10">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`p-2 rounded-full transition-all ${viewMode === 'grid' ? 'bg-white/20 text-white shadow-sm' : 'text-white/40 hover:text-white hover:bg-white/5'
                            } `}
                        title="Grid View"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`p-2 rounded-full transition-all ${viewMode === 'list' ? 'bg-white/20 text-white shadow-sm' : 'text-white/40 hover:text-white hover:bg-white/5'
                            } `}
                        title="List View"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
                    </button>
                </div>
            </div>

            {/* Main Content Area - Virtualized */}
            {filteredList.length > 0 ? (
                viewMode === 'grid' ? (
                    <VirtuosoGrid
                        customScrollParent={document.getElementById('main-scroll-container') as HTMLElement}
                        data={filteredList}
                        totalCount={filteredList.length}
                        overscan={200}
                        components={{
                            List: forwardRef(({ style, children, ...props }: any, ref) => (
                                <div
                                    ref={ref}
                                    {...props}
                                    style={style}
                                    className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 pb-20"
                                >
                                    {children}
                                </div>
                            )),
                            Item: forwardRef(({ children, ...props }: any, ref) => (
                                <div ref={ref} {...props}>
                                    {children}
                                </div>
                            ))
                        }}
                        itemContent={(_index, entry) => (
                            <AnimeCard
                                key={entry.id}
                                anime={{
                                    ...entry.media,
                                }}
                                progress={entry.progress}
                                onClick={() => handleAnimeClick(entry.media.id)}
                            />
                        )}
                    />
                ) : (
                    <Virtuoso
                        customScrollParent={document.getElementById('main-scroll-container') as HTMLElement}
                        data={filteredList}
                        totalCount={filteredList.length}
                        overscan={200}
                        components={{
                            Header: () => (
                                <div className="grid grid-cols-[80px_1fr_100px_100px] gap-4 px-6 py-4 text-xs font-bold text-white/40 uppercase tracking-widest border-b border-white/5 mb-4 sticky top-[72px] bg-black/40 backdrop-blur-xl z-20 rounded-xl">
                                    <div>Image</div>
                                    <div>Title</div>
                                    <div>Score</div>
                                    <div>Progress</div>
                                </div>
                            ),
                            List: forwardRef(({ style, children, ...props }: any, ref) => (
                                <div ref={ref} {...props} style={style} className="flex flex-col gap-3 pb-20">{children}</div>
                            ))
                        }}
                        itemContent={(_index, entry) => (
                            <div
                                onClick={() => handleAnimeClick(entry.media.id)}
                                className="glass-panel grid grid-cols-[80px_1fr_100px_100px] gap-4 items-center p-4 rounded-2xl hover:bg-white/10 cursor-pointer transition-all duration-300 group border border-white/5 hover:border-white/20 hover:shadow-lg hover:shadow-purple-500/10"
                                style={{
                                    background: 'rgba(20, 20, 25, 0.4)',
                                    backdropFilter: 'blur(8px)'
                                }}
                            >
                                {/* Image */}
                                <div className="w-12 h-16 rounded-lg overflow-hidden relative shadow-md">
                                    <img
                                        src={entry.media.coverImage.medium}
                                        alt={entry.media.title.english || entry.media.title.romaji}
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                        loading="lazy"
                                    />
                                </div>
                                {/* Title */}
                                <div className="font-bold text-white group-hover:text-purple-300 transition-colors line-clamp-2" style={{ fontFamily: 'var(--font-rounded)' }}>
                                    {entry.media.title.english || entry.media.title.romaji}
                                </div>
                                {/* Score */}
                                <div className="text-sm font-mono">
                                    <span className={`font-bold ${entry.score >= 80 ? 'text-green-400' : 'text-white/60'}`}>
                                        {entry.score > 0 ? `${entry.score}%` : '-'}
                                    </span>
                                </div>
                                {/* Progress */}
                                <div className="text-sm text-white/60 font-medium">
                                    <span className="text-white">{entry.progress}</span>
                                    <span className="opacity-40"> / {entry.media.episodes || '?'}</span>
                                </div>
                            </div>
                        )}
                    />
                )
            ) : (
                <div className="text-center text-text-secondary py-20">
                    No anime found in this category.
                </div>
            )}
        </div >
    );
}

export default AnimeList;
