import React from 'react';
import { Anime } from '../../hooks/useAnimeData';

interface AnimeCardProps {
    anime: Anime;
    onClick: (id: number) => void;
    progress?: number;
}

const AnimeCard: React.FC<AnimeCardProps> = ({ anime, onClick, progress }) => {
    const title = anime.title.english || anime.title.romaji;
    const episodes = anime.episodes || '?';

    return (
        <div
            className="relative cursor-pointer group rounded-lg overflow-hidden transition-all duration-300 ease-in-out transform hover:scale-105 hover:z-10 hover:shadow-xl"
            onClick={() => onClick(anime.id)}
            style={{ aspectRatio: '2/3' }} // Standard poster ratio
        >
            {/* Image */}
            <img
                src={anime.coverImage.large}
                alt={title}
                className="w-full h-full object-cover"
                loading="lazy"
            />

            {/* Progress Badge (Always visible if progress exists) */}
            {progress !== undefined && (
                <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm text-white text-xs font-bold px-2 py-1 rounded-md shadow-sm z-20">
                    {progress} / {episodes} EP
                </div>
            )}

            {/* Hover Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                <h3 className="text-white font-bold text-sm line-clamp-2 leading-tight drop-shadow-md">
                    {title}
                </h3>
                {anime.averageScore && (
                    <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs font-semibold text-green-400">
                            {anime.averageScore}% Match
                        </span>
                        {anime.format && (
                            <span className="text-[10px] uppercase text-gray-300 border border-gray-500 px-1 rounded">
                                {anime.format}
                            </span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AnimeCard;
