/**
 * ====================================================================
 * MANGA READER PAGE
 * ====================================================================
 *
 * The core reading experience. Supports:
 * - Vertical scroll mode (webtoon style)
 * - Single page mode with navigation
 * - Keyboard navigation (arrow keys)
 * - Next/Previous chapter navigation
 * - 80% read tracking with AniList sync
 * ====================================================================
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ExtensionManager, Page, Chapter, Manga } from '../services/ExtensionManager';
import { useMangaMappings } from '../hooks/useMangaMappings';
import { updateMangaProgress, getMangaEntryByAnilistId, getLocalMangaEntry } from '../lib/localMangaDb';
import { syncMangaEntryToAniList } from '../lib/syncService';
import { getCurrentWindow } from '@tauri-apps/api/window';
import './MangaReader.css';

type ReadingMode = 'vertical' | 'single' | 'double';
type SyncStatus = 'idle' | 'tracking' | 'saving' | 'syncing' | 'synced' | 'error';

function MangaReader() {
    const { sourceId, chapterId } = useParams<{ sourceId: string; chapterId: string }>();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { getMapping } = useMangaMappings();

    // Get manga info from URL params for chapter navigation
    const mangaId = searchParams.get('mangaId');
    const mangaTitle = searchParams.get('title');

    const [pages, setPages] = useState<Page[]>([]);
    const [manga, setManga] = useState<Manga | null>(null);
    const [chapters, setChapters] = useState<Chapter[]>([]);
    const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [readingMode, setReadingMode] = useState<ReadingMode>('vertical');
    const [currentPage, setCurrentPage] = useState(0);
    const [showControls, setShowControls] = useState(true);

    // Reading progress tracking
    const [scrollProgress, setScrollProgress] = useState(0);
    const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');

    // Display settings
    const [zoom, setZoom] = useState(900); // Default width in px for vertical mode
    const [isFullscreen, setIsFullscreen] = useState(false);

    const readerRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Track synced chapters to avoid duplicate syncs
    const syncedChaptersRef = useRef<Set<string>>(new Set());

    // Get AniList mapping for this manga
    const anilistMapping = sourceId && mangaId ? getMapping(sourceId, mangaId) : undefined;

    // 80% threshold for syncing
    const SYNC_THRESHOLD = 0.8;

    // Load pages when chapter changes
    useEffect(() => {
        if (!sourceId || !chapterId) return;

        const loadChapter = async () => {
            setLoading(true);
            setError(null);
            setScrollProgress(0);

            // Default to idle, but might update to synced if already read
            setSyncStatus('idle');

            // Reset scroll position immediately
            if (scrollContainerRef.current) {
                scrollContainerRef.current.scrollTop = 0;
            }
            // Also reset window scroll just in case
            window.scrollTo(0, 0);

            try {
                const source = ExtensionManager.getSource(sourceId);
                if (!source) {
                    throw new Error(`Source '${sourceId}' not found`);
                }

                // Load pages
                const loadedPages = await source.getPages(chapterId);
                setPages(loadedPages);

                // Load manga info and chapters if we have mangaId
                if (mangaId) {
                    const [mangaInfo, chapterList] = await Promise.all([
                        source.getMangaDetails(mangaId),
                        source.getChapters(mangaId),
                    ]);
                    setManga(mangaInfo);
                    setChapters(chapterList);

                    // Find current chapter in the list
                    const current = chapterList.find((c) => c.id === chapterId);
                    setCurrentChapter(current || null);

                    // Check if chapter is already read
                    if (current) {
                        let storedProgress = null;
                        if (anilistMapping?.anilistId) {
                            storedProgress = getMangaEntryByAnilistId(anilistMapping.anilistId);
                        } else if (sourceId && mangaId) {
                            storedProgress = getLocalMangaEntry(`${sourceId}-${mangaId}`);
                        }

                        if (storedProgress && storedProgress.chapter >= current.number) {
                            setSyncStatus('synced');
                        }
                    }
                }

                setCurrentPage(0);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load chapter');
            } finally {
                setLoading(false);
            }
        };

        loadChapter();
    }, [sourceId, chapterId, mangaId]);

    // Update Discord RPC
    useEffect(() => {
        if (!currentChapter) return;

        import('../services/discordRPC').then(({ updateMangaActivity }) => {
            updateMangaActivity({
                mangaTitle: manga?.title || mangaTitle || 'Reading Manga',
                chapter: currentChapter.number,
                anilistId: anilistMapping?.anilistId,
                coverImage: manga?.coverUrl || anilistMapping?.coverImage,
                totalChapters: anilistMapping?.totalChapters
            });
        });

        // Cleanup on unmount
        return () => {
            import('../services/discordRPC').then(({ clearDiscordActivity }) => {
                clearDiscordActivity();
            });
        };
    }, [currentChapter, manga, mangaTitle, anilistMapping]);

    // Scroll tracking for vertical mode
    useEffect(() => {
        if (loading) return;
        if (readingMode !== 'vertical' || !scrollContainerRef.current) return;

        const handleScroll = () => {
            const container = scrollContainerRef.current;
            if (!container) return;

            const scrollTop = container.scrollTop;
            const scrollHeight = container.scrollHeight - container.clientHeight;
            const progress = scrollHeight > 0 ? scrollTop / scrollHeight : 0;

            setScrollProgress(progress);
            setShowControls(false);
        };

        const container = scrollContainerRef.current;
        container.addEventListener('scroll', handleScroll);
        // Trigger once to set initial state
        handleScroll();

        return () => container.removeEventListener('scroll', handleScroll);
    }, [readingMode, pages, loading]);

    // Page tracking for single page mode
    useEffect(() => {
        if (readingMode !== 'single' || pages.length === 0) return;

        const progress = (currentPage + 1) / pages.length;
        setScrollProgress(progress);
    }, [readingMode, currentPage, pages.length]);

    // 80% threshold sync trigger
    useEffect(() => {
        if (!sourceId || !mangaId || !currentChapter) return;

        // Ensure we are tracking the correct chapter
        if (currentChapter.id !== chapterId) return;

        if (scrollProgress < SYNC_THRESHOLD) {
            if (syncStatus === 'idle') {
                setSyncStatus('tracking');
            }
            return;
        }

        const chapterKey = `${sourceId}-${mangaId}-${chapterId}`;

        // Already synced this chapter in this session
        if (syncedChaptersRef.current.has(chapterKey)) return;

        // Mark as synced to prevent duplicate calls
        syncedChaptersRef.current.add(chapterKey);

        const syncChapter = async () => {
            console.log(`[MangaReader] 80% threshold reached for chapter ${currentChapter.number}`);

            setSyncStatus('saving');

            try {
                // Get chapter number (parse from string if needed)
                const chapterNumber = Math.floor(currentChapter.number);

                // Update local progress
                const entryId = anilistMapping?.anilistId
                    ? String(anilistMapping.anilistId)
                    : `${sourceId}-${mangaId}`;

                const entry = updateMangaProgress(entryId, {
                    title: manga?.title || mangaTitle || 'Unknown Manga',
                    chapter: chapterNumber,
                    totalChapters: anilistMapping?.totalChapters,
                    anilistId: anilistMapping?.anilistId,
                    coverImage: manga?.coverUrl || anilistMapping?.coverImage,
                    sourceId,
                    sourceMangaId: mangaId,
                    chapterId: currentChapter.id,
                    chapterTitle: currentChapter.title
                });

                console.log('[MangaReader] Saved to local DB:', entry.title, 'Ch', entry.chapter);

                // Sync to AniList if we have a mapping
                if (anilistMapping?.anilistId) {
                    setSyncStatus('syncing');
                    const synced = await syncMangaEntryToAniList(entry);
                    setSyncStatus(synced ? 'synced' : 'error');
                } else {
                    // No AniList link, just saved locally
                    setSyncStatus('synced');
                }
            } catch (err) {
                console.error('[MangaReader] Sync error:', err);
                setSyncStatus('error');
            }
        };

        syncChapter();
    }, [scrollProgress, sourceId, mangaId, chapterId, currentChapter, manga, mangaTitle, anilistMapping]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (readingMode === 'single') {
                if (e.key === 'ArrowRight' || e.key === 'd') {
                    goToNextPage();
                } else if (e.key === 'ArrowLeft' || e.key === 'a') {
                    goToPrevPage();
                }
            }
            if (e.key === 'ArrowUp' && e.ctrlKey) {
                goToPrevChapter();
            } else if (e.key === 'ArrowDown' && e.ctrlKey) {
                goToNextChapter();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [readingMode, currentPage, pages.length, chapters, currentChapter]);



    const toggleControls = useCallback(() => {
        setShowControls(prev => !prev);
    }, []);

    const goToNextPage = useCallback(() => {
        if (currentPage < pages.length - 1) {
            setCurrentPage((p) => p + 1);
        } else {
            // Last page, go to next chapter
            goToNextChapter();
        }
    }, [currentPage, pages.length]);

    const goToPrevPage = useCallback(() => {
        if (currentPage > 0) {
            setCurrentPage((p) => p - 1);
        } else {
            // First page, go to previous chapter
            goToPrevChapter();
        }
    }, [currentPage]);

    const goToNextChapter = useCallback(() => {
        if (!currentChapter || chapters.length === 0) return;
        const currentIndex = chapters.findIndex((c) => c.id === currentChapter.id);
        // Chapters are sorted desc (newest first), so "next" is actually previous index
        if (currentIndex > 0) {
            const nextChapter = chapters[currentIndex - 1];
            navigate(`/read/${sourceId}/${nextChapter.id}?mangaId=${mangaId}&title=${encodeURIComponent(mangaTitle || '')}`);
        }
    }, [currentChapter, chapters, sourceId, mangaId, mangaTitle, navigate]);

    const goToPrevChapter = useCallback(() => {
        if (!currentChapter || chapters.length === 0) return;
        const currentIndex = chapters.findIndex((c) => c.id === currentChapter.id);
        if (currentIndex < chapters.length - 1) {
            const prevChapter = chapters[currentIndex + 1];
            navigate(`/read/${sourceId}/${prevChapter.id}?mangaId=${mangaId}&title=${encodeURIComponent(mangaTitle || '')}`);
        }
    }, [currentChapter, chapters, sourceId, mangaId, mangaTitle, navigate]);

    const handleBack = () => {
        if (mangaId) {
            navigate(`/manga/${sourceId}/${mangaId}`);
        } else {
            navigate('/manga-list');
        }
    };

    const handleZoomIn = () => setZoom(z => Math.min(z + 100, 2000));
    const handleZoomOut = () => setZoom(z => Math.max(z - 100, 400));

    const toggleFullscreen = async () => {
        try {
            const win = getCurrentWindow();
            const isFull = await win.isFullscreen();
            await win.setFullscreen(!isFull);
            setIsFullscreen(!isFull);
        } catch (e) {
            console.error('Failed to toggle fullscreen:', e);
        }
    };

    // Get sync status display
    const getSyncStatusDisplay = () => {
        if (!anilistMapping && syncStatus !== 'synced') {
            return null; // No AniList link, don't show status
        }

        switch (syncStatus) {
            case 'tracking':
                return (
                    <div className="sync-status tracking">
                        <span className="sync-icon">📖</span>
                        <span>{Math.round(scrollProgress * 100)}%</span>
                        <div className="sync-progress-bar">
                            <div
                                className="sync-progress-fill"
                                style={{ width: `${(scrollProgress / SYNC_THRESHOLD) * 100}%` }}
                            />
                        </div>
                    </div>
                );
            case 'saving':
                return (
                    <div className="sync-status saving">
                        <span className="sync-icon">💾</span>
                        <span>Saving...</span>
                    </div>
                );
            case 'syncing':
                return (
                    <div className="sync-status syncing">
                        <span className="sync-icon spinning">🔄</span>
                        <span>Syncing to AniList...</span>
                    </div>
                );
            case 'synced':
                return (
                    <div className="sync-status synced">
                        <span className="sync-icon">✓</span>
                        <span>Synced{anilistMapping ? ' to AniList' : ''}</span>
                    </div>
                );
            case 'error':
                return (
                    <div className="sync-status error">
                        <span className="sync-icon">⚠️</span>
                        <span>Sync failed</span>
                    </div>
                );
            default:
                return null;
        }
    };

    if (loading) {
        return (
            <div className="manga-reader-loading">
                <div className="loader"></div>
                <p>Loading chapter...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="manga-reader-error">
                <h2>Error</h2>
                <p>{error}</p>
                <button onClick={() => navigate(-1)}>Go Back</button>
            </div>
        );
    }

    return (
        <div className="manga-reader" ref={readerRef}>
            {/* Top Controls */}
            <div className={`reader-controls-top ${showControls ? 'visible' : ''}`}>
                <button className="back-btn" onClick={handleBack}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                </button>

                <div className="chapter-info">
                    <h1 className="manga-title">{manga?.title || mangaTitle || 'Unknown Manga'}</h1>
                    <span className="chapter-number">
                        Chapter {currentChapter?.number || '?'}
                        {currentChapter?.title && ` - ${currentChapter.title}`}
                    </span>
                </div>

                <div className="reader-settings">
                    {/* Sync Status Indicator */}
                    {getSyncStatusDisplay()}

                    <select
                        value={readingMode}
                        onChange={(e) => setReadingMode(e.target.value as ReadingMode)}
                        className="mode-select"
                    >
                        <option value="vertical">Vertical (Webtoon)</option>
                        <option value="single">Single Page</option>
                    </select>
                </div>
            </div>

            {/* Main Content */}
            <div className={`reader-content ${readingMode}`} onClick={toggleControls}>
                {readingMode === 'vertical' ? (
                    <div className="vertical-scroll" ref={scrollContainerRef} style={{ maxWidth: `${zoom}px` }}>
                        {pages.map((page) => (
                            <img
                                key={page.index}
                                src={page.imageUrl}
                                alt={`Page ${page.index + 1}`}
                                className="page-image"
                                loading="lazy"
                            />
                        ))}
                    </div>
                ) : (
                    <div className="single-page">
                        <button className="nav-area prev" onClick={goToPrevPage}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M15 18l-6-6 6-6" />
                            </svg>
                        </button>

                        {pages[currentPage] && (
                            <img
                                src={pages[currentPage].imageUrl}
                                alt={`Page ${currentPage + 1}`}
                                className="page-image"
                            />
                        )}

                        <button className="nav-area next" onClick={goToNextPage}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 18l6-6-6-6" />
                            </svg>
                        </button>
                    </div>
                )}
            </div>

            {/* Bottom Controls */}
            <div className={`reader-controls-bottom ${showControls ? 'visible' : ''}`}>
                <div className="control-group left">
                    <button className="control-btn" onClick={handleZoomOut} title="Zoom Out">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    </button>
                    <span className="zoom-level">{Math.round((zoom / 900) * 100)}%</span>
                    <button className="control-btn" onClick={handleZoomIn} title="Zoom In">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    </button>
                </div>

                <div className="control-group center">
                    <button
                        className="chapter-nav-btn"
                        onClick={goToPrevChapter}
                        disabled={!currentChapter || chapters.findIndex((c) => c.id === currentChapter?.id) >= chapters.length - 1}
                    >
                        ← Previous Chapter
                    </button>

                    <div className="page-indicator">
                        {readingMode === 'vertical' ? (
                            <span>{Math.round(scrollProgress * 100)}%</span>
                        ) : (
                            <>
                                <span>{currentPage + 1}</span>
                                <span className="separator">/</span>
                                <span>{pages.length}</span>
                            </>
                        )}
                    </div>

                    <button
                        className="chapter-nav-btn"
                        onClick={goToNextChapter}
                        disabled={!currentChapter || chapters.findIndex((c) => c.id === currentChapter?.id) <= 0}
                    >
                        Next Chapter →
                    </button>
                </div>

                <div className="control-group right">
                    <button className="control-btn" onClick={toggleFullscreen} title="Toggle Fullscreen">
                        {isFullscreen ? (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path></svg>
                        ) : (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default MangaReader;
