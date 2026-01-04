/**
 * SearchBar Context
 * 
 * Provides global control over the search bar:
 * - Focus the search input
 * - Set the search mode (anime/manga)
 */

import React, { createContext, useContext, useRef, useCallback, useState } from 'react';

export type SearchMode = 'anime' | 'manga';

interface SearchBarContextType {
    inputRef: React.RefObject<HTMLInputElement | null>;
    searchMode: SearchMode;
    setSearchMode: (mode: SearchMode) => void;
    focusSearch: (mode?: SearchMode) => void;
}

const SearchBarContext = createContext<SearchBarContextType | undefined>(undefined);

export function SearchBarProvider({ children }: { children: React.ReactNode }) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [searchMode, setSearchMode] = useState<SearchMode>('anime');

    const focusSearch = useCallback((mode?: SearchMode) => {
        if (mode) {
            setSearchMode(mode);
        }
        // Small delay to ensure mode state is updated before focusing
        setTimeout(() => {
            inputRef.current?.focus();
        }, 50);
    }, []);

    return (
        <SearchBarContext.Provider value={{ inputRef, searchMode, setSearchMode, focusSearch }}>
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
