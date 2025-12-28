import React, { createContext, useContext, useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { fetchCurrentUser } from '../api/anilistClient';
import { cacheRestoredPromise } from '../lib/apollo';
import { open } from '@tauri-apps/plugin-shell';
import { onOpenUrl } from '@tauri-apps/plugin-deep-link';
import { listen } from '@tauri-apps/api/event';

const ANILIST_CLIENT_ID = '33523';
// Client Secret is required for Authorization Code Grant (standard given AniList Constraints)
// User must provide this
const ANILIST_CLIENT_SECRET = 'spCWPTMapryGIQwRZ3djJGSKtzCMXB8udNRyDwxX';

interface UserProfile {
    id: number;
    name: string;
    avatar: {
        large: string;
        medium: string;
    };
    bannerImage?: string;
    favorites?: any;
    options?: {
        displayAdultContent: boolean;
    };
    mediaListOptions?: {
        scoreFormat: string;
    };
}

interface AuthContextType {
    isAuthenticated: boolean;
    user: UserProfile | null;
    loading: boolean;
    error: string | null;
    login: () => Promise<void>;
    logout: () => void;
    handleDeepLink: (url: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Initial load and deep link listener
    useEffect(() => {
        const init = async () => {
            await cacheRestoredPromise;
            checkAuth();
        };
        init();

        // Setup deep link listener for OAuth redirects
        let unlisten: (() => void) | undefined;
        let unlistenSingleInstance: (() => void) | undefined;

        const initDeepLink = async () => {
            unlisten = await onOpenUrl((urls) => {
                console.log('Deep link received:', urls);
                for (const url of urls) {
                    if (url.startsWith('playon://auth')) {
                        handleDeepLink(url);
                    }
                }
            });

            // Also listen for single-instance event from backend (Windows)
            unlistenSingleInstance = await listen<string>('oauth_deep_link', (event) => {
                console.log('Single Instance Deep link received:', event.payload);
                handleDeepLink(event.payload);
            });
        };
        initDeepLink();

        return () => {
            if (unlisten) unlisten();
            if (unlistenSingleInstance) unlistenSingleInstance();
        };
    }, []);

    const checkAuth = async () => {
        setLoading(true);
        const token = localStorage.getItem('token') || localStorage.getItem('anilist_token');
        console.log("checkAuth: Token present?", !!token, token ? token.substring(0, 5) : 'None');

        if (token) {
            try {
                // Try fetching authenticated user
                console.log("Fetching current user...");
                const result = await fetchCurrentUser();
                console.log("fetchCurrentUser result:", result);

                if (result.data && (result.data as any).Viewer) {
                    console.log("User authenticated:", (result.data as any).Viewer.name);
                    setUser((result.data as any).Viewer);
                    setError(null);
                    setLoading(false);
                } else {
                    // Token might be invalid
                    console.warn('Token invalid or expired', result);
                    localStorage.removeItem('token');
                    localStorage.removeItem('anilist_token');
                    setUser(null);
                }
            } catch (err) {
                console.error('Failed to fetch current user:', err);
                setUser(null);
            } finally {
                setLoading(false);
            }
        } else {
            setLoading(false);
        }
    };

    const login = async () => {
        const redirectUri = 'playon://auth';
        // Changed to response_type=code for Authorization Code Grant
        const authUrl = `https://anilist.co/api/v2/oauth/authorize?client_id=${ANILIST_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=code`;
        try {
            // @ts-ignore
            await open(authUrl);
        } catch (err) {
            console.error('Failed to open login URL', err);
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('anilist_token');
        setUser(null);
        // Refresh to fallback
        checkAuth();
    };



    /**
     * Exchanges an authorization code for an access token
     */
    const exchangeCodeForToken = async (code: string) => {
        try {
            setLoading(true);

            // Use Rust backend to exchange token (avoids CORS issues)
            const responseStr = await invoke<string>('exchange_login_code', {
                code,
                clientId: ANILIST_CLIENT_ID,
                clientSecret: ANILIST_CLIENT_SECRET,
                redirectUri: 'playon://auth'
            });


            const data = JSON.parse(responseStr);
            console.log("Token exchange response:", data);

            if (data.access_token) {
                console.log("Saving token:", data.access_token.substring(0, 10) + "...");
                localStorage.setItem('token', data.access_token);
                localStorage.setItem('anilist_token', data.access_token);
                // Reload or re-check auth
                await checkAuth();
            } else {
                console.error('Token exchange failed:', data);
                setError('Login failed: ' + (data.error || 'Unknown error'));
            }

        } catch (err) {
            console.error('Token exchange error:', err);
            setError('Login failed: ' + String(err));
        } finally {
            setLoading(false);
        }
    };

    const handleDeepLink = async (url: string) => {
        // playon://auth?code=...
        try {
            // Need to parse URL carefully. 
            // Note: URLSearchParams works on the query string part.
            // url might be "playon://auth?code=123"
            const urlObj = new URL(url); // This might fail for custom schemes in some envs, but usually fine in modern browsers/Tauri? 
            // If URL() constructor fails, we parse manually.

            const code = urlObj.searchParams.get('code');
            if (code) {
                await exchangeCodeForToken(code);
            }
        } catch (e) {
            // Manual fallback if URL parsing fails
            if (url.includes('code=')) {
                const code = url.split('code=')[1].split('&')[0];
                await exchangeCodeForToken(code);
            }
        }
    };

    // Determine if authenticated (really logged in)
    const isReallyAuthenticated = !!user;

    const value = {
        isAuthenticated: isReallyAuthenticated,
        user,
        loading,
        error,
        login,
        logout,
        handleDeepLink
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuthContext must be used within an AuthProvider');
    }
    return context;
};
