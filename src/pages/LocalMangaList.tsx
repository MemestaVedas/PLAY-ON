import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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

import { CategoryPills } from '../components/ui/CategoryPills';

function LocalMangaList() {
    const [entries, setEntries] = useState<LocalMangaEntry[]>([]);
    const [categories, setCategories] = useState<LibraryCategory[]>([]);
    const [activeCategoryId, setActiveCategoryId] = useState<string>(getDefaultCategory());
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [filterStatus, setFilterStatus] = useState<'all' | 'read' | 'unread'>('all');
    const [showFilterMenu, setShowFilterMenu] = useState(false);

    // Add Category Dialog State
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [isFabHovered, setIsFabHovered] = useState(false);

    // UI State (matching AnimeList)
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
        const saved = localStorage.getItem('localMangaViewMode');
        return saved === 'list' ? 'list' : 'grid';
    });
    const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Persist view mode changes
    const handleViewModeChange = (mode: 'grid' | 'list') => {
        setViewMode(mode);
        localStorage.setItem('localMangaViewMode', mode);
    };

    const handleMouseEnter = () => {
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
            hoverTimeoutRef.current = null;
        }
    };

    const handleMouseLeave = () => {
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
        }
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
            if (!e.title.toLowerCase().includes(query)) return false;
        }

        // 3. Status Filter (Read/Unread)
        if (filterStatus === 'read') {
            return e.status === 'completed';
        } else if (filterStatus === 'unread') {
            return e.status !== 'completed';
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
            <div className="sticky top-[-28px] z-30 mx-auto w-full max-w-[1200px] h-[52px] relative flex items-center justify-center pointer-events-none -mt-4 mb-10">

                {/* 1. Search Island (Left) */}
                <div
                    className="absolute left-4 pointer-events-auto group backdrop-blur-2xl rounded-full shadow-2xl h-[52px] flex items-center transition-all duration-300 w-[52px] hover:w-[340px] focus-within:w-[340px] overflow-hidden"
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
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    </div>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search library..."
                        className="w-full h-full bg-transparent border-none outline-none text-sm font-medium pl-14 pr-4 cursor-pointer focus:cursor-text"
                        style={{ fontFamily: 'var(--font-rounded)', color: 'var(--theme-text-main)' }}
                    />
                </div>



                {/* 3. Filter/Actions Pill (Right) */}
                <div
                    className="absolute right-4 top-0 pointer-events-auto flex flex-wrap items-center justify-between gap-4 py-2 px-3 backdrop-blur-2xl rounded-full shadow-2xl transition-all duration-300"
                    style={{
                        backgroundColor: 'var(--theme-bg-glass)',
                        border: '1px solid var(--theme-border-subtle)'
                    }}
                >

                    {/* Read/Unread Filter - Dropdown Trigger */}
                    <div className="relative">
                        <button
                            onClick={() => setShowFilterMenu(!showFilterMenu)}
                            className="p-2 rounded-full transition-all flex items-center gap-2"
                            style={{
                                backgroundColor: filterStatus !== 'all' || showFilterMenu ? 'var(--theme-active-bg)' : 'transparent',
                                color: filterStatus !== 'all' || showFilterMenu ? 'var(--theme-text-main)' : 'var(--theme-text-muted)'
                            }}
                            title="Filter Status"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
                            {filterStatus !== 'all' && (
                                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 rounded-sm" style={{ backgroundColor: 'var(--theme-accent-primary)', color: 'var(--theme-btn-primary-text)' }}>
                                    {filterStatus}
                                </span>
                            )}
                        </button>

                        {/* Dropdown Menu */}
                        {showFilterMenu && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setShowFilterMenu(false)}></div>
                                <div className="absolute top-full right-0 mt-3 w-40 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl p-1.5 z-50 flex flex-col gap-1 backdrop-blur-xl">
                                    <button
                                        onClick={() => { setFilterStatus('all'); setShowFilterMenu(false); }}
                                        className={`px-3 py-2 rounded-lg text-sm text-left flex items-center justify-between transition-colors ${filterStatus === 'all' ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
                                    >
                                        <span>All</span>
                                        {filterStatus === 'all' && <span className="text-purple-400">✓</span>}
                                    </button>
                                    <button
                                        onClick={() => { setFilterStatus('read'); setShowFilterMenu(false); }}
                                        className={`px-3 py-2 rounded-lg text-sm text-left flex items-center justify-between transition-colors ${filterStatus === 'read' ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
                                    >
                                        <span>Read</span>
                                        {filterStatus === 'read' && <span className="text-purple-400">✓</span>}
                                    </button>
                                    <button
                                        onClick={() => { setFilterStatus('unread'); setShowFilterMenu(false); }}
                                        className={`px-3 py-2 rounded-lg text-sm text-left flex items-center justify-between transition-colors ${filterStatus === 'unread' ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
                                    >
                                        <span>Unread</span>
                                        {filterStatus === 'unread' && <span className="text-purple-400">✓</span>}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>



                    {/* Refresh Button */}
                    <div className="flex items-center pl-2" style={{ borderLeft: '1px solid var(--theme-border-subtle)' }}>
                        <RefreshButton
                            onClick={handleRefreshLibrary}
                            loading={isRefreshing}
                            title="Refresh List"
                            iconSize={16}
                        />
                    </div>

                    {/* View Toggle */}
                    <div className="flex items-center gap-2 pl-2" style={{ borderLeft: '1px solid var(--theme-border-subtle)' }}>
                        <button
                            onClick={() => handleViewModeChange('grid')}
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
                            onClick={() => handleViewModeChange('list')}
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
                                {/* Continue Reading Button */}
                                <button
                                    className="absolute bottom-2 right-2 p-3 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200 z-10 hover:scale-110"
                                    style={{ backgroundColor: 'var(--theme-accent-primary)' }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (entry.sourceId === 'local' && entry.sourceMangaId) {
                                            // For local manga, go to the folder to pick a chapter
                                            navigate(`/local/${encodeURIComponent(entry.sourceMangaId)}`, { state: { type: 'MANGA' } });
                                        } else if (entry.lastReadChapterId && entry.sourceId && entry.sourceMangaId) {
                                            // Resume from last read chapter
                                            navigate(`/read/${entry.sourceId}/${entry.lastReadChapterId}?mangaId=${entry.sourceMangaId}&title=${encodeURIComponent(entry.title)}`);
                                        } else if (entry.chapters && entry.chapters.length > 0 && entry.sourceId && entry.sourceMangaId) {
                                            // Find next chapter from cached chapters
                                            // Chapters are typically sorted newest first, so we need to find chapter (entry.chapter + 1)
                                            // or the first unread chapter
                                            const nextChapterNum = entry.chapter + 1;
                                            const nextChapter = entry.chapters.find((ch: any) => {
                                                const chNum = parseFloat(ch.chapter || ch.number || '0');
                                                return chNum === nextChapterNum;
                                            });
                                            if (nextChapter) {
                                                navigate(`/read/${entry.sourceId}/${nextChapter.id}?mangaId=${entry.sourceMangaId}&title=${encodeURIComponent(entry.title)}`);
                                            } else {
                                                // Fallback to first chapter if next not found
                                                const firstChapter = entry.chapters[entry.chapters.length - 1]; // Last in array = oldest = first chapter
                                                if (firstChapter) {
                                                    navigate(`/read/${entry.sourceId}/${firstChapter.id}?mangaId=${entry.sourceMangaId}&title=${encodeURIComponent(entry.title)}`);
                                                } else {
                                                    navigate(`/manga/${entry.sourceId}/${entry.sourceMangaId}`);
                                                }
                                            }
                                        } else if (entry.sourceId && entry.sourceMangaId) {
                                            // Go to manga details to pick a chapter
                                            navigate(`/manga/${entry.sourceId}/${entry.sourceMangaId}`);
                                        }
                                    }}
                                    title={entry.chapter > 0 ? `Continue from Chapter ${entry.chapter}` : 'Start Reading'}
                                >
                                    <PlayIcon size={16} fill="white" />
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col gap-3 pb-20">
                        {/* List Header */}
                        <div className="grid grid-cols-[80px_1fr_100px_80px] gap-4 px-6 py-4 text-xs font-bold text-white/40 uppercase tracking-widest border-b border-white/5 mb-4 sticky top-[72px] bg-black/40 backdrop-blur-xl z-20 rounded-xl">
                            <div>Cover</div>
                            <div>Title</div>
                            <div>Progress</div>
                            <div></div>
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
                                className="glass-panel grid grid-cols-[80px_1fr_100px_80px] gap-4 items-center p-4 rounded-2xl hover:bg-white/10 cursor-pointer transition-all duration-300 group border border-white/5 hover:border-white/20"
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
                                <div className="flex justify-end">
                                    <button
                                        className="p-2.5 rounded-full shadow-lg hover:scale-110 transition-all duration-200"
                                        style={{ backgroundColor: 'var(--theme-accent-primary)' }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (entry.sourceId === 'local' && entry.sourceMangaId) {
                                                navigate(`/local/${encodeURIComponent(entry.sourceMangaId)}`, { state: { type: 'MANGA' } });
                                            } else if (entry.lastReadChapterId && entry.sourceId && entry.sourceMangaId) {
                                                navigate(`/read/${entry.sourceId}/${entry.lastReadChapterId}?mangaId=${entry.sourceMangaId}&title=${encodeURIComponent(entry.title)}`);
                                            } else if (entry.chapters && entry.chapters.length > 0 && entry.sourceId && entry.sourceMangaId) {
                                                const nextChapterNum = entry.chapter + 1;
                                                const nextChapter = entry.chapters.find((ch: any) => {
                                                    const chNum = parseFloat(ch.chapter || ch.number || '0');
                                                    return chNum === nextChapterNum;
                                                });
                                                if (nextChapter) {
                                                    navigate(`/read/${entry.sourceId}/${nextChapter.id}?mangaId=${entry.sourceMangaId}&title=${encodeURIComponent(entry.title)}`);
                                                } else {
                                                    const firstChapter = entry.chapters[entry.chapters.length - 1];
                                                    if (firstChapter) {
                                                        navigate(`/read/${entry.sourceId}/${firstChapter.id}?mangaId=${entry.sourceMangaId}&title=${encodeURIComponent(entry.title)}`);
                                                    } else {
                                                        navigate(`/manga/${entry.sourceId}/${entry.sourceMangaId}`);
                                                    }
                                                }
                                            } else if (entry.sourceId && entry.sourceMangaId) {
                                                navigate(`/manga/${entry.sourceId}/${entry.sourceMangaId}`);
                                            }
                                        }}
                                        title={entry.chapter > 0 ? `Continue from Chapter ${entry.chapter}` : 'Start Reading'}
                                    >
                                        <PlayIcon size={14} fill="white" />
                                    </button>
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

            {/* Bottom Floating Area */}
            <div className="fixed bottom-0 left-0 w-full z-40 pointer-events-none h-0">

                {/* Center: Category Pills */}
                <div className="absolute bottom-8 pointer-events-auto shadow-2xl rounded-full max-w-[calc(100vw-160px)]" style={{ left: 'calc(50% + 100px)', transform: 'translateX(-50%)' }}>
                    <CategoryPills
                        categories={categories}
                        activeCategory={activeCategoryId}
                        onCategoryChange={setActiveCategoryId}
                        onCategoryDelete={handleDeleteCategory}
                    />
                </div>


            </div>

            {/* Floating Action Button (FAB) for Adding Categories */}
            <div className="fixed bottom-8 right-8 z-40 flex items-center gap-3">
                <AnimatePresence>
                    {isFabHovered && (
                        <motion.div
                            initial={{ opacity: 0, x: 20, scale: 0.8 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 10, scale: 0.8 }}
                            className="bg-black/80 backdrop-blur-md text-white text-sm font-bold px-4 py-2 rounded-xl border border-white/10 shadow-2xl skew-x-[-12deg]"
                            style={{ fontFamily: 'var(--font-rounded)' }}
                        >
                            <div className="skew-x-[12deg]">New Category</div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <motion.button
                    onClick={() => setIsAddDialogOpen(true)}
                    onHoverStart={() => setIsFabHovered(true)}
                    onHoverEnd={() => setIsFabHovered(false)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 400, damping: 15 }}
                    className="w-14 h-14 rounded-full flex items-center justify-center text-white shadow-[0_8px_30px_rgba(0,0,0,0.3)] border border-white/10"
                    style={{ backgroundColor: 'var(--theme-accent-primary)' }}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                </motion.button>
            </div>
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
