/**
 * Search History Hook
 * 
 * Manages recent search queries in localStorage with
 * automatic deduplication and limit enforcement.
 */

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'playon_search_history';
const MAX_HISTORY = 10;

interface SearchHistoryItem {
    query: string;
    type: 'anime' | 'manga';
    timestamp: number;
}

export function useSearchHistory() {
    const [history, setHistory] = useState<SearchHistoryItem[]>([]);

    // Load history from localStorage on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                setHistory(JSON.parse(stored));
            }
        } catch (e) {
            console.error('Failed to load search history:', e);
        }
    }, []);

    // Save history to localStorage whenever it changes
    const saveHistory = useCallback((newHistory: SearchHistoryItem[]) => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
            setHistory(newHistory);
        } catch (e) {
            console.error('Failed to save search history:', e);
        }
    }, []);

    // Add a new search to history
    const addSearch = useCallback((query: string, type: 'anime' | 'manga') => {
        if (!query.trim()) return;

        const newItem: SearchHistoryItem = {
            query: query.trim(),
            type,
            timestamp: Date.now()
        };

        setHistory(prev => {
            // Remove duplicates (same query and type)
            const filtered = prev.filter(
                item => !(item.query.toLowerCase() === query.toLowerCase() && item.type === type)
            );

            // Add new item at the beginning and limit to MAX_HISTORY
            const newHistory = [newItem, ...filtered].slice(0, MAX_HISTORY);

            // Save to localStorage
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
            } catch (e) {
                console.error('Failed to save search history:', e);
            }

            return newHistory;
        });
    }, []);

    // Remove a specific search from history
    const removeSearch = useCallback((query: string, type: 'anime' | 'manga') => {
        setHistory(prev => {
            const newHistory = prev.filter(
                item => !(item.query === query && item.type === type)
            );
            saveHistory(newHistory);
            return newHistory;
        });
    }, [saveHistory]);

    // Clear all history
    const clearHistory = useCallback(() => {
        saveHistory([]);
    }, [saveHistory]);

    // Get history filtered by type
    const getHistoryByType = useCallback((type: 'anime' | 'manga') => {
        return history.filter(item => item.type === type);
    }, [history]);

    return {
        history,
        addSearch,
        removeSearch,
        clearHistory,
        getHistoryByType
    };
}

export default useSearchHistory;
