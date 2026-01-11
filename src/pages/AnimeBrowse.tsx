/**
 * ====================================================================
 * ANIME BROWSE PAGE
 * ====================================================================
 *
 * Browse anime from installed extension sources OR use the web browser.
 * Includes tabs for switching between extensions and web browser mode.
 * ====================================================================
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimeExtensionManager, Anime } from '../services/AnimeExtensionManager';
import './AnimeBrowse.css';

// Preset anime streaming sites with official icons
const PRESET_SITES = [
    { name: 'HiAnime', url: 'https://hianime.to', icon: 'https://hianime.to/favicon.ico' },
    { name: 'AnimePahe', url: 'https://animepahe.si', icon: 'https://animepahe.si/favicon.ico' },
    { name: '9Anime', url: 'https://9anime.org.lv', icon: 'https://9anime.org.lv/favicon.ico' },
    { name: 'AnimeParadise', url: 'https://animeparadise.moe', icon: 'https://animeparadise.moe/favicon.ico' },
    { name: 'Gogoanime', url: 'https://anitaku.so', icon: 'https://anitaku.so/img/icon/logo.png' },
];

function AnimeBrowse() {
    const navigate = useNavigate();
    const iframeRef = useRef<HTMLIFrameElement>(null);

    // Tab mode: 'extensions' or 'browser'
    const [activeTab, setActiveTab] = useState<'extensions' | 'browser'>('browser');

    // Extension browsing state
    const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Anime[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasSearched, setHasSearched] = useState(false);

    // Web browser state
    const [browserUrl, setBrowserUrl] = useState('');
    const [inputUrl, setInputUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPresets, setShowPresets] = useState(true);

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

    // Browser navigation
    const navigateToUrl = (targetUrl: string) => {
        let formattedUrl = targetUrl.trim();
        if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
            formattedUrl = 'https://' + formattedUrl;
        }
        setBrowserUrl(formattedUrl);
        setInputUrl(formattedUrl);
        setIsLoading(true);
        setShowPresets(false);
    };

    const handleBrowserSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (inputUrl.trim()) {
            navigateToUrl(inputUrl);
        }
    };

    const goHome = () => {
        setBrowserUrl('');
        setInputUrl('');
        setShowPresets(true);
    };

    const handleIframeLoad = () => {
        setIsLoading(false);
    };

    return (
        <div className="anime-browse">
            <div className="anime-browse-header">
                <h1>Browse Anime</h1>

                {/* Tab Switcher */}
                <div className="browse-tabs">
                    <button
                        className={`browse-tab ${activeTab === 'browser' ? 'active' : ''}`}
                        onClick={() => setActiveTab('browser')}
                    >
                        🌐 Web Browser
                    </button>
                    <button
                        className={`browse-tab ${activeTab === 'extensions' ? 'active' : ''}`}
                        onClick={() => setActiveTab('extensions')}
                    >
                        🔌 Extensions {sources.length > 0 && `(${sources.length})`}
                    </button>
                </div>
            </div>

            {/* EXTENSIONS TAB */}
            {activeTab === 'extensions' && (
                <>
                    {sources.length === 0 ? (
                        <div className="anime-browse-empty">
                            <div className="empty-icon">📺</div>
                            <h2>No Anime Sources Installed</h2>
                            <p>Install anime extensions from Settings → Extensions to use this feature.</p>
                            <p style={{ color: 'var(--color-text-muted)', marginTop: '8px' }}>
                                Or use the Web Browser tab to watch directly from streaming sites.
                            </p>
                            <button
                                className="primary-btn"
                                onClick={() => navigate('/settings')}
                            >
                                Go to Settings
                            </button>
                        </div>
                    ) : (
                        <>
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
                        </>
                    )}
                </>
            )}

            {/* WEB BROWSER TAB */}
            {activeTab === 'browser' && (
                <div className="browser-container">
                    {/* Browser Controls */}
                    <div className="browser-bar">
                        <form className="browser-url-form" onSubmit={handleBrowserSubmit}>
                            <button
                                type="button"
                                className="browser-nav-btn"
                                onClick={goHome}
                                title="Home"
                            >
                                🏠
                            </button>
                            <input
                                type="text"
                                value={inputUrl}
                                onChange={(e) => setInputUrl(e.target.value)}
                                placeholder="Enter URL or click a site below..."
                                className="browser-url-input"
                            />
                            <button type="submit" className="browser-go-btn">
                                Go
                            </button>
                        </form>
                        {isLoading && <span className="browser-loading">Loading...</span>}
                    </div>

                    {/* Browser Content */}
                    <div className="browser-content">
                        {showPresets ? (
                            <div className="presets-container">
                                <h2 className="presets-title">Anime Streaming Sites</h2>
                                <p className="presets-subtitle">
                                    Click any site to start watching anime directly
                                </p>
                                <div className="presets-grid">
                                    {PRESET_SITES.map((site) => (
                                        <button
                                            key={site.name}
                                            className="preset-card"
                                            onClick={() => navigateToUrl(site.url)}
                                        >
                                            <img
                                                src={site.icon}
                                                alt={site.name}
                                                className="preset-icon-img"
                                                onError={(e) => {
                                                    e.currentTarget.style.display = 'none';
                                                }}
                                            />
                                            <span className="preset-name">{site.name}</span>
                                            <span className="preset-url">{site.url.replace('https://', '')}</span>
                                        </button>
                                    ))}
                                </div>
                                <p className="presets-note">
                                    💡 You can also type any URL in the address bar above
                                </p>
                            </div>
                        ) : (
                            <iframe
                                ref={iframeRef}
                                src={browserUrl}
                                className="browser-frame"
                                onLoad={handleIframeLoad}
                                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation"
                                allow="fullscreen; autoplay; encrypted-media"
                            />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default AnimeBrowse;
