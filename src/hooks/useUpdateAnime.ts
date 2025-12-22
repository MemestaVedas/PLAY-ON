/**
 * Custom React Hook for Updating Anime Entries
 * 
 * Provides mutation function to update anime progress, status, and score
 */

import { useState } from 'react';
import { updateAnimeEntry } from '../api/anilistClient';
import type { UpdateMediaListVariables, MediaListEntry } from '../types/anilist.types';

interface UseUpdateAnimeReturn {
    /** Update function */
    updateAnime: (variables: UpdateMediaListVariables) => Promise<MediaListEntry | null>;
    /** Loading state */
    updating: boolean;
    /** Error message */
    error: string | null;
}

/**
 * Hook for updating anime entries
 * 
 * @returns Update function and state
 * 
 * @example
 * ```tsx
 * const { updateAnime, updating, error } = useUpdateAnime();
 * 
 * // Update progress
 * await updateAnime({ mediaId: 123, progress: 5 });
 * 
 * // Update status
 * await updateAnime({ mediaId: 123, status: 'COMPLETED' });
 * 
 * // Update score
 * await updateAnime({ mediaId: 123, score: 85 });
 * ```
 */
export function useUpdateAnime(): UseUpdateAnimeReturn {
    const [updating, setUpdating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function updateAnime(
        variables: UpdateMediaListVariables
    ): Promise<MediaListEntry | null> {
        try {
            setUpdating(true);
            setError(null);

            const response = await updateAnimeEntry(variables);
            return response.data.SaveMediaListEntry;
        } catch (err) {
            const errorMessage = err instanceof Error
                ? err.message
                : 'Failed to update anime';

            setError(errorMessage);
            console.error('Update anime error:', err);
            return null;
        } finally {
            setUpdating(false);
        }
    }

    return {
        updateAnime,
        updating,
        error,
    };
}
