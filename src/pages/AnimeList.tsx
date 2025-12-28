import { useState, useEffect, useMemo, forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
    const { user, isAuthenticated, loading: authLoading } = useAuth();

    // Use Apollo Query for automatic caching and loading state management
    const { data, loading: queryLoading, error: queryError } = useQuery(USER_ANIME_COLLECTION_QUERY, {
        variables: { userId: user?.id },
        skip: !user?.id,
        fetchPolicy: 'cache-first', // Use cache if available, don't flash loading
    });

    const [loading, setLoading] = useState(true); // Keep strictly for trending fallback logic
    const [fullAnimeList, setFullAnimeList] = useState<AnimeEntry[]>([]);
    const [selectedStatus, setSelectedStatus] = useState<ListStatus>('All');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [isTrending, setIsTrending] = useState(false);

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
            setIsTrending(false);
        } else if (!isAuthenticated && !authLoading) {
            // Fallback to trending if not logged in
            const loadTrending = async () => {
                setLoading(true);
                try {
                    const tData = await fetchTrendingAnime();
                    if (tData.data?.Page?.media) {
                        setIsTrending(true);
                        setFullAnimeList([]); // Clear user list (we would need to map trending to AnimeEntry if we want to show it, but logic here assumes explicit trending handling or different UI. Actually the original code just set fullAnimeList to empty and set isTrending=true, but didn't populate trending data into fullAnimeList? Re-reading original code... )
                        // Original code: setFullAnimeList([]); setIsTrending(true);
                        // It seems the original code MIGHT have had a bug or 'isTrending' is used elsewhere to fetch trending data?
                        // Checking stats calculation: "if (isTrending) return counts;" -> returns 0 counts.
                        // Checking render: "if (!isAuthenticated) return <Please Login>" -> So trending data isn't even shown in MAIN render if !auth.
                        // So the trending fetch in original code was effectively doing nothing visible except stopping loading state?
                        // I will preserve the behavior: stop loading.
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

    // Calculate stats
    const stats = useMemo(() => {
        const counts = {
            All: 0,
            Watching: 0,
            Completed: 0,
            Paused: 0,
            Dropped: 0,
            Planning: 0
        };

        if (isTrending) return counts;

        fullAnimeList.forEach(entry => {
            counts.All++;
            switch (entry.status) {
                case 'CURRENT': counts.Watching++; break;
                case 'COMPLETED': counts.Completed++; break;
                case 'PAUSED': counts.Paused++; break;
                case 'DROPPED': counts.Dropped++; break;
                case 'PLANNING': counts.Planning++; break;
                case 'REPEATING': counts.Watching++; break; // Treat repeating as watching?
            }
        });

        return counts;
    }, [fullAnimeList, isTrending]);

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
            <div className="flex flex-wrap items-center justify-between mb-8 py-4 border-b border-white/5 sticky top-0 z-30 bg-[#0f0f0f]/95 backdrop-blur-md">
                <div className="flex flex-wrap items-center gap-4">
                    {(['All', 'Watching', 'Completed', 'Paused', 'Dropped', 'Planning'] as ListStatus[]).map((status) => (
                        <button
                            key={status}
                            onClick={() => setSelectedStatus(status)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${selectedStatus === status
                                ? 'bg-white text-black shadow-lg shadow-white/10 scale-105'
                                : 'text-text-secondary hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <span>{status}</span>
                            <span className={`px-1.5 rounded-md text-xs font-bold ${selectedStatus === status
                                ? 'bg-black/10 text-black/70'
                                : 'bg-white/10 text-text-secondary'
                                }`}>
                                {stats[status]}
                            </span>
                        </button>
                    ))}
                </div>

                {/* View Toggle */}
                <div className="flex items-center bg-white/5 rounded-lg p-1 gap-1">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white/10 text-white' : 'text-text-secondary hover:text-white'
                            }`}
                        title="Grid View"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white/10 text-white' : 'text-text-secondary hover:text-white'
                            }`}
                        title="List View"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
                    </button>
                </div>
            </div>

            {/* Content header for count */}
            <div className="mb-6">
                <h2 className="text-xl font-bold text-white">
                    {selectedStatus} Anime
                    <span className="text-text-secondary text-sm font-normal ml-3">
                        ({filteredList.length})
                    </span>
                </h2>
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
                        itemContent={(index, entry) => (
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
                                <div className="grid grid-cols-[80px_1fr_100px_100px] gap-4 px-4 py-2 text-sm text-text-secondary font-medium uppercase tracking-wider border-b border-white/5 mb-2 bg-[#0f0f0f]">
                                    <div>Image</div>
                                    <div>Title</div>
                                    <div>Score</div>
                                    <div>Progress</div>
                                </div>
                            ),
                            List: forwardRef(({ style, children, ...props }: any, ref) => (
                                <div ref={ref} {...props} style={style} className="flex flex-col gap-2 pb-20">{children}</div>
                            ))
                        }}
                        itemContent={(index, entry) => (
                            <div
                                onClick={() => handleAnimeClick(entry.media.id)}
                                className="grid grid-cols-[80px_1fr_100px_100px] gap-4 items-center p-3 rounded-lg hover:bg-white/5 cursor-pointer transition-colors group"
                            >
                                {/* Image */}
                                <div className="w-12 h-16 rounded-md overflow-hidden bg-surface-light">
                                    <img
                                        src={entry.media.coverImage.medium}
                                        alt={entry.media.title.english || entry.media.title.romaji}
                                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                        loading="lazy"
                                    />
                                </div>
                                {/* Title */}
                                <div className="font-medium text-white group-hover:text-primary transition-colors">
                                    {entry.media.title.english || entry.media.title.romaji}
                                </div>
                                {/* Score */}
                                <div className="text-sm">
                                    <span className={`${(entry.score || 0) >= 7 ? 'text-green-400' : 'text-text-secondary'}`}>
                                        {entry.score > 0 ? `${entry.score}/10` : '-'}
                                    </span>
                                </div>
                                {/* Progress */}
                                <div className="text-sm text-text-secondary">
                                    <span className="text-white">{entry.progress}</span>
                                    <span className="opacity-50"> / {entry.media.episodes || '?'}</span>
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
        </div>
    );
}

export default AnimeList;
