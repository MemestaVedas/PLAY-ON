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
    /** Local unique ID (typically the AniList ID if known, or source-based ID) */
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
    /** Source ID (e.g., 'hianime') */
    sourceId?: string;
    /** Anime ID within the source */
    sourceAnimeId?: string;
    /** Whether the anime is in the user's library */
    inLibrary?: boolean;
    /** IDs of user-defined categories this anime belongs to */
    categoryIds?: string[];
    /** ID of the last watched episode (for resume) */
    lastWatchedEpisodeId?: string;
    /** Cached Description */
    description?: string;
    /** Cached Genres */
    genres?: string[];
    /** Type (TV, Movie, OVA, etc.) */
    type?: string;
    /** Sub or Dub */
    subOrDub?: string;
    /** Release date/year */
    releaseDate?: string;
    /** Per-anime sub/dub preference: 'sub' | 'dub' */
    subOrDubPref?: 'sub' | 'dub';
}

export interface AnimeLibraryCategory {
    id: string;
    name: string;
    order: number;
}

const CATEGORIES_KEY = 'playon_anime_categories';

/**
 * Get all anime library categories
 */
export function getAnimeLibraryCategories(): AnimeLibraryCategory[] {
    try {
        const data = localStorage.getItem(CATEGORIES_KEY);
        if (!data) {
            const defaultCats = [{ id: 'default', name: 'Default', order: 0 }];
            saveAnimeLibraryCategories(defaultCats);
            return defaultCats;
        }
        return JSON.parse(data);
    } catch {
        return [{ id: 'default', name: 'Default', order: 0 }];
    }
}

/**
 * Save anime library categories
 */
export function saveAnimeLibraryCategories(categories: AnimeLibraryCategory[]): void {
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
}

/**
 * Add a new category
 */
export function addAnimeLibraryCategory(name: string): AnimeLibraryCategory {
    const categories = getAnimeLibraryCategories();
    if (categories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
        throw new Error('Category already exists');
    }

    const newCategory: AnimeLibraryCategory = {
        id: crypto.randomUUID(),
        name,
        order: categories.length
    };

    categories.push(newCategory);
    saveAnimeLibraryCategories(categories);
    return newCategory;
}

/**
 * Delete a category
 */
export function deleteAnimeLibraryCategory(id: string): void {
    const categories = getAnimeLibraryCategories();
    const newCategories = categories.filter(c => c.id !== id);
    saveAnimeLibraryCategories(newCategories);
}

/**
 * Get the full local database
 */
export function getLocalAnimeDb(): Record<string, LocalAnimeEntry> {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : {};
    } catch (e) {
        console.error('[LocalAnimeDB] Failed to parse database:', e);
        return {};
    }
}

// Legacy alias for compatibility
export const getLocalDb = getLocalAnimeDb;

/**
 * Save the full database
 */
function saveDb(db: Record<string, LocalAnimeEntry>): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

/**
 * Get a single entry by ID
 */
export function getLocalAnimeEntry(id: string): LocalAnimeEntry | null {
    const db = getLocalAnimeDb();
    return db[id] || null;
}

// Legacy alias
export const getLocalEntry = getLocalAnimeEntry;

/**
 * Get entry by AniList ID
 */
export function getAnimeEntryByAnilistId(anilistId: number): LocalAnimeEntry | null {
    const db = getLocalAnimeDb();
    return Object.values(db).find(entry => entry.anilistId === anilistId) || null;
}

// Legacy alias
export const getEntryByAnilistId = getAnimeEntryByAnilistId;

/**
 * Get entry by source anime ID
 */
export function getAnimeEntryBySourceId(sourceId: string, sourceAnimeId: string): LocalAnimeEntry | null {
    const db = getLocalAnimeDb();
    return Object.values(db).find(
        entry => entry.sourceId === sourceId && entry.sourceAnimeId === sourceAnimeId
    ) || null;
}

/**
 * Update or create anime progress (LOCAL ONLY)
 */
