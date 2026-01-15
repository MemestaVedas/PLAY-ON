/**
 * MAL Sync Service
 * 
 * Compares AniList and MAL collections to generate diff reports.
 * Allows syncing MAL entries from AniList data.
 */

import { fetchUserAnimeCollection, fetchUserMangaCollection } from '../api/anilistClient';
import * as malClient from '../api/malClient';

// ============================================================================
// TYPES
// ============================================================================

export interface AniListEntry {
    id: number;
    title: string;
    progress: number;
    status: string;
    score: number;
    type: 'anime' | 'manga';
}

export interface MalEntry {
    id: number;
    title: string;
    progress: number;
    status: string;
    score: number;
    type: 'anime' | 'manga';
}

export interface SyncDiffEntry {
    anilistId: number;
    malId: number | null;
    title: string;
    type: 'anime' | 'manga';
    anilist: {
        progress: number;
        status: string;
        score: number;
    };
    mal: {
        progress: number;
        status: string;
        score: number;
    } | null;
    differences: ('progress' | 'status' | 'score' | 'missing')[];
}

export interface SyncDiffReport {
    anime: SyncDiffEntry[];
    manga: SyncDiffEntry[];
    summary: {
        totalAnime: number;
        totalManga: number;
        animeDiffs: number;
        mangaDiffs: number;
        missingOnMal: number;
    };
    generatedAt: Date;
}

export interface SyncUpdateResult {
    success: boolean;
    entry: SyncDiffEntry;
    error?: string;
}

// ============================================================================
// STATUS MAPPING
// ============================================================================

const ANILIST_TO_MAL_ANIME_STATUS: Record<string, string> = {
    'CURRENT': 'watching',
    'COMPLETED': 'completed',
    'PAUSED': 'on_hold',
    'DROPPED': 'dropped',
    'PLANNING': 'plan_to_watch',
    'REPEATING': 'watching',
};

