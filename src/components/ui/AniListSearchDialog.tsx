import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { searchManga } from '../../api/anilistClient';
import './AniListSearchDialog.css';

interface MediaResult {
    id: number;
    title: {
        romaji: string;
        english: string | null;
    };
    coverImage: {
        large: string;
        medium: string;
    };
    // Anime fields
    episodes?: number | null;
    // Manga fields
    chapters?: number | null;
    volumes?: number | null;
    format: string | null;
    status: string | null;
}

type MediaType = 'ANIME' | 'MANGA';

interface AniListSearchDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (media: {
        id: number;
        title: string;
        coverImage: string;
        episodes?: number | null;
        chapters?: number | null;
        volumes?: number | null;
    }) => void;
    initialSearchTerm?: string;
    mediaType?: MediaType;
}

/**
 * Parse and clean a folder/manga name to extract the title
 * Removes common noise like [SubGroup], quality tags, etc.
 */
function parseSearchTerm(name: string): string {
    let cleaned = name;

    // Remove leading [SubGroup] tags like [SubsPlease], [Erai-raws], etc.
    cleaned = cleaned.replace(/^\s*\[[^\]]+\]\s*/g, '');

    // Remove quality tags like [1080p], (720p), [BD], [HEVC], etc.
    cleaned = cleaned.replace(/[[(]\s*(?:\d{3,4}p|BD|HEVC|x264|x265|AAC|FLAC|10bit|Hi10P|WEB-DL|WEB|BDRip|BluRay|DUAL|MULTI)\s*[\])]/gi, '');

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
 * Dialog for searching and selecting an anime or manga from AniList
 * Inspired by Mihon's tracking UI - pre-populates search with folder/manga name
 */
function AniListSearchDialog({
    isOpen,
    onClose,
    onSelect,
    initialSearchTerm = '',
    mediaType = 'ANIME'
}: AniListSearchDialogProps) {
    const [searchQuery, setSearchQuery] = useState(initialSearchTerm);
    const [results, setResults] = useState<MediaResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    const isManga = mediaType === 'MANGA';

    // Reset and auto-search when dialog opens with initial term
    useEffect(() => {
        if (isOpen && initialSearchTerm) {
            // Parse the name to get a cleaner search query
            const cleanedSearchTerm = parseSearchTerm(initialSearchTerm);
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
            if (isManga) {
                // Use the AniList GraphQL API for manga search
                const response = await searchManga(query.trim(), 1, 10);
                const data = response.data?.Page?.media || [];
                setResults(data);
            } else {
                // Use Tauri command for anime search
                const response = await invoke<string>('search_anime_command', {
                    query: query.trim(),
                    limit: 10
                });
                const data: MediaResult[] = JSON.parse(response);
                setResults(data);
            }
        } catch (err) {
            console.error(`AniList ${mediaType.toLowerCase()} search failed:`, err);
            setResults([]);
        } finally {
            setIsLoading(false);
        }
    }, [isManga, mediaType]);

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

    const handleSelect = (media: MediaResult) => {
        const displayTitle = media.title.english || media.title.romaji;
        onSelect({
            id: media.id,
            title: displayTitle,
            coverImage: media.coverImage.large || media.coverImage.medium,
            episodes: media.episodes,
            chapters: media.chapters,
            volumes: media.volumes,
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
                    <h2>Track {isManga ? 'Manga' : 'Anime'} on AniList</h2>
                    <button className="anilist-search-close" onClick={onClose}>
                        ✕
                    </button>
                </div>

                {/* Search Input */}
                <div className="anilist-search-input-wrapper">
                    <input
                        type="text"
                        className="anilist-search-input"
                        placeholder={`Search ${isManga ? 'manga' : 'anime'}...`}
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

                    {results.map((media) => (
                        <div
                            key={media.id}
                            className="anilist-search-result-item"
                            onClick={() => handleSelect(media)}
                        >
                            <img
                                src={media.coverImage.medium || media.coverImage.large}
                                alt={media.title.romaji}
                                className="anilist-search-result-cover"
                            />
                            <div className="anilist-search-result-info">
                                <div className="anilist-search-result-title">
                                    {media.title.english || media.title.romaji}
                                </div>
                                {media.title.english && (
                                    <div className="anilist-search-result-subtitle">
                                        {media.title.romaji}
                                    </div>
                                )}
                                <div className="anilist-search-result-meta">
                                    {media.format && <span>{media.format}</span>}
                                    {isManga ? (
                                        <>
                                            {media.chapters && <span>• {media.chapters} chs</span>}
                                            {media.volumes && <span>• {media.volumes} vols</span>}
                                        </>
                                    ) : (
                                        media.episodes && <span>• {media.episodes} eps</span>
                                    )}
                                    {media.status && <span>• {media.status}</span>}
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
