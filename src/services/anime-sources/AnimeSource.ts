/**
 * ====================================================================
 * ANIME SOURCE INTERFACE
 * ====================================================================
 *
 * This file defines the standard interface for all anime sources.
 * Similar to MangaSource, this allows the app to interact with
 * different anime providers in a consistent way.
 *
 * Each source (HiAnime, AnimePahe, etc.) implements this interface.
 * ====================================================================
 */

// --- Types ---

/**
 * Represents an anime title from a source.
 */
export interface Anime {
    /** Unique ID within the source */
    id: string;
    /** Title of the anime */
    title: string;
    /** URL to the cover/poster image */
    coverUrl: string;
    /** Release year or date */
    releaseDate?: string;
    /** Sub or Dub indicator */
    subOrDub?: 'sub' | 'dub' | 'both';
    /** Type: TV, Movie, OVA, etc. */
    type?: string;
    /** Status: ongoing, completed, etc. */
    status?: 'ongoing' | 'completed' | 'hiatus' | 'cancelled' | 'unknown';
    /** Description/Synopsis */
    description?: string;
    /** Genres/Tags */
    genres?: string[];
    /** Total episodes (if known) */
    totalEpisodes?: number;
    /** URL to the anime page on the source website */
    url?: string;
}

/**
 * Represents an episode of an anime.
 */
export interface Episode {
    /** Unique ID within the source */
    id: string;
    /** Episode number */
    number: number;
    /** Episode title (optional) */
    title?: string;
    /** URL to episode thumbnail */
    image?: string;
    /** URL to the episode page (for opening in browser) */
    url?: string;
    /** Whether this episode has been watched */
    isFiller?: boolean;
    /** Sub/Dub availability flags (if known) */
    hasSub?: boolean;
    hasDub?: boolean;
}

/**
 * Represents a video source/stream for an episode.
 */
export interface VideoSource {
    /** URL to the video stream */
    url: string;
    /** Quality label (e.g., '1080p', '720p', 'default') */
    quality: string;
    /** Whether the stream is HLS (m3u8) */
    isM3U8: boolean;
    /** Whether this is a backup source */
    isBackup?: boolean;
    /** Whether this is an embed iframe (can't be played directly) */
    isEmbed?: boolean;
}

/**
 * Result from fetching episode sources.
 */
export interface EpisodeSources {
    /** Available video sources */
    sources: VideoSource[];
    /** Subtitle tracks */
    subtitles?: Array<{ url: string; lang: string }>;
    /** Required headers for playback */
    headers?: Record<string, string>;
    /** Intro skip timestamps */
    intro?: { start: number; end: number };
    /** Outro skip timestamps */
    outro?: { start: number; end: number };
}

/**
 * Filter for searching anime.
 */
export interface AnimeSearchFilter {
    query?: string;
    page?: number;
    // Can be extended with genre filters, type filters, etc.
}

/**
 * Search result with pagination info.
 */
export interface AnimeSearchResult {
    anime: Anime[];
    hasNextPage: boolean;
}

// --- Source Interface ---

/**
 * The main interface that all anime sources must implement.
 */
export interface AnimeSource {
    /** Unique identifier for the source (e.g., 'hianime', 'animepahe') */
    id: string;

    /** Display name of the source */
    name: string;

    /** Base URL of the source website */
    baseUrl: string;

    /** Language code(s) supported by this source */
    lang: string;

    /** Icon URL or base64 data URL for the source icon */
    iconUrl?: string;

    /** Whether this source contains NSFW content */
    isNsfw?: boolean;

    /**
     * Search for anime by query.
     * @param filter - Search parameters (query, page, etc.)
     * @returns Promise resolving to search results
     */
    search(filter: AnimeSearchFilter): Promise<AnimeSearchResult>;

    /**
     * Get anime details by ID.
     * @param animeId - The anime's unique ID within this source
     * @returns Promise resolving to anime details
     */
    getAnimeInfo(animeId: string): Promise<Anime>;

    /**
     * Get a list of episodes for an anime.
     * @param animeId - The anime's unique ID within this source
     * @returns Promise resolving to an array of episodes
     */
    getEpisodes(animeId: string): Promise<Episode[]>;

