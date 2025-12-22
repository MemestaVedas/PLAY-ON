/**
 * Custom React Hook for User's Anime List
 * 
 * Fetches and manages user's anime list from AniList
 */

import { useState, useEffect } from 'react';
import { fetchUserAnimeList } from '../api/anilistClient';
import type { MediaListEntry } from '../types/anilist.types';

interface UseUserAnimeListReturn {
    /** User's anime list entries */
    animeList: MediaListEntry[];
    /** Loading state */
    loading: boolean;
    /** Error message */
    error: string | null;
    /** Refresh the list */
    refresh: () => void;
}

/**
 * Hook to fetch user's anime list
 * 
 * @param status - Filter by status ('CURRENT', 'COMPLETED', etc.)
 * @param userId - User ID (optional, uses authenticated user if not provided)
 * @returns Anime list data and functions
 * 
 * @example
 * ```tsx
 * // Get currently watching anime
 * const { animeList, loading, error } = useUserAnimeList('CURRENT');
 * 
 * // Get completed anime
 * const { animeList } = useUserAnimeList('COMPLETED');
 * ```
 */
export function useUserAnimeList(
    status?: string,
    userId?: number
): UseUserAnimeListReturn {
    const [animeList, setAnimeList] = useState<MediaListEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    useEffect(() => {
        async function loadAnimeList() {
            try {
                setLoading(true);
                setError(null);

                const response = await fetchUserAnimeList(userId, status);

                // Flatten all entries from all lists
                const allEntries = response.data.MediaListCollection.lists.flatMap(
                    list => list.entries
                );

                setAnimeList(allEntries);
            } catch (err) {
                const errorMessage = err instanceof Error
                    ? err.message
                    : 'Failed to load anime list';

                setError(errorMessage);
                console.error('Anime list fetch error:', err);
            } finally {
                setLoading(false);
            }
        }

        loadAnimeList();
    }, [userId, status, refreshTrigger]);

    function refresh() {
        setRefreshTrigger(prev => prev + 1);
    }

    return {
        animeList,
        loading,
        error,
        refresh,
    };
}
