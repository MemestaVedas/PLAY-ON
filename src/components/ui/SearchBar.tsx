import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchAnime, searchManga } from '../../api/anilistClient';
import { BookOpenIcon, FilmIcon } from './Icons';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchBar } from '../../context/SearchBarContext';

interface SearchResult {
    id: number;
    title: {
        english: string | null;
        romaji: string;
    };
    coverImage: {
        medium: string;
    };
    format: string;
    episodes?: number | null;
    chapters?: number | null;
}

const SearchBar: React.FC = () => {
    const navigate = useNavigate();
    const { inputRef, searchMode, setSearchMode } = useSearchBar();
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Determine expansion state
    const isExpanded = isFocused || isHovered || searchTerm.length > 0 || showDropdown;

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
                setIsFocused(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Re-search when mode changes (if there's a search term)
    useEffect(() => {
        if (searchTerm.trim().length >= 2) {
            performSearch(searchTerm);
        }
    }, [searchMode]);

    const performSearch = async (value: string) => {
        setIsLoading(true);
        try {
            const searchFn = searchMode === 'anime' ? searchAnime : searchManga;
            const response = await searchFn(value.trim(), 1, 8);
            const media = response.data?.Page?.media || [];
            setResults(media);
            setShowDropdown(true);
        } catch (err) {
            console.error('Search error:', err);
            setResults([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchTerm(value);

        // Clear previous debounce
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        if (value.trim().length < 2) {
            setResults([]);
            setShowDropdown(false);
            return;
        }

        // Debounce the API call
        debounceRef.current = setTimeout(() => {
            performSearch(value);
        }, 300);
    };

    const handleResultClick = (id: number) => {
        setShowDropdown(false);
        setSearchTerm('');
        setResults([]);
        if (searchMode === 'anime') {
            navigate(`/anime/${id}`);
        } else {
            navigate(`/manga-details/${id}`);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Escape') {
            setShowDropdown(false);
            setIsFocused(false);
            if (inputRef.current) inputRef.current.blur();
        }
    };

    const toggleMode = () => {
        setSearchMode(searchMode === 'anime' ? 'manga' : 'anime');
    };

    return (
        <div ref={containerRef} className="relative group/search"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <motion.div
                layout
                className="glass-panel pl-2 pr-4 py-2 flex items-center gap-3 rounded-full backdrop-blur-md"
                style={{
                    background: 'var(--color-bg-glass)',
                    borderRadius: '100px',
                    height: '42px',
                    width: 'auto' // Let motion handle fixed width vs auto
                }}
                animate={{
                    width: isExpanded ? '300px' : '48px',
                    paddingRight: isExpanded ? '16px' : '8px',
                    backgroundColor: isExpanded ? 'rgba(255, 255, 255, 0.1)' : 'var(--color-bg-glass)'
                }}
                transition={{ type: "spring", bounce: 0, duration: 0.3 }}
            >
                {/* Mode Toggle - Collapsed into icon when closed, reveals on expand */}
                <div className="relative flex-shrink-0">
                    <button
                        onClick={toggleMode}
                        className="flex items-center justify-center p-0 rounded-full transition-all duration-300 ease-out overflow-hidden hover:bg-white/10 relative"
                        style={{
                            background: searchMode === 'anime' ? 'rgba(180, 162, 246, 0.15)' : 'rgba(160, 233, 229, 0.15)',
                            color: searchMode === 'anime' ? 'var(--color-lavender-mist)' : 'var(--color-mint-tonic)',
                            border: `1px solid ${searchMode === 'anime' ? 'rgba(180, 162, 246, 0.3)' : 'rgba(160, 233, 229, 0.3)'}`,
                            width: '28px',
                            height: '28px',
                        }}
                    >
                        {searchMode === 'anime' ? <FilmIcon size={14} /> : <BookOpenIcon size={14} />}
                    </button>
                    {/* Tooltip or Label could go here if needed */}
                </div>

                <AnimatePresence>
                    {isExpanded && (
                        <motion.div
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: 'auto' }}
                            exit={{ opacity: 0, width: 0 }}
                            transition={{ duration: 0.2 }}
                            className="flex-1 flex items-center overflow-hidden"
                            style={{ gap: '12px' }}
                        >
                            <div className="h-4 w-px bg-white/10 flex-shrink-0" />

                            <input
                                ref={inputRef}
                                type="text"
                                placeholder={searchMode === 'anime' ? 'Search anime...' : 'Search manga...'}
                                value={searchTerm}
                                onChange={handleSearch}
                                onKeyDown={handleKeyDown}
                                onFocus={() => setIsFocused(true)}
                                onBlur={() => {
                                    // Delay blur to allow click actions
                                    setTimeout(() => {
                                        if (!isHovered) setIsFocused(false);
                                    }, 200);
                                }}
                                className="bg-transparent border-none text-sm w-full font-medium"
                                style={{
                                    fontFamily: 'var(--font-rounded)',
                                    color: 'var(--color-text-main)',
                                    outline: 'none',
                                    boxShadow: 'none',
                                    border: 'none',
                                    background: 'transparent',
                                    WebkitAppearance: 'none',
                                    minWidth: '150px'
                                }}
                            />
                            {isLoading && (
                                <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin flex-shrink-0" style={{ borderColor: 'var(--color-text-muted)', borderTopColor: 'transparent' }}></div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            {/* Dropdown Results */}
            {showDropdown && results.length > 0 && (
                <div className="absolute top-full mt-2 right-0 w-80 max-h-96 overflow-y-auto bg-black/90 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl z-[100]">
                    {results.map((item) => (
                        <div
                            key={item.id}
                            onClick={() => handleResultClick(item.id)}
                            className="flex items-center gap-3 p-3 hover:bg-white/10 cursor-pointer transition-colors border-b border-white/5 last:border-b-0"
                        >
                            <img
                                src={item.coverImage.medium}
                                alt={item.title.english || item.title.romaji}
                                className="w-10 h-14 rounded-lg object-cover flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                                <div className="text-white text-sm font-medium truncate" style={{ fontFamily: 'var(--font-rounded)' }}>
                                    {item.title.english || item.title.romaji}
                                </div>
                                <div className="text-white/40 text-xs mt-0.5">
                                    {item.format} • {searchMode === 'anime'
                                        ? (item.episodes ? `${item.episodes} eps` : 'Ongoing')
                                        : (item.chapters ? `${item.chapters} chs` : 'Ongoing')}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* No results message */}
            {showDropdown && results.length === 0 && searchTerm.trim().length >= 2 && !isLoading && (
                <div className="absolute top-full mt-2 right-0 w-80 p-4 bg-black/90 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl z-[100] text-center text-white/50 text-sm">
                    No {searchMode} found
                </div>
            )}
        </div>
    );
};

export default SearchBar;
