/**
 * AniList GraphQL API Type Definitions
 * 
 * These types define the structure of data returned from the AniList GraphQL API.
 * AniList uses GraphQL, which allows us to request exactly the fields we need.
 */

/**
 * User's avatar images at different sizes
 * AniList provides multiple sizes for optimization
 */
export interface AniListAvatar {
    /** Large avatar image URL (typically 230x230px) */
    large: string;
    /** Medium avatar image URL (typically 64x64px) */
    medium: string;
}

/**
 * Complete user profile data from AniList
 * This represents a user's public profile information
 */
export interface AniListUser {
    /** Unique user ID on AniList */
    id: number;
    /** User's display name */
    name: string;
    /** User's avatar images */
    avatar: AniListAvatar;
    /** URL to user's AniList profile page */
    siteUrl: string;
    /** Optional banner image URL */
    bannerImage?: string;
}

/**
 * GraphQL response structure from AniList API
 * GraphQL wraps responses in a 'data' object
 */
export interface AniListUserResponse {
    data: {
        /** The User object returned by the query */
        User: AniListUser;
    };
}

/**
 * Error response from AniList API
 * Used when the GraphQL query fails
 */
export interface AniListError {
    message: string;
    status: number;
    locations?: Array<{
        line: number;
        column: number;
    }>;
}

/**
 * Anime title in different languages
 */
export interface AniListAnimeTitle {
    /** Romanized title */
    romaji: string;
    /** English title (may be null) */
    english: string | null;
}

/**
 * Anime cover image at different sizes
 */
export interface AniListAnimeCoverImage {
    /** Extra large cover image URL */
    extraLarge: string;
    /** Large cover image URL */
    large: string;
    /** Medium cover image URL */
    medium: string;
    /** Dominant color of the cover (hex code) */
    color: string | null;
}

/**
 * Anime media data from AniList
 */
export interface AniListAnime {
    /** Unique anime ID */
    id: number;
    /** Anime titles */
    title: AniListAnimeTitle;
    /** Cover image URLs */
    coverImage: AniListAnimeCoverImage;
}

/**
 * GraphQL response for anime search
 */
export interface AniListAnimeResponse {
    data: {
        /** The Media object returned by the query */
        Media: AniListAnime;
    };
}

/**
 * Media list status enum
 */
export type MediaListStatus =
    | 'CURRENT'      // Currently watching
    | 'PLANNING'     // Plan to watch
    | 'COMPLETED'    // Finished
    | 'DROPPED'      // Dropped
    | 'PAUSED'       // On hold
    | 'REPEATING';   // Rewatching

/**
 * User's anime list entry
 */
export interface MediaListEntry {
    /** Entry ID */
    id: number;
    /** Current status */
    status: MediaListStatus;
    /** User's score (0-100) */
    score: number;
    /** Current episode progress */
    progress: number;
    /** Total episodes (null if unknown) */
    progressVolumes: number | null;
    /** When started watching */
    startedAt: {
        year: number | null;
        month: number | null;
        day: number | null;
    };
    /** When completed */
    completedAt: {
        year: number | null;
        month: number | null;
        day: number | null;
    };
    /** The anime data */
    media: {
        id: number;
        title: AniListAnimeTitle;
        coverImage: AniListAnimeCoverImage;
        episodes: number | null;
        status: string;
        season: string | null;
        seasonYear: number | null;
    };
}

/**
 * Response from user's anime list query
 */
export interface MediaListCollectionResponse {
    data: {
        MediaListCollection: {
            lists: Array<{
                name: string;
                isCustomList: boolean;
                entries: MediaListEntry[];
            }>;
        };
    };
}

/**
 * Update anime entry mutation variables
 */
export interface UpdateMediaListVariables {
    mediaId: number;
    status?: MediaListStatus;
    score?: number;
    progress?: number;
}

/**
 * Response from update mutation
 */
export interface UpdateMediaListResponse {
    data: {
        SaveMediaListEntry: MediaListEntry;
    };
}
