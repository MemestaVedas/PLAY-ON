import { useState, useEffect, useRef, useCallback } from 'react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { getCbzInfo, getCbzPage } from '../services/localFileReader';
import { loadPdf, renderPdfPage } from '../lib/pdfReader';
import { readFile } from '@tauri-apps/plugin-fs';
import { useFolderMappings } from '../hooks/useFolderMappings';
import { useMalAuth } from '../context/MalAuthContext';
import * as malClient from '../api/malClient';
import { updateMangaProgress } from '../lib/localMangaDb';
import { syncMangaEntryToAniList } from '../lib/syncService';
import { updateMangaActivity, clearDiscordActivity, setMangaReadingState } from '../services/discordRPC';
import './MangaReader.css';

type SyncStatus = 'idle' | 'tracking' | 'saving' | 'syncing' | 'synced' | 'error';

function LocalFileReader() {
    const [searchParams] = useSearchParams();
    const filePath = searchParams.get('path') || '';
    const fileName = filePath.split(/[/\\]/).pop() || 'Unknown';
    const navigate = useNavigate();
    const { getMappingForFilePath } = useFolderMappings();
    const malAuth = useMalAuth();

    const [pages, setPages] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0 });
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [zoom, setZoom] = useState(100);

    const containerRef = useRef<HTMLDivElement>(null);
    const virtuosoRef = useRef<VirtuosoHandle>(null);

    const [showControls, setShowControls] = useState(true);

    // Tracking
    const [mapping, setMapping] = useState<ReturnType<typeof getMappingForFilePath>>(undefined);
    const [chapterNumber, setChapterNumber] = useState<number | null>(null);
    const [scrollProgress, setScrollProgress] = useState(0);
    const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
    const syncedRef = useRef(false);

    // 80% threshold for syncing
    const SYNC_THRESHOLD = 0.8;

    // Detect mapping and chapter number on mount
    useEffect(() => {
        if (!filePath) return;

        // Find if this file belongs to a mapped folder
        const foundMapping = getMappingForFilePath(filePath);
        setMapping(foundMapping);

        // Parse chapter number
        const parseChapter = (fname: string): number | null => {
            const patterns = [
                /(?:^|[_\W])(?:C|Ch|Chapter)\.?\s*(\d+)/i,  // Ch. 1, Chapter 1
                /(?:^|[_\W])(?:Vol|Volume)\.?\s*\d+\s*(?:C|Ch|Chapter)\.?\s*(\d+)/i, // Vol. 1 Ch. 1
                /(?:^|[\s_\-\(\[])(\d{1,4})(?:v\d)?(?:[\s_\-\)\]\.]|$)/, // 001, [001]
            ];

            for (const pattern of patterns) {
                const match = fname.match(pattern);
                if (match && match[1]) {
                    return parseInt(match[1], 10);
                }
            }
            return null;
        };

        setChapterNumber(parseChapter(fileName));

    }, [filePath, fileName, getMappingForFilePath]);

    // Discord Rich Presence - set when reading linked manga
    useEffect(() => {
        if (!mapping) return;

        // Set manga reading state to prevent anime detection from overriding
        setMangaReadingState(true);

        // Set Discord activity for reading manga
        updateMangaActivity({
            mangaTitle: mapping.animeName,
            chapter: chapterNumber,
            anilistId: mapping.anilistId,
            coverImage: mapping.coverImage,
        });

        // Clear activity and manga reading state when leaving the reader
        return () => {
            setMangaReadingState(false);
            clearDiscordActivity();
        };
    }, [mapping, chapterNumber]);

    // Load file pages
    useEffect(() => {
        let isMounted = true;

        if (!filePath) {
            setError('No file path provided');
            setLoading(false);
            return;
        }

        const loadFile = async () => {
            setLoading(true);
            setError(null);
            setPages([]);

            try {
                const getFileType = (path: string): 'cbz' | 'pdf' | 'unsupported' => {
                    const ext = path.split('.').pop()?.toLowerCase();
                    if (ext === 'cbz' || ext === 'cbr') return 'cbz';
                    if (ext === 'pdf') return 'pdf';
                    return 'unsupported';
                };
                const fileType = getFileType(filePath);

                if (fileType === 'cbz') {
                    const info = await getCbzInfo(filePath);
                    if (!isMounted) return;

                    const placeholders = new Array(info.pages.length).fill('');
                    setPages(placeholders);
                    setLoading(false);

                    const currentPages = [...placeholders];
                    const UPDATE_BATCH_SIZE = 5;

                    for (let i = 0; i < info.pages.length; i++) {
                        if (!isMounted) break;

                        try {
                            const pageData = await getCbzPage(filePath, info.pages[i]);
                            if (!isMounted) break;
                            currentPages[i] = pageData;

                            if (i === 0 || (i + 1) % UPDATE_BATCH_SIZE === 0 || i === info.pages.length - 1) {
                                setPages([...currentPages]);
                                setLoadingProgress({ current: i + 1, total: info.pages.length });
                            }
                        } catch (err) {
                            console.error(`Failed to load page ${i + 1}:`, err);
                        }
                    }

                } else if (fileType === 'pdf') {
                    const fileData = await readFile(filePath);
                    const pdfDoc = await loadPdf(fileData.buffer);

                    if (!isMounted) return;

                    const placeholders = new Array(pdfDoc.pageCount).fill('');
                    setPages(placeholders);
                    setLoading(false);

                    const currentPages = [...placeholders];
                    const UPDATE_BATCH_SIZE = 3;

                    for (let i = 1; i <= pdfDoc.pageCount; i++) {
                        if (!isMounted) break;
                        try {
                            const pageUrl = await renderPdfPage(pdfDoc, i);
                            if (!isMounted) break;
                            currentPages[i - 1] = pageUrl;

                            if (i === 1 || i % UPDATE_BATCH_SIZE === 0 || i === pdfDoc.pageCount) {
                                setPages([...currentPages]);
                                setLoadingProgress({ current: i, total: pdfDoc.pageCount });
                            }
                        } catch (err) {
                            console.error(`Failed to load PDF page ${i}:`, err);
                        }
                    }
                } else {
                    throw new Error(`Unsupported file type: ${filePath}`);
                }
            } catch (err) {
                if (isMounted) {
                    console.error('Failed to load file:', err);
                    setError(err instanceof Error ? err.message : 'Failed to load file');
                    setLoading(false);
                }
            }
        };

        loadFile();
        return () => { isMounted = false; };
    }, [filePath]);

    // Handle scroll for 80% completion
    const handleScroll = useCallback((e: React.UIEvent<HTMLElement>) => {
        const target = e.currentTarget as HTMLElement;
        const progress = target.scrollTop / (target.scrollHeight - target.clientHeight);
        setScrollProgress(progress);
    }, []);

    // Sync effect
    useEffect(() => {
        if (!mapping || chapterNumber === null || syncedRef.current) return;

        if (scrollProgress < SYNC_THRESHOLD) {
            if (syncStatus === 'idle') {
                setSyncStatus('tracking');
            }
            return;
        }

        // Threshold reached
        syncedRef.current = true;
        setSyncStatus('saving');

        const syncChapter = async () => {
            console.log(`[LocalReader] 80% threshold reached for Ch ${chapterNumber}`);

            try {
                // Update local DB
                const entry = updateMangaProgress(String(mapping.anilistId), {
                    title: mapping.animeName, // Using mapped anime name
                    chapter: chapterNumber,
                    anilistId: mapping.anilistId,
                    coverImage: mapping.coverImage,
                    // We don't have sourceId for local folders exactly as 'source', but we can format it
                    sourceId: 'local',
                    sourceMangaId: filePath
                });

                console.log('[LocalReader] Saved to local DB:', entry.title, 'Ch', entry.chapter);

                // Sync to AniList
                setSyncStatus('syncing');
                const synced = await syncMangaEntryToAniList(entry);
                setSyncStatus(synced ? 'synced' : 'error');

                // Also sync to MAL if authenticated
                if (malAuth.isAuthenticated && malAuth.accessToken) {
                    try {
                        const malResults = await malClient.searchManga(
                            malAuth.accessToken,
                            mapping.animeName,
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
                            console.log('[LocalReader] MAL progress synced:', chapterNumber);
                        }
                    } catch (malErr) {
                        console.error('[LocalReader] MAL sync failed:', malErr);
                    }
                }
            } catch (err) {
                console.error('[LocalReader] Sync error:', err);
                setSyncStatus('error');
            }
        };

        syncChapter();
    }, [scrollProgress, mapping, chapterNumber, malAuth]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (isFullscreen) {
                    toggleFullscreen();
                } else {
                    navigate(-1);
                }
            } else if (e.key === '+' || e.key === '=') {
                setZoom(prev => Math.min(prev + 10, 200));
            } else if (e.key === '-') {
                setZoom(prev => Math.max(prev - 10, 50));
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isFullscreen, navigate]);

    const toggleFullscreen = async () => {
        const appWindow = getCurrentWindow();
        const fullscreen = await appWindow.isFullscreen();
        await appWindow.setFullscreen(!fullscreen);
        setIsFullscreen(!fullscreen);
    };

    // Sync Status UI
    const getSyncStatusDisplay = () => {
        if (!mapping && syncStatus !== 'synced') return null;

        switch (syncStatus) {
            case 'tracking':
                return (
                    <div className="sync-status tracking">
                        <span className="sync-icon">📖</span>
                        <span>{Math.round(scrollProgress * 100)}%</span>
                        <div className="sync-progress-bar">
                            <div className="sync-progress-fill" style={{ width: `${(scrollProgress / SYNC_THRESHOLD) * 100}%` }} />
                        </div>
                    </div>
                );
            case 'saving':
                return <div className="sync-status saving"><span className="sync-icon">💾</span><span>Saving...</span></div>;
            case 'syncing':
                return <div className="sync-status syncing"><span className="sync-icon spinning">🔄</span><span>Syncing...</span></div>;
            case 'synced':
                return <div className="sync-status synced"><span className="sync-icon">✓</span><span>Synced</span></div>;
            case 'error':
                return <div className="sync-status error"><span className="sync-icon">⚠️</span><span>Sync failed</span></div>;
            default:
                return null;
        }
    };

    if (loading) {
        return (
            <div className="manga-reader-loading">
                <div className="loader"></div>
                <p>Loading {fileName}...</p>
                {loadingProgress.total > 0 && <p className="loading-progress">Page {loadingProgress.current} / {loadingProgress.total}</p>}
            </div>
        );
    }

    if (error) {
        return (
            <div className="manga-reader-error">
                <p>Error: {error}</p>
                <button onClick={() => navigate(-1)}>Go Back</button>
            </div>
        );
    }

    return (
        <div className="manga-reader" ref={containerRef}>
            {/* Top Controls */}
            <div className={`reader-controls-top ${showControls ? 'visible' : ''}`}>
                <button className="back-btn" onClick={() => navigate(-1)}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                </button>

                <div className="chapter-info">
                    <h1 className="manga-title">{mapping ? mapping.animeName : fileName}</h1>
                    <span className="chapter-number">
                        {chapterNumber ? `Chapter ${chapterNumber}` : `${pages.length} pages`}
                    </span>
                </div>

                <div className="reader-settings">
                    {getSyncStatusDisplay()}

                    <div className="zoom-controls" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.3)', padding: '4px 8px', borderRadius: '8px' }}>
                        <button className="control-btn" onClick={() => setZoom(prev => Math.max(prev - 10, 50))} title="Zoom Out">−</button>
                        <span className="zoom-level" style={{ minWidth: '40px', textAlign: 'center' }}>{zoom}%</span>
                        <button className="control-btn" onClick={() => setZoom(prev => Math.min(prev + 10, 200))} title="Zoom In">+</button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="reader-content vertical" onClick={() => setShowControls(prev => !prev)}>
                <div className="vertical-scroll" style={{ maxWidth: `${zoom}%`, width: '100%' }}>
                    <Virtuoso
                        ref={virtuosoRef}
                        style={{ height: '100%', width: '100%' }}
                        data={pages}
                        atBottomThreshold={200}
                        onScroll={handleScroll}
                        itemContent={(index: number, pageUrl: string) => (
                            <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                                {pageUrl ? (
                                    <img
                                        src={pageUrl}
                                        alt={`Page ${index + 1}`}
                                        className="page-image"
                                        style={{ width: '100%', height: 'auto', display: 'block' }}
                                        loading="lazy"
                                    />
                                ) : (
                                    <div className="page-placeholder" style={{ height: '600px', width: '100%', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
                                        Loading Page {index + 1}...
                                    </div>
                                )}
                            </div>
                        )}
                    />
                </div>
            </div>

            {/* Bottom Controls */}
            <div className={`reader-controls-bottom ${showControls ? 'visible' : ''}`}>
                {/* Page Indicator */}
                <div className="control-group center">
                    <div className="page-indicator">
                        <span>{Math.round(scrollProgress * 100)}%</span>
                        <span className="separator">•</span>
                        <span>{pages.length} Pages</span>
                    </div>
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

export default LocalFileReader;
