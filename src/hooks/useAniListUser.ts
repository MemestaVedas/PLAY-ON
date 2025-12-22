/**
 * Custom React Hook for AniList User Data
 * 
 * INTERVIEW EXPLANATION - React Hooks:
 * ====================================
 * 
 * What are React Hooks?
 * ---------------------
 * Hooks are functions that let you "hook into" React features like state and lifecycle.
 * They were introduced in React 16.8 to use state without writing class components.
 * 
 * Common built-in hooks:
 * - useState: Manage component state
 * - useEffect: Perform side effects (API calls, subscriptions, etc.)
 * - useCallback: Memoize functions
 * - useMemo: Memoize values
 * 
 * Why create custom hooks?
 * ------------------------
 * 1. Reusability: Use the same logic in multiple components
 * 2. Separation of concerns: Keep business logic separate from UI
 * 3. Testability: Easier to test hooks in isolation
 * 4. Readability: Components stay focused on rendering
 * 5. Composition: Combine multiple hooks into one
 * 
 * This Hook's Purpose:
 * --------------------
 * Fetches AniList user data and manages loading/error states.
 * Any component can use this hook to get user data without duplicating logic.
 */

import { useState, useEffect } from 'react';
import { fetchAniListUser } from '../api/anilistClient';
import type { AniListUser } from '../types/anilist.types';
import { config } from '../config/config';

/**
 * Return type for the hook
 * This defines what data the hook provides to components
 */
interface UseAniListUserReturn {
    /** User data from AniList (null while loading or on error) */
    user: AniListUser | null;
    /** True while fetching data */
    loading: boolean;
    /** Error message if fetch failed (null on success) */
    error: string | null;
}

/**
 * Custom hook to fetch and manage AniList user data
 * 
 * INTERVIEW EXPLANATION - How This Hook Works:
 * ============================================
 * 
 * State Management (useState):
 * ---------------------------
 * We track three pieces of state:
 * 1. user: The fetched user data (null initially)
 * 2. loading: Whether we're currently fetching (true initially)
 * 3. error: Any error that occurred (null initially)
 * 
 * Side Effects (useEffect):
 * -------------------------
 * useEffect runs after the component renders. We use it to:
 * 1. Fetch data when component mounts
 * 2. Update state based on fetch result
 * 
 * The empty dependency array [] means:
 * - Run once when component mounts
 * - Don't run again unless component unmounts and remounts
 * 
 * The Fetch Flow:
 * ---------------
 * 1. Component mounts → useEffect runs
 * 2. Set loading = true
 * 3. Call fetchAniListUser()
 * 4. On success:
 *    - Set user data
 *    - Set loading = false
 * 5. On error:
 *    - Set error message
 *    - Set loading = false
 * 6. Component re-renders with new state
 * 
 * Error Handling:
 * ---------------
 * - Try/catch wraps the async call
 * - Errors are stored in state, not thrown
 * - Components can check error state and show fallback UI
 * 
 * @returns Object with user data, loading state, and error state
 */
export function useAniListUser(): UseAniListUserReturn {
    // State: User data (null until loaded)
    const [user, setUser] = useState<AniListUser | null>(null);

    // State: Loading indicator (true while fetching)
    const [loading, setLoading] = useState<boolean>(true);

    // State: Error message (null if no error)
    const [error, setError] = useState<string | null>(null);

    // Effect: Fetch user data on component mount
    useEffect(() => {
        /**
         * Async function to fetch user data
         * 
         * Why define a function inside useEffect?
         * - useEffect callback can't be async directly
         * - We need async/await to handle the Promise
         * - Solution: Define async function and call it immediately
         */
        async function loadUser() {
            try {
                // Start loading
                setLoading(true);
                setError(null);

                // Fetch user data from AniList
                const response = await fetchAniListUser(config.anilist.username);

                // Update state with user data
                setUser(response.data.User);
            } catch (err) {
                // Handle errors
                const errorMessage = err instanceof Error
                    ? err.message
                    : 'Failed to load AniList user';

                setError(errorMessage);
                console.error('AniList fetch error:', err);
            } finally {
                // Always stop loading, whether success or error
                setLoading(false);
            }
        }

        // Call the async function
        loadUser();
    }, []); // Empty dependency array = run once on mount

    // Return state for components to use
    return { user, loading, error };
}

/**
 * INTERVIEW TALKING POINTS:
 * =========================
 * 
 * 1. Why not fetch in the component directly?
 *    - Reusability: Multiple components can use this hook
 *    - Testing: Easier to test hook separately
 *    - Separation: Component focuses on UI, hook handles data
 * 
 * 2. State management alternatives:
 *    - For simple apps: useState + useEffect (what we're using)
 *    - For complex apps: Redux, Zustand, or React Query
 *    - React Query is great for API data (caching, refetching, etc.)
 * 
 * 3. Performance considerations:
 *    - Data is fetched once per component mount
 *    - Could add caching with useMemo or external cache
 *    - Could add refetch functionality
 *    - Could add loading debouncing
 * 
 * 4. Potential improvements:
 *    - Add retry logic for failed requests
 *    - Add caching to avoid redundant fetches
 *    - Add ability to manually refetch
 *    - Add request cancellation on unmount
 *    - Use React Query for automatic caching/refetching
 * 
 * 5. TypeScript benefits:
 *    - Return type ensures components get correct data shape
 *    - Null checks prevent runtime errors
 *    - IDE autocomplete for user properties
 */
