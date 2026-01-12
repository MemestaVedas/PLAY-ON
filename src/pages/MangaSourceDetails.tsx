/**
 * ====================================================================
 * MANGA DETAILS PAGE (Source-based)
 * ====================================================================
 *
 * Shows manga details from a source with:
 * - Cover image, title, description
 * - Chapter list with reading progress
 * - AniList linking for tracking
 * - Search/browse chapters
 * - Discord RPC integration (Browsing status)
 * - Chapter sorting, filtering, and bookmarking
 * ====================================================================
 */

import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ExtensionManager, Manga, Chapter } from '../services/ExtensionManager';
import { useMangaMappings } from '../hooks/useMangaMappings';
import { useSettings } from '../context/SettingsContext';
import {
    getMangaEntryByAnilistId,
    getMangaEntryBySourceId,
    getLibraryCategories,
    addMangaToLibrary,
    removeMangaFromLibrary,
    setMangaCategories,
    getDefaultCategory,
    linkMangaToAniList,
    toggleChapterBookmark,
    isChapterBookmarked,
    isChapterDownloaded,
    updateMangaCache,
    LibraryCategory
} from '../lib/localMangaDb';
import { sendNotification } from '@tauri-apps/plugin-notification';
import { syncMangaFromAniList } from '../lib/syncService';
import { setBrowsingActivity } from '../services/discordRPC';
import { useAuth } from '../hooks/useAuth';
import { queueChapterDownload, queueMultipleChapters, onDownloadProgress, isDownloadFolderConfigured } from '../services/downloadService';
import { Dropdown } from '../components/ui/Dropdown';
import AniListSearchDialog from '../components/ui/AniListSearchDialog';
import { DownloadFolderDialog } from '../components/ui/DownloadFolderDialog';
import { PlayIcon } from '../components/ui/Icons';
import './MangaSourceDetails.css';

