/**
 * Custom React Hook for User's Favorite Anime
 * 
 * Fetches user's favorite anime from AniList
 */

import { useState, useEffect } from 'react';
import { fetchUserFavorites } from '../api/anilistClient';

interface FavoriteAnime {
    id: number;
    title: {
        romaji: string;
        english: string | null;
    };
    coverImage: {
        extraLarge: string;
        large: string;
        medium: string;
        color: string | null;
    };
}

interface UseFavoriteAnimeReturn {
    /** User's favorite anime */
    favorites: FavoriteAnime[];
    /** Cover image URLs */
    coverImages: string[];
    /** Loading state */
    loading: boolean;
    /** Error message */
    error: string | null;
}

/**
 * Hook to fetch user's favorite anime
 * 
 * @returns Favorite anime data
 * 
 * @example
 * ```tsx
 * const { favorites, coverImages, loading } = useFavoriteAnime();
 * 
 * // Use cover images in BounceCards
 * <BounceCards images={coverImages} />
 * ```
 */
export function useFavoriteAnime(): UseFavoriteAnimeReturn {
    const [favorites, setFavorites] = useState<FavoriteAnime[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function loadFavorites() {
            try {
                setLoading(true);
                setError(null);

                const response = await fetchUserFavorites();
                const favoriteAnime = response.data.Viewer.favourites.anime.nodes;

                setFavorites(favoriteAnime);
            } catch (err) {
                const errorMessage = err instanceof Error
                    ? err.message
                    : 'Failed to load favorite anime';

                setError(errorMessage);
                console.error('Favorites fetch error:', err);
            } finally {
                setLoading(false);
            }
        }

        loadFavorites();
    }, []);

    // Extract cover images for easy use
    const coverImages = favorites.map(anime => anime.coverImage.large);

    return {
        favorites,
        coverImages,
        loading,
        error,
    };
}
