import { useState, useEffect, useMemo, forwardRef, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import AnimeCard from '../components/ui/AnimeCard';
import RefreshButton from '../components/ui/RefreshButton';
import { FilmIcon, BookOpenIcon, SearchIcon } from '../components/ui/Icons';
import { GenreNetworkGraph } from '../components/ui/GenreNetworkGraph';
import { useAuth } from '../hooks/useAuth';
import { USER_ANIME_COLLECTION_QUERY, USER_MANGA_COLLECTION_QUERY } from '../api/anilistClient';
import { Virtuoso, VirtuosoGrid } from 'react-virtuoso';

// Define status types
type ListStatus = 'All' | 'Current' | 'Completed' | 'Paused' | 'Dropped' | 'Planning';

// Combined Entry Type
interface ListEntry {
    id: number;
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
        episodes?: number;
        chapters?: number;
        status: string;
        genres?: string[];
        averageScore?: number;
        nextAiringEpisode?: {
            episode: number;
            timeUntilAiring: number;
        };
        format?: string;
    };
};


// Stable Virtuoso Components
const GridListContainer = forwardRef(({ style, children, ...props }: any, ref) => (
    <div
        ref={ref}
        {...props}
        style={style}
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 pb-20"
    >
        {children}
    </div>
));

const GridItemContainer = forwardRef(({ children, ...props }: any, ref) => (
    <div ref={ref} {...props}>
        {children}
    </div>
));

const ListHeaderContainer = () => (
    <div className="grid grid-cols-[80px_1fr_100px_100px] gap-4 px-6 py-4 text-xs font-bold text-white/40 uppercase tracking-widest border-b border-white/5 mb-4 sticky top-[72px] bg-black/40 backdrop-blur-xl z-20 rounded-xl">
        <div>Image</div>
        <div>Title</div>
        <div>Score</div>
        <div>Progress</div>
    </div>
);

const ListItemContainer = forwardRef(({ style, children, ...props }: any, ref) => (
    <div ref={ref} {...props} style={style} className="flex flex-col gap-3 pb-20">{children}</div>
));

