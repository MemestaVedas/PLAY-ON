/**
 * ====================================================================
 * HIANIME EXTENSION (via Consumet API)
 * ====================================================================
 * 
 * HiAnime/Aniwatch anime source extension for PLAY-ON!
 * Uses the Consumet API for reliable access without Cloudflare issues.
 * 
 * API: https://api.consumet.org/anime/zoro
 * ====================================================================
 */
return {
    id: 'hianime',
    name: 'HiAnime',
    baseUrl: 'https://api.consumet.org',
    lang: 'en',
    version: '1.0.0',
    iconUrl: 'https://hianime.to/favicon.ico',

    /**
     * Search for anime
     */
    async search(filter) {
        const query = filter.query || '';
        const page = filter.page || 1;

        console.log('[HiAnime] Searching:', query);

        try {
            const response = await fetch(
                `${this.baseUrl}/anime/zoro/${encodeURIComponent(query)}?page=${page}`,
                {
                    headers: {
                        'Accept': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`Search failed: ${response.status}`);
            }

            const data = await response.json();

            if (!data || !data.results) {
                return { anime: [], hasNextPage: false };
            }

            const anime = data.results.map(item => ({
                id: item.id,
                title: item.title,
                coverUrl: item.image || '',
                releaseDate: item.releaseDate || undefined,
                type: item.type || 'TV',
                subOrDub: item.subOrDub || 'sub'
            }));

            return {
                anime,
                hasNextPage: data.hasNextPage || false
            };
        } catch (error) {
            console.error('[HiAnime] Search error:', error);
            throw error;
        }
    },

    /**
     * Get anime details
     */
    async getAnimeInfo(animeId) {
        console.log('[HiAnime] Getting info for:', animeId);

        try {
            const response = await fetch(
                `${this.baseUrl}/anime/zoro/info?id=${encodeURIComponent(animeId)}`,
                {
                    headers: {
                        'Accept': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`Failed to get anime info: ${response.status}`);
            }

            const data = await response.json();

            return {
                id: data.id,
                title: data.title,
                coverUrl: data.image || '',
                description: data.description || '',
                genres: data.genres || [],
                status: data.status?.toLowerCase() || 'unknown',
                type: data.type || 'TV',
                totalEpisodes: data.totalEpisodes || undefined,
                releaseDate: data.releaseDate || undefined,
                subOrDub: data.subOrDub || 'sub'
            };
        } catch (error) {
            console.error('[HiAnime] GetAnimeInfo error:', error);
            throw error;
        }
    },

    /**
     * Get episode list
     */
    async getEpisodes(animeId) {
        console.log('[HiAnime] Getting episodes for:', animeId);

        try {
            const response = await fetch(
                `${this.baseUrl}/anime/zoro/info?id=${encodeURIComponent(animeId)}`,
                {
                    headers: {
                        'Accept': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`Failed to get episodes: ${response.status}`);
            }

            const data = await response.json();

            if (!data.episodes) {
                return [];
            }

            return data.episodes.map(ep => ({
                id: ep.id,
                number: ep.number || 0,
                title: ep.title || `Episode ${ep.number}`,
                image: ep.image || undefined,
                isFiller: ep.isFiller || false
            }));
        } catch (error) {
            console.error('[HiAnime] GetEpisodes error:', error);
            throw error;
        }
    },

    /**
     * Get streaming sources for an episode
     */
    async getEpisodeSources(episodeId, server) {
        console.log('[HiAnime] Getting sources for:', episodeId);

        try {
            const serverParam = server || 'vidstreaming';
            const response = await fetch(
                `${this.baseUrl}/anime/zoro/watch?episodeId=${encodeURIComponent(episodeId)}&server=${serverParam}`,
                {
                    headers: {
                        'Accept': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`Failed to get sources: ${response.status}`);
            }

            const data = await response.json();

            if (!data.sources || data.sources.length === 0) {
                throw new Error('No sources found');
            }

            const sources = data.sources.map(s => ({
                url: s.url,
                quality: s.quality || 'default',
                isM3U8: s.isM3U8 !== false
            }));

            return {
                sources,
                headers: data.headers || {},
                intro: data.intro || undefined,
                outro: data.outro || undefined
            };
        } catch (error) {
            console.error('[HiAnime] GetEpisodeSources error:', error);
            throw error;
        }
    }
};
