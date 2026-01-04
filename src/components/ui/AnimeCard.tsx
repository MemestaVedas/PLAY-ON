import React from 'react';
import { Anime } from '../../hooks/useAnimeData';
import './AnimeCard.css';

interface AnimeCardProps {
    anime: Anime;
    onClick: (id: number) => void;
    progress?: number;
    onResume?: () => void; // Optional resume callback for linked manga
    isResuming?: boolean; // Optional loading state for resume action
}

const AnimeCard: React.FC<AnimeCardProps> = ({ anime, onClick, progress, onResume, isResuming = false }) => {
    const title = anime.title.english || anime.title.romaji;
    const episodes = anime.episodes || '?';
    const hasProgress = progress !== undefined;

    const handleResumeClick = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent card click
        if (!isResuming) {
            onResume?.();
        }
    };

    return (
        <div
            className="anime-card"
            onClick={() => onClick(anime.id)}
        >
            {/* Progress Badge with Inverted Corners */}
            {hasProgress && (
                <div className="anime-card__progress-badge">
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
                    title="Resume reading"
                    disabled={isResuming}
                >
                    {isResuming ? (
                        <div className="anime-card__resume-spinner" />
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                            <polygon points="5 3 19 12 5 21 5 3" />
                        </svg>
                    )}
                </button>
            )}

            {/* Image Container */}
            <div className={`anime-card__image-wrapper ${hasProgress ? 'anime-card__image-wrapper--notched' : ''}`}>
                <img
                    src={anime.coverImage.large}
                    alt={title}
                    className="anime-card__image"
                    loading="lazy"
                />

                {/* Hover Overlay */}
                <div className="anime-card__overlay">
                    {/* Format Tag (Moved to Top-Left via absolute positioning) */}
                    {anime.format && (
                        <span className="anime-card__format">{anime.format}</span>
                    )}

                    <h3 className="anime-card__title">{title}</h3>
                    {anime.averageScore && (
                        <div className="anime-card__meta">
                            <span className="anime-card__score">{anime.averageScore}% Match</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AnimeCard;

