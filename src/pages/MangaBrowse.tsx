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
import { SearchIcon } from '../components/ui/Icons';
import { Dropdown } from '../components/ui/Dropdown';
import './MangaBrowse.css';

function MangaBrowse() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    // Get all available sources - use state so it updates when extensions change
    const [sources, setSources] = useState(() => ExtensionManager.getAllSources());

    // Refresh sources when component mounts (extensions may have been installed)
    useEffect(() => {
        const initAndRefresh = async () => {
            if (!ExtensionManager.isInitialized()) {
                await ExtensionManager.initialize();
            }
            refreshSources();
        };

        const refreshSources = () => {
            const newSources = ExtensionManager.getAllSources();
            console.log('[MangaBrowse] Refreshing sources, found:', newSources.length);
            setSources(newSources);
        };

        // Initial load
        initAndRefresh();

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
                {/* Search Bar */}
                <div className="search-bar" style={{ flex: 1 }}>
                    <SearchIcon size={20} />
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

                {/* Source Selector Dropdown */}
                {sources.length > 0 && (
                    <div style={{ marginLeft: 'auto' }}>
                        <Dropdown
                            value={currentSourceId}
                            options={sources.map(s => ({
                                value: s.id,
                                label: s.name,
                                icon: s.iconUrl ? <img src={s.iconUrl} alt="" style={{ width: 16, height: 16, borderRadius: 2 }} /> : undefined
                            }))}
                            onChange={(val) => handleSourceChange(val)}
                            className="w-48"
                        />
                    </div>
                )}
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
                        <div className="empty-icon text-white/20 mb-4">🔌</div>
                        <h3>No Manga Extensions Active</h3>
                        <p>Loading extensions... or none are installed.</p>
                        <p style={{ color: 'var(--color-text-muted)', marginTop: '8px' }}>
                            Go to Settings to manage extensions.
                        </p>
                        <button
                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg mt-4"
                            onClick={() => navigate('/settings')}
                        >
                            Manage Extensions
                        </button>
                    </div>
                ) : !query.trim() && !loading ? (
                    <div className="browse-empty">
                        <div className="empty-icon text-white/20 mb-4">
                            <SearchIcon size={64} />
                        </div>
                        <h3>Search for manga</h3>
                        <p>Enter a title to search on {currentSource?.name || 'source'}...</p>
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
