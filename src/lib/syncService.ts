/**
 * Sync Service
 * 
 * Handles synchronizing local anime progress to AniList.
 * Uses the Tauri backend command for authenticated mutations.
 */

import { invoke } from '@tauri-apps/api/core';
import {
    getUnsyncedEntries,
    markAsSynced,
    updateSyncAttempt,
    LocalAnimeEntry
} from './localAnimeDb';
import { addToOfflineQueue } from './offlineQueue';

/**
 * Sync a single entry to AniList
 */
export async function syncEntryToAniList(entry: LocalAnimeEntry): Promise<boolean> {
    // Must have AniList ID and token
    const token = localStorage.getItem('anilist_token') || localStorage.getItem('token');

    if (!token) {
        console.log('[Sync] Not logged in, skipping sync for:', entry.title);
        return false;
    }

    if (!entry.anilistId) {
        console.log('[Sync] No AniList ID for:', entry.title);
        return false;
    }

    try {
        console.log(`[Sync] Syncing "${entry.title}" Ep ${entry.episode} to AniList...`);

        // Map local status to AniList status
        const anilistStatus = mapStatusToAniList(entry.status);

        // Call the Tauri backend command
        const result = await invoke<string>('update_anime_progress_command', {
            accessToken: token,
            mediaId: entry.anilistId,
            progress: entry.episode,
            status: anilistStatus,
        });

        const parsed = JSON.parse(result);
        console.log('[Sync] ✓ Success:', entry.title, parsed);

        // Mark as synced in local DB
        markAsSynced(entry.id);

        // Notify user of successful sync
        // Using a short timeout to prevent it from overlapping with the "watching" notification
        setTimeout(() => {
            const seasonText = entry.season ? ` S${entry.season}` : '';
            import('../services/notification').then(({ sendDesktopNotification }) => {
                sendDesktopNotification(
                    'Synced to AniList',
                    `Updated: ${entry.title} - Ep ${entry.episode}${seasonText}`
                );
            });
        }, 1500);

        return true;
    } catch (error) {
        console.error('[Sync] ✗ Failed:', entry.title, error);

        // Update sync attempt timestamp
        updateSyncAttempt(entry.id);

        // Add to offline queue for retry
        addToOfflineQueue('UpdateAnimeProgress', {
            entryId: entry.id,
            anilistId: entry.anilistId,
            episode: entry.episode,
            status: entry.status,
        });

        return false;
    }
}

/**
 * Map local status to AniList MediaListStatus
 */
function mapStatusToAniList(status: LocalAnimeEntry['status']): string {
    const statusMap: Record<LocalAnimeEntry['status'], string> = {
        watching: 'CURRENT',
        completed: 'COMPLETED',
        paused: 'PAUSED',
        dropped: 'DROPPED',
        planning: 'PLANNING',
    };
    return statusMap[status];
}

/**
 * Sync all unsynced entries to AniList
 */
export async function syncAllToAniList(): Promise<{ success: number; failed: number }> {
    const unsynced = getUnsyncedEntries();

    if (unsynced.length === 0) {
        console.log('[Sync] No entries to sync');
        return { success: 0, failed: 0 };
    }

    console.log(`[Sync] Syncing ${unsynced.length} entries...`);

    let success = 0;
    let failed = 0;

    // Sync sequentially to avoid rate limits
    for (const entry of unsynced) {
        const result = await syncEntryToAniList(entry);
        if (result) {
            success++;
        } else {
            failed++;
        }

        // Small delay to avoid hitting rate limits
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`[Sync] Complete: ${success} synced, ${failed} failed`);
    return { success, failed };
}

/**
 * Quick update: Save locally AND sync immediately
 * Use this for user-triggered updates
 */
export async function updateAndSync(
    id: string,
    data: {
        title: string;
        titleRomaji?: string;
        episode: number;
        season?: number;
        totalEpisodes?: number;
        anilistId?: number;
        coverImage?: string;
    }
): Promise<{ local: LocalAnimeEntry; synced: boolean }> {
    // Import here to avoid circular dependency
    const { updateProgress } = await import('./localAnimeDb');

    // Update local DB first (instant)
    const entry = updateProgress(id, data);

    // Then try to sync to AniList (background)
    const synced = await syncEntryToAniList(entry);

    return { local: entry, synced };
}

/**
 * Auto-sync hook - call this periodically or on network reconnect
 */
export function startAutoSync(intervalMs: number = 60000): () => void {
    console.log('[Sync] Starting auto-sync every', intervalMs / 1000, 'seconds');

    const interval = setInterval(() => {
        if (navigator.onLine) {
            syncAllToAniList();
        }
    }, intervalMs);

    // Also sync on reconnect
    const handleOnline = () => {
        console.log('[Sync] Network reconnected, syncing...');
        syncAllToAniList();
    };
    window.addEventListener('online', handleOnline);

    // Return cleanup function
    return () => {
        clearInterval(interval);
        window.removeEventListener('online', handleOnline);
    };
}
