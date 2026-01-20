import { useState, useEffect } from 'react';

const MAX_RECENT_SEARCHES = 10;

export function useRecentSearches(key: string) {
    const [recentSearches, setRecentSearches] = useState<string[]>([]);

    useEffect(() => {
        const stored = localStorage.getItem(key);
        if (stored) {
            try {
                setRecentSearches(JSON.parse(stored));
            } catch (e) {
                console.error('Failed to parse recent searches', e);
            }
        }
    }, [key]);

    const addSearch = (query: string) => {
        if (!query.trim()) return;
        const normalized = query.trim();

        setRecentSearches(prev => {
            // Remove existing if present to move to top
            const filtered = prev.filter(s => s !== normalized);
            const newSearches = [normalized, ...filtered].slice(0, MAX_RECENT_SEARCHES);
            localStorage.setItem(key, JSON.stringify(newSearches));
            return newSearches;
        });
    };

    const removeSearch = (query: string, e?: React.MouseEvent) => {
        e?.stopPropagation();
        setRecentSearches(prev => {
            const newSearches = prev.filter(s => s !== query);
            localStorage.setItem(key, JSON.stringify(newSearches));
            return newSearches;
        });
    };

    const clearSearches = () => {
        setRecentSearches([]);
        localStorage.removeItem(key);
    };

    return {
        recentSearches,
        addSearch,
        removeSearch,
        clearSearches
    };
}
