/**
 * Authentication Service
 * 
 * Handles local authentication flow and token management. Supports both OAuth flow and Personal Access Token
 */

import { config } from '../config/config';
import type { AuthState } from '../types/auth.types';

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
 * Initiate OAuth flow (Skeleton)
 * 
 * Structure for a real OAuth flow:
 * 1. Generate state/code verifier (PKCE)
 * 2. Store them in session storage
 * 3. Redirect user to authorization URL
 */
export function initiateOAuth(): void {
    console.log('Initiating OAuth flow...');

    // 1. Generate a random state to prevent CSRF
    const state = Math.random().toString(36).substring(2, 15);
    sessionStorage.setItem('auth_state', state);

    // 2. Placeholder for Client ID and Redirect URI
    const clientId = 'YOUR_CLIENT_ID';
    const redirectUri = encodeURIComponent('http://localhost:1420/auth/callback');

    // 3. Construct Authorization URL (Generic pattern)
    const authUrl = `https://example-auth-server.com/authorize?` +
        `client_id=${clientId}&` +
        `redirect_uri=${redirectUri}&` +
        `state=${state}&` +
        `response_type=code&` +
        `scope=read_write`;

    // For now, since we are a shell, we mock the result
    console.log('Would redirect to:', authUrl);

    // MOCK LOGIN for Shell functionality
    const mockState: AuthState = {
        isAuthenticated: true,
        accessToken: 'mock_access_token_12345',
        expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000,
        userId: 12345,
    };
    saveAuthState(mockState);
    localStorage.setItem('onboardingCompleted', 'true');
    window.location.reload();
}

/**
 * Handle OAuth Callback (Skeleton)
 * 
 * Structure for handling the redirect back from the provider:
 * 1. Extract 'code' and 'state' from URL
 * 2. Verify 'state' against stored session
 * 3. Exchange 'code' for 'access_token' via backend/fetch
 */
export async function handleOAuthCallback(query: URLSearchParams): Promise<boolean> {
    const code = query.get('code');
    const state = query.get('state');
    const storedState = sessionStorage.getItem('auth_state');

    if (!code || state !== storedState) {
        console.error('OAuth state mismatch or missing code');
        return false;
    }

    console.log('Exchanging code for token:', code);

    // Placeholder for token exchange
    // const response = await fetch('https://example-auth-server.com/token', { method: 'POST', ... });

    return true;
}

/**
 * Set authentication with Personal Access Token
 */
export function setPersonalAccessToken(token: string): void {
    const authState: AuthState = {
        isAuthenticated: true,
        accessToken: token,
        expiresAt: null,
        userId: 12345,
    };

    saveAuthState(authState);
    localStorage.setItem('onboardingCompleted', 'true');
}

/**
 * Logout user
 */
export function logout(): void {
    clearAuth();
    localStorage.removeItem('onboardingCompleted');
    window.location.reload();
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