    /**
     * Get the streaming sources for an episode.
     * @param episodeId - The episode's unique ID within this source
     * @param server - Optional server preference
     * @param dub - Whether to favor dub sources
     * @returns Promise resolving to episode sources
     * 
     * Implementation Notes for Extension Developers:
     * - Try server-based selection first (most reliable for multi-server sources):
     *   Fetch /ajax/episode/servers, parse for 'dub'/'sub' sections
     * - Fallback to parameter-based (for simpler APIs):
     *   Append ?dub=1 or ?language=dub to API calls
     * - If dub unavailable, return sub sources (player will show warning)
     */
    getEpisodeSources(episodeId: string, server?: string, dub?: boolean): Promise<EpisodeSources>;

    /**
     * Get available servers for an episode.
     * @param episodeId - The episode's unique ID within this source
     * @returns Promise resolving to an array of servers
     */
    getEpisodeServers?(episodeId: string): Promise<any[]>;
}

// ============================================================================
// Dub Support Helpers
// ============================================================================

export interface ServerInfo {
    id: string;
    name: string;
    category: 'sub' | 'dub' | 'raw';
}

/**
 * Select the best server based on dub preference.
 * Priority: dub (if preferred) → sub → raw → any
 */
export function selectServerByCategory(
    servers: ServerInfo[],
    preferDub: boolean
): string | null {
    if (preferDub) {
        const dubServer = servers.find(s => s.category === 'dub');
        if (dubServer) return dubServer.id;
    }

    const subServer = servers.find(s => s.category === 'sub');
    if (subServer) return subServer.id;

    const rawServer = servers.find(s => s.category === 'raw');
    if (rawServer) return rawServer.id;

    return servers[0]?.id || null;
}

/**
 * Parse server HTML to extract server information.
 * Looks for data-name, data-category, or class-based indicators.
 */
export function parseServersFromHtml(html: string): ServerInfo[] {
    const servers: ServerInfo[] = [];

    // Match data-name="dub" or data-name="sub" patterns
    const serverMatches = html.matchAll(/data-id="(\d+)"[^>]*data-name="(dub|sub|raw)"[^>]*>/gi);
    for (const match of serverMatches) {
        servers.push({
            id: match[1],
            name: match[2].toUpperCase(),
            category: match[2].toLowerCase() as 'sub' | 'dub' | 'raw'
        });
    }

    // Alternative: category="dub" pattern
    if (servers.length === 0) {
        const altMatches = html.matchAll(/data-id="(\d+)"[^>]*category="(dub|sub|raw)"[^>]*>/gi);
        for (const match of altMatches) {
            servers.push({
                id: match[1],
                name: match[2].toUpperCase(),
                category: match[2].toLowerCase() as 'sub' | 'dub' | 'raw'
            });
        }
    }

    return servers;
}

/**
 * Build API URL with dub parameter for parameter-based sources.
 */
export function buildUrlWithDubParam(
    baseUrl: string,
    episodeId: string,
    dub: boolean,
    paramName: string = 'dub'
): string {
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}/${episodeId}${separator}${paramName}=${dub ? '1' : '0'}`;
}

/**
 * Base class providing common functionality for anime sources.
 * Sources can extend this for shared utilities.
 */
export abstract class BaseAnimeSource implements AnimeSource {
    abstract id: string;
    abstract name: string;
    abstract baseUrl: string;
    abstract lang: string;
    iconUrl?: string;
    isNsfw?: boolean;

    abstract search(filter: AnimeSearchFilter): Promise<AnimeSearchResult>;
    abstract getAnimeInfo(animeId: string): Promise<Anime>;
    abstract getEpisodes(animeId: string): Promise<Episode[]>;
    abstract getEpisodeSources(episodeId: string, server?: string, dub?: boolean): Promise<EpisodeSources>;

    /**
     * Helper to make HTTP requests.
     * Uses Tauri's HTTP plugin for cross-origin requests.
     */
    protected async fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
        const response = await fetch(url, options);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    }
}
