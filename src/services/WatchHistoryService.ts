/**
 * Watch History Service
 * 
 * Stores and retrieves watch history for anime episodes.
 * Persists to localStorage for offline access.
 */

const STORAGE_KEY = 'playon_watch_history';
const MAX_HISTORY_ITEMS = 100;

export interface WatchHistoryEntry {
    id: string; // Unique ID for the entry
    type: 'anime' | 'manga';

    // Media info
    mediaId: number | string;
    title: string;
    coverImage?: string;

    // Episode/Chapter info
    episodeNumber?: number;
    chapterNumber?: number;
    episodeTitle?: string;

    // Source info (for extension-based content)
    sourceId?: string;
    sourceMediaId?: string;
    sourceEpisodeId?: string;

    // Progress
    progress?: number; // 0-100 percentage for anime, chapter number for manga
    duration?: number; // Total duration in seconds (for anime)

    // Timestamps
    watchedAt: number;
    lastUpdated: number;
}

/**
 * Get all watch history entries
 */
export function getWatchHistory(): WatchHistoryEntry[] {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.error('Failed to load watch history:', e);
        return [];
    }
}

/**
 * Get watch history filtered by type
 */
export function getWatchHistoryByType(type: 'anime' | 'manga'): WatchHistoryEntry[] {
    return getWatchHistory().filter(entry => entry.type === type);
}

/**
 * Get recent watch history (last N items)
 */
export function getRecentHistory(limit: number = 20): WatchHistoryEntry[] {
    return getWatchHistory()
        .sort((a, b) => b.lastUpdated - a.lastUpdated)
        .slice(0, limit);
}

/**
 * Add or update a watch history entry
 */
export function addToWatchHistory(entry: Omit<WatchHistoryEntry, 'id' | 'watchedAt' | 'lastUpdated'>): void {
    try {
        const history = getWatchHistory();
        const now = Date.now();

        // Create unique ID based on media and episode
        const entryId = `${entry.type}_${entry.mediaId}_${entry.episodeNumber || entry.chapterNumber || 0}`;

        // Check if entry already exists
        const existingIndex = history.findIndex(h => h.id === entryId);

        const newEntry: WatchHistoryEntry = {
            ...entry,
            id: entryId,
            watchedAt: existingIndex >= 0 ? history[existingIndex].watchedAt : now,
            lastUpdated: now
        };

        if (existingIndex >= 0) {
            // Update existing entry
            history[existingIndex] = newEntry;
        } else {
            // Add new entry at the beginning
            history.unshift(newEntry);
        }

        // Limit history size
        const trimmedHistory = history.slice(0, MAX_HISTORY_ITEMS);

        localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedHistory));
    } catch (e) {
        console.error('Failed to add to watch history:', e);
    }
}

/**
 * Update progress for an existing entry
 */
export function updateWatchProgress(
    mediaId: number | string,
    episodeNumber: number,
    progress: number,
    duration?: number
): void {
    try {
        const history = getWatchHistory();
        const entryId = `anime_${mediaId}_${episodeNumber}`;

        const existingIndex = history.findIndex(h => h.id === entryId);

        if (existingIndex >= 0) {
            history[existingIndex].progress = progress;
            if (duration) {
                history[existingIndex].duration = duration;
            }
            history[existingIndex].lastUpdated = Date.now();

            localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
        }
    } catch (e) {
        console.error('Failed to update watch progress:', e);
    }
}

/**
 * Remove a specific entry from history
 */
export function removeFromWatchHistory(entryId: string): void {
    try {
        const history = getWatchHistory();
        const filtered = history.filter(h => h.id !== entryId);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    } catch (e) {
        console.error('Failed to remove from watch history:', e);
    }
}

/**
 * Clear all watch history
 */
export function clearWatchHistory(): void {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
        console.error('Failed to clear watch history:', e);
    }
}

/**
 * Get the last watched episode for a specific media
 */
export function getLastWatched(mediaId: number | string, type: 'anime' | 'manga'): WatchHistoryEntry | null {
    const history = getWatchHistory();
    const entries = history
        .filter(h => h.mediaId === mediaId && h.type === type)
        .sort((a, b) => b.lastUpdated - a.lastUpdated);

    return entries[0] || null;
}

/**
 * Check if an episode/chapter has been watched
 */
export function hasBeenWatched(
    mediaId: number | string,
    episodeOrChapter: number,
    type: 'anime' | 'manga'
): boolean {
    const entryId = `${type}_${mediaId}_${episodeOrChapter}`;
    const history = getWatchHistory();
    return history.some(h => h.id === entryId);
}

export default {
    getWatchHistory,
    getWatchHistoryByType,
    getRecentHistory,
    addToWatchHistory,
    updateWatchProgress,
    removeFromWatchHistory,
    clearWatchHistory,
    getLastWatched,
    hasBeenWatched
};