function UnifiedList() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { user, isAuthenticated } = useAuth();

    // State for list type (Anime vs Manga)
    const [listType, setListType] = useState<'anime' | 'manga'>('anime');

    const [viewMode, setViewMode] = useState<'grid' | 'list' | 'graph'>('grid');
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchHovered, setIsSearchHovered] = useState(false);
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState<ListStatus>('All');

    const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Initial load from URL
    useEffect(() => {
        const type = searchParams.get('type') as 'anime' | 'manga';
        if (type === 'anime' || type === 'manga') {
            setListType(type);
        }
    }, []);

    // Update URL when type changes
    useEffect(() => {
        const params = new URLSearchParams(searchParams);
        params.set('type', listType);
        setSearchParams(params, { replace: true });
    }, [listType]);


    // Queries
    const { data: animeData, loading: animeLoading, refetch: refetchAnime } = useQuery(USER_ANIME_COLLECTION_QUERY, {
        variables: { userId: user?.id },
        skip: !user?.id || listType !== 'anime',
        fetchPolicy: 'cache-and-network',
        nextFetchPolicy: 'cache-first',
    });

    const { data: mangaData, loading: mangaLoading, refetch: refetchManga } = useQuery(USER_MANGA_COLLECTION_QUERY, {
        variables: { userId: user?.id },
        skip: !user?.id || listType !== 'manga',
        fetchPolicy: 'cache-and-network',
        nextFetchPolicy: 'cache-first',
    });

    // Determine current data
    const currentData = listType === 'anime' ? animeData : mangaData;
    const currentLoading = listType === 'anime' ? animeLoading : mangaLoading;
    const currentRefetch = listType === 'anime' ? refetchAnime : refetchManga;


    const fullList = useMemo(() => {
        if (isAuthenticated && currentData?.MediaListCollection?.lists) {
            const lists = currentData.MediaListCollection.lists;
            const allEntries = lists.flatMap((list: any) => list.entries);

            const uniqueEntriesMap = new Map();
            allEntries.forEach((entry: any) => {
                if (!uniqueEntriesMap.has(entry.id)) {
                    uniqueEntriesMap.set(entry.id, entry);
                }
            });
            return Array.from(uniqueEntriesMap.values()) as ListEntry[];
        }
        return [];
    }, [isAuthenticated, currentData]);


    // Filter logic
    const filteredList = useMemo(() => {
        let result = fullList;

        // 1. Filter by Status
        if (selectedStatus !== 'All') {
            const statusMap: Record<string, string> = {
                'Current': 'CURRENT', // Watching/Reading
                'Completed': 'COMPLETED',
                'Paused': 'PAUSED',
                'Dropped': 'DROPPED',
                'Planning': 'PLANNING'
            };

            const target = statusMap[selectedStatus];

            if (selectedStatus === 'Current') {
                result = result.filter(entry => entry.status === 'CURRENT' || entry.status === 'REPEATING');
            } else {
                result = result.filter(entry => entry.status === target);
            }
        }

        // 2. Filter by Search
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(entry =>
                (entry.media.title.english && entry.media.title.english.toLowerCase().includes(query)) ||
                (entry.media.title.romaji && entry.media.title.romaji.toLowerCase().includes(query))
            );
        }

        return result;
    }, [fullList, selectedStatus, searchQuery]);


    const handleItemClick = (id: string | number) => {
        const numericId = typeof id === 'string' ? parseInt(id) : id;
        if (isNaN(numericId)) return; // Ignore genre cluster clicks for now

        if (listType === 'anime') {
            navigate(`/anime/${numericId}`);
        } else {
            navigate(`/manga-details/${numericId}`);
        }
    };

    const handleMouseEnter = () => {
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
            hoverTimeoutRef.current = null;
        }
        setIsSearchHovered(true);
    };

    const handleMouseLeave = () => {
        hoverTimeoutRef.current = setTimeout(() => {
            setIsSearchHovered(false);
        }, 150);
    };

    if (!isAuthenticated) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-text-secondary">
                <h2 className="text-2xl font-bold text-white mb-4">Please Login</h2>
                <p>Log in with your AniList account to view your list.</p>
            </div>
        );
    }

    return (
        <div className="max-w-[1600px] mx-auto pb-10 px-6 min-h-screen">
            {/* Header / Stats Bar */}
            <div className="sticky top-[-28px] z-30 mx-auto w-full max-w-[950px] h-[52px] relative flex items-center justify-center pointer-events-none -mt-4 mb-4">

                {/* Search Island */}
                <div
                    className="absolute left-4 pointer-events-auto group backdrop-blur-2xl rounded-full shadow-2xl h-[52px] flex items-center transition-all duration-300 w-[52px] hover:w-[300px] focus-within:w-[300px] overflow-hidden"
                    style={{
                        backgroundColor: 'var(--theme-bg-glass)',
                        border: '1px solid var(--theme-border-highlight)'
                    }}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                >
                    <div
                        className="absolute left-0 top-0 w-[52px] h-full flex items-center justify-center transition-colors pointer-events-none"
                        style={{ color: 'var(--theme-text-muted)' }}
                    >
                        <SearchIcon size={20} />
                    </div>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => setIsSearchFocused(true)}
                        onBlur={() => setIsSearchFocused(false)}
                        placeholder={isSearchHovered || isSearchFocused ? `Search ${listType}...` : ''}
                        className="w-full h-full bg-transparent border-none outline-none text-sm font-medium pl-14 pr-4 cursor-pointer focus:cursor-text"
                        style={{
                            fontFamily: 'var(--font-rounded)',
                            color: 'var(--theme-text-main)',
                            paddingLeft: '3.5rem' // Force padding to prevent icon overlap
                        }}
                    />
                </div>

                {/* Filters Island */}
                <div
                    className="absolute right-4 top-0 pointer-events-auto flex flex-wrap items-center justify-between gap-4 py-2 px-3 backdrop-blur-2xl rounded-full shadow-2xl transition-all duration-300"
                    style={{
                        backgroundColor: 'var(--theme-bg-glass)',
                        border: '1px solid var(--theme-border-subtle)'
                    }}
                >
                    {/* Status Buttons */}
                    <div className="flex flex-wrap items-center gap-1">
                        {(['All', 'Current', 'Completed', 'Paused', 'Dropped', 'Planning'] as ListStatus[]).map((status) => {
                            // Only compact filters if search has text or is focused (prevent glitching on simple hover)
                            const isCompact = searchQuery || isSearchHovered || isSearchFocused;
                            // Map 'Current' to 'Watching' or 'Reading' for display
                            let displayLabel: string = status;
                            if (status === 'Current') displayLabel = listType === 'anime' ? 'Watching' : 'Reading';

                            const getStatusIcon = (s: ListStatus) => {
                                switch (s) {
                                    case 'All': return <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>;
                                    case 'Current': return <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>;
                                    case 'Completed': return <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>;
                                    case 'Paused': return <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>;
                                    case 'Dropped': return <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;
                                    case 'Planning': return <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>;
                                    default: return null;
                                }
                            }

                            return (
                                <button
                                    key={status}
                                    onClick={() => setSelectedStatus(status)}
                                    className={`flex items-center gap-2 rounded-full text-sm font-bold transition-all duration-200 ${isCompact ? 'p-2' : 'px-4 py-2'}`}
                                    style={{
                                        fontFamily: 'var(--font-rounded)',
                                        backgroundColor: selectedStatus === status
                                            ? 'var(--theme-accent-primary)'
                                            : 'transparent',
                                        color: selectedStatus === status
                                            ? 'var(--theme-btn-primary-text)'
                                            : 'var(--theme-text-muted)',
                                        border: selectedStatus === status
                                            ? 'none'
                                            : '1px solid transparent',
                                        boxShadow: selectedStatus === status ? '0 4px 14px rgba(0,0,0,0.2)' : undefined
                                    }}
                                    title={isCompact ? displayLabel : ''}
                                >
                                    {isCompact ? (
                                        <span>{getStatusIcon(status)}</span>
                                    ) : (
                                        <span>{displayLabel}</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    <div className="flex items-center pl-2 border-l border-white/10 gap-2">
                        <RefreshButton
                            onClick={() => currentRefetch && currentRefetch()}
                            loading={currentLoading}
                            title="Refresh"
                            iconSize={16}
                        />

                        <button
                            onClick={() => setViewMode('grid')}
                            className="p-2 rounded-full transition-all"
                            style={{
                                backgroundColor: viewMode === 'grid' ? 'var(--theme-active-bg)' : 'transparent',
                                color: viewMode === 'grid' ? 'var(--theme-text-main)' : 'var(--theme-text-muted)'
                            }}
                            title="Grid View"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className="p-2 rounded-full transition-all"
                            style={{
                                backgroundColor: viewMode === 'list' ? 'var(--theme-active-bg)' : 'transparent',
                                color: viewMode === 'list' ? 'var(--theme-text-main)' : 'var(--theme-text-muted)'
                            }}
                            title="List View"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
                        </button>
                        <button
                            onClick={() => setViewMode('graph')}
                            className="p-2 rounded-full transition-all"
                            style={{
                                backgroundColor: viewMode === 'graph' ? 'var(--theme-active-bg)' : 'transparent',
                                color: viewMode === 'graph' ? 'var(--theme-text-main)' : 'var(--theme-text-muted)'
                            }}
                            title="Graph View"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
                        </button>
                    </div>
                </div>

            </div>

            {/* Type Toggle - Sliding Pill */}
            <div className="flex justify-center mb-8">
                <div
                    onClick={() => setListType(prev => prev === 'anime' ? 'manga' : 'anime')}
                    className="relative w-52 h-12 bg-black/40 backdrop-blur-xl rounded-full border border-white/10 shadow-2xl cursor-pointer select-none group"
                >
                    {/* Background Labels */}
                    <div className="absolute inset-0 flex justify-between items-center px-6 text-xs font-bold text-white/20" style={{ fontFamily: 'var(--font-rounded)' }}>
                        <span className={`transition-opacity duration-300 ${listType === 'anime' ? 'opacity-0' : 'opacity-100'}`}>ANIME</span>
                        <span className={`transition-opacity duration-300 ${listType === 'manga' ? 'opacity-0' : 'opacity-100'}`}>MANGA</span>
                    </div>

                    {/* The Sliding Toggle - Translucent Fill & Colored Outline */}
                    <div
                        className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full flex items-center justify-center gap-2 shadow-lg backdrop-blur-md transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) border ${listType === 'anime'
                            ? 'left-1 bg-[rgba(var(--theme-accent-primary-rgb),0.1)] border-[var(--theme-accent-primary)] text-[var(--theme-accent-primary)] shadow-[0_0_15px_rgba(var(--theme-accent-primary-rgb),0.3)]'
                            : 'left-[calc(50%+0px)] bg-[rgba(var(--theme-accent-success-rgb),0.1)] border-[var(--theme-accent-success)] text-[var(--theme-accent-success)] shadow-[0_0_15px_rgba(var(--theme-accent-success-rgb),0.3)]'
                            }`}
                    >
                        <div className={`transition-all duration-300 ${listType === 'anime' ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-50 rotate-90 absolute'}`}>
                            <FilmIcon size={20} className="currentColor" />
                        </div>
                        <div className={`transition-all duration-300 ${listType === 'manga' ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-50 -rotate-90 absolute'}`}>
                            <BookOpenIcon size={20} className="currentColor" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Content */}
            {currentLoading && !fullList.length ? (
                <div className="flex items-center justify-center h-40 text-text-secondary">
                    <div className="animate-pulse">Loading...</div>
                </div>
            ) : filteredList.length > 0 ? (
                viewMode === 'graph' ? (
                    // Graph View - Fills the content area
                    <div
                        className="w-full relative -mx-6"
                        style={{ height: 'calc(100vh - 200px)', minHeight: '400px' }}
                    >
                        <GenreNetworkGraph
                            entries={filteredList}
                            onNodeClick={handleItemClick}
                            type={listType}
                        />
                    </div>
                ) : viewMode === 'grid' ? (
                    <VirtuosoGrid
                        customScrollParent={document.getElementById('main-scroll-container') as HTMLElement}
                        data={filteredList}
                        totalCount={filteredList.length}
                        overscan={200}
                        components={{
                            List: GridListContainer,
                            Item: GridItemContainer
                        }}
                        itemContent={(_index, entry) => (
                            <AnimeCard
                                key={entry.id}
                                anime={{
                                    ...entry.media,
                                    episodes: listType === 'anime' ? entry.media.episodes : entry.media.chapters
                                } as any}
                                progress={entry.progress}
                                onClick={() => handleItemClick(entry.media.id)}
                            />
                        )}
                    />
                ) : (
                    // List View
                    <Virtuoso
                        customScrollParent={document.getElementById('main-scroll-container') as HTMLElement}
                        data={filteredList}
                        totalCount={filteredList.length}
                        overscan={200}
                        components={{
                            Header: ListHeaderContainer,
                            List: ListItemContainer
                        }}
                        itemContent={(_index, entry) => (
                            <div
                                onClick={() => handleItemClick(entry.media.id)}
                                className="glass-panel grid grid-cols-[80px_1fr_100px_100px] gap-4 items-center p-4 rounded-2xl hover:bg-white/10 cursor-pointer transition-all duration-300 group border border-white/5 hover:border-white/20 hover:shadow-lg hover:shadow-purple-500/10"
                                style={{
                                    background: 'rgba(20, 20, 25, 0.4)',
                                    backdropFilter: 'blur(8px)'
                                }}
                            >
                                <div className="w-12 h-16 rounded-lg overflow-hidden relative shadow-md">
                                    <img
                                        src={entry.media.coverImage.medium}
                                        alt={entry.media.title.english || entry.media.title.romaji}
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                        loading="lazy"
                                    />
                                </div>
                                <div className="font-bold text-white group-hover:text-purple-300 transition-colors line-clamp-2" style={{ fontFamily: 'var(--font-rounded)' }}>
                                    {entry.media.title.english || entry.media.title.romaji}
                                </div>
                                <div className="text-sm font-mono">
                                    <span className={`font-bold ${entry.score >= 80 ? 'text-green-400' : 'text-white/60'}`}>
                                        {entry.score > 0 ? `${entry.score}%` : '-'}
                                    </span>
                                </div>
                                <div className="text-sm text-white/60 font-medium">
                                    <span className="text-white">{entry.progress}</span>
                                    <span className="opacity-40"> / {listType === 'anime' ? (entry.media.episodes || '?') : (entry.media.chapters || '?')}</span>
                                </div>
                            </div>
                        )}
                    />
                )
            ) : (
                <div className="text-center text-text-secondary py-20">
                    No {listType} found in this category.
                </div>
            )}
        </div>
    );
}

export default UnifiedList;
