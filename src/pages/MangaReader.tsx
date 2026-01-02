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
 * ====================================================================
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ExtensionManager, Page, Chapter, Manga } from '../services/ExtensionManager';
import './MangaReader.css';

type ReadingMode = 'vertical' | 'single' | 'double';

function MangaReader() {
    const { sourceId, chapterId } = useParams<{ sourceId: string; chapterId: string }>();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

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

    const readerRef = useRef<HTMLDivElement>(null);
    const hideControlsTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Load pages when chapter changes
    useEffect(() => {
        if (!sourceId || !chapterId) return;

        const loadChapter = async () => {
            setLoading(true);
            setError(null);

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

    // Auto-hide controls
    useEffect(() => {
        const handleMouseMove = () => {
            setShowControls(true);
            if (hideControlsTimeout.current) {
                clearTimeout(hideControlsTimeout.current);
            }
            hideControlsTimeout.current = setTimeout(() => {
                setShowControls(false);
            }, 3000);
        };

        const reader = readerRef.current;
        if (reader) {
            reader.addEventListener('mousemove', handleMouseMove);
        }

        return () => {
            if (reader) {
                reader.removeEventListener('mousemove', handleMouseMove);
            }
            if (hideControlsTimeout.current) {
                clearTimeout(hideControlsTimeout.current);
            }
        };
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
            <div className={`reader-content ${readingMode}`}>
                {readingMode === 'vertical' ? (
                    <div className="vertical-scroll">
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
                <button
                    className="chapter-nav-btn"
                    onClick={goToPrevChapter}
                    disabled={!currentChapter || chapters.findIndex((c) => c.id === currentChapter?.id) >= chapters.length - 1}
                >
                    ← Previous Chapter
                </button>

                {readingMode === 'single' && (
                    <div className="page-indicator">
                        <span>{currentPage + 1}</span>
                        <span className="separator">/</span>
                        <span>{pages.length}</span>
                    </div>
                )}

                <button
                    className="chapter-nav-btn"
                    onClick={goToNextChapter}
                    disabled={!currentChapter || chapters.findIndex((c) => c.id === currentChapter?.id) <= 0}
                >
                    Next Chapter →
                </button>
            </div>
        </div>
    );
}

export default MangaReader;
