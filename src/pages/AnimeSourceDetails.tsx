/**
 * ====================================================================
 * ANIME SOURCE DETAILS PAGE
 * ====================================================================
 *
 * Shows anime details from an extension source with:
 * - Cover image, title, description
 * - Episode list
 * - Play button to watch episodes
 * - Save to library and AniList linking
 * ====================================================================
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AnimeExtensionManager, Anime, Episode } from '../services/AnimeExtensionManager';
import {
    getAnimeEntryBySourceId,
    addAnimeToLibrary,
    removeAnimeFromLibrary,
    linkAnimeToAniList,
    unlinkAnimeFromAniList,
    getAnimeLibraryCategories,
    AnimeLibraryCategory,
    LocalAnimeEntry
} from '../lib/localAnimeDb';
import { LinkIcon, PlayIcon } from '../components/ui/Icons';
import './AnimeSourceDetails.css';

function AnimeSourceDetails() {
    const { sourceId, animeId } = useParams<{ sourceId: string; animeId: string }>();
    const navigate = useNavigate();

    const [anime, setAnime] = useState<Anime | null>(null);
    const [episodes, setEpisodes] = useState<Episode[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

    // Library state
    const [localEntry, setLocalEntry] = useState<LocalAnimeEntry | null>(null);
    const [showLibraryDialog, setShowLibraryDialog] = useState(false);
    const [libraryCategories, setLibraryCategories] = useState<AnimeLibraryCategory[]>([]);
    const [selectedCategories, setSelectedCategories] = useState<string[]>(['default']);

    // Linking state
    const [showLinkDialog, setShowLinkDialog] = useState(false);
    const [linkSearchQuery, setLinkSearchQuery] = useState('');
    const [linkSearchResults, setLinkSearchResults] = useState<any[]>([]);
    const [linkSearching, setLinkSearching] = useState(false);

    // Refresh trigger
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const source = useMemo(() => {
        return sourceId ? AnimeExtensionManager.getSource(sourceId) : null;
    }, [sourceId]);

    const inLibrary = localEntry?.inLibrary ?? false;

    // Load local entry
    useEffect(() => {
        if (sourceId && animeId) {
            const entry = getAnimeEntryBySourceId(sourceId, decodeURIComponent(animeId));
            setLocalEntry(entry);
        }
    }, [sourceId, animeId, refreshTrigger]);

    // Load anime details and episodes
    useEffect(() => {
        if (!source || !animeId) return;

        const loadData = async () => {
            setLoading(true);
            setError(null);

            try {
                const decodedAnimeId = decodeURIComponent(animeId);
                const [animeData, episodesData] = await Promise.all([
                    source.getAnimeInfo(decodedAnimeId),
                    source.getEpisodes(decodedAnimeId),
                ]);

                setAnime(animeData);
                setEpisodes(episodesData);
            } catch (err) {
                console.error('Failed to load anime data:', err);
                setError(err instanceof Error ? err.message : 'Failed to load anime');
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [source, animeId]);

    // Sort episodes
    const sortedEpisodes = useMemo(() => {
        const sorted = [...episodes].sort((a, b) => {
            return sortOrder === 'asc' ? a.number - b.number : b.number - a.number;
        });
        return sorted;
    }, [episodes, sortOrder]);

    const handleEpisodeClick = (episode: Episode) => {
        if (sourceId && anime) {
            navigate(`/watch/${sourceId}/${encodeURIComponent(episode.id)}?animeId=${encodeURIComponent(animeId || '')}&title=${encodeURIComponent(anime.title)}&ep=${episode.number}`);
        }
    };

    const handlePlayFirst = () => {
        if (episodes.length > 0) {
            const firstEp = [...episodes].sort((a, b) => a.number - b.number)[0];
            handleEpisodeClick(firstEp);
        }
    };

    // Library handlers
    const handleToggleLibrary = () => {
        const cats = getAnimeLibraryCategories();
        setLibraryCategories(cats);

        if (inLibrary && localEntry?.categoryIds) {
            setSelectedCategories(localEntry.categoryIds);
        } else {
            setSelectedCategories(['default']);
        }

        setShowLibraryDialog(true);
    };

    const handleLibrarySave = () => {
        if (!anime || !sourceId || !animeId) return;

        const id = localEntry?.id || `${sourceId}_${animeId}`;

        addAnimeToLibrary(id, {
            title: anime.title,
            coverImage: anime.coverUrl,
            sourceId,
            sourceAnimeId: decodeURIComponent(animeId),
            description: anime.description,
            genres: anime.genres,
            type: anime.type,
            subOrDub: anime.subOrDub,
            releaseDate: anime.releaseDate,
            categoryIds: selectedCategories,
        });

        setShowLibraryDialog(false);
        setRefreshTrigger(prev => prev + 1);
    };

    const handleLibraryRemove = () => {
        if (localEntry) {
            removeAnimeFromLibrary(localEntry.id);
            setShowLibraryDialog(false);
            setRefreshTrigger(prev => prev + 1);
        }
    };

    // AniList linking handlers
    const handleOpenLinkDialog = () => {
        setLinkSearchQuery(anime?.title || '');
        setLinkSearchResults([]);
        setShowLinkDialog(true);
    };

    const handleLinkSearch = useCallback(async () => {
        if (!linkSearchQuery.trim()) return;

        setLinkSearching(true);
        try {
            // Use AniList GraphQL API to search for anime
            const query = `
                query ($search: String) {
                    Page(page: 1, perPage: 10) {
                        media(search: $search, type: ANIME) {
                            id
                            title { romaji english native }
                            coverImage { large }
                            episodes
                            format
                            status
                        }
                    }
                }
            `;

            const response = await fetch('https://graphql.anilist.co', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query, variables: { search: linkSearchQuery } })
            });

            const data = await response.json();
            setLinkSearchResults(data?.data?.Page?.media || []);
        } catch (err) {
            console.error('AniList search failed:', err);
            setLinkSearchResults([]);
        } finally {
            setLinkSearching(false);
        }
    }, [linkSearchQuery]);

    const handleLinkSelect = (anilistAnime: any) => {
        if (!sourceId || !animeId) return;

        linkAnimeToAniList(
            sourceId,
            decodeURIComponent(animeId),
            anilistAnime.id,
            anilistAnime.title.romaji || anilistAnime.title.english || anime?.title || '',
            anilistAnime.coverImage?.large,
            anilistAnime.episodes
        );

        setShowLinkDialog(false);
        setRefreshTrigger(prev => prev + 1);
    };

    const handleRemoveLink = () => {
        if (localEntry) {
            unlinkAnimeFromAniList(localEntry.id);
            setRefreshTrigger(prev => prev + 1);
        }
    };

    if (loading) {
        return (
            <div className="anime-source-details-loading">
                <div className="loader"></div>
                <p>Loading anime...</p>
            </div>
        );
    }

    if (error || !anime) {
        return (
            <div className="anime-source-details-error">
                <h2>Error</h2>
                <p>{error || 'Anime not found'}</p>
                <button onClick={() => navigate('/anime-browse')}>Back to Browse</button>
            </div>
        );
    }

    return (
        <div className="anime-source-details">
            {/* Hero Section */}
            <div className="hero-section">
                <div className="hero-bg" style={{ backgroundImage: `url(${anime.coverUrl})` }} />
                <div className="hero-content">
                    <img src={anime.coverUrl} alt={anime.title} className="cover-image" />
                    <div className="anime-info">
                        <span className="source-badge">
                            {source?.name || 'Unknown Source'}
                        </span>
                        {localEntry?.anilistId && (
                            <span className="linked-badge">
                                <LinkIcon size={12} />
                                Linked
                            </span>
                        )}
                        <h1 className="title">{anime.title}</h1>
                        <div className="meta">
                            {anime.releaseDate && (
                                <span className="release-date">{anime.releaseDate}</span>
                            )}
                            {anime.status && (
                                <span className={`status ${anime.status}`}>
                                    {anime.status.charAt(0).toUpperCase() + anime.status.slice(1)}
                                </span>
                            )}
                            {anime.type && (
                                <span className="type">{anime.type}</span>
                            )}
                            {anime.totalEpisodes && (
                                <span className="total-eps">{anime.totalEpisodes} Episodes</span>
                            )}
                        </div>
                        {anime.genres && anime.genres.length > 0 && (
                            <div className="genres">
                                {anime.genres.slice(0, 6).map((genre) => (
                                    <span key={genre} className="genre-tag">
                                        {genre}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* AniList Tracking Section */}
                        <div className="tracking-section">
                            {localEntry?.anilistId ? (
                                <div className="tracking-linked">
                                    {localEntry.coverImage && (
                                        <img
                                            src={localEntry.coverImage}
                                            alt={localEntry.title}
                                            style={{ width: '40px', height: '56px', objectFit: 'cover', borderRadius: '4px' }}
                                        />
                                    )}
                                    <div className="tracking-info">
                                        <span className="tracking-label">Linked to AniList</span>
                                        <span className="tracking-title">{localEntry.title}</span>
                                        {localEntry.episode > 0 && (
                                            <span className="tracking-progress">Ep {localEntry.episode}</span>
                                        )}
                                    </div>
                                    <button
                                        onClick={handleRemoveLink}
                                        className="tracking-unlink-btn"
                                        title="Unlink"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="18" y1="6" x2="6" y2="18"></line>
                                            <line x1="6" y1="6" x2="18" y2="18"></line>
                                        </svg>
                                    </button>
                                </div>
                            ) : (
                                <button onClick={handleOpenLinkDialog} className="tracking-link-btn">
                                    <LinkIcon size={16} />
                                    Track on AniList
                                </button>
                            )}
                        </div>

                        <div className="action-buttons">
                            <button className="primary-btn" onClick={handlePlayFirst}>
                                <PlayIcon size={20} fill="currentColor" />
                                {localEntry && localEntry.episode > 0 ? `Continue Ep ${localEntry.episode + 1}` : "Start Watching"}
                            </button>

                            {/* Library Button */}
                            <button
                                className={`secondary-btn ${inLibrary ? 'library-active' : ''}`}
                                onClick={handleToggleLibrary}
                                title={inLibrary ? "Remove from Library" : "Add to Library"}
                                style={inLibrary ? {
                                    borderColor: 'var(--color-zen-accent)',
                                    color: 'var(--color-zen-accent)',
                                    background: 'rgba(180, 162, 246, 0.1)',
                                    padding: '0.75rem',
                                    aspectRatio: '1',
                                    display: 'flex',
                                    justifyContent: 'center'
                                } : {}}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill={inLibrary ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                                </svg>
                                {!inLibrary && "Save"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Description */}
            {anime.description && (
                <div className="description-section">
                    <h2>Synopsis</h2>
                    <p>{anime.description}</p>
                </div>
            )}

            {/* Episodes Section */}
            <div className="episodes-section">
                <div className="episodes-header">
                    <h2>Episodes ({episodes.length})</h2>
                    <div className="episode-controls">
                        <button
                            className="control-btn"
                            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                            title={sortOrder === 'desc' ? 'Sorted: Newest First' : 'Sorted: Oldest First'}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                {sortOrder === 'desc' ? (
                                    <><path d="M3 8L7 4L11 8" /><path d="M7 4V20" /><path d="M13 12H21" /><path d="M13 16H19" /><path d="M13 20H17" /><path d="M13 8H21" /></>
                                ) : (
                                    <><path d="M3 16L7 20L11 16" /><path d="M7 20V4" /><path d="M13 8H21" /><path d="M13 12H19" /><path d="M13 16H17" /><path d="M13 20H21" /></>
                                )}
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="episode-list">
                    {sortedEpisodes.length === 0 ? (
                        <div className="no-episodes">No episodes found</div>
                    ) : (
                        sortedEpisodes.map((episode) => (
                            <div
                                key={episode.id}
                                className="episode-item"
                                onClick={() => handleEpisodeClick(episode)}
                            >
                                {episode.image && (
                                    <img
                                        src={episode.image}
                                        alt={`Episode ${episode.number}`}
                                        className="episode-thumb"
                                    />
                                )}
                                <div className="episode-info">
                                    <span className="episode-number">
                                        Episode {episode.number}
                                    </span>
                                    {episode.title && (
                                        <span className="episode-title">{episode.title}</span>
                                    )}
                                    {episode.isFiller && (
                                        <span className="filler-badge">Filler</span>
                                    )}
                                </div>
                                <div className="play-icon">
                                    <PlayIcon size={20} fill="currentColor" />
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Library Dialog */}
            {showLibraryDialog && (
                <div className="modal-overlay" onClick={() => setShowLibraryDialog(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h3>{inLibrary ? 'Update Library' : 'Add to Library'}</h3>

                        <div className="category-selector">
                            <p className="category-label">Categories:</p>
                            {libraryCategories.map((cat) => (
                                <label key={cat.id} className="category-checkbox">
                                    <input
                                        type="checkbox"
                                        checked={selectedCategories.includes(cat.id)}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedCategories([...selectedCategories, cat.id]);
                                            } else {
                                                setSelectedCategories(selectedCategories.filter(id => id !== cat.id));
                                            }
                                        }}
                                    />
                                    {cat.name}
                                </label>
                            ))}
                        </div>

                        <div className="modal-actions">
                            {inLibrary && (
                                <button className="danger-btn" onClick={handleLibraryRemove}>
                                    Remove from Library
                                </button>
                            )}
                            <button className="secondary-btn" onClick={() => setShowLibraryDialog(false)}>
                                Cancel
                            </button>
                            <button className="primary-btn" onClick={handleLibrarySave}>
                                {inLibrary ? 'Update' : 'Add to Library'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Link Dialog */}
            {showLinkDialog && (
                <div className="modal-overlay" onClick={() => setShowLinkDialog(false)}>
                    <div className="modal-content link-dialog" onClick={(e) => e.stopPropagation()}>
                        <h3>Link to AniList</h3>
                        <p className="link-subtitle">Search for this anime on AniList to sync progress</p>

                        <div className="link-search-bar">
                            <input
                                type="text"
                                value={linkSearchQuery}
                                onChange={(e) => setLinkSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleLinkSearch()}
                                placeholder="Search AniList..."
                            />
                            <button onClick={handleLinkSearch} disabled={linkSearching}>
                                {linkSearching ? 'Searching...' : 'Search'}
                            </button>
                        </div>

                        <div className="link-results">
                            {linkSearchResults.map((result) => (
                                <div
                                    key={result.id}
                                    className="link-result-item"
                                    onClick={() => handleLinkSelect(result)}
                                >
                                    <img src={result.coverImage?.large} alt={result.title.romaji} />
                                    <div className="link-result-info">
                                        <span className="link-result-title">
                                            {result.title.romaji || result.title.english}
                                        </span>
                                        <span className="link-result-meta">
                                            {result.format} • {result.episodes ? `${result.episodes} eps` : 'Unknown eps'} • {result.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                            {linkSearchResults.length === 0 && !linkSearching && linkSearchQuery && (
                                <p className="no-results">No results found. Try a different search term.</p>
                            )}
                        </div>

                        <div className="modal-actions">
                            <button className="secondary-btn" onClick={() => setShowLinkDialog(false)}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AnimeSourceDetails;
