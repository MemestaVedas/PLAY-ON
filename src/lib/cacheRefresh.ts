/**
 * Cache Refresh Utility
 * 
 * Handles automatic cache refresh on app startup if more than 6 hours
 * have passed since the last refresh.
 */

import { apolloClient } from './apollo';

const LAST_REFRESH_KEY = 'playon_last_cache_refresh';
const SIX_HOURS_MS = 6 * 60 * 60 * 1000; // 6 hours in milliseconds

/**
 * Get the timestamp of the last cache refresh
 */
export function getLastCacheRefresh(): number {
    const stored = localStorage.getItem(LAST_REFRESH_KEY);
    return stored ? parseInt(stored, 10) : 0;
}

/**
 * Update the last cache refresh timestamp to now
 */
export function updateLastCacheRefresh(): void {
    localStorage.setItem(LAST_REFRESH_KEY, Date.now().toString());
}

/**
 * Check if cache refresh is needed (more than 6 hours since last refresh)
 */
export function isCacheRefreshNeeded(): boolean {
    const lastRefresh = getLastCacheRefresh();
    const now = Date.now();
    return (now - lastRefresh) > SIX_HOURS_MS;
}

/**
 * Check and refresh cache if needed (called on app startup)
 * Returns true if cache was refreshed, false otherwise
 */
export async function checkAndRefreshCache(): Promise<boolean> {
    if (!isCacheRefreshNeeded()) {
        console.log('[CacheRefresh] Cache is still fresh, skipping refresh');
        return false;
    }

    console.log('[CacheRefresh] Cache is stale, refreshing...');

    try {
        // Clear Apollo cache to force refetch
        await apolloClient.clearStore();

        // Update timestamp
        updateLastCacheRefresh();

        console.log('[CacheRefresh] Cache refreshed successfully');
        return true;
    } catch (error) {
        console.error('[CacheRefresh] Failed to refresh cache:', error);
        return false;
    }
}

/**
 * Force refresh cache regardless of timestamp
 */
export async function forceRefreshCache(): Promise<void> {
    console.log('[CacheRefresh] Forcing cache refresh...');

    try {
        await apolloClient.clearStore();
        updateLastCacheRefresh();
        console.log('[CacheRefresh] Forced cache refresh completed');
    } catch (error) {
        console.error('[CacheRefresh] Failed to force refresh cache:', error);
        throw error;
    }
}
