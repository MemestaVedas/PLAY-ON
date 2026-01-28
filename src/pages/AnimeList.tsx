import { useState, useEffect, useMemo, forwardRef, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import AnimeCard from '../components/ui/AnimeCard';
import RefreshButton from '../components/ui/RefreshButton';
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

function AnimeList() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user, isAuthenticated, loading: authLoading } = useAuth();

    // Use Apollo Query for automatic caching and loading state management
    // pollInterval refreshes the list every 10 minutes (600000ms)
    const { data, loading: queryLoading, error: queryError } = useQuery(USER_ANIME_COLLECTION_QUERY, {
        variables: { userId: user?.id },
        skip: !user?.id,
        fetchPolicy: 'cache-and-network', // Show cache first, then update from network
        nextFetchPolicy: 'cache-first', // Use cache for subsequent re-renders
        notifyOnNetworkStatusChange: true,
        pollInterval: 600000, // Refresh every 10 minutes
    });

    // Initialize status from URL if present
    const initialStatus = (searchParams.get('status') as ListStatus) || 'All';
    const [selectedStatus, setSelectedStatus] = useState<ListStatus>(initialStatus);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    // Trending fallback state (only used if not authenticated)
    const [trendingList, setTrendingList] = useState<AnimeEntry[]>([]);
    const [trendingLoading, setTrendingLoading] = useState(false);

    // Effect to load trending only if NOT authenticated
    useEffect(() => {
        if (!isAuthenticated && !authLoading) {
            const loadTrending = async () => {
                setTrendingLoading(true);
                try {
                    const tData = await fetchTrendingAnime();
                    if (tData.data?.Page?.media) {
                        // Map trending data to AnimeEntry structure
                        const mappedTrending = tData.data.Page.media.map((m: any) => ({
                            id: m.id,
                            status: 'TRENDING',
                            score: m.averageScore || 0,
                            progress: 0,
                            media: m
                        }));
                        setTrendingList(mappedTrending);
                    }
                } catch (e) { console.error(e); }
                setTrendingLoading(false);
            };
            loadTrending();
        }
    }, [isAuthenticated, authLoading]);

    // Update selected status when URL param switches (e.g. navigation from Home)
    useEffect(() => {
        const statusFromUrl = (searchParams.get('status') as ListStatus);
        if (statusFromUrl) {
            setSelectedStatus(statusFromUrl);
        }
    }, [searchParams]);

    // DERIVE LIST DIRECTLY FROM DATA (No useEffect syncing -> No Flash)
    const fullAnimeList = useMemo(() => {
        if (isAuthenticated && data?.MediaListCollection?.lists) {
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
            return Array.from(uniqueEntriesMap.values()) as AnimeEntry[];
        }

        // Fallback to trending if not authenticated
        if (!isAuthenticated) return trendingList;

        return [];
    }, [isAuthenticated, data, trendingList]);

    // Loading state calculation
    // Only show loading if we're loading AND have no cached data to display
    // This ensures cache-first display without loading screen
    const hasData = fullAnimeList.length > 0;
    const isLoading = !hasData && (isAuthenticated ? queryLoading : (authLoading || trendingLoading));

    const error = queryError ? "Failed to fetch anime list." : null;

    const handleAnimeClick = useCallback((id: number) => {
        navigate(`/anime/${id}`);
    }, [navigate]);



    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchHovered, setIsSearchHovered] = useState(false);
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        }, 300);
    };


    // Discord Rich Presence - Browsing Library
    useEffect(() => {
        const updateRPC = async () => {
            const { setBrowsingActivity } = await import('../services/discordRPC');
            setBrowsingActivity('full', user?.avatar?.medium || null, user?.name ? `Logged in as ${user.name}` : null);
        };

        updateRPC();
    }, [user]);



    // Filtered list
    const filteredList = useMemo(() => {
        let result = fullAnimeList;

        // 1. Filter by Status
        if (selectedStatus !== 'All') {
            const statusMap: Record<string, string> = {
                'Watching': 'CURRENT',
                'Completed': 'COMPLETED',
                'Paused': 'PAUSED',
                'Dropped': 'DROPPED',
                'Planning': 'PLANNING'
            };
            const target = statusMap[selectedStatus];

            if (selectedStatus === 'Watching') {
                result = result.filter(entry => entry.status === 'CURRENT' || entry.status === 'REPEATING');
            } else {
                result = result.filter(entry => entry.status === target);
            }
        }

        // 2. Filter by Search Query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(entry =>
                (entry.media.title.english && entry.media.title.english.toLowerCase().includes(query)) ||
                (entry.media.title.romaji && entry.media.title.romaji.toLowerCase().includes(query))
            );
        }

        return result;
    }, [fullAnimeList, selectedStatus, searchQuery]);


    if (isLoading) {
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
            <div className="sticky top-[-28px] z-30 mx-auto w-full max-w-[950px] h-[52px] relative flex items-center justify-center pointer-events-none -mt-4 mb-10">

                {/* 1. Search Island (Left) */}
                <div
                    className={`absolute left-4 pointer-events-auto group backdrop-blur-2xl rounded-full shadow-2xl h-[52px] flex items-center transition-all duration-300 overflow-hidden ${searchQuery ? 'w-[340px]' : 'w-[52px] hover:w-[340px] focus-within:w-[340px]'}`}
                    style={{
                        backgroundColor: 'var(--theme-bg-glass)',
                        // border: '1px solid var(--theme-border-highlight)'
                    }}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                >
                    <div
                        className="absolute left-0 top-0 w-[52px] h-full flex items-center justify-center transition-colors pointer-events-none"
                        style={{ color: 'var(--theme-text-muted)' }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    </div>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => setIsSearchFocused(true)}
                        onBlur={() => setIsSearchFocused(false)}
                        placeholder="Search library..."
                        className={`h-full bg-transparent border-none outline-none text-sm font-medium pr-4 cursor-pointer focus:cursor-text transition-opacity duration-300 ${searchQuery ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'}`}
                        style={{
                            width: 'calc(100% - 52px)',
                            marginLeft: '52px',
                            fontFamily: 'var(--font-rounded)',
                            color: 'var(--theme-text-main)',
                            '--placeholder-color': 'var(--theme-text-muted)',
                            paddingLeft: '12px'
                        } as React.CSSProperties}
                    />
                </div>

                {/* 2. Main Filter Pill (Right) */}
                <div
                    className="absolute right-4 top-0 pointer-events-auto flex flex-wrap items-center justify-between gap-4 py-2 px-3 backdrop-blur-2xl rounded-full shadow-2xl transition-all duration-300"
                    style={{
                        backgroundColor: 'var(--theme-bg-glass)',
                        border: '1px solid var(--theme-border-subtle)'
                    }}
                >
                    {/* Status Buttons */}
                    <div className="flex flex-wrap items-center gap-1">
                        {(['All', 'Watching', 'Completed', 'Paused', 'Dropped', 'Planning'] as ListStatus[]).map((status) => {
                            const isCompact = searchQuery || isSearchHovered || isSearchFocused;

                            const getStatusIcon = (s: ListStatus) => {
                                switch (s) {
                                    case 'All': return <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>;
                                    case 'Watching': return <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>;
                                    case 'Completed': return <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>;
                                    case 'Paused': return <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>;
                                    case 'Dropped': return <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;
                                    case 'Planning': return <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>;
                                }
                            };

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
                                    title={isCompact ? status : ''}
                                >
                                    {isCompact ? (
                                        <span>{getStatusIcon(status)}</span>
                                    ) : (
                                        <span>{status}</span>
                                    )}
                                </button>
                            )
                        })}
                    </div>

                    {/* Refresh Button */}
                    <div className="flex items-center pl-2" style={{ borderLeft: '1px solid var(--theme-border-subtle)' }}>
                        <RefreshButton
                            onClick={() => data?.refetch && data.refetch()}
                            loading={queryLoading}
                            title="Refresh List"
                            iconSize={16}
                        />
                    </div>

                    {/* View Toggle */}
                    <div className="flex items-center gap-2 pl-2" style={{ borderLeft: '1px solid var(--theme-border-subtle)' }}>
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
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
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
                                    episodes: entry.media.episodes // Ensure episodes is passed
                                } as any}
                                progress={entry.progress}
                                onClick={handleAnimeClick}
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
        </div>
    );
}

export default AnimeList;

