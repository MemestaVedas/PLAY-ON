import { useState, useEffect } from 'react';
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

    const getAnimeDetails = async (id: number) => {
        try {
            const data = await fetchAnimeDetails(id);
            return data.data?.Media as Anime;
        } catch (err) {
            console.error(`Failed to fetch details for anime ${id}:`, err);
            return null;
        }
    };

    return { trending, loading, error, getAnimeDetails };
}
