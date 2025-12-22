/**
 * Custom React Hook for Fetching Multiple Anime Cover Images
 * 
 * This hook fetches cover images for multiple anime titles and returns them as an array of URLs.
 * Perfect for displaying anime covers in components like BounceCards.
 */

import { useState, useEffect } from 'react';
import { fetchAniListAnime } from '../api/anilistClient';

interface UseAnimeImagesReturn {
    /** Array of cover image URLs */
    images: string[];
    /** True while fetching data */
    loading: boolean;
    /** Error message if any fetch failed */
    error: string | null;
}

/**
 * Fetches cover images for multiple anime titles
 * 
 * @param animeNames - Array of anime names to fetch cover images for
 * @param imageSize - Size of image to use ('extraLarge' | 'large' | 'medium')
 * @returns Object with images array, loading state, and error state
 * 
 * @example
 * ```tsx
 * const { images, loading, error } = useAnimeImages([
 *   'Attack on Titan',
 *   'Demon Slayer',
 *   'My Hero Academia'
 * ]);
 * ```
 */
export function useAnimeImages(
    animeNames: string[],
    imageSize: 'extraLarge' | 'large' | 'medium' = 'large'
): UseAnimeImagesReturn {
    const [images, setImages] = useState<string[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function loadAnimeImages() {
            try {
                setLoading(true);
                setError(null);

                // Fetch all anime in parallel
                const promises = animeNames.map(name => fetchAniListAnime(name));
                const results = await Promise.all(promises);

                // Extract cover image URLs based on selected size
                const imageUrls = results.map(result => {
                    const coverImage = result.data.Media.coverImage;
                    return coverImage[imageSize];
                });

                setImages(imageUrls);
            } catch (err) {
                const errorMessage = err instanceof Error
                    ? err.message
                    : 'Failed to load anime images';

                setError(errorMessage);
                console.error('Anime images fetch error:', err);
            } finally {
                setLoading(false);
            }
        }

        if (animeNames.length > 0) {
            loadAnimeImages();
        } else {
            setLoading(false);
        }
    }, [animeNames, imageSize]);

    return { images, loading, error };
}

/**
 * USAGE EXAMPLE IN HOME.TSX:
 * ===========================
 * 
 * // 1. Import the hook
 * import { useAnimeImages } from '../hooks/useAnimeImages';
 * 
 * // 2. Define your anime list
 * const animeList = [
 *   'Attack on Titan',
 *   'Demon Slayer',
 *   'Jujutsu Kaisen',
 *   'My Hero Academia',
 *   'One Piece'
 * ];
 * 
 * // 3. Use the hook in your component
 * const { images, loading, error } = useAnimeImages(animeList, 'large');
 * 
 * // 4. Pass images to BounceCards
 * {!loading && images.length > 0 && (
 *   <BounceCards
 *     images={images}
 *     containerWidth={500}
 *     containerHeight={250}
 *     // ... other props
 *   />
 * )}
 * 
 * // 5. Show loading state
 * {loading && <p>Loading anime covers...</p>}
 * 
 * // 6. Show error state
 * {error && <p>Error: {error}</p>}
 */
