/**
 * Local Manga Database
 * 
 * Stores manga read progress locally using localStorage.
 * This is the "local-first" data layer that syncs to AniList in background.
 */

const STORAGE_KEY = 'playon_manga_db';

/**
 * Local manga entry structure
 */
export interface LocalMangaEntry {
    /** Local unique ID (typically the AniList ID if known, or source-based ID) */
    id: string;
    /** Manga title (for display) */
    title: string;
    /** AniList media ID (null if not matched yet) */
    anilistId: number | null;
    /** Current chapter progress */
    chapter: number;
    /** Total chapters (if known) */
    totalChapters?: number;
    /** Current volume progress (optional) */
    volume?: number;
    /** Total volumes (if known) */
    totalVolumes?: number;
    /** Read status: reading, completed, paused, dropped, planning */
    status: 'reading' | 'completed' | 'paused' | 'dropped' | 'planning';
    /** Last read timestamp */
    lastRead: number;
    /** Whether this has been synced to AniList */
    synced: boolean;
    /** Timestamp of last sync attempt */
    lastSyncAttempt?: number;
    /** Cover image URL */
    coverImage?: string;
    /** Source ID (e.g., 'weebcentral') */
    sourceId?: string;
    /** Manga ID within the source */
    sourceMangaId?: string;
    /** Whether the manga is in the user's library */
    inLibrary?: boolean;
    /** IDs of user-defined categories this manga belongs to */
    categoryIds?: string[];
    /** ID of the last read chapter (for resume) */
    lastReadChapterId?: string;
    /** Title of the last read chapter */
    lastReadChapterTitle?: string;
    /** List of bookmarked chapter IDs */
    bookmarkedChapters?: string[];
    /** List of downloaded chapter IDs */
    downloadedChapters?: string[];
    /** Cached Description */
    description?: string;
    /** Cached Genres */
    genres?: string[];
    /** Cached Author */
    author?: string;
    /** Cached Chapter List (for offline viewing) */
    chapters?: any[]; // using any[] to avoid circular dependency with ExtensionManager, but realistically it mimics Chapter interface
    /** Timestamp of last details cache update */
    lastCacheUpdate?: number;
}

export interface LibraryCategory {
    id: string;
    name: string;
    order: number;
}

const CATEGORIES_KEY = 'playon_manga_categories';

/**
 * Get all library categories
 */
export function getLibraryCategories(): LibraryCategory[] {
    try {
        const data = localStorage.getItem(CATEGORIES_KEY);
        // Ensure at least Default exists if everything is empty? 
        // Or just let UI handle empty.
        // Let's return saved ones. If null, return default set (maybe just 'default'?).
        if (!data) {
            const defaultCats = [{ id: 'default', name: 'Default', order: 0 }];
            saveLibraryCategories(defaultCats);
            return defaultCats;
        }
        return JSON.parse(data);
    } catch {
        return [{ id: 'default', name: 'Default', order: 0 }];
    }
}

/**
 * Save library categories
 */
export function saveLibraryCategories(categories: LibraryCategory[]): void {
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
}

/**
 * Add a new category
 */
export function addLibraryCategory(name: string): LibraryCategory {
    const categories = getLibraryCategories();
    // unique check
    if (categories.some(c => c.name === name)) {
        throw new Error('Category already exists');
    }
    const newCat = {
        id: crypto.randomUUID(),
        name,
        order: categories.length
    };
    categories.push(newCat);
    saveLibraryCategories(categories);
    return newCat;
}

/**
 * Delete a category
 */
export function deleteLibraryCategory(id: string): void {
    const categories = getLibraryCategories();
    const newCats = categories.filter(c => c.id !== id);
    saveLibraryCategories(newCats);

    // Also remove this category from all manga entries
    const db = getLocalMangaDb();
    let changed = false;
    Object.values(db).forEach(entry => {
        if (entry.categoryIds && entry.categoryIds.includes(id)) {
            entry.categoryIds = entry.categoryIds.filter(cId => cId !== id);
            changed = true;
        }
    });
    if (changed) saveDb(db);
}

/**
 * Update entries' categories
 */
export function setMangaCategories(id: string, categoryIds: string[]): void {
    const db = getLocalMangaDb();
    if (db[id]) {
        db[id].categoryIds = categoryIds;
        saveDb(db);
        console.log('[LocalMangaDB] Updated categories for:', db[id].title);
    }
}

