import { useState, useEffect, useMemo, forwardRef, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { useAuth } from '../hooks/useAuth';
import { USER_MANGA_COLLECTION_QUERY } from '../api/anilistClient';
import { Virtuoso, VirtuosoGrid } from 'react-virtuoso';
import AnimeCard from '../components/ui/AnimeCard';

// Define status types based on AniList
type ListStatus = 'All' | 'Reading' | 'Completed' | 'Paused' | 'Dropped' | 'Planning';

interface MangaEntry {
    id: number;
    status: string;
    score: number;
    progress: number; // Chapters read
    progressVolumes: number;
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
        chapters: number | null;
        volumes: number | null;
        status: string;
    };
}

function MangaList() {
    const [searchParams] = useSearchParams();
    const { user, isAuthenticated, loading: authLoading } = useAuth();

    const { data, loading: queryLoading, error: queryError } = useQuery(USER_MANGA_COLLECTION_QUERY, {
        variables: { userId: user?.id },
        skip: !user?.id,
        fetchPolicy: 'cache-first',
        nextFetchPolicy: 'cache-first',
        notifyOnNetworkStatusChange: true,
        pollInterval: 600000,
    });

    const initialStatus = (searchParams.get('status') as ListStatus) || 'All';
    const [selectedStatus, setSelectedStatus] = useState<ListStatus>(initialStatus);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    useEffect(() => {
        const statusFromUrl = (searchParams.get('status') as ListStatus);
        if (statusFromUrl) {
            setSelectedStatus(statusFromUrl);
        }
    }, [searchParams]);

    const fullMangaList = useMemo(() => {
        if (isAuthenticated && data?.MediaListCollection?.lists) {
            const lists = data.MediaListCollection.lists;
            const allEntries = lists.flatMap((list: any) => list.entries);

            const uniqueEntriesMap = new Map();
            allEntries.forEach((entry: any) => {
                if (!uniqueEntriesMap.has(entry.id)) {
                    uniqueEntriesMap.set(entry.id, entry);
                }
            });
            return Array.from(uniqueEntriesMap.values()) as MangaEntry[];
        }
        return [];
    }, [isAuthenticated, data]);

    const isLoading = isAuthenticated ? queryLoading : authLoading;
    const error = queryError ? "Failed to fetch manga list." : null;

    const handleMangaClick = (id: number) => {
        // For now, just show a toast or do nothing since we don't have manga details page
        // Could link to AniList directly:
        window.open(`https://anilist.co/manga/${id}`, '_blank');
    };

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
        }, 150);
    };

    const filteredList = useMemo(() => {
        let result = fullMangaList;

        if (selectedStatus !== 'All') {
            const statusMap: Record<string, string> = {
                'Reading': 'CURRENT',
                'Completed': 'COMPLETED',
                'Paused': 'PAUSED',
                'Dropped': 'DROPPED',
                'Planning': 'PLANNING'
            };
            const target = statusMap[selectedStatus];

            if (selectedStatus === 'Reading') {
                result = result.filter(entry => entry.status === 'CURRENT' || entry.status === 'REPEATING');
            } else {
                result = result.filter(entry => entry.status === target);
            }
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(entry =>
                (entry.media.title.english && entry.media.title.english.toLowerCase().includes(query)) ||
                (entry.media.title.romaji && entry.media.title.romaji.toLowerCase().includes(query))
            );
        }

        return result;
    }, [fullMangaList, selectedStatus, searchQuery]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full text-text-secondary">
                <div className="animate-pulse">Loading Manga List...</div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-text-secondary">
                <h2 className="text-2xl font-bold text-white mb-4">Please Login</h2>
                <p>Log in with your AniList account to view your manga list.</p>
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

    const getStatusIcon = (s: ListStatus) => {
        switch (s) {
            case 'All': return <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>;
            case 'Reading': return <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path></svg>;
            case 'Completed': return <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>;
            case 'Paused': return <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>;
            case 'Dropped': return <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;
            case 'Planning': return <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>;
        }
    };

    return (
        <div className="max-w-[1600px] mx-auto pb-10 px-6 min-h-screen">
            {/* Header / Stats Bar */}
            <div className="sticky top-[-28px] z-30 mx-auto w-full max-w-[950px] h-[52px] relative flex items-center justify-center pointer-events-none -mt-10 mb-10">

                {/* Search Island (Left) */}
                <div
                    className="absolute left-4 pointer-events-auto group bg-black/60 backdrop-blur-2xl border border-white/20 rounded-full shadow-2xl h-[52px] flex items-center transition-all duration-300 w-[52px] hover:w-[340px] focus-within:w-[340px] overflow-hidden hover:shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:border-white/40"
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                >
                    <div className="absolute left-0 top-0 w-[52px] h-full flex items-center justify-center text-white/70 group-hover:text-white transition-colors pointer-events-none">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    </div>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => setIsSearchFocused(true)}
                        onBlur={() => setIsSearchFocused(false)}
                        placeholder="Search manga..."
                        className="w-full h-full bg-transparent border-none outline-none text-white text-sm font-medium pl-14 pr-4 placeholder-white/30 cursor-pointer focus:cursor-text"
                        style={{ fontFamily: 'var(--font-rounded)' }}
                    />
                </div>

                {/* Filter Pill (Right) */}
                <div className="absolute right-4 top-0 pointer-events-auto flex flex-wrap items-center justify-between gap-4 py-2 px-3 bg-black/60 backdrop-blur-2xl border border-white/10 rounded-full shadow-2xl transition-all duration-300">
                    <div className="flex flex-wrap items-center gap-1">
                        {(['All', 'Reading', 'Completed', 'Paused', 'Dropped', 'Planning'] as ListStatus[]).map((status) => {
                            const isCompact = searchQuery || isSearchHovered || isSearchFocused;

                            return (
                                <button
                                    key={status}
                                    onClick={() => setSelectedStatus(status)}
                                    className={`flex items-center gap-2 rounded-full text-sm font-bold transition-all duration-200 border ${selectedStatus === status
                                        ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.3)]'
                                        : 'bg-transparent text-white/60 border-transparent hover:bg-white/10 hover:text-white'
                                        } ${isCompact ? 'p-2' : 'px-4 py-2'}`}
                                    style={{ fontFamily: 'var(--font-rounded)' }}
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
                    <div className="flex items-center pl-2 border-l border-white/10">
                        <button
                            onClick={() => data?.refetch && data.refetch()}
                            className={`p-2 rounded-full transition-all text-white/40 hover:text-white hover:bg-white/5 ${queryLoading ? 'animate-spin text-white' : ''}`}
                            title="Refresh List"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6"></path><path d="M1 20v-6h6"></path><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
                        </button>
                    </div>

                    {/* View Toggle */}
                    <div className="flex items-center gap-2 pl-2 border-l border-white/10">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-full transition-all ${viewMode === 'grid' ? 'bg-white/20 text-white shadow-sm' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                            title="Grid View"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-full transition-all ${viewMode === 'list' ? 'bg-white/20 text-white shadow-sm' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
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
                            <div className="p-2">
                                <AnimeCard
                                    anime={{
                                        id: entry.media.id,
                                        title: entry.media.title,
                                        coverImage: entry.media.coverImage,
                                        episodes: entry.media.chapters,
                                        averageScore: entry.score || (entry.media as any).averageScore, // Fallback if entry score missing
                                        format: 'MANGA',
                                        // Add other required props if any, or cast as any if types impede
                                    } as any}
                                    onClick={handleMangaClick}
                                    progress={entry.progress}
                                />
                            </div>
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
                                onClick={() => handleMangaClick(entry.media.id)}
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
                                    <span className="opacity-40"> / {entry.media.chapters || '?'}</span>
                                </div>
                            </div>
                        )}
                    />
                )
            ) : (
                <div className="text-center text-text-secondary py-20">
                    No manga found in this category.
                </div>
            )}
        </div>
    );
}

export default MangaList;