const ANILIST_TO_MAL_MANGA_STATUS: Record<string, string> = {
    'CURRENT': 'reading',
    'COMPLETED': 'completed',
    'PAUSED': 'on_hold',
    'DROPPED': 'dropped',
    'PLANNING': 'plan_to_read',
    'REPEATING': 'reading',
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Normalize a title for matching (lowercase, remove special chars)
 */
function normalizeTitle(title: string): string {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Calculate similarity between two strings (0-1)
 */
function stringSimilarity(a: string, b: string): number {
    const normA = normalizeTitle(a);
    const normB = normalizeTitle(b);

    if (normA === normB) return 1;
    if (normA.includes(normB) || normB.includes(normA)) return 0.9;

    // Simple word overlap scoring
    const wordsA = new Set(normA.split(' '));
    const wordsB = new Set(normB.split(' '));
    const intersection = [...wordsA].filter(w => wordsB.has(w)).length;
    const union = new Set([...wordsA, ...wordsB]).size;

    return intersection / union;
}

/**
 * Find the best matching MAL entry for an AniList entry
 */
function findBestMatch(
    anilistEntry: AniListEntry,
    malEntries: MalEntry[]
): MalEntry | null {
    let bestMatch: MalEntry | null = null;
    let bestScore = 0;

    for (const malEntry of malEntries) {
        if (malEntry.type !== anilistEntry.type) continue;

        const similarity = stringSimilarity(anilistEntry.title, malEntry.title);
        if (similarity > bestScore && similarity > 0.6) {
            bestScore = similarity;
            bestMatch = malEntry;
        }
    }

    return bestMatch;
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Fetch all AniList entries for a user
 */
export async function fetchAniListEntries(userId: number): Promise<AniListEntry[]> {
    // Use Maps to deduplicate entries by ID (same anime can appear in multiple lists)
    const animeMap = new Map<number, AniListEntry>();
    const mangaMap = new Map<number, AniListEntry>();

    try {
        // Fetch anime
        const animeResult = await fetchUserAnimeCollection(userId);
        const animeLists = animeResult.data?.MediaListCollection?.lists || [];

        for (const list of animeLists) {
            for (const entry of list.entries || []) {
                const id = entry.media.id;
                // Only add if not already present (first occurrence wins)
                if (!animeMap.has(id)) {
                    animeMap.set(id, {
                        id,
                        title: entry.media.title?.english || entry.media.title?.romaji || 'Unknown',
                        progress: entry.progress || 0,
                        status: entry.status || 'CURRENT',
                        score: entry.score || 0,
                        type: 'anime',
                    });
                }
            }
        }

        // Fetch manga
        const mangaResult = await fetchUserMangaCollection(userId);
        const mangaLists = mangaResult.data?.MediaListCollection?.lists || [];

        for (const list of mangaLists) {
            for (const entry of list.entries || []) {
                const id = entry.media.id;
                // Only add if not already present (first occurrence wins)
                if (!mangaMap.has(id)) {
                    mangaMap.set(id, {
                        id,
                        title: entry.media.title?.english || entry.media.title?.romaji || 'Unknown',
                        progress: entry.progress || 0,
                        status: entry.status || 'CURRENT',
                        score: entry.score || 0,
                        type: 'manga',
                    });
                }
            }
        }
    } catch (e) {
        console.error('[MalSync] Failed to fetch AniList entries:', e);
        throw e;
    }

    // Combine both maps into a single array
    return [...animeMap.values(), ...mangaMap.values()];
}

/**
 * Fetch all MAL entries for a user
 */
export async function fetchMalEntries(accessToken: string): Promise<MalEntry[]> {
    const entries: MalEntry[] = [];

    try {
        // Fetch anime list (up to 1000 entries)
        const animeList = await malClient.fetchAnimeList(accessToken, undefined, 1000);
        for (const item of animeList) {
            entries.push({
                id: item.anime.id,
                title: item.anime.title,
                progress: item.num_episodes_watched,
                status: item.status,
                score: item.score,
                type: 'anime',
            });
        }

        // Fetch manga list (up to 1000 entries)
        const mangaList = await malClient.fetchMangaList(accessToken, undefined, 1000);
        for (const item of mangaList) {
            entries.push({
                id: item.manga.id,
                title: item.manga.title,
                progress: item.num_chapters_read,
                status: item.status,
                score: item.score,
                type: 'manga',
            });
        }
    } catch (e) {
        console.error('[MalSync] Failed to fetch MAL entries:', e);
        throw e;
    }

    return entries;
}

/**
 * Generate a sync diff report comparing AniList to MAL
 */
export async function generateSyncReport(
    anilistUserId: number,
    malAccessToken: string
): Promise<SyncDiffReport> {
    console.log('[MalSync] Generating sync report...');

    // Fetch both collections
    const [anilistEntries, malEntries] = await Promise.all([
        fetchAniListEntries(anilistUserId),
        fetchMalEntries(malAccessToken),
    ]);

    console.log(`[MalSync] Found ${anilistEntries.length} AniList entries, ${malEntries.length} MAL entries`);

    const animeDiffs: SyncDiffEntry[] = [];
    const mangaDiffs: SyncDiffEntry[] = [];
    let missingOnMal = 0;

    // Compare each AniList entry against MAL
    for (const aniEntry of anilistEntries) {
        const malMatch = findBestMatch(aniEntry, malEntries);
        const differences: SyncDiffEntry['differences'] = [];

        if (!malMatch) {
            // Entry missing on MAL
            differences.push('missing');
            missingOnMal++;
        } else {
            // Compare progress
            if (aniEntry.progress !== malMatch.progress) {
                differences.push('progress');
            }

            // Compare status (convert AniList status to MAL format for comparison)
            const expectedMalStatus = aniEntry.type === 'anime'
                ? ANILIST_TO_MAL_ANIME_STATUS[aniEntry.status]
                : ANILIST_TO_MAL_MANGA_STATUS[aniEntry.status];

            if (expectedMalStatus && malMatch.status !== expectedMalStatus) {
                differences.push('status');
            }

            // Compare score (AniList uses 0-100, MAL uses 0-10)
            // Convert AniList score to MAL scale (divide by 10, round)
            const anilistScoreAsMal = Math.round(aniEntry.score / 10);
            if (anilistScoreAsMal !== malMatch.score) {
                differences.push('score');
            }
        }

        // Only add to diff report if there are differences
        if (differences.length > 0) {
            const diffEntry: SyncDiffEntry = {
                anilistId: aniEntry.id,
                malId: malMatch?.id || null,
                title: aniEntry.title,
                type: aniEntry.type,
                anilist: {
                    progress: aniEntry.progress,
                    status: aniEntry.status,
                    score: aniEntry.score,
                },
                mal: malMatch ? {
                    progress: malMatch.progress,
                    status: malMatch.status,
                    score: malMatch.score,
                } : null,
                differences,
            };

            if (aniEntry.type === 'anime') {
                animeDiffs.push(diffEntry);
            } else {
                mangaDiffs.push(diffEntry);
            }
        }
    }

    const report: SyncDiffReport = {
        anime: animeDiffs,
        manga: mangaDiffs,
        summary: {
            totalAnime: anilistEntries.filter(e => e.type === 'anime').length,
            totalManga: anilistEntries.filter(e => e.type === 'manga').length,
            animeDiffs: animeDiffs.length,
            mangaDiffs: mangaDiffs.length,
            missingOnMal,
        },
        generatedAt: new Date(),
    };

    console.log('[MalSync] Report generated:', report.summary);
    return report;
}

/**
 * Update a single MAL entry to match AniList
 */
export async function syncEntryToMal(
    malAccessToken: string,
    entry: SyncDiffEntry
): Promise<SyncUpdateResult> {
    try {
        if (!entry.malId) {
            // Entry doesn't exist on MAL - would need to add it
            // MAL API doesn't easily support adding new entries, skip for now
            return {
                success: false,
                entry,
                error: 'Entry not found on MAL. Please add it manually first.',
            };
        }

        // Convert status
        const malStatus = entry.type === 'anime'
            ? ANILIST_TO_MAL_ANIME_STATUS[entry.anilist.status] as malClient.MalAnimeStatus
            : ANILIST_TO_MAL_MANGA_STATUS[entry.anilist.status] as malClient.MalMangaStatus;

        if (entry.type === 'anime') {
            await malClient.updateAnimeProgress(
                malAccessToken,
                entry.malId,
                entry.anilist.progress,
                malStatus as malClient.MalAnimeStatus
            );
        } else {
            await malClient.updateMangaProgress(
                malAccessToken,
                entry.malId,
                entry.anilist.progress,
                malStatus as malClient.MalMangaStatus
            );
        }

        console.log(`[MalSync] Updated ${entry.type} "${entry.title}" on MAL`);

        return { success: true, entry };
    } catch (e) {
        console.error(`[MalSync] Failed to update "${entry.title}":`, e);
        return {
            success: false,
            entry,
            error: String(e),
        };
    }
}

/**
 * Sync multiple entries to MAL
 */
export async function syncMultipleToMal(
    malAccessToken: string,
    entries: SyncDiffEntry[]
): Promise<SyncUpdateResult[]> {
    const results: SyncUpdateResult[] = [];

    // Process sequentially to avoid rate limiting
    for (const entry of entries) {
        const result = await syncEntryToMal(malAccessToken, entry);
        results.push(result);

        // Small delay between requests to be nice to MAL API
        await new Promise(resolve => setTimeout(resolve, 200));
    }

    return results;
}
