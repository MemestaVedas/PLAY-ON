/**
 * Persisted Filters Hook
 * 
 * Saves and loads filter/sort preferences per page to localStorage.
 */

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'playon_filters';

interface FilterState {
    [key: string]: any;
}

interface PersistedFilters {
    [pageId: string]: FilterState;
}

export function usePersistedFilters<T extends FilterState>(
    pageId: string,
    defaultFilters: T
): [T, (filters: Partial<T>) => void, () => void] {
    const [filters, setFilters] = useState<T>(defaultFilters);

    // Load filters from localStorage on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const allFilters: PersistedFilters = JSON.parse(stored);
                if (allFilters[pageId]) {
                    setFilters({ ...defaultFilters, ...allFilters[pageId] });
                }
            }
        } catch (e) {
            console.error('Failed to load persisted filters:', e);
        }
    }, [pageId]); // eslint-disable-line react-hooks/exhaustive-deps

    // Update filters and persist to localStorage
    const updateFilters = useCallback((newFilters: Partial<T>) => {
        setFilters(prev => {
            const updated = { ...prev, ...newFilters };

            // Save to localStorage
            try {
                const stored = localStorage.getItem(STORAGE_KEY);
                const allFilters: PersistedFilters = stored ? JSON.parse(stored) : {};
                allFilters[pageId] = updated;
                localStorage.setItem(STORAGE_KEY, JSON.stringify(allFilters));
            } catch (e) {
                console.error('Failed to save persisted filters:', e);
            }

            return updated;
        });
    }, [pageId]);

    // Reset filters to defaults
    const resetFilters = useCallback(() => {
        setFilters(defaultFilters);

        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            const allFilters: PersistedFilters = stored ? JSON.parse(stored) : {};
            delete allFilters[pageId];
            localStorage.setItem(STORAGE_KEY, JSON.stringify(allFilters));
        } catch (e) {
            console.error('Failed to reset persisted filters:', e);
        }
    }, [pageId, defaultFilters]);

    return [filters, updateFilters, resetFilters];
}

export default usePersistedFilters;
