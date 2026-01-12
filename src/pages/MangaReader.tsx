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
import { Dropdown } from '../components/ui/Dropdown';
import { ExtensionManager, Page, Chapter, Manga } from '../services/ExtensionManager';
import { useMangaMappings } from '../hooks/useMangaMappings';
import { useMalAuth } from '../context/MalAuthContext';
import { useAuthContext } from '../context/AuthContext';
import * as malClient from '../api/malClient';
import { updateMangaProgress, getMangaEntryByAnilistId, getLocalMangaEntry, getLocalMangaDb, isChapterDownloaded, LocalMangaEntry } from '../lib/localMangaDb';
import { syncMangaEntryToAniList } from '../lib/syncService';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/core';
import { updateMangaActivity, clearDiscordActivity, setMangaReadingState } from '../services/discordRPC';
import { trackMangaSession } from '../services/StatsService';
import './MangaReader.css';

// Helper component to handle image loading (supports both online URLs and local encoded CBZ paths)
const MangaPageImage = ({ page, alt, className, loading = 'lazy' }: { page: Page; alt: string; className?: string; loading?: 'lazy' | 'eager' }) => {
    const [src, setSrc] = useState<string>('');
    const [error, setError] = useState(false);

    useEffect(() => {
        let isMounted = true;

        const loadSrc = async () => {
            if (page.imageUrl.startsWith('manga://')) {
                // Parse manga:// protocol manually since browser support is flaky
                try {
                    // Protocol: manga://localhost/<encoded_path>/<encoded_page>
                    const pathAndQuery = page.imageUrl.replace('manga://localhost/', '');
                    const parts = pathAndQuery.split('/');
                    if (parts.length >= 2) {
                        const encodedPath = parts[0];
                        const encodedPage = parts.slice(1).join('/');

                        const decodedPath = decodeURIComponent(encodedPath);
                        const decodedPage = decodeURIComponent(encodedPage);

                        // Fetch base64 data directly via invoke
                        const dataUrl = await invoke<string>('get_cbz_page', {
                            path: decodedPath,
                            pageName: decodedPage
                        });

                        if (isMounted) {
                            setSrc(dataUrl);
                        }
                    } else {
                        throw new Error('Invalid manga URL format');
                    }
                } catch (e) {
                    // console.error('Failed to load local page:', e);
                    if (isMounted) setError(true);
                }
            } else {
                // Standard URL
                setSrc(page.imageUrl);
            }
        };

        loadSrc();

        return () => {
            isMounted = false;
        };
    }, [page.imageUrl]);

    if (error) {
        return (
            <div className={`page-error ${className}`} style={{ height: '800px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#2a2a2a', color: '#666' }}>
                <span>Failed to load image</span>
            </div>
        );
    }

    if (!src) {
        return <div className={`page-placeholder ${className}`} style={{ minHeight: '400px', backgroundColor: '#1a1a1a' }} />;
    }

    return (
        <img
            src={src}
            alt={alt}
            className={className}
            loading={loading}
            onError={() => setError(true)}
        />
    );
};

type ReadingMode = 'vertical' | 'single' | 'double';
type SyncStatus = 'idle' | 'tracking' | 'saving' | 'syncing' | 'synced' | 'error';