const DEFAULT_CAT_KEY = 'playon_manga_default_category';

/**
 * Get the user's preferred default category ID
 */
export function getDefaultCategory(): string {
    return localStorage.getItem(DEFAULT_CAT_KEY) || 'default';
}

/**
 * Set the user's preferred default category ID
 */
export function setDefaultCategory(id: string): void {
    localStorage.setItem(DEFAULT_CAT_KEY, id);
}

/**
 * Get the full local database
 */
export function getLocalMangaDb(): Record<string, LocalMangaEntry> {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : {};
    } catch (e) {
        console.error('[LocalMangaDB] Failed to parse database:', e);
        return {};
    }
}

/**
 * Save the full database
 */
function saveDb(db: Record<string, LocalMangaEntry>): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    // console.log('[LocalMangaDB] Database saved, entries:', Object.keys(db).length);
}

/**
 * Get a single entry by ID
 */
export function getLocalMangaEntry(id: string): LocalMangaEntry | null {
    const db = getLocalMangaDb();
    return db[id] || null;
}

/**
 * Get entry by AniList ID
 */
export function getMangaEntryByAnilistId(anilistId: number): LocalMangaEntry | null {
    const db = getLocalMangaDb();
    return Object.values(db).find(entry => entry.anilistId === anilistId) || null;
}

/**
 * Get entry by source manga ID
 */
export function getMangaEntryBySourceId(sourceId: string, sourceMangaId: string): LocalMangaEntry | null {
    const db = getLocalMangaDb();
    return Object.values(db).find(
        entry => entry.sourceId === sourceId && entry.sourceMangaId === sourceMangaId
    ) || null;
}

/**
 * Update or create manga progress (LOCAL ONLY)
 * This does NOT sync to AniList - call syncService separately
 */
export function updateMangaProgress(
    id: string,
    data: {
        title: string;
        chapter: number;
        volume?: number;
        totalChapters?: number;
        totalVolumes?: number;
        anilistId?: number;
        coverImage?: string;
        sourceId?: string;
        sourceMangaId?: string;
        chapterId?: string;
        chapterTitle?: string;
        description?: string;
        genres?: string[];
        author?: string;
        chapters?: any[];
    }
): LocalMangaEntry {
    const db = getLocalMangaDb();
    const existing = db[id];

    // Only update if chapter is higher than existing (don't regress)
    const currentChapter = existing?.chapter ?? 0;
    const newChapter = Math.max(currentChapter, data.chapter);

    const entry: LocalMangaEntry = {
        id,
        title: data.title,
        anilistId: data.anilistId ?? existing?.anilistId ?? null,
        chapter: newChapter,
        volume: data.volume ?? existing?.volume,
        totalChapters: data.totalChapters ?? existing?.totalChapters,
        totalVolumes: data.totalVolumes ?? existing?.totalVolumes,
        status: determineMangaStatus(newChapter, data.totalChapters),
        lastRead: Date.now(),
        synced: false, // Mark as unsynced since we're updating locally
        lastSyncAttempt: existing?.lastSyncAttempt,
        coverImage: data.coverImage ?? existing?.coverImage,
        sourceId: data.sourceId ?? existing?.sourceId,
        sourceMangaId: data.sourceMangaId ?? existing?.sourceMangaId,
        inLibrary: existing?.inLibrary ?? false,
        categoryIds: existing?.categoryIds,
        lastReadChapterId: data.chapterId ?? existing?.lastReadChapterId,
        lastReadChapterTitle: data.chapterTitle ?? existing?.lastReadChapterTitle,
        // Cache updates
        description: data.description ?? existing?.description,
        genres: data.genres ?? existing?.genres,
        author: data.author ?? existing?.author,
        chapters: data.chapters ?? existing?.chapters,
        lastCacheUpdate: (data.chapters || data.description) ? Date.now() : existing?.lastCacheUpdate,
        bookmarkedChapters: existing?.bookmarkedChapters,
        downloadedChapters: existing?.downloadedChapters,
    };

    db[id] = entry;
    saveDb(db);

    console.log('[LocalMangaDB] Updated progress:', entry.title, 'Ch', entry.chapter);
    return entry;
}

/**
 * Add manga to library
 */
