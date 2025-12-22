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
