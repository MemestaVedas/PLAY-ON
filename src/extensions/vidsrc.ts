/**
 * VidSrc Extension
 * 
 * Scrapes vidsrc.to / vidsrc.me for anime content.
 * Note: VidSrc is primarily movies/TV but has some anime.
 * Uses the standard embed API.
 */

import { AnimeSource, Anime, Episode, EpisodeSources, AnimeSearchResult, AnimeSearchFilter } from '../services/anime-sources/AnimeSource';
// import { fetch } from '@tauri-apps/plugin-http'; // Unused

const BASE_URL = 'https://vidsrc.to';

export const VidSrcExtension: AnimeSource = {
    id: 'vidsrc',
    name: 'VidSrc',
    baseUrl: BASE_URL,
    lang: 'en',
    iconUrl: `${BASE_URL}/favicon.ico`,

    async search(_filter: AnimeSearchFilter): Promise<AnimeSearchResult> {
        // VidSrc doesn't have a direct search API for anime specifically
        // We might need to use TMDB search and then map to VidSrc
        // For now, let's try a direct search if available, or return empty
        console.warn('[VidSrc] Search not fully implemented - requires TMDB mapping');
        return { anime: [], hasNextPage: false };
    },

    async getAnimeInfo(animeId: string): Promise<Anime> {
        // ID is expected to be TMDB ID or IMDB ID
        return {
            id: animeId,
            title: 'Unknown',
            coverUrl: '',
            status: 'unknown',
            type: 'tv'
        };
    },

    async getEpisodes(_animeId: string): Promise<Episode[]> {
        // VidSrc assumes we know the episode count or just tries to load them
        // This is tricky without a metadata provider like TMDB
        return [];
    },

    async getEpisodeSources(episodeId: string): Promise<EpisodeSources> {
        // episodeId format: tmdbId:season:episode or imdbId:season:episode
        const [id, s, e] = episodeId.split(':');
        const url = `${BASE_URL}/embed/tv/${id}/${s}/${e}`;

        return {
            sources: [{
                url: url,
                quality: 'auto',
                isM3U8: false,
                isBackup: false
            }],
            headers: { 'Referer': BASE_URL }
        };
    }
};
