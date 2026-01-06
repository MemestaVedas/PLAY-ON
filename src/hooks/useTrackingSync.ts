/**
 * Unified Tracking Sync Service
 * 
 * Provides hooks to sync anime/manga progress to both AniList and MAL simultaneously.
 * Handles ID mapping and status conversion between the two services.
 */

import { useAuthContext } from '../context/AuthContext';
import { useMalAuth } from '../context/MalAuthContext';
import { updateMangaProgress as updateAnilistMangaProgress, updateMediaProgress as updateAnilistAnimeProgress } from '../api/anilistClient';
import * as malClient from '../api/malClient';

export interface SyncResult {
    anilist: { success: boolean; error?: string };
    mal: { success: boolean; error?: string };
}

/**
 * Hook for syncing media progress to all connected trackers
 */
export function useTrackingSync() {
    const anilistAuth = useAuthContext();
    const malAuth = useMalAuth();

    /**
     * Sync anime progress to all connected services
     * 
     * @param anilistId - AniList anime ID
     * @param malId - MAL anime ID (optional, will skip MAL if not provided)
     * @param progress - Episode number
     * @param status - AniList status format (will be converted for MAL)
     */
    const syncAnimeProgress = async (
        anilistId: number,
        malId: number | null,
        progress: number,
        status?: string
    ): Promise<SyncResult> => {
        const result: SyncResult = {
            anilist: { success: false },
            mal: { success: false },
        };

        // Sync to AniList
        if (anilistAuth.isAuthenticated) {
            try {
                await updateAnilistAnimeProgress(anilistId, progress, status);
                result.anilist.success = true;
                console.log(`[Sync] AniList anime ${anilistId} updated to episode ${progress}`);
            } catch (e) {
                result.anilist.error = String(e);
                console.error('[Sync] AniList anime update failed:', e);
            }
        }

        // Sync to MAL
        if (malAuth.isAuthenticated && malAuth.accessToken && malId) {
            try {
                const malStatus = status ? malClient.anilistToMalAnimeStatus(status) : undefined;
                await malClient.updateAnimeProgress(malAuth.accessToken, malId, progress, malStatus);
                result.mal.success = true;
                console.log(`[Sync] MAL anime ${malId} updated to episode ${progress}`);
            } catch (e) {
                result.mal.error = String(e);
                console.error('[Sync] MAL anime update failed:', e);
            }
        } else if (!malId) {
            result.mal.error = 'MAL ID not provided';
        }

        return result;
    };

    /**
     * Sync manga progress to all connected services
     * 
     * @param anilistId - AniList manga ID
     * @param malId - MAL manga ID (optional, will skip MAL if not provided)
     * @param chaptersRead - Number of chapters read
     * @param status - AniList status format (will be converted for MAL)
     */
    const syncMangaProgress = async (
        anilistId: number,
        malId: number | null,
        chaptersRead: number,
        status?: string
    ): Promise<SyncResult> => {
        const result: SyncResult = {
            anilist: { success: false },
            mal: { success: false },
        };

        // Sync to AniList
        if (anilistAuth.isAuthenticated) {
            try {
                await updateAnilistMangaProgress(anilistId, chaptersRead, status);
                result.anilist.success = true;
                console.log(`[Sync] AniList manga ${anilistId} updated to chapter ${chaptersRead}`);
            } catch (e) {
                result.anilist.error = String(e);
                console.error('[Sync] AniList manga update failed:', e);
            }
        }

        // Sync to MAL
        if (malAuth.isAuthenticated && malAuth.accessToken && malId) {
            try {
                const malStatus = status ? malClient.anilistToMalMangaStatus(status) : undefined;
                await malClient.updateMangaProgress(malAuth.accessToken, malId, chaptersRead, malStatus);
                result.mal.success = true;
                console.log(`[Sync] MAL manga ${malId} updated to chapter ${chaptersRead}`);
            } catch (e) {
                result.mal.error = String(e);
                console.error('[Sync] MAL manga update failed:', e);
            }
        } else if (!malId) {
            result.mal.error = 'MAL ID not provided';
        }

        return result;
    };

    /**
     * Check which services are connected
     */
    const getConnectedServices = () => ({
        anilist: anilistAuth.isAuthenticated,
        mal: malAuth.isAuthenticated,
    });

    return {
        syncAnimeProgress,
        syncMangaProgress,
        getConnectedServices,
        isAnilistConnected: anilistAuth.isAuthenticated,
        isMalConnected: malAuth.isAuthenticated,
    };
}

/**
 * Search for matching MAL ID given an AniList title
 * This is a helper to find the corresponding MAL entry for cross-syncing
 */
export async function findMalIdByTitle(
    malAccessToken: string,
    title: string,
    type: 'anime' | 'manga'
): Promise<number | null> {
    try {
        const results = type === 'anime'
            ? await malClient.searchAnime(malAccessToken, title, 5)
            : await malClient.searchManga(malAccessToken, title, 5);

        if (results.length > 0) {
            // Return first match - could be improved with fuzzy matching
            return results[0].id;
        }
        return null;
    } catch (e) {
        console.error(`[Sync] Failed to find MAL ${type} for "${title}":`, e);
        return null;
    }
}
