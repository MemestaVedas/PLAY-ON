/**
 * Authentication Type Definitions
 * 
 * Types for AniList OAuth authentication and token management
 */

/**
 * OAuth state for security
 */
export interface OAuthState {
    state: string;
    codeVerifier?: string;
}

/**
 * Access token from AniList
 */
export interface AccessToken {
    access_token: string;
    token_type: string;
    expires_in: number;
    expires_at?: number; // Timestamp when token expires
}

/**
 * OAuth callback response
 */
export interface OAuthCallbackParams {
    code?: string;
    state?: string;
    error?: string;
}

/**
 * Authentication state
 */
export interface AuthState {
    isAuthenticated: boolean;
    accessToken: string | null;
    expiresAt: number | null;
    userId: number | null;
}

/**
 * Viewer (authenticated user) data from AniList
 */
export interface Viewer {
    id: number;
    name: string;
    avatar: {
        large: string;
        medium: string;
    };
}

/**
 * Response from viewer query
 */
export interface ViewerResponse {
    data: {
        Viewer: Viewer;
    };
}