export function updateAnimeProgress(
    id: string,
    data: {
        title: string;
        titleRomaji?: string;
        episode: number;
        season?: number;
        totalEpisodes?: number;
        anilistId?: number | null;
        coverImage?: string;
        sourceId?: string;
        sourceAnimeId?: string;
        episodeId?: string;
        description?: string;
        genres?: string[];
        type?: string;
        subOrDub?: string;
        releaseDate?: string;
        subOrDubPref?: 'sub' | 'dub';
    },
    allowRegress: boolean = false
): LocalAnimeEntry {
    const db = getLocalAnimeDb();
    const existing = db[id];

    // Only update if episode is higher than existing (don't regress) unless allowRegress is true
    const currentEpisode = existing?.episode ?? 0;
    const newEpisode = allowRegress ? data.episode : Math.max(currentEpisode, data.episode);

    const entry: LocalAnimeEntry = {
        id,
        title: data.title,
        titleRomaji: data.titleRomaji,
        anilistId: data.anilistId ?? existing?.anilistId ?? null,
        episode: newEpisode,
        season: data.season ?? existing?.season,
        totalEpisodes: data.totalEpisodes ?? existing?.totalEpisodes,
        status: determineAnimeStatus(newEpisode, data.totalEpisodes),
        lastWatched: Date.now(),
        synced: false,
        lastSyncAttempt: existing?.lastSyncAttempt,
        coverImage: data.coverImage ?? existing?.coverImage,
        sourceId: data.sourceId ?? existing?.sourceId,
        sourceAnimeId: data.sourceAnimeId ?? existing?.sourceAnimeId,
        inLibrary: existing?.inLibrary ?? false,
        categoryIds: existing?.categoryIds,
        lastWatchedEpisodeId: data.episodeId ?? existing?.lastWatchedEpisodeId,
        description: data.description ?? existing?.description,
        genres: data.genres ?? existing?.genres,
        type: data.type ?? existing?.type,
        subOrDub: data.subOrDub ?? existing?.subOrDub,
        releaseDate: data.releaseDate ?? existing?.releaseDate,
        subOrDubPref: data.subOrDubPref ?? existing?.subOrDubPref ?? 'sub',
    };

    db[id] = entry;
    saveDb(db);

    console.log('[LocalAnimeDB] Updated progress:', entry.title, 'Ep', entry.episode);
    return entry;
}

// Legacy alias
export const updateProgress = updateAnimeProgress;

/**
 * Determine status based on episode count
 */
function determineAnimeStatus(
    episode: number,
    totalEpisodes?: number
): LocalAnimeEntry['status'] {
    if (totalEpisodes && episode >= totalEpisodes) {
        return 'completed';
    }
    return episode > 0 ? 'watching' : 'planning';
}

/**
 * Add anime to library
 */
export function addAnimeToLibrary(
    id: string,
    data: {
        title: string;
        coverImage?: string;
        sourceId?: string;
        sourceAnimeId?: string;
        anilistId?: number;
        description?: string;
        genres?: string[];
        type?: string;
        subOrDub?: string;
        releaseDate?: string;
        categoryIds?: string[];
        subOrDubPref?: 'sub' | 'dub';
    }
): LocalAnimeEntry {
    const db = getLocalAnimeDb();
    const existing = db[id];

    const entry: LocalAnimeEntry = {
        ...(existing || {
            id,
            episode: 0,
            status: 'planning' as const,
            lastWatched: Date.now(),
            synced: true,
            anilistId: null
        }),
        title: data.title,
        coverImage: data.coverImage ?? existing?.coverImage,
        sourceId: data.sourceId ?? existing?.sourceId,
        sourceAnimeId: data.sourceAnimeId ?? existing?.sourceAnimeId,
        anilistId: data.anilistId ?? existing?.anilistId ?? null,
        inLibrary: true,
        categoryIds: data.categoryIds ?? existing?.categoryIds ?? ['default'],
        description: data.description ?? existing?.description,
        genres: data.genres ?? existing?.genres,
        type: data.type ?? existing?.type,
        subOrDub: data.subOrDub ?? existing?.subOrDub,
        releaseDate: data.releaseDate ?? existing?.releaseDate,
        subOrDubPref: data.subOrDubPref ?? existing?.subOrDubPref ?? 'sub',
    };

    db[id] = entry;
    saveDb(db);
    console.log('[LocalAnimeDB] Added to library:', entry.title);
    return entry;
}

/**
 * Remove anime from library (does not delete progress)
 */
export function removeAnimeFromLibrary(id: string): void {
    const db = getLocalAnimeDb();
    if (db[id]) {
        db[id].inLibrary = false;
        saveDb(db);
        console.log('[LocalAnimeDB] Removed from library:', db[id].title);
    }
}

/**
 * Update entries' categories
 */
export function setAnimeCategories(id: string, categoryIds: string[]): void {
    const db = getLocalAnimeDb();
    if (db[id]) {
        db[id].categoryIds = categoryIds;
        saveDb(db);
        console.log('[LocalAnimeDB] Updated categories for:', db[id].title);
    }
}

/**
 * Toggle sub/dub preference for an anime
 */
export function toggleSubOrDubPref(id: string): 'sub' | 'dub' {
    const db = getLocalAnimeDb();
    if (db[id]) {
        const current = db[id].subOrDubPref || 'sub';
        const next = current === 'sub' ? 'dub' : 'sub';
        db[id].subOrDubPref = next;
        saveDb(db);
        console.log('[LocalAnimeDB] Toggled sub/dub preference for:', db[id].title, 'to:', next);
        return next;
    }
    return 'sub';
}

/**
 * Get all library entries
 */
export function getAnimeLibraryEntries(): LocalAnimeEntry[] {
    const db = getLocalAnimeDb();
    return Object.values(db)
        .filter(entry => entry.inLibrary)
        .sort((a, b) => a.title.localeCompare(b.title));
}

