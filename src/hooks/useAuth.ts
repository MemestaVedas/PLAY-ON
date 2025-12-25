/**
 * Custom React Hook for Authentication
 * 
 * Manages authentication state and provides login/logout functionality
 */

import { useAuthContext } from '../context/AuthContext';
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
 * Now consumes global AuthContext
 * 
 * @returns Authentication state and functions
 */
export function useAuth(): UseAuthReturn {
    return useAuthContext();
}
