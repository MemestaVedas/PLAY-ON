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
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
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
        }
    };

    const toggleMode = () => {
        setSearchMode(searchMode === 'anime' ? 'manga' : 'anime');
    };

    return (
        <div ref={containerRef} className="relative group/search">
            <div
                className="glass-panel pl-2 pr-4 py-2 flex items-center gap-3 rounded-full border border-white/5 backdrop-blur-md transition-all duration-300 ease-out hover:border-white/20 hover:bg-white/[0.07] focus-within:border-white/30 focus-within:bg-white/10 focus-within:ring-1 focus-within:ring-white/10"
                style={{
                    background: 'var(--color-bg-glass)',
                    borderColor: 'var(--color-border-subtle)',
                }}
            >
                {/* Mode Toggle */}
                <button
                    onClick={toggleMode}
                    className="flex items-center gap-2 h-8 rounded-full transition-all duration-300 ease-out overflow-hidden hover:bg-white/10 relative"
                    style={{
                        background: searchMode === 'anime' ? 'rgba(180, 162, 246, 0.15)' : 'rgba(160, 233, 229, 0.15)',
                        color: searchMode === 'anime' ? 'var(--color-lavender-mist)' : 'var(--color-mint-tonic)',
                        border: `1px solid ${searchMode === 'anime' ? 'rgba(180, 162, 246, 0.3)' : 'rgba(160, 233, 229, 0.3)'}`,
                        width: '32px', // Default width (icon only)
                        paddingLeft: '0px'
                    }}
                >
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={searchMode}
                            initial={{ y: 20, opacity: 0, rotateX: -90 }}
                            animate={{ y: 0, opacity: 1, rotateX: 0 }}
                            exit={{ y: -20, opacity: 0, rotateX: 90 }}
                            transition={{ duration: 0.3, ease: "backOut" }}
                            className="flex items-center justify-center gap-0 w-full h-full absolute inset-0 px-2"
                            style={{ transformOrigin: "50% 50% -10px" }}
                        >
                            <div className="flex-shrink-0">
                                {searchMode === 'anime' ? <FilmIcon size={16} /> : <BookOpenIcon size={16} />}
                            </div>

                            {/* Text Label - Expands on hover/focus */}
                            <span
                                className="whitespace-nowrap font-mono text-[10px] uppercase tracking-wider font-bold opacity-0 group-hover/search:opacity-100 group-focus-within/search:opacity-100 transition-opacity duration-300 delay-75 ml-0"
                                style={{
                                    maxWidth: '0px',
                                    transition: 'opacity 0.3s ease, max-width 0.3s ease, margin-left 0.3s ease',
                                }}
                            >
                                {searchMode === 'anime' ? 'ANIME' : 'MANGA'}
                            </span>
                        </motion.div>
                    </AnimatePresence>

                    <style>{`
                        .group\\/search:hover button,
                        .group\\/search:focus-within button {
                            width: 76px !important;
                            padding-left: 0px !important;
                        }
                        .group\\/search:hover button span,
                        .group\\/search:focus-within button span {
                            max-width: 60px !important;
                            margin-left: 8px !important;
                        }
                    `}</style>
                </button>

                <div className="h-4 w-px bg-white/10 mx-1" />

                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-text-muted)' }}><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                <input
                    ref={inputRef}
                    type="text"
                    placeholder={searchMode === 'anime' ? 'Search anime...' : 'Search manga...'}
                    value={searchTerm}
                    onChange={handleSearch}
                    onKeyDown={handleKeyDown}
                    onFocus={() => results.length > 0 && setShowDropdown(true)}
                    className="bg-transparent border-none outline-none text-sm w-48 font-medium"
                    style={{
                        fontFamily: 'var(--font-rounded)',
                        color: 'var(--color-text-main)',
                    }}
                />
                {isLoading && (
                    <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--color-text-muted)', borderTopColor: 'transparent' }}></div>
                )}
            </div>

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

