import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Anime, getAnimeTitle, getAnimeCover } from '../types/anilist';
import { Card } from './UIComponents';

/**
 * Example component demonstrating how to use AniList API through Tauri backend
 * 
 * This shows three different ways to get anime data:
 * 1. Search by title
 * 2. Get by ID
 * 3. Auto-match from currently playing media
 */
function AniListExample() {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Anime[]>([]);
    const [selectedAnime, setSelectedAnime] = useState<Anime | null>(null);
    const [matchedAnime, setMatchedAnime] = useState<Anime | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Method 1: Search for anime by title
    const handleSearch = async () => {
        if (!searchQuery.trim()) return;

        setLoading(true);
        setError(null);

        try {
            // Call the Rust backend command
            const resultJson = await invoke<string>('search_anime_command', {
                query: searchQuery,
                limit: 10
            });

            // Parse the JSON response
            const results: Anime[] = JSON.parse(resultJson);
            setSearchResults(results);
        } catch (err) {
            console.error('Search error:', err);
            setError(err as string);
        } finally {
            setLoading(false);
        }
    };

    // Method 2: Get anime by ID
    const handleGetById = async (id: number) => {
        setLoading(true);
        setError(null);

        try {
            // Call the Rust backend command
            const resultJson = await invoke<string>('get_anime_by_id_command', {
                id: id
            });

            // Parse the JSON response
            const anime: Anime = JSON.parse(resultJson);
            setSelectedAnime(anime);
        } catch (err) {
            console.error('Get by ID error:', err);
            setError(err as string);
        } finally {
            setLoading(false);
        }
    };

    // Method 3: Auto-match from currently playing media
    const handleAutoMatch = async () => {
        setLoading(true);
        setError(null);

        try {
            // Call the Rust backend command
            const resultJson = await invoke<string>('match_anime_from_window_command');

            // Parse the JSON response
            if (resultJson === 'null') {
                setMatchedAnime(null);
                setError('No media playing or no match found');
            } else {
                const anime: Anime = JSON.parse(resultJson);
                setMatchedAnime(anime);
            }
        } catch (err) {
            console.error('Auto-match error:', err);
            setError(err as string);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '2rem' }}>
            <h2 style={{ marginBottom: '2rem', color: '#374151' }}>
                🎌 AniList API Integration Examples
            </h2>

            {/* Example 1: Search */}
            <Card style={{ marginBottom: '2rem' }}>
                <h3 style={{ marginBottom: '1rem', color: '#374151' }}>
                    1️⃣ Search Anime by Title
                </h3>
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                        placeholder="Enter anime title..."
                        style={{
                            flex: 1,
                            padding: '0.75rem',
                            borderRadius: '8px',
                            border: '1px solid #D1D5DB',
                            fontSize: '1rem',
                        }}
                    />
                    <button
                        onClick={handleSearch}
                        disabled={loading}
                        style={{
                            padding: '0.75rem 1.5rem',
                            borderRadius: '8px',
                            border: 'none',
                            background: '#FFB5C5',
                            color: '#fff',
                            fontWeight: '600',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.6 : 1,
                        }}
                    >
                        {loading ? 'Searching...' : 'Search'}
                    </button>
                </div>

                {searchResults.length > 0 && (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                        gap: '1rem',
                        marginTop: '1rem',
                    }}>
                        {searchResults.map((anime) => (
                            <div
                                key={anime.id}
                                onClick={() => handleGetById(anime.id)}
                                style={{
                                    cursor: 'pointer',
                                    borderRadius: '8px',
                                    overflow: 'hidden',
                                    border: '1px solid #E5E7EB',
                                    transition: 'transform 0.2s',
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            >
                                {getAnimeCover(anime) && (
                                    <img
                                        src={getAnimeCover(anime)!}
                                        alt={getAnimeTitle(anime)}
                                        style={{ width: '100%', height: '200px', objectFit: 'cover' }}
                                    />
                                )}
                                <div style={{ padding: '0.5rem', fontSize: '0.85rem', color: '#374151' }}>
                                    {getAnimeTitle(anime)}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            {/* Example 2: Get by ID (shows selected anime) */}
            {selectedAnime && (
                <Card style={{ marginBottom: '2rem' }}>
                    <h3 style={{ marginBottom: '1rem', color: '#374151' }}>
                        2️⃣ Anime Details (ID: {selectedAnime.id})
                    </h3>
                    <div style={{ display: 'flex', gap: '1.5rem' }}>
                        {getAnimeCover(selectedAnime) && (
                            <img
                                src={getAnimeCover(selectedAnime)!}
                                alt={getAnimeTitle(selectedAnime)}
                                style={{
                                    width: '200px',
                                    height: '280px',
                                    objectFit: 'cover',
                                    borderRadius: '8px',
                                }}
                            />
                        )}
                        <div style={{ flex: 1 }}>
                            <h4 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: '#374151' }}>
                                {getAnimeTitle(selectedAnime)}
                            </h4>
                            <p style={{ color: '#6B7280', marginBottom: '1rem' }}>
                                <strong>Status:</strong> {selectedAnime.status || 'Unknown'} •{' '}
                                <strong>Episodes:</strong> {selectedAnime.episodes || 'Unknown'}
                            </p>
                            <p style={{ color: '#374151', lineHeight: '1.6' }}>
                                {selectedAnime.description?.replace(/<[^>]*>/g, '') || 'No description available'}
                            </p>
                        </div>
                    </div>
                </Card>
            )}

            {/* Example 3: Auto-match from media player */}
            <Card>
                <h3 style={{ marginBottom: '1rem', color: '#374151' }}>
                    3️⃣ Auto-Match from Currently Playing Media
                </h3>
                <button
                    onClick={handleAutoMatch}
                    disabled={loading}
                    style={{
                        padding: '0.75rem 1.5rem',
                        borderRadius: '8px',
                        border: 'none',
                        background: '#C7B8EA',
                        color: '#fff',
                        fontWeight: '600',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        opacity: loading ? 0.6 : 1,
                        marginBottom: '1rem',
                    }}
                >
                    {loading ? 'Matching...' : 'Match Current Media'}
                </button>

                {matchedAnime && (
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        {getAnimeCover(matchedAnime) && (
                            <img
                                src={getAnimeCover(matchedAnime)!}
                                alt={getAnimeTitle(matchedAnime)}
                                style={{
                                    width: '100px',
                                    height: '140px',
                                    objectFit: 'cover',
                                    borderRadius: '8px',
                                }}
                            />
                        )}
                        <div>
                            <h4 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', color: '#374151' }}>
                                {getAnimeTitle(matchedAnime)}
                            </h4>
                            <p style={{ color: '#6B7280' }}>
                                ID: {matchedAnime.id} • {matchedAnime.status}
                            </p>
                        </div>
                    </div>
                )}
            </Card>

            {/* Error display */}
            {error && (
                <div style={{
                    marginTop: '1rem',
                    padding: '1rem',
                    background: '#FEE2E2',
                    border: '1px solid #FCA5A5',
                    borderRadius: '8px',
                    color: '#991B1B',
                }}>
                    ⚠️ {error}
                </div>
            )}
        </div>
    );
}

export default AniListExample;
