import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchAnime } from '../../api/anilistClient';

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
    episodes: number | null;
}

const SearchBar: React.FC = () => {
    const navigate = useNavigate();
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
        debounceRef.current = setTimeout(async () => {
            setIsLoading(true);
            try {
                const response = await searchAnime(value.trim(), 1, 8);
                const media = response.data?.Page?.media || [];
                setResults(media);
                setShowDropdown(true);
            } catch (err) {
                console.error('Search error:', err);
                setResults([]);
            } finally {
                setIsLoading(false);
            }
        }, 300);
    };

    const handleResultClick = (id: number) => {
        setShowDropdown(false);
        setSearchTerm('');
        setResults([]);
        navigate(`/anime/${id}`);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Escape') {
            setShowDropdown(false);
        }
    };

    return (
        <div ref={containerRef} className="relative">
            <div
                className="glass-panel px-4 py-2 flex items-center gap-3 rounded-full border border-white/5 backdrop-blur-md"
                style={{
                    background: 'var(--color-bg-glass)',
                    borderColor: 'var(--color-border-subtle)',
                }}
            >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-text-muted)' }}><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                <input
                    type="text"
                    placeholder="Search anime..."
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
                    {results.map((anime) => (
                        <div
                            key={anime.id}
                            onClick={() => handleResultClick(anime.id)}
                            className="flex items-center gap-3 p-3 hover:bg-white/10 cursor-pointer transition-colors border-b border-white/5 last:border-b-0"
                        >
                            <img
                                src={anime.coverImage.medium}
                                alt={anime.title.english || anime.title.romaji}
                                className="w-10 h-14 rounded-lg object-cover flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                                <div className="text-white text-sm font-medium truncate" style={{ fontFamily: 'var(--font-rounded)' }}>
                                    {anime.title.english || anime.title.romaji}
                                </div>
                                <div className="text-white/40 text-xs mt-0.5">
                                    {anime.format} • {anime.episodes ? `${anime.episodes} eps` : 'Ongoing'}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* No results message */}
            {showDropdown && results.length === 0 && searchTerm.trim().length >= 2 && !isLoading && (
                <div className="absolute top-full mt-2 right-0 w-80 p-4 bg-black/90 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl z-[100] text-center text-white/50 text-sm">
                    No anime found
                </div>
            )}
        </div>
    );
};

export default SearchBar;