export function addMangaToLibrary(
    id: string,
    data: {
        title: string;
        coverImage?: string;
        sourceId?: string;
        sourceMangaId?: string;
        anilistId?: number;
        description?: string;
        genres?: string[];
        author?: string;
    }
): LocalMangaEntry {
    const db = getLocalMangaDb();
    const existing = db[id];

    const entry: LocalMangaEntry = {
        ...(existing || {
            id,
            chapter: 0,
            status: 'planning',
            lastRead: Date.now(),
            synced: true,
            anilistId: null
        }),
        title: data.title,
        coverImage: data.coverImage ?? existing?.coverImage,
        sourceId: data.sourceId ?? existing?.sourceId,
        sourceMangaId: data.sourceMangaId ?? existing?.sourceMangaId,
        anilistId: data.anilistId ?? existing?.anilistId ?? null,
        inLibrary: true,
        categoryIds: existing?.categoryIds ?? ['default'], // Default to 'default' category if new
        // Cache initial details if provided
        description: data.description ?? existing?.description,
        genres: data.genres ?? existing?.genres,
        author: data.author ?? existing?.author,
    };

    db[id] = entry;
    saveDb(db);
    console.log('[LocalMangaDB] Added to library:', entry.title);
    return entry;
}

/**
 * Remove manga from library (does not delete progress)
 */
export function removeMangaFromLibrary(id: string): void {
    const db = getLocalMangaDb();
    if (db[id]) {
        db[id].inLibrary = false;
        saveDb(db);
        console.log('[LocalMangaDB] Removed from library:', db[id].title);
    }
}

/**
 * Get all library entries
 */
export function getLibraryEntries(): LocalMangaEntry[] {
    const db = getLocalMangaDb();
    return Object.values(db)
        .filter(entry => entry.inLibrary)
        .sort((a, b) => a.title.localeCompare(b.title));
}


/**
 * Determine status based on chapter count
 */
function determineMangaStatus(
    chapter: number,
    totalChapters?: number
): LocalMangaEntry['status'] {
    if (totalChapters && chapter >= totalChapters) {
        return 'completed';
    }
    return 'reading';
}

/**
 * Mark entry as synced
 */
export function markMangaAsSynced(id: string): void {
    const db = getLocalMangaDb();
    if (db[id]) {
        db[id].synced = true;
        db[id].lastSyncAttempt = Date.now();
        saveDb(db);
        console.log('[LocalMangaDB] Marked as synced:', db[id].title);
    }
}

/**
 * Update sync attempt timestamp (for failed syncs)
 */
export function updateMangaSyncAttempt(id: string): void {
    const db = getLocalMangaDb();
    if (db[id]) {
        db[id].lastSyncAttempt = Date.now();
        saveDb(db);
    }
}

/**
 * Get all entries that need syncing
 */
export function getUnsyncedMangaEntries(): LocalMangaEntry[] {
    const db = getLocalMangaDb();
    return Object.values(db).filter(entry => !entry.synced && entry.anilistId !== null);
}

/**
 * Get all entries (for display)
 */
export function getAllMangaEntries(): LocalMangaEntry[] {
    const db = getLocalMangaDb();
    return Object.values(db).sort((a, b) => b.lastRead - a.lastRead);
}

/**
 * Get entries by status
 */
export function getMangaEntriesByStatus(status: LocalMangaEntry['status']): LocalMangaEntry[] {
    return getAllMangaEntries().filter(entry => entry.status === status);
}

/**
 * Delete an entry
 */
export function deleteMangaEntry(id: string): void {
    const db = getLocalMangaDb();
    delete db[id];
    saveDb(db);
    console.log('[LocalMangaDB] Deleted entry:', id);
}

/**
 * Link a source manga to an AniList ID
 */
export function linkMangaToAniList(
    sourceId: string,
    sourceMangaId: string,
    anilistId: number,
    title: string,
    coverImage?: string,
    totalChapters?: number
): LocalMangaEntry {
    // Use anilistId as the main key for linking
    const id = String(anilistId);
    const db = getLocalMangaDb();

    // Check if there's an existing entry with this source manga
    const existingBySource = getMangaEntryBySourceId(sourceId, sourceMangaId);

    const entry: LocalMangaEntry = {
        id,
        title,
        anilistId,
        chapter: existingBySource?.chapter ?? 0,
        totalChapters: totalChapters ?? existingBySource?.totalChapters,
        status: existingBySource?.status ?? 'planning',
        lastRead: existingBySource?.lastRead ?? Date.now(),
        synced: existingBySource?.synced ?? true, // Don't sync just for linking
        coverImage: coverImage ?? existingBySource?.coverImage,
        sourceId,
        sourceMangaId,
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
        entry.author = existingBySource.author;
        entry.chapters = existingBySource.chapters;
        entry.lastCacheUpdate = existingBySource.lastCacheUpdate;
        entry.bookmarkedChapters = existingBySource.bookmarkedChapters;
        entry.downloadedChapters = existingBySource.downloadedChapters;
    }

    saveDb(db);

    console.log('[LocalMangaDB] Linked manga:', title, 'to AniList ID:', anilistId);
    return entry;
}

