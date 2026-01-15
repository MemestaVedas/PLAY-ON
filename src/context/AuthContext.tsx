import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { fetchCurrentUser } from '../api/anilistClient';
import { cacheRestoredPromise } from '../lib/apollo';
import { open } from '@tauri-apps/plugin-shell';
import { onOpenUrl } from '@tauri-apps/plugin-deep-link';
import { listen } from '@tauri-apps/api/event';

const ANILIST_CLIENT_ID = import.meta.env.VITE_ANILIST_CLIENT_ID || '';
const ANILIST_CLIENT_SECRET = import.meta.env.VITE_ANILIST_CLIENT_SECRET || '';

interface UserProfile {
    id: number;
    name: string;
    about?: string;
    avatar: {
        large: string;
        medium: string;
    };
    bannerImage?: string;
    favorites?: any;
    options?: {
        titleLanguage?: string;
        staffNameLanguage?: string;
        displayAdultContent: boolean;
        profileColor?: string;
        timezone?: string;
        activityMergeTime?: number;
        airingNotifications?: boolean;
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
    loginWithCode: (code: string) => Promise<void>;
    handleDeepLink: (url: string) => Promise<void>;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // OPTIMIZATION: Initialize state directly from localStorage to prevent UI flash
    const [user, setUser] = useState<UserProfile | null>(() => {
        try {
            const storedUser = localStorage.getItem('user_profile');
            if (storedUser) {
                console.log("AuthContext: Hydrating user from cache:", JSON.parse(storedUser).name);
                return JSON.parse(storedUser);
            }
        } catch (e) {
            console.error("AuthContext: Failed to parse stored user", e);
        }
        return null;
    });

    const [loading, setLoading] = useState(() => !user);
    const [error, setError] = useState<string | null>(null);
    const processingRef = useRef<string | null>(null);

    // Initial load and deep link listener
    useEffect(() => {
        const init = async () => {
            // Verify token exists
            const storedToken = localStorage.getItem('token') || localStorage.getItem('anilist_token');

            if (!storedToken) {
                // If no token but we have user, clear it (logout happened elsewhere?)
                if (user) setUser(null);
                setLoading(false);
            }

            // Sync with Apollo Cache and verify token
            await cacheRestoredPromise;
            checkAuth();
        };
        init();

        // Setup deep link listener for OAuth redirects
        let unlisten: (() => void) | undefined;
        let unlistenSingleInstance: (() => void) | undefined;

        const initDeepLink = async () => {
            // Check for initial URL if app was started via deep link
            const { getCurrent } = await import('@tauri-apps/plugin-deep-link');
            const initialUrls = await getCurrent();
            if (initialUrls && initialUrls.length > 0) {
                console.log('Initial deep link detected:', initialUrls);
                for (const url of initialUrls) {
                    if (url.startsWith('playon://auth')) {
                        handleDeepLink(url);
                    }
                }
            }

            unlisten = await onOpenUrl((urls) => {
                console.log('Deep link received:', urls);
                for (const url of urls) {
                    if (url.startsWith('playon://auth')) {
                        handleDeepLink(url);
                    }
                }
            });

            // Also listen for single-instance event from backend (Windows)
            unlistenSingleInstance = await listen<string>('auth-callback', (event) => {
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
        // If we don't have an optimistic user, show loading
        if (!user) setLoading(true);

        const token = localStorage.getItem('token') || localStorage.getItem('anilist_token');
        console.log("checkAuth: Token present?", !!token, token ? token.substring(0, 5) : 'None');

        if (token) {
            try {
                // Try fetching authenticated user
                console.log("Fetching current user...");
                const result = await fetchCurrentUser();
                console.log("fetchCurrentUser result:", result);

                if (result.data && (result.data as any).Viewer) {
                    const viewer = (result.data as any).Viewer;
                    console.log("User authenticated:", viewer.name);
                    setUser(viewer);
                    // Persist user for next launch
                    localStorage.setItem('user_profile', JSON.stringify(viewer));
                    setError(null);
                    setLoading(false);
                } else {
                    // Token might be invalid
                    console.warn('Token invalid or expired', result);
                    localStorage.removeItem('token');
                    localStorage.removeItem('anilist_token');
                    localStorage.removeItem('user_profile');
                    setUser(null);
                }
            } catch (err) {
                console.error('Failed to fetch current user:', err);
                // Don't clear user immediately on network error if we have optimistic user
                // Only clear if it's strictly an auth error? 
                // For now, keep optimistic user if network fails.
            } finally {
                setLoading(false);
            }
        } else {
            localStorage.removeItem('user_profile');
            setUser(null);
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
        localStorage.removeItem('user_profile');
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
            console.log('Processing deep link:', url);
            const urlObj = new URL(url);
            const code = urlObj.searchParams.get('code');

            if (code) {
                // Prevent double-processing
                if (processingRef.current === code) {
                    console.log('Code already being processed, ignoring:', code.substring(0, 5) + '...');
                    return;
                }

                processingRef.current = code;
                await exchangeCodeForToken(code);
                // Clear ref after some time or on success/fail
                setTimeout(() => { processingRef.current = null; }, 5000);
            }
        } catch (e) {
            // Manual fallback if URL parsing fails
            if (url.includes('code=')) {
                const code = url.split('code=')[1].split('&')[0];
                if (code && processingRef.current !== code) {
                    processingRef.current = code;
                    await exchangeCodeForToken(code);
                    setTimeout(() => { processingRef.current = null; }, 5000);
                }
            }
        }
    };

    /**
     * Refreshes the current user data from AniList.
     * Call this after updating profile settings.
     */
    const refreshUser = async () => {
        try {
            const result = await fetchCurrentUser();
            if (result.data && (result.data as any).Viewer) {
                const viewer = (result.data as any).Viewer;
                setUser(viewer);
                localStorage.setItem('user_profile', JSON.stringify(viewer));
            }
        } catch (err) {
            console.error('Failed to refresh user:', err);
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
        loginWithCode: exchangeCodeForToken,
        handleDeepLink,
        refreshUser
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
