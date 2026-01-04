import { useState, useEffect, useCallback } from 'react';
import { fetchTrendingAnime, fetchAnimeDetails } from '../api/anilistClient';

export interface Anime {
    id: number;
    title: {
        english?: string;
        romaji: string;
        native?: string;
    };
    coverImage: {
        extraLarge: string;
        large: string;
        medium: string;
        color?: string;
    };
    bannerImage?: string;
    episodes?: number;
    status?: string;
    format?: string;
    source?: string;
    popularity?: number;
    rankings?: {
        rank: number;
        type: string;
        context: string;
        allTime: boolean;
    }[];
    averageScore?: number;
    seasonYear?: number;
    genres?: string[];
    description?: string;
    studios?: {
        nodes: { name: string }[];
    };
    nextAiringEpisode?: {
        episode: number;
        timeUntilAiring: number;
    };
    mediaListEntry?: {
        id: number;
        status: string;
        progress: number;
        score?: number;
    };
    recommendations?: {
        nodes: {
            mediaRecommendation: {
                id: number;
                title: {
                    english?: string;
                    romaji: string;
                    native?: string;
                };
                coverImage: {
                    extraLarge: string;
                    large: string;
                    medium: string;
                    color?: string;
                };
                status?: string;
                averageScore?: number;
                format?: string;
                episodes?: number;
            };
        }[];
    };
}

export function useAnimeData() {
    const [trending, setTrending] = useState<Anime[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function loadTrending() {
            try {
                setLoading(true);
                const data = await fetchTrendingAnime();
                if (data.data?.Page?.media) {
                    setTrending(data.data.Page.media);
                }
            } catch (err) {
                console.error("Failed to fetch trending anime:", err);
                setError("Failed to load trending anime.");
            } finally {
                setLoading(false);
            }
        }

        loadTrending();
    }, []);

    const getAnimeDetails = useCallback(async (id: number): Promise<Anime | null> => {
        try {
            console.log('[useAnimeData] Fetching details for anime ID:', id);
            const data = await fetchAnimeDetails(id);
            console.log('[useAnimeData] Got data:', data.data?.Media);
            return data.data?.Media as Anime;
        } catch (err) {
            console.error(`[useAnimeData] Failed to fetch details for anime ${id}:`, err);
            return null;
        }
    }, []);

    return { trending, loading, error, getAnimeDetails };
}
