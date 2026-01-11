/**
 * ====================================================================
 * ANIME SOURCE DETAILS PAGE
 * ====================================================================
 *
 * Shows anime details from an extension source with:
 * - Cover image, title, description
 * - Episode list
 * - Play button to watch episodes
 * ====================================================================
 */

import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AnimeExtensionManager, Anime, Episode } from '../services/AnimeExtensionManager';
import './AnimeSourceDetails.css';

function AnimeSourceDetails() {
    const { sourceId, animeId } = useParams<{ sourceId: string; animeId: string }>();
    const navigate = useNavigate();

    const [anime, setAnime] = useState<Anime | null>(null);
    const [episodes, setEpisodes] = useState<Episode[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

    const source = useMemo(() => {
        return sourceId ? AnimeExtensionManager.getSource(sourceId) : null;
    }, [sourceId]);

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
                <button onClick={() => navigate(-1)}>Go Back</button>
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

                        <div className="action-buttons">
                            <button className="primary-btn" onClick={handlePlayFirst}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                                </svg>
                                Play Episode 1
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
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                        <polygon points="5 3 19 12 5 21 5 3"></polygon>
                                    </svg>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

export default AnimeSourceDetails;