function MangaSourceDetails() {
    const { sourceId, mangaId } = useParams<{ sourceId: string; mangaId: string }>();
    const navigate = useNavigate();
    const { getMapping, addMapping, removeMapping } = useMangaMappings();
    const { settings } = useSettings();
    const { user } = useAuth();

    const [manga, setManga] = useState<Manga | null>(null);
    const [chapters, setChapters] = useState<Chapter[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showLinkDialog, setShowLinkDialog] = useState(false);
    const [showLibraryDialog, setShowLibraryDialog] = useState(false);
    const [libraryCategories, setLibraryCategories] = useState<LibraryCategory[]>([]);
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

    // Sorting and filtering state
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(settings.defaultChapterSort);
    const [filter, setFilter] = useState<string[]>([]);
    const [bookmarkFilter, setBookmarkFilter] = useState(false);
    // Track downloading chapters: chapterId -> boolean
    const [downloadingChapters, setDownloadingChapters] = useState<Record<string, boolean>>({});
    // Show download folder configuration dialog
    const [showDownloadFolderDialog, setShowDownloadFolderDialog] = useState(false);
    // Pending download action to execute after folder is configured
    const [pendingDownloadAction, setPendingDownloadAction] = useState<(() => void) | null>(null);

    // Refresh trigger for library status updates
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const source = useMemo(() => {
        return sourceId ? ExtensionManager.getSource(sourceId) : null;
    }, [sourceId]);

    // Get current AniList mapping
    const anilistMapping = sourceId && mangaId ? getMapping(sourceId, mangaId) : undefined;

    // Get local entry (Linked or Unlinked)
    const localEntry = useMemo(() => {
        // Priority to linked anilist entry
        if (anilistMapping?.anilistId) {
            return getMangaEntryByAnilistId(anilistMapping.anilistId);
        }
        // Fallback to source-based entry (unlinked reading or saved to library)
        if (sourceId && mangaId) {
            return getMangaEntryBySourceId(sourceId, mangaId);
        }
        return null;
    }, [anilistMapping, sourceId, mangaId, refreshTrigger]);

    const inLibrary = localEntry?.inLibrary ?? false;

    useEffect(() => {
        // Listen for download progress to update UI
        const unsubscribe = onDownloadProgress((chapterId, current, total, status) => {
            if (chapterId) {
                // If starting or in progress
                if (current < total) {
                    setDownloadingChapters(prev => ({ ...prev, [chapterId]: true }));
                }
                // If complete (single chapter or individual update)
                else if (current === total && current > 0) {
                    setDownloadingChapters(prev => {
                        const next = { ...prev };
                        delete next[chapterId];
                        return next;
                    });
                    setRefreshTrigger(prev => prev + 1);
                }
            } else {
                // Bulk download completion (chapterId is null)
                if (status.includes('Downloaded') || status.includes('successfully')) {
                    // Clear all downloading states
                    setDownloadingChapters({});
                    setRefreshTrigger(prev => prev + 1);

                    // Send single summary notification for bulk download
                    sendNotification({
                        title: 'Bulk Download Complete',
                        body: status,
                    });
                }
            }
        });
        return () => unsubscribe();
    }, []);

    // Load manga details and chapters
    useEffect(() => {
        if (!source || !mangaId) return;

        const loadData = async () => {
            setLoading(true);
            setError(null);

            // 1. Load from cache immediately if available
            if (localEntry) {
                if (localEntry.description || localEntry.chapters) {
                    console.log('[MangaDetails] Loading from cache');
                    setManga({
                        id: mangaId,
                        title: localEntry.title,
                        coverUrl: localEntry.coverImage || '',
                        description: localEntry.description || '',
                        author: localEntry.author || '',
                        genres: localEntry.genres || [],
                        status: 'unknown', // Status might be stale, but better than nothing
                        url: '',
                    });
                    if (localEntry.chapters) {
                        setChapters(localEntry.chapters);
                    }
                    // Don't unset loading yet if we want to try fetching fresh data
                    // But for UX, showing cached data immediately is better.
                    setLoading(false);
                }
            }

            try {
                const [mangaData, chaptersData] = await Promise.all([
                    source.getMangaDetails(mangaId),
                    source.getChapters(mangaId),
                ]);

                setManga(mangaData);
                setChapters(chaptersData);

                // 2. Update Cache
                if (localEntry) {
                    updateMangaCache(localEntry.id, {
                        description: mangaData.description,
                        genres: mangaData.genres,
                        author: mangaData.author,
                        chapters: chaptersData,
                        coverImage: mangaData.coverUrl
                    });
                }
            } catch (err) {
                console.error('Failed to load fresh data:', err);

                // If we have cached data, don't show error page, just show toast/log
                const hasCachedData = localEntry && (localEntry.description || localEntry.chapters);

                if (!hasCachedData) {
                    setError(err instanceof Error ? err.message : 'Failed to load manga');
                } else {
                    // Maybe show a "Offline Mode" toast here?
                    console.log('Using cached data due to error');
                }
            } finally {
                setLoading(false);
            }
        };

        loadData();

        // Set browsing activity including avatar
        setBrowsingActivity('full', user?.avatar?.medium || null, user?.name ? `Logged in as ${user.name}` : null);
    }, [source, mangaId, user]);

    const filteredChapters = useMemo(() => {
        // Get the entry ID for bookmark/download checks
        const entryId = localEntry?.id || (sourceId && mangaId ? `${sourceId}:${mangaId}` : '');

        let result = [...chapters];

        // Apply search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(
                (ch) =>
                    ch.number.toString().includes(query) ||
                    ch.title?.toLowerCase().includes(query) ||
                    ch.scanlator?.toLowerCase().includes(query)
            );
        }

        // Apply main filter (Read/Unread/Downloaded/Not-Downloaded)
        if (filter.length > 0) {
            if (filter.includes('read')) {
                if (localEntry) {
                    result = result.filter(ch => ch.number <= localEntry.chapter);
                } else {
                    result = []; // Can't be read if no local entry
                }
            }
            if (filter.includes('unread')) {
                if (localEntry) {
                    result = result.filter(ch => ch.number > localEntry.chapter);
                }
                // If no local entry, all are unread, so no filtering needed
            }
            if (filter.includes('downloaded')) {
                if (entryId) {
                    result = result.filter(ch => isChapterDownloaded(entryId, ch.id));
                } else {
                    result = [];
                }
            }
            if (filter.includes('not-downloaded')) {
                if (entryId) {
                    result = result.filter(ch => !isChapterDownloaded(entryId, ch.id));
                }
                // If no entryId, none are downloaded, so all are not-downloaded
            }
        }

        // Apply sorting
        result.sort((a, b) => {
            return sortOrder === 'asc' ? a.number - b.number : b.number - a.number;
        });

        return result;
    }, [chapters, searchQuery, sortOrder, filter, bookmarkFilter, localEntry, sourceId, mangaId, refreshTrigger]);

    const handleChapterClick = (chapter: Chapter) => {
        navigate(
            `/read/${sourceId}/${chapter.id}?mangaId=${mangaId}&title=${encodeURIComponent(manga?.title || '')}`
        );
    };

    const handleReadFirst = () => {
        if (chapters.length > 0) {
            // Last chapter in list is the first chapter (sorted desc)
            handleChapterClick(chapters[chapters.length - 1]);
        }
    };

    const handleReadLatest = () => {
        if (chapters.length > 0) {
            handleChapterClick(chapters[0]);
        }
    };

    const handleContinueReading = () => {
        if (!localEntry || chapters.length === 0) return;

        // Find the next chapter after the last read one
        const lastReadChapter = localEntry.chapter;
        const sortedChapters = [...chapters].sort((a, b) => a.number - b.number);
        const nextChapter = sortedChapters.find(ch => ch.number > lastReadChapter);

        if (nextChapter) {
            handleChapterClick(nextChapter);
        } else {
            // If no next chapter, go to the latest
            handleReadLatest();
        }
    };

    const handleToggleLibrary = () => {
        if (!manga) return;
        const cats = getLibraryCategories();
        setLibraryCategories(cats);

        // Determine current selection
        let currentIds: string[] = [getDefaultCategory()];
        if (inLibrary && localEntry?.categoryIds) {
            currentIds = localEntry.categoryIds;
        }
        setSelectedCategories(currentIds);
        setShowLibraryDialog(true);
    };

    const handleLibrarySave = () => {
        if (!manga || !sourceId || !mangaId) return;
        const id = anilistMapping?.anilistId
            ? String(anilistMapping.anilistId)
            : (localEntry?.id ?? `${sourceId}:${mangaId}`);

        // Add to library (or update details)
        addMangaToLibrary(id, {
            title: manga.title,
            coverImage: manga.coverUrl,
            sourceId,
            sourceMangaId: mangaId,
            anilistId: anilistMapping?.anilistId
        });

        // Set categories
        let cats = selectedCategories;
        if (cats.length === 0) cats = ['default'];
        setMangaCategories(id, cats);

        setRefreshTrigger(prev => prev + 1);
        setShowLibraryDialog(false);
    };

    const handleLibraryRemove = () => {
        if (!localEntry) return;
        removeMangaFromLibrary(localEntry.id);
        setRefreshTrigger(prev => prev + 1);
        setShowLibraryDialog(false);
    };

    const handleAniListLink = async (media: {
        id: number;
        title: string;
        coverImage: string;
        chapters?: number | null;
        volumes?: number | null;
    }) => {
        if (!sourceId || !mangaId || !manga) return;

        addMapping({
            sourceId,
            sourceMangaId: mangaId,
            sourceTitle: manga.title,
            anilistId: media.id,
            anilistTitle: media.title,
            coverImage: media.coverImage,
            totalChapters: media.chapters ?? undefined,
            totalVolumes: media.volumes ?? undefined,
        });

        // Update local DB to link entry
        const linkedEntry = linkMangaToAniList(
            sourceId,
            mangaId,
            media.id,
            manga.title,
            manga.coverUrl,
            media.chapters ?? undefined
        );

        // Pull latest progress from AniList
        await syncMangaFromAniList(linkedEntry);

        setRefreshTrigger(prev => prev + 1);
    };

    const handleRemoveLink = () => {
        if (!sourceId || !mangaId) return;
        removeMapping(sourceId, mangaId);
    };

    if (loading) {
        return (
            <div className="manga-source-details-loading">
                <div className="loader"></div>
                <p>Loading manga...</p>
            </div>
        );
    }

    if (error || !manga) {
        return (
            <div className="manga-source-details-error">
                <h2>Error</h2>
                <p>{error || 'Manga not found'}</p>
                <button onClick={() => navigate(-1)}>Go Back</button>
            </div>
        );
    }

    return (
        <div className="manga-source-details">
            {/* Hero Section */}
            <div className="hero-section">
                <div className="hero-bg" style={{ backgroundImage: `url(${manga.coverUrl})` }} />
                <div className="hero-content">
                    <img src={manga.coverUrl} alt={manga.title} className="cover-image" />
                    <div className="manga-info">
                        <span className="source-badge">
                            {source?.name || 'Unknown Source'}
                        </span>
                        <h1 className="title">{manga.title}</h1>
                        <div className="meta">
                            {manga.author && <span className="author">By {manga.author}</span>}
                            {manga.status && (
                                <span className={`status ${manga.status}`}>
                                    {manga.status.charAt(0).toUpperCase() + manga.status.slice(1)}
                                </span>
                            )}
                        </div>
                        {manga.genres && manga.genres.length > 0 && (
                            <div className="genres">
                                {manga.genres.slice(0, 6).map((genre) => (
                                    <span key={genre} className="genre-tag">
                                        {genre}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* AniList Tracking Section (LocalFolder link style) */}
                        <div className="tracking-section">
                            {anilistMapping ? (
                                // Linked state: show anime info with unlink button
                                <div
                                    className="inline-flex items-center gap-3 px-4 py-3 rounded-xl border border-white/10"
                                    style={{ background: 'rgba(180, 162, 246, 0.1)' }}
                                >
                                    {anilistMapping.coverImage && (
                                        <img
                                            src={anilistMapping.coverImage}
                                            alt={anilistMapping.anilistTitle}
                                            className="w-10 h-14 object-cover rounded-lg cursor-pointer"
                                            style={{ width: '40px', height: '56px' }}
                                            onClick={() => navigate(`/manga-details/${anilistMapping.anilistId}`)}
                                        />
                                    )}
                                    <div
                                        className="flex flex-col cursor-pointer"
                                        onClick={() => navigate(`/manga-details/${anilistMapping.anilistId}`)}
                                    >
                                        <span
                                            className="text-xs text-white/40 uppercase tracking-wider"
                                            style={{ fontFamily: 'var(--font-mono)' }}
                                        >
                                            Linked to AniList
                                        </span>
                                        <span
                                            className="text-sm font-semibold text-white"
                                            style={{ fontFamily: 'var(--font-rounded)' }}
                                        >
                                            {anilistMapping.anilistTitle}
                                        </span>
                                        {localEntry && localEntry.chapter > 0 && (
                                            <span className="text-xs text-white/60">
                                                On Ch {localEntry.chapter}
                                                {anilistMapping.totalChapters && ` / ${anilistMapping.totalChapters}`}
                                            </span>
                                        )}
                                    </div>
                                    <button
                                        onClick={handleRemoveLink}
                                        className="ml-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 hover:bg-red-500/20 text-red-400 border border-red-500/30"
                                        style={{ fontFamily: 'var(--font-rounded)' }}
                                    >
                                        Unlink
                                    </button>
                                </div>
                            ) : (
                                // Not linked: show track button
                                <button
                                    onClick={() => setShowLinkDialog(true)}
                                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 hover:scale-105"
                                    style={{
                                        fontFamily: 'var(--font-rounded)',
                                        background: 'linear-gradient(135deg, var(--color-zen-accent), #9c7cf0)',
                                        color: 'white',
                                        boxShadow: '0 4px 15px rgba(180, 162, 246, 0.3)',
                                        border: 'none',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <span>🔗</span>
                                    Track on AniList
                                </button>
                            )}
                        </div>

                        <div className="action-buttons">
                            {localEntry && localEntry.chapter > 0 ? (
                                <button className="primary-btn" onClick={handleContinueReading}>
                                    <PlayIcon size={20} fill="currentColor" />
                                    Continue Ch {localEntry.chapter + 1}
                                </button>
                            ) : (
                                <button className="primary-btn" onClick={handleReadFirst}>
                                    <PlayIcon size={20} fill="currentColor" />
                                    Start Reading
                                </button>
                            )}


                            <button
                                className={`secondary-btn ${inLibrary ? 'library-active' : ''}`}
                                onClick={handleToggleLibrary}
                                title={inLibrary ? "Remove from Library" : "Add to Library"}
                                style={inLibrary ? {
                                    borderColor: 'var(--color-zen-accent)',
                                    color: 'var(--color-zen-accent)',
                                    background: 'rgba(180, 162, 246, 0.1)',
                                    padding: '0.75rem',
                                    aspectRatio: '1',
                                    display: 'flex',
                                    justifyContent: 'center'
                                } : {}}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill={inLibrary ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                                </svg>
                                {!inLibrary && "Save"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Description */}
            {manga.description && (
                <div className="description-section">
                    <h2>Synopsis</h2>
                    <p>{manga.description}</p>
                </div>
            )}

            {/* Chapters Section */}
            <div className="chapters-section">
                <div className="chapters-header">
                    <h2>Chapters ({chapters.length})</h2>
                    <div className="chapter-controls">
                        {/* Search Box */}
                        <div className="chapter-search" style={{ marginRight: 'auto' }}>
                            <input
                                type="text"
                                placeholder="Search chapters..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: '8px',
                                    padding: '6px 12px',
                                    color: 'white',
                                    fontSize: '0.9rem',
                                    minWidth: '200px',
                                    outline: 'none'
                                }}
                            />
                        </div>
                        {/* Sort Toggle */}
                        <button
                            className="control-btn"
                            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                            title={sortOrder === 'desc' ? 'Sorted: Newest First' : 'Sorted: Oldest First'}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                {sortOrder === 'desc' ? (
                                    <><path d="M3 8L7 4L11 8" /><path d="M7 4V20" /><path d="M13 12H21" /><path d="M13 16H19" /><path d="M13 20H17" /><path d="M13 8H21" /></>
                                ) : (
                                    <><path d="M3 16L7 20L11 16" /><path d="M7 20V4" /><path d="M13 8H21" /><path d="M13 12H19" /><path d="M13 16H17" /><path d="M13 20H21" /></>
                                )}
                            </svg>
                        </button>

                        {/* Main Filter */}
                        <Dropdown
                            multiple
                            value={filter}
                            onChange={(val) => setFilter(val)}
                            placeholder="Filters"
                            options={[
                                { value: 'read', label: 'Read' },
                                { value: 'unread', label: 'Unread' },
                                { value: 'downloaded', label: 'Downloaded' },
                                { value: 'not-downloaded', label: 'Not Downloaded' }
                            ]}
                            className="w-40"
                        />

                        {/* Bookmark Filter Toggle */}
                        <button
                            className={`control-btn ${bookmarkFilter ? 'active' : ''}`}
                            onClick={() => setBookmarkFilter(!bookmarkFilter)}
                            title={bookmarkFilter ? 'Showing Bookmarked' : 'Show All'}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill={bookmarkFilter ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                            </svg>
                        </button>

                        {/* Search */}
                        <div className="chapter-search">
                            <input
                                type="text"
                                placeholder="Search chapters..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>


                    </div>
                </div>

                <div className="chapter-list">
                    {filteredChapters.length === 0 ? (
                        <div className="no-chapters">No chapters found</div>
                    ) : (
                        filteredChapters.map((chapter) => {
                            // Re-evaluate on refreshTrigger changes (included in component scope)
                            const entryId = localEntry?.id || (sourceId && mangaId ? `${sourceId}:${mangaId}` : '');
                            const isRead = localEntry && chapter.number <= localEntry.chapter;
                            const isBookmarked = entryId ? isChapterBookmarked(entryId, chapter.id) : false;
                            const isDownloaded = entryId ? isChapterDownloaded(entryId, chapter.id) : false;

                            return (
                                <div
                                    key={`${chapter.id}-${refreshTrigger}`}
                                    className={`chapter-item ${isRead ? 'read' : ''} ${isDownloaded ? 'downloaded' : ''}`}
                                >
                                    <div className="chapter-main" onClick={() => handleChapterClick(chapter)}>
                                        <span className="chapter-number">
                                            Chapter {chapter.number}
                                        </span>
                                        {chapter.title && (
                                            <span className="chapter-title">{chapter.title}</span>
                                        )}
                                        <div className="chapter-badges">
                                            {isRead && (
                                                <span className="chapter-read-badge" title="Read">✓</span>
                                            )}
                                            {isDownloaded && (
                                                <span className="chapter-downloaded-badge" title="Downloaded">⬇</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="chapter-actions">
                                        {/* Download Button */}
                                        {!isDownloaded && (
                                            <button
                                                className={`download-btn ${downloadingChapters[chapter.id] ? 'downloading' : ''}`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (downloadingChapters[chapter.id]) return; // Prevent duplicate clicks

                                                    if (sourceId && mangaId && manga) {
                                                        // Check if download folder is configured
                                                        if (!isDownloadFolderConfigured()) {
                                                            setPendingDownloadAction(() => () => {
                                                                setDownloadingChapters(prev => ({ ...prev, [chapter.id]: true }));
                                                                queueChapterDownload({
                                                                    sourceId,
                                                                    mangaId,
                                                                    mangaTitle: manga.title,
                                                                    chapterId: chapter.id,
                                                                    chapterNumber: chapter.number,
                                                                    entryId: entryId || `${sourceId}:${mangaId}`,
                                                                });
                                                            });
                                                            setShowDownloadFolderDialog(true);
                                                            return;
                                                        }

                                                        // Optimistic UI update
                                                        setDownloadingChapters(prev => ({ ...prev, [chapter.id]: true }));

                                                        queueChapterDownload({
                                                            sourceId,
                                                            mangaId,
                                                            mangaTitle: manga.title,
                                                            chapterId: chapter.id,
                                                            chapterNumber: chapter.number,
                                                            entryId: entryId || `${sourceId}:${mangaId}`,
                                                        });
                                                    }
                                                }}
                                                title={downloadingChapters[chapter.id] ? "Downloading..." : "Download Chapter"}
                                                disabled={!!downloadingChapters[chapter.id]}
                                            >
                                                {downloadingChapters[chapter.id] ? (
                                                    <div className="download-spinner">
                                                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeOpacity="0.3" />
                                                            <path d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                                                        </svg>
                                                    </div>
                                                ) : (
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                                        <polyline points="7 10 12 15 17 10"></polyline>
                                                        <line x1="12" y1="15" x2="12" y2="3"></line>
                                                    </svg>
                                                )}
                                            </button>
                                        )}
                                        {/* Bookmark Button */}
                                        <button
                                            className={`bookmark-btn ${isBookmarked ? 'bookmarked' : ''}`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (entryId) {
                                                    toggleChapterBookmark(entryId, chapter.id);
                                                    setRefreshTrigger(prev => prev + 1);
                                                }
                                            }}
                                            title={isBookmarked ? 'Remove Bookmark' : 'Add Bookmark'}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill={isBookmarked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                                            </svg>
                                        </button>
                                    </div>
                                    <div className="chapter-meta">
                                        {chapter.scanlator && (
                                            <span className="scanlator">{chapter.scanlator}</span>
                                        )}
                                        {chapter.dateUpload && (
                                            <span className="date">
                                                {chapter.dateUpload.toLocaleDateString()}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* AniList Search Dialog */}
            <AniListSearchDialog
                isOpen={showLinkDialog}
                onClose={() => setShowLinkDialog(false)}
                onSelect={handleAniListLink}
                initialSearchTerm={manga.title}
                mediaType="MANGA"
            />

            {/* Library Category Dialog */}
            {showLibraryDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md animate-fade-in" onClick={() => setShowLibraryDialog(false)}>
                    <div
                        className="bg-[#15151e] p-6 rounded-2xl border border-white/10 w-full max-w-[380px] shadow-2xl transform transition-all scale-100"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="text-center mb-6">
                            <h3 className="text-xl font-bold text-white mb-1">
                                {inLibrary ? 'Update Library Entry' : 'Add to Library'}
                            </h3>
                            <p className="text-sm text-white/40">Select categories for this manga</p>
                        </div>

                        <div className="flex flex-col gap-2 mb-6 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                            {libraryCategories.map(cat => {
                                const isSelected = selectedCategories.includes(cat.id);
                                return (
                                    <div
                                        key={cat.id}
                                        onClick={() => {
                                            if (isSelected) {
                                                setSelectedCategories(prev => prev.filter(id => id !== cat.id));
                                            } else {
                                                setSelectedCategories(prev => [...prev, cat.id]);
                                            }
                                        }}
                                        className={`group flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all duration-200
                                            ${isSelected
                                                ? 'bg-[rgba(168,85,247,0.15)] border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.1)]'
                                                : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className={`font-medium transition-colors ${isSelected ? 'text-white' : 'text-white/70 group-hover:text-white'}`}>
                                                {cat.name}
                                            </span>
                                        </div>

                                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all duration-200
                                            ${isSelected
                                                ? 'bg-purple-500 border-purple-500 scale-110'
                                                : 'border-white/20 group-hover:border-white/40'
                                            }`}
                                        >
                                            {isSelected && (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="20 6 9 17 4 12"></polyline>
                                                </svg>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="flex gap-2 items-center mt-4">
                            {inLibrary && (
                                <button
                                    onClick={() => {
                                        if (confirm("Remove from Library?")) {
                                            handleLibraryRemove();
                                        }
                                    }}
                                    className="p-3 rounded-xl text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all"
                                    title="Remove from Library"
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                </button>
                            )}
                            <button
                                onClick={() => setShowLibraryDialog(false)}
                                className="px-4 py-3 rounded-xl font-medium text-white/60 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleLibrarySave}
                                className="flex-1 py-3 rounded-xl font-bold text-white shadow-lg transition-transform active:scale-95 hover:brightness-110"
                                style={{
                                    background: 'linear-gradient(135deg, var(--color-zen-accent), #9c7cf0)',
                                    boxShadow: '0 4px 15px rgba(168, 85, 247, 0.3)'
                                }}
                            >
                                {inLibrary ? 'Save' : 'Add'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Download Folder Configuration Dialog */}
            <DownloadFolderDialog
                isOpen={showDownloadFolderDialog}
                onClose={() => {
                    setShowDownloadFolderDialog(false);
                    setPendingDownloadAction(null);
                }}
                onConfigured={() => {
                    // Execute pending download action if any
                    if (pendingDownloadAction) {
                        pendingDownloadAction();
                        setPendingDownloadAction(null);
                    }
                }}
            />
        </div>
    );
}

export default MangaSourceDetails;
