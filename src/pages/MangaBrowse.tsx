/**
 * ====================================================================
 * MANGA BROWSE PAGE
 * ====================================================================
 *
 * Allows users to search and browse manga from available sources.
 * This is the entry point for discovering new manga to read.
 * ====================================================================
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ExtensionManager, Manga } from '../services/ExtensionManager';
import './MangaBrowse.css';

function MangaBrowse() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    // Get all available sources - use state so it updates when extensions change
    const [sources, setSources] = useState(() => ExtensionManager.getAllSources());

    // Refresh sources when component mounts (extensions may have been installed)
    useEffect(() => {
        const refreshSources = () => {
            const newSources = ExtensionManager.getAllSources();
            console.log('[MangaBrowse] Refreshing sources, found:', newSources.length);
            setSources(newSources);
        };

        // Initial load
        refreshSources();

        // Set up a listener for extension changes (polling for now)
        // In a real app, you'd use an event emitter pattern
        const interval = setInterval(refreshSources, 2000);

        return () => clearInterval(interval);
    }, []);

    // Current source (default to first available)
    const currentSourceId = searchParams.get('source') || sources[0]?.id || '';
    const currentSource = useMemo(
        () => ExtensionManager.getSource(currentSourceId),
        [currentSourceId, sources] // Re-compute when sources change
    );

    const [query, setQuery] = useState(searchParams.get('q') || '');
    const [results, setResults] = useState<Manga[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(false);
    const [page, setPage] = useState(1);

    // Search when source or query changes
    useEffect(() => {
        if (!currentSource) return;

        const doSearch = async () => {
            // Only search if there's a query (remove this check if you want to show popular/latest by default)
            if (!query.trim()) {
                setResults([]);
                return;
            }

            setLoading(true);
            setError(null);

            try {
                const result = await currentSource.search({
                    query: query.trim(),
                    page: 1,
                });
                setResults(result.manga);
                setHasMore(result.hasNextPage);
                setPage(1);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Search failed');
                setResults([]);
            } finally {
                setLoading(false);
            }
        };

        // Debounce search
        const timeoutId = setTimeout(doSearch, 300);
        return () => clearTimeout(timeoutId);
    }, [currentSource, query]);

    const loadMore = async () => {
        if (!currentSource || !hasMore || loading) return;

        setLoading(true);
        try {
            const result = await currentSource.search({
                query: query.trim(),
                page: page + 1,
            });
            setResults((prev) => [...prev, ...result.manga]);
            setHasMore(result.hasNextPage);
            setPage((p) => p + 1);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load more');
        } finally {
            setLoading(false);
        }
    };

    const handleSourceChange = (sourceId: string) => {
        setSearchParams({ source: sourceId, q: query });
        setResults([]);
        setPage(1);
    };

    const handleMangaClick = (manga: Manga) => {
        navigate(`/manga/${currentSourceId}/${manga.id}`);
    };

    return (
        <div className="manga-browse">
            {/* Header */}
            <div className="browse-header">
                <h1>Browse Manga</h1>
                <p className="subtitle">Search and discover manga from available sources</p>
            </div>

            {/* Controls */}
            <div className="browse-controls">
                {/* Source Selector - Only show if multiple sources */}
                {sources.length > 1 && (
                    <div className="source-selector">
                        {sources.map((source) => (
                            <button
                                key={source.id}
                                className={`source-btn ${source.id === currentSourceId ? 'active' : ''}`}
                                onClick={() => handleSourceChange(source.id)}
                            >
                                {source.iconUrl && (
                                    <img src={source.iconUrl} alt="" className="source-icon" />
                                )}
                                {source.name}
                            </button>
                        ))}
                    </div>
                )}

                {/* Search Bar */}
                <div className="search-bar">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={`Search on ${currentSource?.name || 'source'}...`}
                    />
                    {query && (
                        <button className="clear-btn" onClick={() => setQuery('')}>
                            ×
                        </button>
                    )}
                </div>
            </div>

            {/* Error State */}
            {error && (
                <div className="browse-error">
                    <p>{error}</p>
                </div>
            )}

            {/* Results */}
            <div className="browse-results">
                {sources.length === 0 ? (
                    <div className="browse-empty">
                        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                        </svg>
                        <h3>No Extensions Loaded</h3>
                        <p>No active manga sources found. Extensions may have failed to load.</p>
                        <button
                            className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg mt-4"
                            onClick={() => navigate('/settings')}
                        >
                            Manage Extensions
                        </button>
                    </div>
                ) : !query.trim() && !loading ? (
                    <div className="browse-empty">
                        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8"></circle>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        </svg>
                        <h3>Search for manga</h3>
                        <p>Enter a title to search on {currentSource?.name}</p>
                    </div>
                ) : null}

                {results.length > 0 && (
                    <div className="manga-grid">
                        {results.map((manga) => (
                            <div
                                key={manga.id}
                                className="manga-card"
                                onClick={() => handleMangaClick(manga)}
                            >
                                <div className="card-cover">
                                    <img
                                        src={manga.coverUrl}
                                        alt={manga.title}
                                        loading="lazy"
                                    />
                                    <div className="card-overlay">
                                        <span className="read-btn">Read</span>
                                    </div>
                                </div>
                                <div className="card-info">
                                    <h3 className="card-title">{manga.title}</h3>
                                    {manga.author && (
                                        <p className="card-author">{manga.author}</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Load More */}
                {hasMore && !loading && (
                    <div className="load-more-container">
                        <button className="load-more-btn" onClick={loadMore}>
                            Load More
                        </button>
                    </div>
                )}

                {/* Loading */}
                {loading && (
                    <div className="browse-loading">
                        <div className="loader"></div>
                        <p>Searching...</p>
                    </div>
                )}

                {/* No Results */}
                {sources.length > 0 && query.trim() && !loading && results.length === 0 && !error && (
                    <div className="browse-empty">
                        <h3>No results found</h3>
                        <p>Try a different search term</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default MangaBrowse;
