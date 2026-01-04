/**
 * Local File Reader Page
 * 
 * Handles viewing local manga files (CBZ, PDF).
 * Reuses styling from MangaReader for consistent UX.
 */

import { useState, useEffect, useRef } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { getCbzInfo } from '../services/localFileReader';
import { loadPdf, renderPdfPage } from '../lib/pdfReader';
import './MangaReader.css';

function LocalFileReader() {
    const [searchParams] = useSearchParams();
    const filePath = searchParams.get('path') || '';
    const fileName = filePath.split(/[/\\]/).pop() || 'Unknown';
    const navigate = useNavigate();

    const [pages, setPages] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0 });
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [zoom, setZoom] = useState(100);

    const containerRef = useRef<HTMLDivElement>(null);

    const [showControls, setShowControls] = useState(true);

    // Load file pages
    useEffect(() => {
        // Flag to track if the effect is still active
        // This prevents state updates if the component unmounts or if filePath changes
        let isMounted = true;

        if (!filePath) {
            setError('No file path provided');
            setLoading(false);
            return;
        }

        const loadFile = async () => {
            setLoading(true);
            setError(null);
            setPages([]); // Reset pages

            try {
                // Moved getFileType here to avoid re-importing in the new CBZ logic
                const getFileType = (path: string): 'cbz' | 'pdf' | 'unsupported' => {
                    const ext = path.split('.').pop()?.toLowerCase();
                    if (ext === 'cbz') return 'cbz';
                    if (ext === 'pdf') return 'pdf';
                    return 'unsupported';
                };
                const fileType = getFileType(filePath);

                if (fileType === 'cbz') {
                    // Load CBZ file info first
                    const info = await getCbzInfo(filePath);
                    if (!isMounted) return;

                    // Generate URLs via custom protocol
                    // Format: manga://localhost/<encoded_path>/<encoded_page_name>
                    const pageUrls = info.pages.map(pageName => {
                        const encodedPath = encodeURIComponent(filePath);
                        const encodedPage = encodeURIComponent(pageName);
                        return `manga://localhost/${encodedPath}/${encodedPage}`;
                    });

                    setPages(pageUrls);
                    setLoading(false);

                } else if (fileType === 'pdf') {
                    // Load PDF document
                    const pdfDoc = await loadPdf(`file://${filePath}`);
                    if (!isMounted) return;

                    // Initialize placeholders
                    const placeholders = new Array(pdfDoc.pageCount).fill('');
                    setPages(placeholders);
                    setLoading(false);

                    const currentPages = [...placeholders];
                    const UPDATE_BATCH_SIZE = 3; // PDFs are slower to render

                    // Load pages progressively
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

        // Cleanup function
        return () => {
            isMounted = false;
        };
    }, [filePath]);

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

    if (loading) {
        return (
            <div className="manga-reader-loading">
                <div className="loader"></div>
                <p>Loading {fileName}...</p>
                {loadingProgress.total > 0 && (
                    <p className="loading-progress">
                        Page {loadingProgress.current} / {loadingProgress.total}
                    </p>
                )}
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
                    <h1 className="manga-title">{fileName}</h1>
                    <span className="chapter-number">
                        {pages.length} pages
                    </span>
                </div>

                <div className="reader-settings">
                    <button className="control-btn" onClick={() => setZoom(prev => Math.max(prev - 10, 50))}>−</button>
                    <span className="zoom-level">{zoom}%</span>
                    <button className="control-btn" onClick={() => setZoom(prev => Math.min(prev + 10, 200))}>+</button>
                </div>
            </div>

            {/* Main Content */}
            <div className="reader-content vertical" onClick={() => setShowControls(prev => !prev)}>
                <div className="vertical-scroll" style={{ maxWidth: `${zoom}%`, width: '100%' }}>
                    <Virtuoso
                        style={{ height: '100%', width: '100%' }}
                        data={pages}
                        itemContent={(index: number, pageUrl: string) => (
                            <div style={{ display: 'flex', justifyContent: 'center', width: '100%', minHeight: '200px' }}>
                                {pageUrl ? (
                                    <img
                                        src={pageUrl}
                                        alt={`Page ${index + 1}`}
                                        className="page-image"
                                        style={{ width: '100%', minHeight: '200px', display: 'block' }}
                                        loading="lazy"
                                    />
                                ) : (
                                    <div
                                        className="page-placeholder"
                                        style={{
                                            height: '800px',
                                            width: '100%',
                                            background: '#1a1a1a',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#666',
                                            marginBottom: '10px'
                                        }}
                                    >
                                        Loading Page {index + 1}...
                                    </div>
                                )}
                            </div>
                        )}
                    />
                </div>
            </div>

            {/* Bottom Controls (Fullscreen) */}
            <div className={`reader-controls-bottom ${showControls ? 'visible' : ''}`}>
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
