/**
 * ====================================================================
 * ANIME BROWSE PAGE
 * ====================================================================
 *
 * Browse and search anime from installed extension sources.
 * ====================================================================
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimeExtensionManager, Anime } from '../services/AnimeExtensionManager';
import { SearchIcon } from '../components/ui/Icons';
import { Dropdown } from '../components/ui/Dropdown';
import './AnimeBrowse.css';

export default function AnimeBrowse() {
    const navigate = useNavigate();

    // Extension browsing state
    const [sources, setSources] = useState<any[]>(() => AnimeExtensionManager.getAllSources());
    const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Anime[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasSearched, setHasSearched] = useState(false);

    // Initialize manager and refresh sources
    useEffect(() => {
        const initAndRefresh = async () => {
            if (!AnimeExtensionManager.isInitialized()) {
                await AnimeExtensionManager.initialize();
            }
            refreshSources();
        };

        const refreshSources = () => {
            const newSources = AnimeExtensionManager.getAllSources();
            setSources(newSources);

            // Auto-select first source if none selected
            if (!selectedSourceId && newSources.length > 0) {
                // Pre-select HiAnime if available, otherwise first one
                const hianime = newSources.find(s => s.id === 'hianime');
                setSelectedSourceId(hianime ? hianime.id : newSources[0].id);
            }
        };

        // Initial load
        initAndRefresh();

        // Set up a listener for extension changes (polling for now)
        const interval = setInterval(refreshSources, 2000);
        return () => clearInterval(interval);
    }, [selectedSourceId]);

    // Get selected source object
    const selectedSource = useMemo(() => {
        if (!selectedSourceId) return null;
        return AnimeExtensionManager.getSource(selectedSourceId) || null;
    }, [selectedSourceId, sources]);

    // Handle search
    const handleSearch = async () => {
        if (!selectedSource || !searchQuery.trim()) return;

        setIsSearching(true);
        setError(null);
        setHasSearched(true);

        try {
            const result = await selectedSource.search({ query: searchQuery.trim() });
            setSearchResults(result.anime);
        } catch (err) {
            console.error('[AnimeBrowse] Search failed:', err);
            setError(err instanceof Error ? err.message : 'Search failed');
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    };

    // Handle anime click
    const handleAnimeClick = (anime: Anime) => {
        if (selectedSourceId) {
            navigate(`/anime-source/${selectedSourceId}/${encodeURIComponent(anime.id)}`);
        }
    };

    return (
        <div className="anime-browse">
            <div className="anime-browse-header">
                <h1>Browse Anime</h1>
                <p className="subtitle">Search and discover anime from available sources</p>
            </div>

            {sources.length === 0 ? (
                <div className="anime-browse-empty">
                    <div className="empty-icon">🔌</div>
                    <h2>No Anime Extensions Active</h2>
                    <p>Loading extensions... or none are installed.</p>
                    <p style={{ color: 'var(--color-text-muted)', marginTop: '8px' }}>
                        Go to Settings to manage extensions.
                    </p>
                    <button
                        className="primary-btn"
                        onClick={() => navigate('/settings')}
                    >
                        Manage Extensions
                    </button>
                    <button
                        className="secondary-btn"
                        style={{ marginTop: '12px', background: 'transparent', border: '1px solid var(--color-border-subtle)' }}
                        onClick={() => window.location.reload()}
                    >
                        Reload Page
                    </button>
                </div>
            ) : (
                <>
                    {/* Search Section */}
                    <div className="anime-controls">
                        <div className="search-bar">
                            <input
                                type="text"
                                placeholder={`Search for anime...`}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            />
                            {searchQuery && (
                                <button className="clear-btn" onClick={() => setSearchQuery('')}>
                                    ×
                                </button>
                            )}
                        </div>
                        <button className="search-icon-btn" onClick={handleSearch} disabled={isSearching || !searchQuery.trim()}>
                            <SearchIcon size={20} />
                        </button>

                        {/* Source Selector Dropdown */}
                        <div style={{ marginLeft: 'auto' }}>
                            <Dropdown
                                value={selectedSourceId || ''}
                                options={sources.map(s => ({
                                    value: s.id,
                                    label: s.name,
                                    icon: s.iconUrl ? <img src={s.iconUrl} alt="" style={{ width: 16, height: 16, borderRadius: 2 }} /> : undefined
                                }))}
                                onChange={(val) => setSelectedSourceId(val)}
                                className="w-48"
                            />
                        </div>
                    </div>

                    {/* Error Display */}
                    {error && (
                        <div className="error-message">
                            <span>⚠️ {error}</span>
                        </div>
                    )}

                    {/* Search Results */}
                    <div className="anime-results">
                        {isSearching ? (
                            <div className="loading-container">
                                <div className="loader"></div>
                                <p>Searching...</p>
                            </div>
                        ) : searchResults.length > 0 ? (
                            <div className="anime-grid">
                                {searchResults.map(anime => (
                                    <div
                                        key={anime.id}
                                        className="anime-card"
                                        onClick={() => handleAnimeClick(anime)}
                                    >
                                        <div className="anime-cover">
                                            <img
                                                src={anime.coverUrl}
                                                alt={anime.title}
                                                loading="lazy"
                                            />
                                            {anime.type && (
                                                <span className="anime-type">{anime.type}</span>
                                            )}
                                            {anime.subOrDub && (
                                                <span className={`anime-sub-dub ${anime.subOrDub}`}>
                                                    {anime.subOrDub.toUpperCase()}
                                                </span>
                                            )}
                                            <div className="card-overlay">
                                                <span className="play-btn">Play</span>
                                            </div>
                                        </div>
                                        <div className="anime-info">
                                            <h3 className="anime-title">{anime.title}</h3>
                                            {anime.releaseDate && (
                                                <span className="anime-date">{anime.releaseDate}</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : hasSearched ? (
                            <div className="no-results">
                                <p>No anime found for "{searchQuery}"</p>
                            </div>
                        ) : (
                            <div className="search-prompt">
                                <div className="prompt-icon text-white/20 mb-4">
                                    <SearchIcon size={64} />
                                </div>
                                <h3>Search for anime</h3>
                                <p>Enter a title to search on {selectedSource?.name || 'source'}...</p>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