/**
 * Mark entry as synced
 */
export function markAnimeAsSynced(id: string): void {
    const db = getLocalAnimeDb();
    if (db[id]) {
        db[id].synced = true;
        db[id].lastSyncAttempt = Date.now();
        saveDb(db);
        console.log('[LocalAnimeDB] Marked as synced:', db[id].title);
    }
}

// Legacy alias
export const markAsSynced = markAnimeAsSynced;

/**
 * Update sync attempt timestamp (for failed syncs)
 */
export function updateSyncAttempt(id: string): void {
    const db = getLocalAnimeDb();
    if (db[id]) {
        db[id].lastSyncAttempt = Date.now();
        saveDb(db);
    }
}

/**
 * Get all entries that need syncing
 */
export function getUnsyncedAnimeEntries(): LocalAnimeEntry[] {
    const db = getLocalAnimeDb();
    return Object.values(db).filter(entry => !entry.synced && entry.anilistId !== null);
}

// Legacy alias
export const getUnsyncedEntries = getUnsyncedAnimeEntries;

/**
 * Get all entries (for display)
 */
export function getAllAnimeEntries(): LocalAnimeEntry[] {
    const db = getLocalAnimeDb();
    return Object.values(db).sort((a, b) => b.lastWatched - a.lastWatched);
}

// Legacy alias
export const getAllEntries = getAllAnimeEntries;

/**
 * Get entries by status
 */
export function getAnimeEntriesByStatus(status: LocalAnimeEntry['status']): LocalAnimeEntry[] {
    return getAllAnimeEntries().filter(entry => entry.status === status);
}

// Legacy alias
export const getEntriesByStatus = getAnimeEntriesByStatus;

/**
 * Delete an entry
 */
export function deleteAnimeEntry(id: string): void {
    const db = getLocalAnimeDb();
    delete db[id];
    saveDb(db);
    console.log('[LocalAnimeDB] Deleted entry:', id);
}

// Legacy alias
export const deleteEntry = deleteAnimeEntry;

/**
 * Link a source anime to an AniList ID
 */
export function linkAnimeToAniList(
    sourceId: string,
    sourceAnimeId: string,
    anilistId: number,
    title: string,
    coverImage?: string,
    totalEpisodes?: number
): LocalAnimeEntry {
    const id = String(anilistId);
    const db = getLocalAnimeDb();

    // Check if there's an existing entry with this source anime
    const existingBySource = getAnimeEntryBySourceId(sourceId, sourceAnimeId);

    const entry: LocalAnimeEntry = {
        id,
        title,
        anilistId,
        episode: existingBySource?.episode ?? 0,
        totalEpisodes: totalEpisodes ?? existingBySource?.totalEpisodes,
        status: existingBySource?.status ?? 'planning',
        lastWatched: existingBySource?.lastWatched ?? Date.now(),
        synced: existingBySource?.synced ?? true,
        coverImage: coverImage ?? existingBySource?.coverImage,
        sourceId,
        sourceAnimeId,
        inLibrary: true, // Auto-add to library when linking
        categoryIds: existingBySource?.categoryIds ?? ['default'],
    };

    // If there was an entry by source, remove it (we're consolidating to anilist ID)
    if (existingBySource && existingBySource.id !== id) {
        delete db[existingBySource.id];
    }

    db[id] = entry;

    // Preserve cache if linking
    if (existingBySource) {
        entry.description = existingBySource.description;
        entry.genres = existingBySource.genres;
        entry.type = existingBySource.type;
        entry.subOrDub = existingBySource.subOrDub;
        entry.releaseDate = existingBySource.releaseDate;
        entry.subOrDubPref = existingBySource.subOrDubPref;
    }

    saveDb(db);

    console.log('[LocalAnimeDB] Linked anime:', title, 'to AniList ID:', anilistId);
    return entry;
}

/**
 * Unlink anime from AniList (revert to source-based ID if possible, or just remove anilistId)
 * Note: unique logic required because ID switch involves key change.
 * For now, we just remove the anilistId field but keep the entry key as the anilist ID
 * to avoid losing progress, or we'd have to migrate data back to a source-ID keyed entry.
 */
export function unlinkAnimeFromAniList(id: string): void {
    const db = getLocalAnimeDb();
    if (db[id]) {
        db[id].anilistId = null;
        db[id].synced = false;
        // Ideally we would rename the key back to sourceId:sourceAnimeId but that's complex
        // and might conflict. We'll keep the ID as is for now, just clear the field.
        saveDb(db);
        console.log('[LocalAnimeDB] Unlinked anime:', db[id].title);
    }
}

/**
 * Clear entire database (use with caution!)
 */
export function clearAnimeDb(): void {
    localStorage.removeItem(STORAGE_KEY);
    console.log('[LocalAnimeDB] Database cleared');
}

// Legacy alias
export const clearDb = clearAnimeDb;
