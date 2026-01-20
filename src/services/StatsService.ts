/**
 * Stats Service
 * 
 * Tracks and persists user statistics for anime watching and manga reading.
 * Stores data in localStorage for offline access and potential "Wrapped" features.
 */

// Stats data structure
export interface UserStats {
    anime: {
        totalMinutesWatched: number;
        episodesWatched: number;
        sessionsCount: number;
        lastWatched?: {
            id: number;
            title: string;
            coverImage?: string;
            timestamp: number;
        };
        byGenre: Record<string, number>; // genre -> minutes
    };
    manga: {
        totalMinutesRead: number;
        chaptersRead: number;
        sessionsCount: number;
        lastRead?: {
            id: number;
            title: string;
            coverImage?: string;
            timestamp: number;
        };
        byGenre: Record<string, number>; // genre -> chapters
    };
    daily: Record<string, { anime: number; manga: number }>; // YYYY-MM-DD -> minutes
    weeklyActivity: number[]; // Array of 7 numbers representing activity per day (0=Sun, 6=Sat)
    firstTrackedDate?: number; // Timestamp of when tracking started
}

const STATS_STORAGE_KEY = 'user-stats';

// Default empty stats
const defaultStats: UserStats = {
    anime: {
        totalMinutesWatched: 0,
        episodesWatched: 0,
        sessionsCount: 0,
        byGenre: {},
    },
    manga: {
        totalMinutesRead: 0,
        chaptersRead: 0,
        sessionsCount: 0,
        byGenre: {},
    },
    daily: {},
    weeklyActivity: [0, 0, 0, 0, 0, 0, 0],
};

/**
 * Get current stats from localStorage
 */
export function getStats(): UserStats {
    try {
        const stored = localStorage.getItem(STATS_STORAGE_KEY);
        if (stored) {
            return { ...defaultStats, ...JSON.parse(stored) };
        }
    } catch (e) {
        console.error('[StatsService] Failed to parse stored stats:', e);
    }
    return { ...defaultStats };
}

/**
 * Save stats to localStorage
 */
function saveStats(stats: UserStats): void {
    try {
        localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats));
        window.dispatchEvent(new Event('stats-updated'));
    } catch (e) {
        console.error('[StatsService] Failed to save stats:', e);
    }
}

/**
 * Get today's date key for daily tracking
 */
function getTodayKey(): string {
    const now = new Date();
    return now.toISOString().split('T')[0]; // YYYY-MM-DD
}

/**
 * Track anime watching session
 */
export function trackAnimeSession(
    animeId: number,
    title: string,
    coverImage: string | undefined,
    minutesWatched: number,
    genres: string[] = []
): void {
    const stats = getStats();
    const today = getTodayKey();
    const dayOfWeek = new Date().getDay();

    // Update anime stats
    stats.anime.totalMinutesWatched += minutesWatched;
    stats.anime.episodesWatched += 1;
    stats.anime.sessionsCount += 1;
    stats.anime.lastWatched = {
        id: animeId,
        title,
        coverImage,
        timestamp: Date.now(),
    };

    // Track by genre
    genres.forEach(genre => {
        stats.anime.byGenre[genre] = (stats.anime.byGenre[genre] || 0) + minutesWatched;
    });

    // Update daily stats
    if (!stats.daily[today]) {
        stats.daily[today] = { anime: 0, manga: 0 };
    }
    stats.daily[today].anime += minutesWatched;

    // Update weekly activity
    stats.weeklyActivity[dayOfWeek] += minutesWatched;

    // Set first tracked date if not set
    if (!stats.firstTrackedDate) {
        stats.firstTrackedDate = Date.now();
    }

    saveStats(stats);
    console.log('[StatsService] Tracked anime session:', title, minutesWatched, 'min');
}

/**
 * Track manga reading session
 */
export function trackMangaSession(
    mangaId: number,
    title: string,
    coverImage: string | undefined,
    chaptersRead: number,
    minutesRead: number,
    genres: string[] = []
): void {
    const stats = getStats();
    const today = getTodayKey();
    const dayOfWeek = new Date().getDay();

    // Update manga stats
    stats.manga.totalMinutesRead += minutesRead;
    stats.manga.chaptersRead += chaptersRead;
    stats.manga.sessionsCount += 1;
    stats.manga.lastRead = {
        id: mangaId,
        title,
        coverImage,
        timestamp: Date.now(),
    };

    // Track by genre
    genres.forEach(genre => {
        stats.manga.byGenre[genre] = (stats.manga.byGenre[genre] || 0) + chaptersRead;
    });

    // Update daily stats
    if (!stats.daily[today]) {
        stats.daily[today] = { anime: 0, manga: 0 };
    }
    stats.daily[today].manga += minutesRead;

    // Update weekly activity
    stats.weeklyActivity[dayOfWeek] += minutesRead;

    // Set first tracked date if not set
    if (!stats.firstTrackedDate) {
        stats.firstTrackedDate = Date.now();
    }

    saveStats(stats);
    console.log('[StatsService] Tracked manga session:', title, chaptersRead, 'chapters');
}

/**
 * Get formatted time string from minutes
 */
export function formatTime(minutes: number): string {
    if (minutes < 60) {
        return `${Math.round(minutes)}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours < 24) {
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
}

/**
 * Get most consumed genre
 */
export function getTopGenre(byGenre: Record<string, number>): { genre: string; value: number } | null {
    const entries = Object.entries(byGenre);
    if (entries.length === 0) return null;

    entries.sort((a, b) => b[1] - a[1]);
    return { genre: entries[0][0], value: entries[0][1] };
}

/**
 * Get activity streak (consecutive days)
 */
export function getActivityStreak(daily: Record<string, { anime: number; manga: number }>): number {
    const today = new Date();
    let streak = 0;

    for (let i = 0; i < 365; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() - i);
        const key = checkDate.toISOString().split('T')[0];

        const day = daily[key];
        if (day && (day.anime > 0 || day.manga > 0)) {
            streak++;
        } else if (i > 0) {
            // Allow today to be empty, but break streak if previous day is empty
            break;
        }
    }

    return streak;
}

/**
 * Clear all stats (for testing/reset)
 */
export function clearStats(): void {
    localStorage.removeItem(STATS_STORAGE_KEY);
    console.log('[StatsService] Stats cleared');
}
