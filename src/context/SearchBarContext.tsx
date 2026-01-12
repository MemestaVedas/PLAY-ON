/**
 * SearchBar Context
 * 
 * Provides global control over the search bar:
 * - Focus the search input
 * - Set the search mode (anime/manga)
 */

import React, { createContext, useContext, useRef, useCallback, useState, useEffect } from 'react';
import { useSettings } from './SettingsContext';

export type SearchMode = 'anime' | 'manga';

interface SearchBarContextType {
    inputRef: React.RefObject<HTMLInputElement | null>;
    searchMode: SearchMode;
    setSearchMode: (mode: SearchMode) => void;
    focusSearch: (mode?: SearchMode) => void;
}

const SearchBarContext = createContext<SearchBarContextType | undefined>(undefined);

export function SearchBarProvider({ children }: { children: React.ReactNode }) {
    const { settings } = useSettings();
    const inputRef = useRef<HTMLInputElement>(null);
    const [searchMode, setSearchMode] = useState<SearchMode>(settings.defaultSearchMode);

    // Update search mode when setting changes
    useEffect(() => {
        setSearchMode(settings.defaultSearchMode);
    }, [settings.defaultSearchMode]);

    const focusSearch = useCallback((mode?: SearchMode) => {
        if (mode) {
            setSearchMode(mode);
        }
        // Small delay to ensure mode state is updated before focusing
        setTimeout(() => {
            inputRef.current?.focus();
        }, 50);
    }, []);

    const value = React.useMemo(() => ({
        inputRef,
        searchMode,
        setSearchMode,
        focusSearch
    }), [inputRef, searchMode, setSearchMode, focusSearch]);

    return (
        <SearchBarContext.Provider value={value}>
            {children}
        </SearchBarContext.Provider>
    );
}

export function useSearchBar() {
    const context = useContext(SearchBarContext);
    if (!context) {
        throw new Error('useSearchBar must be used within a SearchBarProvider');
    }
    return context;
}
