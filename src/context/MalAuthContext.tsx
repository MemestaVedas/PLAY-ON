/**
 * MAL Authentication Context
 * 
 * Manages MyAnimeList OAuth state separately from AniList.
 * Uses localhost callback server for secure OAuth flow.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import * as malClient from '../api/malClient';

const MAL_CLIENT_ID = import.meta.env.VITE_MAL_CLIENT_ID || '';

interface MalUserProfile {
    id: number;
    name: string;
    picture?: string;
}

interface MalAuthContextType {
    isAuthenticated: boolean;
    user: MalUserProfile | null;
    loading: boolean;
    error: string | null;
    login: () => Promise<void>;
    logout: () => void;
    accessToken: string | null;
}

const MalAuthContext = createContext<MalAuthContextType | undefined>(undefined);

export const MalAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<MalUserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [accessToken, setAccessToken] = useState<string | null>(null);

    // Initial load - restore from localStorage
    useEffect(() => {
        const init = async () => {
            const storedUser = localStorage.getItem('mal_user_profile');
            const storedToken = localStorage.getItem('mal_access_token');

            if (storedUser && storedToken) {
                try {
                    const parsedUser = JSON.parse(storedUser);
                    console.log("MalAuth: Loaded user:", parsedUser.name);
                    setUser(parsedUser);
                    setAccessToken(storedToken);
                    setLoading(false);

                    // Verify token in background
                    verifyToken(storedToken);
                } catch (e) {
                    console.error("MalAuth: Failed to parse stored user", e);
                    setLoading(false);
                }
            } else {
                setLoading(false);
            }
        };
        init();
    }, []);

    const verifyToken = async (token: string) => {
        try {
            const userProfile = await malClient.fetchUserProfile(token);
            setUser(userProfile);
            localStorage.setItem('mal_user_profile', JSON.stringify(userProfile));
        } catch (e) {
            console.error("MalAuth: Token verification failed", e);
            // Try to refresh
            const refreshTokenStr = localStorage.getItem('mal_refresh_token');
            if (refreshTokenStr && MAL_CLIENT_ID) {
                try {
                    const newTokens = await malClient.refreshToken(refreshTokenStr, MAL_CLIENT_ID);
                    localStorage.setItem('mal_access_token', newTokens.access_token);
                    localStorage.setItem('mal_refresh_token', newTokens.refresh_token);
                    setAccessToken(newTokens.access_token);

                    const userProfile = await malClient.fetchUserProfile(newTokens.access_token);
                    setUser(userProfile);
                    localStorage.setItem('mal_user_profile', JSON.stringify(userProfile));
                } catch (refreshError) {
                    console.error("MalAuth: Token refresh failed", refreshError);
                    logout();
                }
            } else {
                logout();
            }
        }
    };

    const login = async () => {
        if (!MAL_CLIENT_ID) {
            setError('MAL client ID not configured. Add VITE_MAL_CLIENT_ID to your .env file.');
            return;
        }

        try {
            setLoading(true);
            setError(null);

            // Use the complete OAuth flow that handles everything
            const resultStr = await invoke<string>('mal_start_oauth_flow', {
                clientId: MAL_CLIENT_ID,
            });

            const tokens = JSON.parse(resultStr) as {
                access_token: string;
                refresh_token: string;
            };

            // Store tokens
            localStorage.setItem('mal_access_token', tokens.access_token);
            localStorage.setItem('mal_refresh_token', tokens.refresh_token);
            setAccessToken(tokens.access_token);

            // Fetch user profile
            const userProfile = await malClient.fetchUserProfile(tokens.access_token);
            setUser(userProfile);
            localStorage.setItem('mal_user_profile', JSON.stringify(userProfile));

            console.log('MalAuth: Login successful!', userProfile.name);
        } catch (err) {
            console.error('MalAuth: Login failed', err);
            setError('Login failed: ' + String(err));
        } finally {
            setLoading(false);
        }
    };

    const logout = () => {
        localStorage.removeItem('mal_access_token');
        localStorage.removeItem('mal_refresh_token');
        localStorage.removeItem('mal_user_profile');
        setUser(null);
        setAccessToken(null);
        setError(null);
    };

    const value: MalAuthContextType = {
        isAuthenticated: !!user,
        user,
        loading,
        error,
        login,
        logout,
        accessToken,
    };

    return <MalAuthContext.Provider value={value}>{children}</MalAuthContext.Provider>;
};

export const useMalAuth = () => {
    const context = useContext(MalAuthContext);
    if (context === undefined) {
        throw new Error('useMalAuth must be used within a MalAuthProvider');
    }
    return context;
};
