import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'dismissed_recommendations';

interface DismissedRecommendations {
    anime: number[];
    manga: number[];
}

/**
 * Hook to manage dismissed recommendations
 * Persists to localStorage so dismissed items stay hidden across sessions
 */
export function useDismissedRecommendations() {
    const [dismissed, setDismissed] = useState<DismissedRecommendations>({ anime: [], manga: [] });

    // Load from localStorage on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                setDismissed(JSON.parse(stored));
            }
        } catch (e) {
            console.error('Failed to load dismissed recommendations:', e);
        }
    }, []);

    // Save to localStorage whenever dismissed changes
    const saveToStorage = useCallback((data: DismissedRecommendations) => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            console.error('Failed to save dismissed recommendations:', e);
        }
    }, []);

    // Dismiss an anime recommendation
    const dismissAnime = useCallback((id: number) => {
        setDismissed(prev => {
            if (prev.anime.includes(id)) return prev;
            const updated = { ...prev, anime: [...prev.anime, id] };
            saveToStorage(updated);
            return updated;
        });
    }, [saveToStorage]);

    // Dismiss a manga recommendation
    const dismissManga = useCallback((id: number) => {
        setDismissed(prev => {
            if (prev.manga.includes(id)) return prev;
            const updated = { ...prev, manga: [...prev.manga, id] };
            saveToStorage(updated);
            return updated;
        });
    }, [saveToStorage]);

    // Check if an anime is dismissed
    const isAnimeDismissed = useCallback((id: number) => {
        return dismissed.anime.includes(id);
    }, [dismissed.anime]);

    // Check if a manga is dismissed
    const isMangaDismissed = useCallback((id: number) => {
        return dismissed.manga.includes(id);
    }, [dismissed.manga]);

    // Clear all dismissed (for settings/reset)
    const clearAll = useCallback(() => {
        const empty = { anime: [], manga: [] };
        setDismissed(empty);
        saveToStorage(empty);
    }, [saveToStorage]);

    return {
        dismissedAnime: dismissed.anime,
        dismissedManga: dismissed.manga,
        dismissAnime,
        dismissManga,
        isAnimeDismissed,
        isMangaDismissed,
        clearAll
    };
}
