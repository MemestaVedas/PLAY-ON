/**
 * ====================================================================
 * SAMPLE ANIME EXTENSION TEMPLATE
 * ====================================================================
 *
 * This is a template for creating anime extensions for PLAY-ON!
 * Extensions are JavaScript bundles that implement the AnimeSource interface.
 *
 * IMPORTANT: Replace this template with actual source implementation.
 * The fetch function is passed in by the app and supports CORS bypass.
 * ====================================================================
 */
return {
    id: 'sample-anime',
    name: 'Sample Anime Source',
    baseUrl: 'https://example.com',
    lang: 'en',
    version: '1.0.0',

    /**
     * Search for anime by query
     * @param {Object} filter - { query: string, page?: number }
     * @returns {Promise<{ anime: Anime[], hasNextPage: boolean }>}
     */
    async search(filter) {
        console.log('[SampleAnime] Searching for:', filter.query);

        // TODO: Implement actual search logic
        // Example:
        // const response = await fetch(`${this.baseUrl}/search?q=${encodeURIComponent(filter.query)}`);
        // const html = await response.text();
        // const parser = new DOMParser();
        // const doc = parser.parseFromString(html, 'text/html');
        // ... parse results

        return {
            anime: [
                {
                    id: 'sample-1',
                    title: 'Sample Anime (Search Result)',
                    coverUrl: 'https://via.placeholder.com/200x300',
                    releaseDate: '2024',
                    type: 'TV',
                    status: 'completed'
                }
            ],
            hasNextPage: false
        };
    },

    /**
     * Get detailed info for an anime
     * @param {string} animeId - The anime ID
     * @returns {Promise<Anime>}
     */
    async getAnimeInfo(animeId) {
        console.log('[SampleAnime] Getting info for:', animeId);

        // TODO: Implement actual detail fetching

        return {
            id: animeId,
            title: 'Sample Anime',
            coverUrl: 'https://via.placeholder.com/200x300',
            description: 'This is a sample anime source. Replace this template with an actual implementation.',
            releaseDate: '2024',
            status: 'completed',
            type: 'TV',
            totalEpisodes: 12,
            genres: ['Action', 'Adventure']
        };
    },

    /**
     * Get list of episodes for an anime
     * @param {string} animeId - The anime ID
     * @returns {Promise<Episode[]>}
     */
    async getEpisodes(animeId) {
        console.log('[SampleAnime] Getting episodes for:', animeId);

        // TODO: Implement actual episode list fetching

        const episodes = [];
        for (let i = 1; i <= 12; i++) {
            episodes.push({
                id: `${animeId}-ep-${i}`,
                number: i,
                title: `Episode ${i}`,
                isFiller: false
            });
        }

        return episodes;
    },

    /**
     * Get streaming sources for an episode
     * @param {string} episodeId - The episode ID
     * @param {string} [server] - Optional server preference
     * @returns {Promise<{ sources: VideoSource[], headers?: Record<string, string> }>}
     */
    async getEpisodeSources(episodeId, server) {
        console.log('[SampleAnime] Getting sources for:', episodeId, 'server:', server);

        // TODO: Implement actual source extraction
        // This typically involves:
        // 1. Fetching the episode page
        // 2. Finding the embedded player iframe
        // 3. Extracting the actual video URL (often m3u8)

        return {
            sources: [
                {
                    url: 'https://example.com/sample.m3u8',
                    quality: '1080p',
                    isM3U8: true
                },
                {
                    url: 'https://example.com/sample-720.m3u8',
                    quality: '720p',
                    isM3U8: true
                }
            ],
            headers: {
                'Referer': 'https://example.com'
            }
            // Optional: intro and outro skip timestamps
            // intro: { start: 0, end: 90 },
            // outro: { start: 1300, end: 1400 }
        };
    }
};
