import React, { createContext, useContext, useState, useEffect } from 'react';
import {
    isAuthenticated as checkAuth,
    logout as performLogout,
    initiateOAuth as startOAuth
} from '../services/authService';
import type { Viewer } from '../types/auth.types';

interface AuthContextType {
    isAuthenticated: boolean;
    user: Viewer | null;
    loading: boolean;
    error: string | null;
    login: () => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState<Viewer | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const initAuth = async () => {
            try {
                const authenticated = checkAuth();
                setIsAuthenticated(authenticated);

                if (authenticated) {
                    // Mock user data for the generic shell
                    setUser({
                        id: 12345,
                        name: 'MemestaVedas',
                        avatar: {
                            large: 'https://placehold.co/150x150/2563eb/FFF?text=K',
                            medium: 'https://placehold.co/150x150/2563eb/FFF?text=K',
                        }
                    });
                }
            } catch (err) {
                console.error('Failed to initialize auth:', err);
                setError('Failed to initialize authentication');
            } finally {
                setLoading(false);
            }
        };

        initAuth();
    }, []);

    const login = () => {
        startOAuth();
    };

    const logout = () => {
        performLogout();
        setIsAuthenticated(false);
        setUser(null);
    };

    const value = {
        isAuthenticated,
        user,
        loading,
        error,
        login,
        logout
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
