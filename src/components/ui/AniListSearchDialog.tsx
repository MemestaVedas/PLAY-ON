import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import './AniListSearchDialog.css';

interface AnimeResult {
    id: number;
    title: {
        romaji: string;
        english: string | null;
    };
    coverImage: {
        large: string;
        medium: string;
    };
    episodes: number | null;
    format: string | null;
    status: string | null;
}

interface AniListSearchDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (anime: { id: number; title: string; coverImage: string }) => void;
    initialSearchTerm?: string;
}

/**
 * Parse and clean a folder name to extract the anime title
 * Removes common noise like [SubGroup], quality tags, etc.
 */
function parseFolderName(folderName: string): string {
    let cleaned = folderName;

    // Remove leading [SubGroup] tags like [SubsPlease], [Erai-raws], etc.
    cleaned = cleaned.replace(/^\s*\[[^\]]+\]\s*/g, '');

    // Remove quality tags like [1080p], (720p), [BD], [HEVC], etc.
    cleaned = cleaned.replace(/[\[(]\s*(?:\d{3,4}p|BD|HEVC|x264|x265|AAC|FLAC|10bit|Hi10P|WEB-DL|WEB|BDRip|BluRay|DUAL|MULTI)\s*[\])]/gi, '');

    // Remove hash tags like [ABCD1234]
    cleaned = cleaned.replace(/\s*\[[A-Fa-f0-9]{8}\]\s*/g, '');

    // Remove season indicators like S01, S1, Season 1 (keep for search context)
    // But extract just the title portion
    cleaned = cleaned.replace(/\s*(?:S\d{1,2}|Season\s*\d{1,2})\s*/gi, ' ');

    // Replace underscores and dots with spaces
    cleaned = cleaned.replace(/[_.]/g, ' ');

    // Remove year in parentheses like (2023)
    cleaned = cleaned.replace(/\s*\(\d{4}\)\s*/g, ' ');

    // Remove trailing dashes
    cleaned = cleaned.replace(/\s*-\s*$/, '');

    // Clean up multiple spaces
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    return cleaned;
}

/**
 * Dialog for searching and selecting an anime from AniList
 * Inspired by Mihon's tracking UI - pre-populates search with folder name
 */
function AniListSearchDialog({ isOpen, onClose, onSelect, initialSearchTerm = '' }: AniListSearchDialogProps) {
    const [searchQuery, setSearchQuery] = useState(initialSearchTerm);
    const [results, setResults] = useState<AnimeResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    // Reset and auto-search when dialog opens with initial term
    useEffect(() => {
        if (isOpen && initialSearchTerm) {
            // Parse the folder name to get a cleaner search query
            const cleanedSearchTerm = parseFolderName(initialSearchTerm);
            setSearchQuery(cleanedSearchTerm);
            performSearch(cleanedSearchTerm);
        }
        if (!isOpen) {
            setResults([]);
            setHasSearched(false);
            setSearchQuery('');
        }
    }, [isOpen, initialSearchTerm]);

    const performSearch = useCallback(async (query: string) => {
        if (!query.trim()) {
            setResults([]);
            return;
        }

        setIsLoading(true);
        setHasSearched(true);
        try {
            const response = await invoke<string>('search_anime_command', {
                query: query.trim(),
                limit: 10
            });
            const data: AnimeResult[] = JSON.parse(response);
            setResults(data);
        } catch (err) {
            console.error('AniList search failed:', err);
            setResults([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Debounced search on query change
    useEffect(() => {
        if (!isOpen) return;

        const timer = setTimeout(() => {
            if (searchQuery.trim()) {
                performSearch(searchQuery);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [searchQuery, isOpen, performSearch]);

    const handleSelect = (anime: AnimeResult) => {
        const displayTitle = anime.title.english || anime.title.romaji;
        onSelect({
            id: anime.id,
            title: displayTitle,
            coverImage: anime.coverImage.large || anime.coverImage.medium
        });
        onClose();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="anilist-search-overlay" onClick={onClose} onKeyDown={handleKeyDown}>
            <div className="anilist-search-dialog" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="anilist-search-header">
                    <h2>Track on AniList</h2>
                    <button className="anilist-search-close" onClick={onClose}>
                        ✕
                    </button>
                </div>

                {/* Search Input */}
                <div className="anilist-search-input-wrapper">
                    <input
                        type="text"
                        className="anilist-search-input"
                        placeholder="Search anime..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        autoFocus
                    />
                    {isLoading && <div className="anilist-search-spinner" />}
                </div>

                {/* Results */}
                <div className="anilist-search-results">
                    {isLoading && results.length === 0 && (
                        <div className="anilist-search-loading">
                            Searching AniList...
                        </div>
                    )}

                    {!isLoading && hasSearched && results.length === 0 && (
                        <div className="anilist-search-empty">
                            No results found for "{searchQuery}"
                        </div>
                    )}

                    {results.map((anime) => (
                        <div
                            key={anime.id}
                            className="anilist-search-result-item"
                            onClick={() => handleSelect(anime)}
                        >
                            <img
                                src={anime.coverImage.medium || anime.coverImage.large}
                                alt={anime.title.romaji}
                                className="anilist-search-result-cover"
                            />
                            <div className="anilist-search-result-info">
                                <div className="anilist-search-result-title">
                                    {anime.title.english || anime.title.romaji}
                                </div>
                                {anime.title.english && (
                                    <div className="anilist-search-result-subtitle">
                                        {anime.title.romaji}
                                    </div>
                                )}
                                <div className="anilist-search-result-meta">
                                    {anime.format && <span>{anime.format}</span>}
                                    {anime.episodes && <span>• {anime.episodes} eps</span>}
                                    {anime.status && <span>• {anime.status}</span>}
                                </div>
                            </div>
                            <button className="anilist-search-select-btn">
                                Select
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default AniListSearchDialog;
