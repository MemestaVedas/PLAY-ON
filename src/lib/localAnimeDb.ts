/**
 * Local Anime Database
 * 
 * Stores anime watch progress locally using localStorage.
 * This is the "local-first" data layer that syncs to AniList in background.
 */

const STORAGE_KEY = 'playon_anime_db';

/**
 * Local anime entry structure
 */
export interface LocalAnimeEntry {
    /** Local unique ID (typically the AniList ID if known) */
    id: string;
    /** Anime title (for display) */
    title: string;
    /** Romaji title */
    titleRomaji?: string;
    /** AniList media ID (null if not matched yet) */
    anilistId: number | null;
    /** Current season (if known) */
    season?: number;
    /** Current episode progress */
    episode: number;
    /** Total episodes (if known) */
    totalEpisodes?: number;
    /** Watch status: watching, completed, paused, dropped, planning */
    status: 'watching' | 'completed' | 'paused' | 'dropped' | 'planning';
    /** Last watched timestamp */
    lastWatched: number;
    /** Whether this has been synced to AniList */
    synced: boolean;
    /** Timestamp of last sync attempt */
    lastSyncAttempt?: number;
    /** Cover image URL */
    coverImage?: string;
}

/**
 * Get the full local database
 */
export function getLocalDb(): Record<string, LocalAnimeEntry> {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : {};
    } catch (e) {
        console.error('[LocalDB] Failed to parse database:', e);
        return {};
    }
}

/**
 * Save the full database
 */
function saveDb(db: Record<string, LocalAnimeEntry>): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    console.log('[LocalDB] Database saved, entries:', Object.keys(db).length);
}

/**
 * Get a single entry by ID
 */
export function getLocalEntry(id: string): LocalAnimeEntry | null {
    const db = getLocalDb();
    return db[id] || null;
}

/**
 * Get entry by AniList ID
 */
export function getEntryByAnilistId(anilistId: number): LocalAnimeEntry | null {
    const db = getLocalDb();
    return Object.values(db).find(entry => entry.anilistId === anilistId) || null;
}

/**
 * Update or create anime progress (LOCAL ONLY)
 * This does NOT sync to AniList - call syncService separately
 */
export function updateProgress(
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
): LocalAnimeEntry {
    const db = getLocalDb();
    const existing = db[id];

    const entry: LocalAnimeEntry = {
        id,
        title: data.title,
        titleRomaji: data.titleRomaji,
        anilistId: data.anilistId ?? existing?.anilistId ?? null,
        episode: data.episode,
        season: data.season ?? existing?.season,
        totalEpisodes: data.totalEpisodes ?? existing?.totalEpisodes,
        status: determineStatus(data.episode, data.totalEpisodes),
        lastWatched: Date.now(),
        synced: false, // Mark as unsynced since we're updating locally
        lastSyncAttempt: existing?.lastSyncAttempt,
        coverImage: data.coverImage ?? existing?.coverImage,
    };

    db[id] = entry;
    saveDb(db);

    console.log('[LocalDB] Updated progress:', entry.title, 'Ep', entry.episode);
    return entry;
}

/**
 * Determine status based on episode count
 */
function determineStatus(
    episode: number,
    totalEpisodes?: number
): LocalAnimeEntry['status'] {
    if (totalEpisodes && episode >= totalEpisodes) {
        return 'completed';
    }
    return 'watching';
}

/**
 * Mark entry as synced
 */
export function markAsSynced(id: string): void {
    const db = getLocalDb();
    if (db[id]) {
        db[id].synced = true;
        db[id].lastSyncAttempt = Date.now();
        saveDb(db);
        console.log('[LocalDB] Marked as synced:', db[id].title);
    }
}

/**
 * Update sync attempt timestamp (for failed syncs)
 */
export function updateSyncAttempt(id: string): void {
    const db = getLocalDb();
    if (db[id]) {
        db[id].lastSyncAttempt = Date.now();
        saveDb(db);
    }
}

/**
 * Get all entries that need syncing
 */
export function getUnsyncedEntries(): LocalAnimeEntry[] {
    const db = getLocalDb();
    return Object.values(db).filter(entry => !entry.synced && entry.anilistId !== null);
}

/**
 * Get all entries (for display)
 */
export function getAllEntries(): LocalAnimeEntry[] {
    const db = getLocalDb();
    return Object.values(db).sort((a, b) => b.lastWatched - a.lastWatched);
}

/**
 * Get entries by status
 */
export function getEntriesByStatus(status: LocalAnimeEntry['status']): LocalAnimeEntry[] {
    return getAllEntries().filter(entry => entry.status === status);
}

/**
 * Delete an entry
 */
export function deleteEntry(id: string): void {
    const db = getLocalDb();
    delete db[id];
    saveDb(db);
    console.log('[LocalDB] Deleted entry:', id);
}

/**
 * Clear entire database (use with caution!)
 */
export function clearDb(): void {
    localStorage.removeItem(STORAGE_KEY);
    console.log('[LocalDB] Database cleared');
}
