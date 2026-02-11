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
    isExpanded: boolean;
    setSearchMode: (mode: SearchMode) => void;
    setIsExpanded: (expanded: boolean) => void;
    focusSearch: (mode?: SearchMode) => void;
}

const SearchBarContext = createContext<SearchBarContextType | undefined>(undefined);

export function SearchBarProvider({ children }: { children: React.ReactNode }) {
    const { settings } = useSettings();
    const inputRef = useRef<HTMLInputElement>(null);
    const [searchMode, setSearchMode] = useState<SearchMode>(settings.defaultSearchMode);
    const [isExpanded, setIsExpanded] = useState(false);

    // Update search mode when setting changes
    useEffect(() => {
        setSearchMode(settings.defaultSearchMode);
    }, [settings.defaultSearchMode]);

    const focusSearch = useCallback((mode?: SearchMode) => {
        if (mode) {
            setSearchMode(mode);
        }
        setIsExpanded(true);
        // Small delay to ensure the input is rendered before focusing
        setTimeout(() => {
            if (inputRef.current) {
                inputRef.current.focus();
            } else {
                console.warn('[SearchBar] Input ref still null after setIsExpanded(true)');
            }
        }, 100);
    }, []);

    const value = React.useMemo(() => ({
        inputRef,
        searchMode,
        isExpanded,
        setSearchMode,
        setIsExpanded,
        focusSearch
    }), [inputRef, searchMode, isExpanded, setSearchMode, setIsExpanded, focusSearch]);

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
