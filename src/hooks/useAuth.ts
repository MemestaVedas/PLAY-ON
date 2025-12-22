/**
 * Custom React Hook for Authentication
 * 
 * Manages authentication state and provides login/logout functionality
 */

import { useState, useEffect } from 'react';
import {
    getAuthState,
    isAuthenticated as checkAuth,
    initiateOAuth,
    logout as performLogout,
    handleTokenFromHash,
} from '../services/authService';
import { fetchViewer } from '../api/anilistClient';
import type { Viewer } from '../types/auth.types';

interface UseAuthReturn {
    /** Whether user is authenticated */
    isAuthenticated: boolean;
    /** Authenticated user's data */
    user: Viewer | null;
    /** Loading state */
    loading: boolean;
    /** Error message */
    error: string | null;
    /** Start OAuth login */
    login: () => void;
    /** Logout user */
    logout: () => void;
}

/**
 * Hook for managing authentication state
 * 
 * @returns Authentication state and functions
 * 
 * @example
 * ```tsx
 * const { isAuthenticated, user, login, logout } = useAuth();
 * 
 * if (!isAuthenticated) {
 *     return <button onClick={login}>Login with AniList</button>;
 * }
 * 
 * return <div>Welcome, {user?.name}!</div>;
 * ```
 */
export function useAuth(): UseAuthReturn {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState<Viewer | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Check for token in URL hash (OAuth callback)
        handleTokenFromHash();

        // Check if already authenticated
        const authenticated = checkAuth();
        setIsAuthenticated(authenticated);

        // Fetch user data if authenticated
        if (authenticated) {
            fetchUserData();
        } else {
            setLoading(false);
        }
    }, []);

    async function fetchUserData() {
        try {
            setLoading(true);
            const response = await fetchViewer();
            setUser(response.data.Viewer);
            setError(null);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to fetch user data';
            setError(errorMessage);
            console.error('Auth error:', err);
        } finally {
            setLoading(false);
        }
    }

    function login() {
        initiateOAuth();
    }

    function logout() {
        performLogout();
        setIsAuthenticated(false);
        setUser(null);
    }

    return {
        isAuthenticated,
        user,
        loading,
        error,
        login,
        logout,
    };
}