/**
 * Update cached details for an entry
 */
export function updateMangaCache(
    id: string,
    data: {
        description?: string;
        genres?: string[];
        author?: string;
        chapters?: any[];
        coverImage?: string;
    }
): void {
    const db = getLocalMangaDb();
    const entry = db[id];
    if (entry) {
        if (data.description) entry.description = data.description;
        if (data.genres) entry.genres = data.genres;
        if (data.author) entry.author = data.author;
        if (data.chapters) entry.chapters = data.chapters;
        if (data.coverImage) entry.coverImage = data.coverImage;
        entry.lastCacheUpdate = Date.now();
        saveDb(db);
        // console.log('[LocalMangaDB] Cache updated for:', entry.title);
    }
}

/**
 * Clear entire database (use with caution!)
 */
export function clearMangaDb(): void {
    localStorage.removeItem(STORAGE_KEY);
    console.log('[LocalMangaDB] Database cleared');
}

// ============================================================================
// BOOKMARK FUNCTIONS
// ============================================================================

/**
 * Toggle bookmark status for a chapter
 */
export function toggleChapterBookmark(entryId: string, chapterId: string): boolean {
    const db = getLocalMangaDb();
    const entry = db[entryId];
    if (!entry) return false;

    const bookmarks = entry.bookmarkedChapters || [];
    const index = bookmarks.indexOf(chapterId);

    if (index > -1) {
        // Remove bookmark
        bookmarks.splice(index, 1);
        entry.bookmarkedChapters = bookmarks;
        saveDb(db);
        console.log('[LocalMangaDB] Removed bookmark for chapter:', chapterId);
        return false;
    } else {
        // Add bookmark
        entry.bookmarkedChapters = [...bookmarks, chapterId];
        saveDb(db);
        console.log('[LocalMangaDB] Added bookmark for chapter:', chapterId);
        return true;
    }
}

/**
 * Check if a chapter is bookmarked
 */
export function isChapterBookmarked(entryId: string, chapterId: string): boolean {
    const entry = getLocalMangaEntry(entryId);
    return entry?.bookmarkedChapters?.includes(chapterId) ?? false;
}

/**
 * Get all bookmarked chapters for an entry
 */
export function getBookmarkedChapters(entryId: string): string[] {
    const entry = getLocalMangaEntry(entryId);
    return entry?.bookmarkedChapters ?? [];
}

// ============================================================================
// DOWNLOAD TRACKING FUNCTIONS
// ============================================================================

/**
 * Mark a chapter as downloaded
 */
export function markChapterDownloaded(entryId: string, chapterId: string): void {
    const db = getLocalMangaDb();
    const entry = db[entryId];
    if (!entry) return;

    const downloads = entry.downloadedChapters || [];
    if (!downloads.includes(chapterId)) {
        entry.downloadedChapters = [...downloads, chapterId];
        saveDb(db);
        console.log('[LocalMangaDB] Marked chapter as downloaded:', chapterId);
    }
}

/**
 * Check if a chapter is downloaded
 */
export function isChapterDownloaded(entryId: string, chapterId: string): boolean {
    const entry = getLocalMangaEntry(entryId);
    return entry?.downloadedChapters?.includes(chapterId) ?? false;
}

/**
 * Get all downloaded chapters for an entry
 */
export function getDownloadedChapters(entryId: string): string[] {
    const entry = getLocalMangaEntry(entryId);
    return entry?.downloadedChapters ?? [];
}

/**
 * Remove downloaded status for a chapter
 */
export function removeChapterDownloaded(entryId: string, chapterId: string): void {
    const db = getLocalMangaDb();
    const entry = db[entryId];
    if (!entry || !entry.downloadedChapters) return;

    entry.downloadedChapters = entry.downloadedChapters.filter(id => id !== chapterId);
    saveDb(db);
    console.log('[LocalMangaDB] Removed download status for chapter:', chapterId);
}

