import React from 'react';
import { Anime } from '../../hooks/useAnimeData';
import './AnimeCard.css';

interface AnimeCardProps {
    anime: Anime;
    onClick: (id: number) => void;
    progress?: number;
}

const AnimeCard: React.FC<AnimeCardProps> = ({ anime, onClick, progress }) => {
    const title = anime.title.english || anime.title.romaji;
    const episodes = anime.episodes || '?';
    const hasProgress = progress !== undefined;

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
                    <h3 className="anime-card__title">{title}</h3>
                    {anime.averageScore && (
                        <div className="anime-card__meta">
                            <span className="anime-card__score">{anime.averageScore}% Match</span>
                            {anime.format && (
                                <span className="anime-card__format">{anime.format}</span>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AnimeCard;
