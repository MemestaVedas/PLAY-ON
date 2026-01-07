/**
 * Cache Utility Functions
 * 
 * Provides functions to clear all cached data from the application.
 */

import { apolloClient } from './apollo';

/**
 * List of localStorage keys used by the application.
 */
const LOCAL_STORAGE_KEYS = [
    'token',                    // AniList OAuth token
    'anilist_token',            // AniList OAuth token (duplicate for compatibility)
    'local-folders',            // User's local media folders
    'onboardingCompleted',      // Onboarding completion flag
    'username',                 // Local username
    'play-on-offline-queue',    // Offline sync queue
    'play-on-local-anime-db',   // Local anime watch database
    'apollo-cache-persist',     // Apollo GraphQL cache
    'play-on-settings',         // Main app settings
    'extension-repos',          // Extension repositories
    'installed-extensions',     // Installed extensions (code bundles)
    'enabled-extensions',       // Status of extensions
];

/**
 * Clears all cached data from localStorage and Apollo cache.
 * This resets the application to a fresh state.
 */
export async function clearAllCache(): Promise<void> {
    // Clear localStorage keys
    LOCAL_STORAGE_KEYS.forEach(key => {
        localStorage.removeItem(key);
    });

    // Clear Apollo cache
    try {
        await apolloClient.clearStore();
    } catch (error) {
        console.error('Failed to clear Apollo cache:', error);
    }

    console.log('All cache cleared successfully');
}

/**
 * Clears cache and reloads the page (stays in app).
 */
export async function clearCacheAndReload(): Promise<void> {
    await clearAllCache();
    window.location.reload();
}
