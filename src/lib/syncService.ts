/**
 * Sync Service
 * 
 * Handles synchronizing local anime progress to AniList.
 * Uses the Tauri backend command for authenticated mutations.
 */

import { invoke } from '@tauri-apps/api/core';
import { gql } from '@apollo/client';
import { apolloClient } from './apollo';
import { updateMangaProgress } from './localMangaDb';
import {
    getUnsyncedEntries,
    markAsSynced,
    updateSyncAttempt,
    LocalAnimeEntry
} from './localAnimeDb';
import {
    getUnsyncedMangaEntries,
    markMangaAsSynced,
    updateMangaSyncAttempt,
    LocalMangaEntry
} from './localMangaDb';
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
                    `Updated: ${entry.title} - Ep ${entry.episode}${seasonText}`,
                    entry.coverImage
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
 * Sync a single manga entry to AniList
 */
export async function syncMangaEntryToAniList(entry: LocalMangaEntry): Promise<boolean> {
    // Must have AniList ID and token
    const token = localStorage.getItem('anilist_token') || localStorage.getItem('token');

    if (!token) {
        console.log('[MangaSync] Not logged in, skipping sync for:', entry.title);
        return false;
    }

    if (!entry.anilistId) {
        console.log('[MangaSync] No AniList ID for:', entry.title);
        return false;
    }

    try {
        console.log(`[MangaSync] Syncing "${entry.title}" Ch ${entry.chapter} to AniList...`);

        // Map local status to AniList status
        const anilistStatus = mapMangaStatusToAniList(entry.status);

        // Call the Tauri backend command (same as anime, just different media type)
        const result = await invoke<string>('update_anime_progress_command', {
            accessToken: token,
            mediaId: entry.anilistId,
            progress: entry.chapter,
            status: anilistStatus,
        });

        const parsed = JSON.parse(result);
        console.log('[MangaSync] ✓ Success:', entry.title, parsed);

        // Mark as synced in local DB
        markMangaAsSynced(entry.id);

        // Notify user of successful sync
        setTimeout(() => {
            import('../services/notification').then(({ sendDesktopNotification }) => {
                sendDesktopNotification(
                    'Manga Synced to AniList',
                    `Updated: ${entry.title} - Ch ${entry.chapter}`,
                    entry.coverImage
                );
            });
        }, 1500);

        return true;
    } catch (error) {
        console.error('[MangaSync] ✗ Failed:', entry.title, error);

        // Update sync attempt timestamp
        updateMangaSyncAttempt(entry.id);

        // Add to offline queue for retry
        addToOfflineQueue('UpdateMangaProgress', {
            entryId: entry.id,
            anilistId: entry.anilistId,
            chapter: entry.chapter,
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
 * Map local manga status to AniList MediaListStatus
 */
function mapMangaStatusToAniList(status: LocalMangaEntry['status']): string {
    const statusMap: Record<LocalMangaEntry['status'], string> = {
        reading: 'CURRENT',
        completed: 'COMPLETED',
        paused: 'PAUSED',
        dropped: 'DROPPED',
        planning: 'PLANNING',
    };
    return statusMap[status];
}

/**
 * Sync all unsynced entries to AniList (both anime and manga)
 */
export async function syncAllToAniList(): Promise<{ success: number; failed: number }> {
    const unsyncedAnime = getUnsyncedEntries();
    const unsyncedManga = getUnsyncedMangaEntries();

    if (unsyncedAnime.length === 0 && unsyncedManga.length === 0) {
        console.log('[Sync] No entries to sync');
        return { success: 0, failed: 0 };
    }

    console.log(`[Sync] Syncing ${unsyncedAnime.length} anime and ${unsyncedManga.length} manga entries...`);

    let success = 0;
    let failed = 0;

    // Sync anime entries sequentially to avoid rate limits
    for (const entry of unsyncedAnime) {
        const result = await syncEntryToAniList(entry);
        if (result) {
            success++;
        } else {
            failed++;
        }

        // Small delay to avoid hitting rate limits
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Sync manga entries
    for (const entry of unsyncedManga) {
        const result = await syncMangaEntryToAniList(entry);
        if (result) {
            success++;
        } else {
            failed++;
        }

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

/**
 * Sync progress FROM AniList to local DB
 */
export async function syncMangaFromAniList(entry: LocalMangaEntry): Promise<boolean> {
    if (!entry.anilistId) return false;

    // Check auth
    const token = localStorage.getItem('anilist_token') || localStorage.getItem('token');
    if (!token) return false;

    try {
        console.log(`[MangaSync] Fetching progress for "${entry.title}" from AniList...`);

        const { data } = await apolloClient.query({
            query: gql`
                query ($id: Int) {
                    Media(id: $id) {
                        id
                        mediaListEntry {
                            progress
                            status
                            updatedAt
                        }
                    }
                }
            `,
            variables: { id: entry.anilistId },
            fetchPolicy: 'network-only'
        });

        const listEntry = data?.Media?.mediaListEntry;
        if (listEntry) {
            // Update local DB
            if (listEntry.progress > entry.chapter || listEntry.progress !== entry.chapter) {
                updateMangaProgress(entry.id, {
                    title: entry.title,
                    chapter: listEntry.progress,
                    anilistId: entry.anilistId,
                });
                console.log(`[MangaSync] Updated local "${entry.title}" to Ch ${listEntry.progress}`);
                return true;
            }
        }
        return true;
    } catch (e) {
        console.error('[MangaSync] Failed to fetch from AniList:', e);
        return false;
    }
}
