import React, { useState, useCallback } from 'react';
import { Anime } from '../../hooks/useAnimeData';
import './AnimeCard.css';

interface AnimeCardProps {
    anime: Anime;
    onClick: (id: number) => void;
    progress?: number;
    onResume?: () => void; // Optional resume callback for linked manga
    isResuming?: boolean; // Optional loading state for resume action
    compact?: boolean;
}

const AnimeCard: React.FC<AnimeCardProps> = ({ anime, onClick, progress, onResume, isResuming = false, compact = false }) => {
    const title = anime.title.english || anime.title.romaji;
    const episodes = anime.episodes || '?';
    const hasProgress = progress !== undefined;
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);

    const handleResumeClick = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent card click
        if (!isResuming) {
            onResume?.();
        }
    };

    // Keyboard accessibility for card
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick(anime.id);
        }
    }, [onClick, anime.id]);

    // Handle image load
    const handleImageLoad = () => {
        setImageLoaded(true);
    };

    // Handle image error with fallback
    const handleImageError = () => {
        setImageError(true);
        setImageLoaded(true); // Stop showing skeleton
    };

    return (
        <div
            className={`anime-card ${compact ? 'anime-card--compact' : ''}`}
            onClick={() => onClick(anime.id)}
            onKeyDown={handleKeyDown}
            role="button"
            tabIndex={0}
            aria-label={`${title}${hasProgress ? `, ${progress} of ${episodes} episodes watched` : ''}`}
            style={compact ? { fontSize: '0.9em' } : undefined}
        >
            {/* Progress Badge with Inverted Corners */}
            {hasProgress && (
                <div
                    className="anime-card__progress-badge"
                    style={compact ? { padding: '2px 6px', fontSize: '0.75rem' } : undefined}
                    aria-hidden="true"
                >
                    <span className="anime-card__progress-current">{progress}</span>
                    <span className="anime-card__progress-separator">/</span>
                    <span className="anime-card__progress-total">{episodes}</span>
                </div>
            )}

            {/* Resume Button */}
            {onResume && (
                <button
                    className={`anime-card__resume-btn ${isResuming ? 'anime-card__resume-btn--loading' : ''}`}
                    onClick={handleResumeClick}
                    aria-label={`Resume ${title}`}
                    disabled={isResuming}
                    style={compact ? { width: '32px', height: '32px' } : undefined}
                >
                    {isResuming ? (
                        <div className="anime-card__resume-spinner" style={compact ? { width: '16px', height: '16px' } : undefined} aria-hidden="true" />
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width={compact ? "14" : "16"} height={compact ? "14" : "16"} viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true">
                            <polygon points="5 3 19 12 5 21 5 3" />
                        </svg>
                    )}
                </button>
            )}

            {/* Image Container */}
            <div className={`anime-card__image-wrapper ${hasProgress ? 'anime-card__image-wrapper--notched' : ''}`}>
                {/* Skeleton Placeholder */}
                {!imageLoaded && !imageError && (
                    <div
                        className="anime-card__skeleton"
                        aria-hidden="true"
                        style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'linear-gradient(90deg, rgba(255, 255, 255, 0.05) 25%, rgba(255, 255, 255, 0.1) 50%, rgba(255, 255, 255, 0.05) 75%)',
                            backgroundSize: '200% 100%',
                            animation: 'shimmer 1.5s infinite',
                            borderRadius: 'inherit',
                        }}
                    />
                )}

                {/* Error Fallback */}
                {imageError && (
                    <div
                        className="anime-card__error-fallback"
                        aria-hidden="true"
                        style={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'rgba(20, 20, 25, 0.8)',
                            color: 'var(--theme-text-muted)',
                            fontSize: '0.75rem',
                            borderRadius: 'inherit',
                        }}
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <polyline points="21 15 16 10 5 21" />
                        </svg>
                    </div>
                )}

                <img
                    src={anime.coverImage.large}
                    alt=""
                    aria-hidden="true"
                    className="anime-card__image"
                    loading="lazy"
                    onLoad={handleImageLoad}
                    onError={handleImageError}
                    style={{
                        opacity: imageLoaded && !imageError ? 1 : 0,
                        transition: 'opacity 0.3s ease-in-out',
                    }}
                />

                {/* Hover Overlay */}
                <div className="anime-card__overlay" style={compact ? { padding: '12px' } : undefined} aria-hidden="true">
                    {/* Format Tag (Moved to Top-Left via absolute positioning) */}
                    {anime.format && (
                        <span className="anime-card__format" style={compact ? { fontSize: '0.65rem', padding: '2px 6px' } : undefined}>{anime.format}</span>
                    )}

                    <h3 className="anime-card__title" style={compact ? { fontSize: '0.9rem', marginBottom: '2px' } : undefined}>{title}</h3>
                    {anime.averageScore && (
                        <div className="anime-card__meta">
                            <span className="anime-card__score" style={compact ? { fontSize: '0.75rem' } : undefined}>{anime.averageScore}% Match</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AnimeCard;
