/**
 * ====================================================================
 * MANGA DETAILS PAGE (Source-based)
 * ====================================================================
 *
 * Shows manga details from a source with:
 * - Cover image, title, description
 * - Chapter list with reading progress
 * - Search/browse chapters
 * ====================================================================
 */

import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ExtensionManager, Manga, Chapter } from '../services/ExtensionManager';
import './MangaSourceDetails.css';

function MangaSourceDetails() {
    const { sourceId, mangaId } = useParams<{ sourceId: string; mangaId: string }>();
    const navigate = useNavigate();

    const [manga, setManga] = useState<Manga | null>(null);
    const [chapters, setChapters] = useState<Chapter[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const source = useMemo(() => {
        return sourceId ? ExtensionManager.getSource(sourceId) : null;
    }, [sourceId]);

    // Load manga details and chapters
    useEffect(() => {
        if (!source || !mangaId) return;

        const loadData = async () => {
            setLoading(true);
            setError(null);

            try {
                const [mangaData, chaptersData] = await Promise.all([
                    source.getMangaDetails(mangaId),
                    source.getChapters(mangaId),
                ]);
                setManga(mangaData);
                setChapters(chaptersData);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load manga');
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [source, mangaId]);

    const filteredChapters = useMemo(() => {
        if (!searchQuery.trim()) return chapters;
        const query = searchQuery.toLowerCase();
        return chapters.filter(
            (ch) =>
                ch.number.toString().includes(query) ||
                ch.title?.toLowerCase().includes(query) ||
                ch.scanlator?.toLowerCase().includes(query)
        );
    }, [chapters, searchQuery]);

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
                        <div className="action-buttons">
                            <button className="primary-btn" onClick={handleReadFirst}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
                                </svg>
                                Start Reading
                            </button>
                            <button className="secondary-btn" onClick={handleReadLatest}>
                                Latest Chapter
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
                    <div className="chapter-search">
                        <input
                            type="text"
                            placeholder="Search chapters..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="chapter-list">
                    {filteredChapters.length === 0 ? (
                        <div className="no-chapters">No chapters found</div>
                    ) : (
                        filteredChapters.map((chapter) => (
                            <div
                                key={chapter.id}
                                className="chapter-item"
                                onClick={() => handleChapterClick(chapter)}
                            >
                                <div className="chapter-main">
                                    <span className="chapter-number">
                                        Chapter {chapter.number}
                                    </span>
                                    {chapter.title && (
                                        <span className="chapter-title">{chapter.title}</span>
                                    )}
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
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

export default MangaSourceDetails;
