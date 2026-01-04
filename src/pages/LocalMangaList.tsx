import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    getLibraryEntries,
    LocalMangaEntry,
    getLibraryCategories,
    LibraryCategory,
    addLibraryCategory,
    deleteLibraryCategory,
    setMangaCategories as dbSetMangaCategories,
    getDefaultCategory
} from '../lib/localMangaDb';
import { syncMangaFromAniList } from '../lib/syncService';
import { PlayIcon } from '../components/ui/Icons';
import RefreshButton from '../components/ui/RefreshButton';
import AnimeCard from '../components/ui/AnimeCard';

function LocalMangaList() {
    const [entries, setEntries] = useState<LocalMangaEntry[]>([]);
    const [categories, setCategories] = useState<LibraryCategory[]>([]);
    const [activeCategoryId, setActiveCategoryId] = useState<string>(getDefaultCategory());
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Add Category Dialog State
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');

    // UI State (matching AnimeList)
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
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

    // Context Menu State
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, entryId: string } | null>(null);
    const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
    const [showCategoryAssigner, setShowCategoryAssigner] = useState(false);

    const navigate = useNavigate();

    useEffect(() => {
        loadData();
        const handleFocus = () => loadData();
        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, []);

    const loadData = () => {
        setEntries(getLibraryEntries());
        setCategories(getLibraryCategories());
        setLoading(false);
    };

    // Filter Entries
    const filteredEntries = entries.filter(e => {
        // 1. Category Filter
        const catIds = e.categoryIds || ['default'];
        if (!catIds.includes(activeCategoryId)) return false;

        // 2. Search Filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            return e.title.toLowerCase().includes(query);
        }

        return true;
    });

    const adaptEntry = (entry: LocalMangaEntry) => ({
        id: entry.anilistId || parseInt(entry.id) || 0,
        title: {
            english: entry.title,
            romaji: entry.title,
        },
        coverImage: {
            extraLarge: entry.coverImage || '',
            large: entry.coverImage || '',
            medium: entry.coverImage || '',
        },
        episodes: entry.totalChapters || null,
        averageScore: 0,
        format: 'MANGA',
        status: entry.status.toUpperCase(),
        nextAiringEpisode: null,
    });

    // Context Menu Handler
    const handleContextMenu = (e: React.MouseEvent, entryId: string) => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY, entryId });
    };

    // Close context menu on click elsewhere
    useEffect(() => {
        const handleClick = () => setContextMenu(null);
        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, []);

    const handleConfirmAdd = () => {
        if (newCategoryName.trim()) {
            try {
                addLibraryCategory(newCategoryName.trim());
                loadData();
                setIsAddDialogOpen(false);
                setNewCategoryName('');
            } catch (e) {
                alert("Category exists or invalid");
            }
        }
    };

    const handleRefreshLibrary = async () => {
        setIsRefreshing(true);
        const entries = getLibraryEntries();
        for (const entry of entries) {
            if (entry.anilistId) {
                await syncMangaFromAniList(entry);
            }
        }
        loadData();
        setIsRefreshing(false);
    };

    const handleDeleteCategory = (id: string) => {
        if (id === 'default') {
            alert("Cannot delete Default category");
            return;
        }
        if (confirm("Delete this category?")) {
            deleteLibraryCategory(id);
            if (activeCategoryId === id) setActiveCategoryId('default');
            loadData();
        }
    }

    return (
        <div className="max-w-[1600px] mx-auto pb-10 px-6 min-h-screen">

            {/* Header / Stats Bar (Floating Style) */}
            <div className="sticky top-[-28px] z-30 mx-auto w-full max-w-[950px] h-[52px] relative flex items-center justify-center pointer-events-none -mt-4 mb-10">

                {/* 1. Search Island (Left) */}
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
                        placeholder="Search library..."
                        className="w-full h-full bg-transparent border-none outline-none text-white text-sm font-medium pl-14 pr-4 placeholder-white/30 cursor-pointer focus:cursor-text"
                        style={{ fontFamily: 'var(--font-rounded)' }}
                    />
                </div>

                {/* 2. Main Filter Pill (Right) */}
                <div className="absolute right-4 top-0 pointer-events-auto flex flex-wrap items-center justify-between gap-4 py-2 px-3 bg-black/60 backdrop-blur-2xl border border-white/10 rounded-full shadow-2xl transition-all duration-300">
                    {/* Categories */}
                    <div className="flex flex-wrap items-center gap-1">
                        {categories.map(cat => {
                            const isCompact = searchQuery || isSearchHovered || isSearchFocused;
                            return (
                                <button
                                    key={cat.id}
                                    onClick={() => setActiveCategoryId(cat.id)}
                                    onContextMenu={(e) => {
                                        if (cat.id !== 'default') {
                                            e.preventDefault();
                                            handleDeleteCategory(cat.id);
                                        }
                                    }}
                                    className={`flex items-center gap-2 rounded-full text-sm font-bold transition-all duration-200 border ${activeCategoryId === cat.id
                                        ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.3)]'
                                        : 'bg-transparent border-transparent hover:bg-white/10'
                                        } ${isCompact ? 'p-2' : 'px-4 py-2'}`}
                                    style={{ fontFamily: 'var(--font-rounded)', color: activeCategoryId === cat.id ? 'black' : 'var(--color-text-muted)' }}
                                    title={cat.name}
                                >
                                    <span>{cat.name}</span>
                                </button>
                            );
                        })}

                        {/* Add Category Button */}
                        <button
                            onClick={() => setIsAddDialogOpen(true)}
                            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/20 text-white/60 hover:text-white transition-colors border border-white/5"
                            title="Add Category"
                        >
                            +
                        </button>
                    </div>

                    {/* Refresh Button */}
                    <div className="flex items-center pl-2 border-l border-white/10">
                        <RefreshButton
                            onClick={handleRefreshLibrary}
                            loading={isRefreshing}
                            title="Refresh List"
                            iconSize={16}
                        />
                    </div>

                    {/* View Toggle */}
                    <div className="flex items-center gap-2 pl-2 border-l border-white/10">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-full transition-all hover:bg-white/5 ${viewMode === 'grid' ? 'bg-white/20 shadow-sm' : ''}`}
                            style={{ color: viewMode === 'grid' ? 'var(--color-text-main)' : 'var(--color-text-muted)' }}
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

            {loading ? (
                <div className="flex items-center justify-center h-64 text-white/40">Loading...</div>
            ) : filteredEntries.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-white/40 gap-4">
                    <p>No manga found.</p>
                    {searchQuery ? (
                        <button onClick={() => setSearchQuery('')} className="text-purple-400 hover:underline">Clear Search</button>
                    ) : (
                        <button
                            onClick={() => navigate('/manga-browse')}
                            className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                        >
                            Browse Extensions
                        </button>
                    )}
                </div>
            ) : (
                viewMode === 'grid' ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 pb-20">
                        {filteredEntries.map(entry => (
                            <div
                                key={entry.id}
                                onClick={() => {
                                    if (entry.sourceId === 'local' && entry.sourceMangaId) {
                                        // Navigate to local folder view
                                        navigate(`/local/${encodeURIComponent(entry.sourceMangaId)}`, { state: { type: 'MANGA' } });
                                    } else if (entry.sourceId && entry.sourceMangaId) {
                                        navigate(`/manga/${entry.sourceId}/${entry.sourceMangaId}`);
                                    }
                                }}
                                onContextMenu={(e) => handleContextMenu(e, entry.id)}
                                className="relative group cursor-pointer"
                            >
                                <AnimeCard
                                    anime={adaptEntry(entry) as any}
                                    onClick={() => { }}
                                    progress={entry.chapter}
                                />
                                {/* Resume Button */}
                                {entry.lastReadChapterId && (
                                    <button
                                        className="absolute bottom-2 right-2 p-3 bg-purple-600 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200 z-10 hover:scale-110 hover:bg-purple-500"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigate(`/read/${entry.sourceId}/${entry.lastReadChapterId}?mangaId=${entry.sourceMangaId}&title=${encodeURIComponent(entry.title)}`);
                                        }}
                                        title={`Resume Chapter ${entry.chapter}`}
                                    >
                                        <PlayIcon size={16} fill="white" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col gap-3 pb-20">
                        {/* List Header */}
                        <div className="grid grid-cols-[80px_1fr_100px] gap-4 px-6 py-4 text-xs font-bold text-white/40 uppercase tracking-widest border-b border-white/5 mb-4 sticky top-[72px] bg-black/40 backdrop-blur-xl z-20 rounded-xl">
                            <div>Cover</div>
                            <div>Title</div>
                            <div>Progress</div>
                        </div>
                        {filteredEntries.map(entry => (
                            <div
                                key={entry.id}
                                onClick={() => {
                                    if (entry.sourceId === 'local' && entry.sourceMangaId) {
                                        // Navigate to local folder view
                                        navigate(`/local/${encodeURIComponent(entry.sourceMangaId)}`, { state: { type: 'MANGA' } });
                                    } else if (entry.sourceId && entry.sourceMangaId) {
                                        navigate(`/manga/${entry.sourceId}/${entry.sourceMangaId}`);
                                    }
                                }}
                                onContextMenu={(e) => handleContextMenu(e, entry.id)}
                                className="glass-panel grid grid-cols-[80px_1fr_100px] gap-4 items-center p-4 rounded-2xl hover:bg-white/10 cursor-pointer transition-all duration-300 group border border-white/5 hover:border-white/20"
                                style={{ background: 'rgba(20, 20, 25, 0.4)' }}
                            >
                                <div className="w-12 h-16 rounded-lg overflow-hidden relative shadow-md">
                                    <img src={entry.coverImage || ''} alt={entry.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" />
                                </div>
                                <div className="font-bold text-white group-hover:text-purple-300 transition-colors line-clamp-2" style={{ fontFamily: 'var(--font-rounded)' }}>
                                    {entry.title}
                                </div>
                                <div className="text-sm text-white/60 font-medium">
                                    <span className="text-white">{entry.chapter}</span>
                                    <span className="opacity-40"> / {entry.totalChapters || '?'}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            )}

            {/* Context Menu */}
            {contextMenu && (
                <div
                    className="fixed z-50 bg-gray-900 border border-white/10 rounded-lg shadow-xl py-1 w-48"
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                >
                    <button
                        className="w-full text-left px-4 py-2 hover:bg-white/10 text-white text-sm"
                        onClick={() => {
                            setSelectedEntryId(contextMenu.entryId);
                            setShowCategoryAssigner(true);
                            setContextMenu(null); // Close menu
                        }}
                    >
                        Set Categories...
                    </button>
                </div>
            )}

            {/* Category Assigner Dialog */}
            {showCategoryAssigner && selectedEntryId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-[#1a1a1a] p-6 rounded-xl border border-white/10 w-[300px]">
                        <h3 className="text-xl font-bold text-white mb-4">Set Categories</h3>
                        <div className="flex flex-col gap-2 mb-6 max-h-[300px] overflow-y-auto">
                            {categories.map(cat => {
                                const entry = entries.find(e => e.id === selectedEntryId);
                                const isSelected = (entry?.categoryIds || ['default']).includes(cat.id);
                                return (
                                    <label key={cat.id} className="flex items-center gap-3 text-white cursor-pointer hover:bg-white/5 p-2 rounded">
                                        <CategoryCheckbox
                                            cat={cat}
                                            isChecked={isSelected}
                                            onToggle={(checked) => {
                                                const entry = entries.find(e => e.id === selectedEntryId);
                                                if (!entry) return;
                                                const currentIds = entry.categoryIds || ['default'];
                                                let newIds = [...currentIds];

                                                if (checked) {
                                                    if (!newIds.includes(cat.id)) newIds.push(cat.id);
                                                    if (cat.id !== 'default') {
                                                        newIds = newIds.filter(i => i !== 'default');
                                                    }
                                                } else {
                                                    newIds = newIds.filter(i => i !== cat.id);
                                                    if (newIds.length === 0) newIds.push('default');
                                                }
                                                dbSetMangaCategories(selectedEntryId, newIds);
                                                loadData();
                                            }}
                                        />
                                    </label>
                                );
                            })}
                        </div>
                        <button
                            onClick={() => setShowCategoryAssigner(false)}
                            className="w-full py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white"
                        >
                            Done
                        </button>
                    </div>
                </div>
            )}

            {/* Add Category Dialog - Styled like Settings */}
            {isAddDialogOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-[#1a1a1a] p-6 rounded-xl border border-white/10 w-[320px]" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-bold text-white mb-2">New Category</h3>
                        <p className="text-sm text-white/60 mb-4">Create a new collection for your manga.</p>

                        <input
                            type="text"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            placeholder="e.g. Action, Plan to Read"
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white mb-4 focus:outline-none focus:border-purple-500 transition-colors"
                            autoFocus
                            onKeyDown={(e) => e.key === 'Enter' && handleConfirmAdd()}
                        />

                        <div className="flex gap-2 justify-end">
                            <button
                                onClick={() => setIsAddDialogOpen(false)}
                                className="px-4 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmAdd}
                                className="px-4 py-2 text-sm bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition-colors"
                            >
                                Create
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function CategoryCheckbox({ cat, isChecked, onToggle }: { cat: LibraryCategory, isChecked: boolean, onToggle: (c: boolean) => void }) {
    return (
        <div
            onClick={(e) => {
                e.preventDefault();
                onToggle(!isChecked);
            }}
            className="flex items-center gap-3 w-full"
        >
            <div className={`w-5 h-5 rounded border flex items-center justify-center ${isChecked ? 'bg-purple-500 border-purple-500' : 'border-white/40'}`}>
                {isChecked && <span className="text-white text-xs">✓</span>}
            </div>
            <span>{cat.name}</span>
        </div>
    );
}

export default LocalMangaList;