function MangaReader() {
    const { sourceId, chapterId } = useParams<{ sourceId: string; chapterId: string }>();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { getMapping } = useMangaMappings();
    const malAuth = useMalAuth();
    const { user } = useAuthContext();

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

    // Track actual reading time for stats
    const chapterStartTimeRef = useRef<number>(Date.now());

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

            // Reset chapter start time for accurate time tracking
            chapterStartTimeRef.current = Date.now();

            // Default to idle
            setSyncStatus('idle');

            // Reset scroll position
            if (scrollContainerRef.current) {
                scrollContainerRef.current.scrollTop = 0;
            }
            window.scrollTo(0, 0);

            try {
                // 1. Check for Local Offline Data
                const allEntries = getLocalMangaDb();
                const localEntry = Object.values(allEntries).find(e =>
                    (e.sourceId === sourceId && e.sourceMangaId === mangaId) ||
                    (anilistMapping?.anilistId && e.anilistId === anilistMapping.anilistId)
                ) as LocalMangaEntry | undefined;

                // If we found a local entry, use its data first
                if (localEntry) {
                    if (localEntry.chapters) {
                        setChapters(localEntry.chapters);
                    }
                }

                // Check if chapter is downloaded
                const isDownloaded = isChapterDownloaded(localEntry?.id || '', chapterId);

                if (isDownloaded && localEntry && localEntry.chapters) {
                    console.log('[MangaReader] Chapter is downloaded, reading from disk');

                    const chapter = localEntry.chapters.find((c: Chapter) => c.id === chapterId);
                    if (chapter) {
                        try {
                            // Get settings for path
                            const settingsJson = localStorage.getItem('app-settings');
                            let downloadDir = '';
                            if (settingsJson) {
                                downloadDir = JSON.parse(settingsJson).mangaDownloadPath || '';
                            }

                            if (downloadDir) {
                                // Construct Path matches Rust logic
                                // Sanitize: replace specific chars with _ and trim
                                const sanitize = (s: string) => s.replace(/[<>:"/\\|?*]/g, '_').trim();

                                const mangaDir = sanitize(localEntry.title);
                                const chapterFile = `${sanitize(chapter.title)}.cbz`;

                                // We need full path. Assuming Windows/Standard separators. 
                                // Better to join properly or just use slashes which usually work.
                                const cbzPath = `${downloadDir}\\${mangaDir}\\${chapterFile}`.replace(/\\\\/g, '\\');

                                // Get CBZ info
                                const info = await invoke<{ page_count: number, pages: string[] }>('get_cbz_info', { path: cbzPath });

                                // Generate Page URLs
                                const cbzPages: Page[] = info.pages.map((filename: string, index: number) => ({
                                    index,
                                    imageUrl: `manga://localhost/${encodeURIComponent(cbzPath)}/${encodeURIComponent(filename)}`
                                }));

                                setPages(cbzPages);

                                // If we successfully loaded from CBZ, we still need basic manga info
                                if (localEntry) {
                                    setManga({
                                        id: localEntry.id,
                                        title: localEntry.title,
                                        coverUrl: localEntry.coverImage || '',
                                        description: localEntry.description || '',
                                        author: localEntry.author || '',
                                        genres: localEntry.genres || [],
                                        status: 'unknown',
                                        url: '',
                                    });
                                    if (localEntry.chapters) {
                                        setChapters(localEntry.chapters);
                                        // Find current chapter
                                        const current = localEntry.chapters.find((c: Chapter) => c.id === chapterId);
                                        setCurrentChapter(current || null);
                                    }
                                }

                                setLoading(false);
                                return; // Exit early to skip online fetch
                            }
                        } catch (e) {
                            // Only log real errors, not "file not found" (os error 2) which is expected for non-downloaded chapters
                            const msg = e instanceof Error ? e.message : String(e);
                            if (!msg.includes('os error 2') && !msg.includes('system cannot find the file')) {
                                console.warn('Failed to load local CBZ:', e);
                            }
                            // Fallback to online if local fails
                        }
                    }
                }

                // ... fetch online logic ...
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

        // Set manga reading state to prevent anime detection from overriding
        setMangaReadingState(true);

        updateMangaActivity({
            mangaTitle: manga?.title || mangaTitle || 'Reading Manga',
            chapter: currentChapter.number,
            anilistId: anilistMapping?.anilistId,
            coverImage: manga?.coverUrl || anilistMapping?.coverImage,
            totalChapters: anilistMapping?.totalChapters,
            smallImage: user?.avatar?.medium || null,
            smallText: user?.name ? `Logged in as ${user.name}` : null
        });

        // Cleanup on unmount
        return () => {
            setMangaReadingState(false);
            clearDiscordActivity();
        };
    }, [currentChapter, manga, mangaTitle, anilistMapping, user]);

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

    // Page tracking for single/double page mode
    useEffect(() => {
        if (readingMode === 'vertical' || pages.length === 0) return;

        // In double mode, currentPage + 2 gives a more accurate reading progress
        const effectivePage = readingMode === 'double'
            ? Math.min(currentPage + 2, pages.length)
            : currentPage + 1;
        const progress = effectivePage / pages.length;
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

                // Track manga session for stats (with actual elapsed time)
                const elapsedMinutes = Math.round((Date.now() - chapterStartTimeRef.current) / 60000);
                // Use actual time if reasonable (1-60 min), otherwise fallback to 10 min estimate
                const actualMinutesRead = (elapsedMinutes >= 1 && elapsedMinutes <= 60) ? elapsedMinutes : 10;

                trackMangaSession(
                    anilistMapping?.anilistId || parseInt(mangaId || '0', 10),
                    manga?.title || mangaTitle || 'Unknown Manga',
                    manga?.coverUrl || anilistMapping?.coverImage,
                    1, // 1 chapter read
                    actualMinutesRead, // Use actual tracked time
                    manga?.genres || []
                );

                console.log('[MangaReader] Tracked', actualMinutesRead, 'minutes for this chapter');

                // Sync to AniList if we have a mapping
                if (anilistMapping?.anilistId) {
                    setSyncStatus('syncing');
                    const synced = await syncMangaEntryToAniList(entry);
                    setSyncStatus(synced ? 'synced' : 'error');
                } else {
                    // No AniList link, just saved locally
                    setSyncStatus('synced');
                }

                // Also sync to MAL if authenticated
                if (malAuth.isAuthenticated && malAuth.accessToken) {
                    const mangaTitleStr = manga?.title || mangaTitle || '';
                    try {
                        const malResults = await malClient.searchManga(
                            malAuth.accessToken,
                            mangaTitleStr,
                            1
                        );
                        if (malResults.length > 0) {
                            const malId = malResults[0].id;
                            await malClient.updateMangaProgress(
                                malAuth.accessToken,
                                malId,
                                chapterNumber,
                                'reading'
                            );
                            console.log('[MangaReader] MAL progress synced:', chapterNumber);
                        }
                    } catch (malErr) {
                        console.error('[MangaReader] MAL sync failed:', malErr);
                    }
                }
            } catch (err) {
                console.error('[MangaReader] Sync error:', err);
                setSyncStatus('error');
            }
        };

        syncChapter();
    }, [scrollProgress, sourceId, mangaId, chapterId, currentChapter, manga, mangaTitle, anilistMapping, malAuth]);

    // Keyboard navigation + zoom shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Zoom shortcuts: Ctrl+Plus, Ctrl+Minus, Ctrl+0
            if (e.ctrlKey && (e.key === '=' || e.key === '+')) {
                e.preventDefault();
                setZoom(z => Math.min(z + 100, 2000));
                return;
            }
            if (e.ctrlKey && e.key === '-') {
                e.preventDefault();
                setZoom(z => Math.max(z - 100, 400));
                return;
            }
            if (e.ctrlKey && e.key === '0') {
                e.preventDefault();
                setZoom(900); // Reset to default
                return;
            }
            // Go back shortcut: Ctrl+Backspace
            if (e.ctrlKey && e.key === 'Backspace') {
                e.preventDefault();
                navigate(-1);
                return;
            }

            // Page navigation in single/double mode
            if (readingMode === 'single' || readingMode === 'double') {
                if (e.key === 'ArrowRight' || e.key === 'd') {
                    goToNextPage();
                } else if (e.key === 'ArrowLeft' || e.key === 'a') {
                    goToPrevPage();
                }
            }
            // Chapter navigation
            if (e.key === 'ArrowUp' && e.ctrlKey) {
                goToPrevChapter();
            } else if (e.key === 'ArrowDown' && e.ctrlKey) {
                goToNextChapter();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [readingMode, currentPage, pages.length, chapters, currentChapter]);

    // Scroll wheel zoom (Ctrl+scroll)
    useEffect(() => {
        const handleWheel = (e: WheelEvent) => {
            if (e.ctrlKey) {
                e.preventDefault();
                if (e.deltaY < 0) {
                    setZoom(z => Math.min(z + 50, 2000));
                } else {
                    setZoom(z => Math.max(z - 50, 400));
                }
            }
        };

        window.addEventListener('wheel', handleWheel, { passive: false });
        return () => window.removeEventListener('wheel', handleWheel);
    }, []);



    const toggleControls = useCallback(() => {
        setShowControls(prev => !prev);
    }, []);

    const goToNextPage = useCallback(() => {
        const increment = readingMode === 'double' ? 2 : 1;
        if (currentPage < pages.length - increment) {
            setCurrentPage((p) => p + increment);
        } else if (currentPage < pages.length - 1) {
            // Handle odd pages in double mode
            setCurrentPage(pages.length - 1);
        } else {
            // Last page, go to next chapter
            goToNextChapter();
        }
    }, [currentPage, pages.length, readingMode]);

    const goToPrevPage = useCallback(() => {
        const decrement = readingMode === 'double' ? 2 : 1;
        if (currentPage >= decrement) {
            setCurrentPage((p) => p - decrement);
        } else if (currentPage > 0) {
            setCurrentPage(0);
        } else {
            // First page, go to previous chapter
            goToPrevChapter();
        }
    }, [currentPage, readingMode]);

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
    const handleZoomReset = () => setZoom(900);

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
                        {currentChapter?.title && currentChapter.title !== `Chapter ${currentChapter.number}` && ` - ${currentChapter.title}`}
                    </span>
                </div>

                <div className="reader-settings">
                    {/* Sync Status Indicator */}
                    {getSyncStatusDisplay()}

                    <Dropdown
                        value={readingMode}
                        onChange={(val) => setReadingMode(val as ReadingMode)}
                        options={[
                            { value: 'vertical', label: 'Vertical (Webtoon)' },
                            { value: 'single', label: 'Single Page' },
                            { value: 'double', label: 'Double Page Spread' }
                        ]}
                        className="w-48"
                    />
                </div>
            </div>

            {/* Main Content */}
            <div className={`reader-content ${readingMode}`} onClick={toggleControls}>
                {readingMode === 'vertical' ? (
                    <div className="vertical-scroll" ref={scrollContainerRef} style={{ maxWidth: `${zoom}px` }}>
                        {pages.map((page) => (
                            <MangaPageImage
                                key={page.index}
                                page={page}
                                alt={`Page ${page.index + 1}`}
                                className="page-image"
                                loading="lazy"
                            />
                        ))}
                    </div>
                ) : readingMode === 'double' ? (
                    <div className="double-page">
                        <button className="nav-area prev" onClick={goToPrevPage}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M15 18l-6-6 6-6" />
                            </svg>
                        </button>

                        <div className="double-page-container">
                            {/* Left page (even index) */}
                            {pages[currentPage] && (
                                <MangaPageImage
                                    page={pages[currentPage]}
                                    alt={`Page ${currentPage + 1}`}
                                    className="page-image left-page"
                                    loading="eager"
                                />
                            )}
                            {/* Right page (odd index) */}
                            {pages[currentPage + 1] && (
                                <MangaPageImage
                                    page={pages[currentPage + 1]}
                                    alt={`Page ${currentPage + 2}`}
                                    className="page-image right-page"
                                    loading="eager"
                                />
                            )}
                        </div>

                        <button className="nav-area next" onClick={goToNextPage}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 18l6-6-6-6" />
                            </svg>
                        </button>
                    </div>
                ) : (
                    <div className="single-page">
                        <button className="nav-area prev" onClick={goToPrevPage}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M15 18l-6-6 6-6" />
                            </svg>
                        </button>

                        {pages[currentPage] && (
                            <MangaPageImage
                                page={pages[currentPage]}
                                alt={`Page ${currentPage + 1}`}
                                className="page-image"
                                loading="eager"
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
                    <button className="zoom-level" onClick={handleZoomReset} title="Reset Zoom (Ctrl+0)">
                        {Math.round((zoom / 900) * 100)}%
                    </button>
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
