/**
 * ====================================================================
 * ANIME BROWSE PAGE
 * ====================================================================
 *
 * Browse anime from installed extension sources.
 * Similar to MangaBrowse but for anime sources.
 * ====================================================================
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimeExtensionManager, Anime } from '../services/AnimeExtensionManager';
import './AnimeBrowse.css';

function AnimeBrowse() {
    const navigate = useNavigate();

    const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Anime[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasSearched, setHasSearched] = useState(false);

    // Get all available anime sources
    const sources = useMemo(() => {
        return AnimeExtensionManager.getAllSources();
    }, []);

    // Get selected source
    const selectedSource = useMemo(() => {
        if (!selectedSourceId) return null;
        return AnimeExtensionManager.getSource(selectedSourceId) || null;
    }, [selectedSourceId]);

    // Auto-select first source if none selected
    useEffect(() => {
        if (!selectedSourceId && sources.length > 0) {
            setSelectedSourceId(sources[0].id);
        }
    }, [sources, selectedSourceId]);

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

    // No sources installed
    if (sources.length === 0) {
        return (
            <div className="anime-browse">
                <div className="anime-browse-empty">
                    <div className="empty-icon">📺</div>
                    <h2>No Anime Sources Installed</h2>
                    <p>Install anime extensions from Settings → Extensions to start browsing.</p>
                    <button
                        className="primary-btn"
                        onClick={() => navigate('/settings')}
                    >
                        Go to Settings
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="anime-browse">
            <div className="anime-browse-header">
                <h1>Browse Anime</h1>

                {/* Source Selector */}
                <div className="source-selector">
                    <label>Source:</label>
                    <select
                        value={selectedSourceId || ''}
                        onChange={(e) => {
                            setSelectedSourceId(e.target.value);
                            setSearchResults([]);
                            setHasSearched(false);
                        }}
                    >
                        {sources.map(source => (
                            <option key={source.id} value={source.id}>
                                {source.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Search Bar */}
            <div className="search-section">
                <div className="search-bar">
                    <input
                        type="text"
                        placeholder={`Search ${selectedSource?.name || 'anime'}...`}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                    <button
                        className="search-btn"
                        onClick={handleSearch}
                        disabled={isSearching || !searchQuery.trim()}
                    >
                        {isSearching ? 'Searching...' : 'Search'}
                    </button>
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
                        <div className="prompt-icon">🔍</div>
                        <p>Search for anime using the search bar above</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default AnimeBrowse;
