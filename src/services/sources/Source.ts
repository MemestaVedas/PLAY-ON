/**
 * ====================================================================
 * MANGA SOURCE INTERFACE
 * ====================================================================
 *
 * This file defines the standard interface for all manga sources.
 * Similar to Tachiyomi/Mihon's Source interface, this allows the app
 * to interact with different manga providers in a consistent way.
 *
 * Each source (MangaDex, MangaSee, etc.) implements this interface.
 * ====================================================================
 */

// --- Types ---

/**
 * Represents a manga title from a source.
 */
export interface Manga {
    /** Unique ID within the source */
    id: string;
    /** Title of the manga */
    title: string;
    /** URL to the cover image */
    coverUrl: string;
    /** Author(s) */
    author?: string;
    /** Artist(s) */
    artist?: string;
    /** Description/Synopsis */
    description?: string;
    /** Status: ongoing, completed, hiatus, etc. */
    status?: 'ongoing' | 'completed' | 'hiatus' | 'cancelled' | 'unknown';
    /** Genres/Tags */
    genres?: string[];
    /** URL to the manga page on the source website */
    url?: string;
}

/**
 * Represents a chapter of a manga.
 */
export interface Chapter {
    /** Unique ID within the source */
    id: string;
    /** Chapter number (can be a float for sub-chapters like 10.5) */
    number: number;
    /** Chapter title (optional) */
    title?: string;
    /** Scanlation group name */
    scanlator?: string;
    /** Upload date */
    dateUpload?: Date;
    /** Language code (e.g., 'en', 'es') */
    language?: string;
    /** URL to the chapter page (for opening in browser) */
    url?: string;
}

/**
 * Represents a single page/image in a chapter.
 */
export interface Page {
    /** Page index (0-based) */
    index: number;
    /** URL to the image */
    imageUrl: string;
}

/**
 * Filter for searching manga.
 */
export interface SearchFilter {
    query?: string;
    page?: number;
    // Can be extended with genre filters, sort options, etc.
}

/**
 * Search result with pagination info.
 */
export interface SearchResult {
    manga: Manga[];
    hasNextPage: boolean;
}

// --- Source Interface ---

/**
 * The main interface that all manga sources must implement.
 */
export interface MangaSource {
    /** Unique identifier for the source (e.g., 'mangadex', 'mangasee') */
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
     * Search for manga by query.
     * @param filter - Search parameters (query, page, etc.)
     * @returns Promise resolving to search results
     */
    search(filter: SearchFilter): Promise<SearchResult>;

    /**
     * Get manga details by ID.
     * @param mangaId - The manga's unique ID within this source
     * @returns Promise resolving to manga details
     */
    getMangaDetails(mangaId: string): Promise<Manga>;

    /**
     * Get a list of chapters for a manga.
     * @param mangaId - The manga's unique ID within this source
     * @returns Promise resolving to an array of chapters (sorted newest first)
     */
    getChapters(mangaId: string): Promise<Chapter[]>;

    /**
     * Get the list of pages/images for a chapter.
     * @param chapterId - The chapter's unique ID within this source
     * @returns Promise resolving to an array of pages
     */
    getPages(chapterId: string): Promise<Page[]>;
}

/**
 * Base class providing common functionality for sources.
 * Sources can extend this for shared utilities.
 */
export abstract class BaseMangaSource implements MangaSource {
    abstract id: string;
    abstract name: string;
    abstract baseUrl: string;
    abstract lang: string;
    iconUrl?: string;
    isNsfw?: boolean;

    abstract search(filter: SearchFilter): Promise<SearchResult>;
    abstract getMangaDetails(mangaId: string): Promise<Manga>;
    abstract getChapters(mangaId: string): Promise<Chapter[]>;
    abstract getPages(chapterId: string): Promise<Page[]>;

    /**
     * Helper to make HTTP requests.
     * Uses Tauri's HTTP plugin for cross-origin requests.
     */
    protected async fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
        // We'll use the browser's fetch for now, or Tauri's HTTP plugin
        // For CORS issues, Tauri's plugin is preferred
        const response = await fetch(url, options);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    }
}
