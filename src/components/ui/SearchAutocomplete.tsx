/**
 * Search Autocomplete Component
 * 
 * Enhanced search input with recent searches dropdown,
 * keyboard navigation, and quick actions.
 */

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSearchHistory } from '../../hooks/useSearchHistory';

interface SearchAutocompleteProps {
    type: 'anime' | 'manga';
    placeholder?: string;
    onSearch: (query: string) => void;
    onClear?: () => void;
    className?: string;
}

export function SearchAutocomplete({
    type,
    placeholder = 'Search...',
    onSearch,
    onClear,
    className = ''
}: SearchAutocompleteProps) {
    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const { getHistoryByType, addSearch, removeSearch, clearHistory } = useSearchHistory();
    const recentSearches = getHistoryByType(type);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSearch = (searchQuery: string) => {
        if (searchQuery.trim()) {
            addSearch(searchQuery.trim(), type);
            onSearch(searchQuery.trim());
            setIsOpen(false);
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        switch (e.key) {
            case 'Enter':
                if (highlightedIndex >= 0 && recentSearches[highlightedIndex]) {
                    handleSearch(recentSearches[highlightedIndex].query);
                } else {
                    handleSearch(query);
                }
                break;
            case 'ArrowDown':
                e.preventDefault();
                setHighlightedIndex(prev =>
                    prev < recentSearches.length - 1 ? prev + 1 : prev
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1);
                break;
            case 'Escape':
                setIsOpen(false);
                setHighlightedIndex(-1);
                inputRef.current?.blur();
                break;
        }
    };

    const handleClear = () => {
        setQuery('');
        onClear?.();
        inputRef.current?.focus();
    };

    return (
        <div
            ref={containerRef}
            className={className}
            style={{ position: 'relative', width: '100%' }}
        >
            {/* Search Input */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 14px',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                transition: 'all 0.2s ease'
            }}>
                {/* Search Icon */}
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ opacity: 0.5, flexShrink: 0 }}
                >
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>

                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setIsOpen(true)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    style={{
                        flex: 1,
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        color: 'var(--theme-text-main)',
                        fontSize: '14px'
                    }}
                />

                {/* Clear Button */}
                {query && (
                    <button
                        onClick={handleClear}
                        style={{
                            padding: '4px',
                            background: 'rgba(255, 255, 255, 0.1)',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{ opacity: 0.6 }}
                        >
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                )}
            </div>

            {/* Dropdown */}
            <AnimatePresence>
                {isOpen && recentSearches.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.15 }}
                        style={{
                            position: 'absolute',
                            top: 'calc(100% + 8px)',
                            left: 0,
                            right: 0,
                            background: 'rgba(20, 20, 25, 0.98)',
                            backdropFilter: 'blur(16px)',
                            borderRadius: '12px',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                            overflow: 'hidden',
                            zIndex: 100
                        }}
                    >
                        {/* Header */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '10px 14px',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
                        }}>
                            <span style={{
                                fontSize: '11px',
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                color: 'var(--theme-text-muted)',
                                opacity: 0.7
                            }}>
                                Recent Searches
                            </span>
                            <button
                                onClick={() => clearHistory()}
                                style={{
                                    fontSize: '11px',
                                    color: 'var(--theme-accent-primary)',
                                    background: 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    opacity: 0.8
                                }}
                            >
                                Clear All
                            </button>
                        </div>

                        {/* Recent Items */}
                        <div style={{ maxHeight: '240px', overflow: 'auto' }}>
                            {recentSearches.map((item, index) => (
                                <div
                                    key={`${item.query}-${item.timestamp}`}
                                    onClick={() => handleSearch(item.query)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '10px 14px',
                                        cursor: 'pointer',
                                        background: highlightedIndex === index
                                            ? 'rgba(255, 255, 255, 0.05)'
                                            : 'transparent',
                                        transition: 'background 0.15s ease'
                                    }}
                                    onMouseEnter={() => setHighlightedIndex(index)}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        {/* Clock Icon */}
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            width="14"
                                            height="14"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            style={{ opacity: 0.4 }}
                                        >
                                            <circle cx="12" cy="12" r="10" />
                                            <polyline points="12 6 12 12 16 14" />
                                        </svg>
                                        <span style={{
                                            fontSize: '14px',
                                            color: 'var(--theme-text-main)'
                                        }}>
                                            {item.query}
                                        </span>
                                    </div>

                                    {/* Remove Button */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeSearch(item.query, type);
                                        }}
                                        style={{
                                            padding: '4px',
                                            background: 'transparent',
                                            border: 'none',
                                            cursor: 'pointer',
                                            opacity: 0.4,
                                            display: 'flex'
                                        }}
                                    >
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            width="12"
                                            height="12"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        >
                                            <line x1="18" y1="6" x2="6" y2="18" />
                                            <line x1="6" y1="6" x2="18" y2="18" />
                                        </svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default SearchAutocomplete;
