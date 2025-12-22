/**
 * AniList Authentication Service
 * 
 * Handles OAuth authentication flow and token management for AniList API
 * Supports both OAuth flow and Personal Access Token
 */

import { config } from '../config/config';
import type { AuthState, OAuthCallbackParams } from '../types/auth.types';

const TOKEN_STORAGE_KEY = 'anilist_access_token';
const AUTH_STATE_KEY = 'anilist_auth_state';

/**
 * Get the current authentication state
 */
export function getAuthState(): AuthState {
    try {
        const stored = localStorage.getItem(AUTH_STATE_KEY);
        if (stored) {
            const state: AuthState = JSON.parse(stored);

            // Check if token is expired
            if (state.expiresAt && state.expiresAt < Date.now()) {
                clearAuth();
                return createEmptyAuthState();
            }

            return state;
        }
    } catch (error) {
        console.error('Error reading auth state:', error);
    }

    return createEmptyAuthState();
}

/**
 * Get access token (from OAuth or Personal Access Token)
 */
export function getAccessToken(): string | null {
    // Check for Personal Access Token first
    if (config.auth.personalAccessToken) {
        return config.auth.personalAccessToken;
    }

    // Otherwise use OAuth token
    const authState = getAuthState();
    return authState.accessToken;
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
    return getAccessToken() !== null;
}

/**
 * Save authentication state
 */
function saveAuthState(state: AuthState): void {
    try {
        localStorage.setItem(AUTH_STATE_KEY, JSON.stringify(state));
    } catch (error) {
        console.error('Error saving auth state:', error);
    }
}

/**
 * Create empty auth state
 */
function createEmptyAuthState(): AuthState {
    return {
        isAuthenticated: false,
        accessToken: null,
        expiresAt: null,
        userId: null,
    };
}

/**
 * Clear authentication
 */
export function clearAuth(): void {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(AUTH_STATE_KEY);
}

/**
 * Initiate OAuth flow
 * Opens AniList authorization page in browser
 */
export function initiateOAuth(): void {
    const { clientId, authUrl, redirectUri } = config.oauth;

    if (clientId === 'YOUR_CLIENT_ID') {
        alert('Please configure your OAuth Client ID in config.ts\n\nGo to https://anilist.co/settings/developer to create one.');
        return;
    }

    // Generate random state for security
    const state = generateRandomString(32);
    sessionStorage.setItem('oauth_state', state);

    // Build authorization URL
    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'token', // Implicit grant (no server needed)
        state: state,
    });

    const authorizationUrl = `${authUrl}?${params.toString()}`;

    // Open in browser
    window.open(authorizationUrl, '_blank');
}

/**
 * Handle OAuth callback
 * Call this when the redirect URI is accessed
 */
export function handleOAuthCallback(params: OAuthCallbackParams): boolean {
    const { state, error } = params;

    // Check for errors
    if (error) {
        console.error('OAuth error:', error);
        return false;
    }

    // Verify state
    const savedState = sessionStorage.getItem('oauth_state');
    if (!savedState || savedState !== state) {
        console.error('Invalid OAuth state');
        return false;
    }

    // Clear state
    sessionStorage.removeItem('oauth_state');

    return true;
}

/**
 * Handle OAuth token from URL hash
 * AniList returns token in URL hash for implicit grant
 */
export function handleTokenFromHash(): boolean {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);

    const accessToken = params.get('access_token');
    const expiresIn = params.get('expires_in');

    if (accessToken) {
        const expiresAt = expiresIn
            ? Date.now() + parseInt(expiresIn) * 1000
            : Date.now() + 365 * 24 * 60 * 60 * 1000; // 1 year default

        const authState: AuthState = {
            isAuthenticated: true,
            accessToken,
            expiresAt,
            userId: null, // Will be fetched separately
        };

        saveAuthState(authState);

        // Clear hash from URL
        window.history.replaceState(null, '', window.location.pathname);

        return true;
    }

    return false;
}

/**
 * Set authentication with Personal Access Token
 */
export function setPersonalAccessToken(token: string): void {
    const authState: AuthState = {
        isAuthenticated: true,
        accessToken: token,
        expiresAt: null, // PATs don't expire
        userId: null,
    };

    saveAuthState(authState);
}

/**
 * Logout user
 */
export function logout(): void {
    clearAuth();
    window.location.reload();
}

/**
 * Generate random string for OAuth state
 */
function generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * USAGE EXAMPLES:
 * ===============
 * 
 * // Check if authenticated
 * if (isAuthenticated()) {
 *     // User is logged in
 * }
 * 
 * // Get access token for API calls
 * const token = getAccessToken();
 * 
 * // Start OAuth login
 * initiateOAuth();
 * 
 * // Handle OAuth callback (in callback page)
 * useEffect(() => {
 *     handleTokenFromHash();
 * }, []);
 * 
 * // Logout
 * logout();
 * 
 * // Use Personal Access Token (for testing)
 * setPersonalAccessToken('your-token-here');
 */
