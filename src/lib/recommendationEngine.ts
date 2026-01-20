/**
 * Smart Recommendation Engine
 * 
 * Calculates Genre Affinity Scores using multiple factors to provide
 * balanced recommendations that aren't skewed by long-running shows.
 * 
 * Formula: GAS = (countWeight × normalizedCount) + 
 *                (timeWeight × log₁₀(time + 1)) + 
 *                (scoreWeight × (meanScore / 100))
 */

// Types
export interface GenreStats {
    genre: string;
    count: number;
    minutesWatched?: number;  // For anime
    chaptersRead?: number;    // For manga
    meanScore: number;
}

export interface GenreScore {
    genre: string;
    score: number;
    components: {
        countScore: number;
        timeScore: number;
        ratingScore: number;
    };
}

// Tunable weights
const WEIGHTS = {
    count: 0.45,   // Diversity indicator - how many shows in this genre
    time: 0.35,    // Engagement - log-scaled to reduce long-show bias
    rating: 0.20,  // Quality preference - user's average rating for genre
};

// Minimum anime/manga count to consider a genre
const MIN_COUNT_THRESHOLD = 3;

/**
 * Calculate Genre Affinity Scores for all genres
 * Returns sorted array with highest affinity first
 */
export function calculateGenreAffinityScores(
    genres: GenreStats[],
    type: 'anime' | 'manga'
): GenreScore[] {
    if (genres.length === 0) return [];

    // Filter genres with minimum count
    const validGenres = genres.filter(g => g.count >= MIN_COUNT_THRESHOLD);
    if (validGenres.length === 0) return [];

    // Find max values for normalization
    const maxCount = Math.max(...validGenres.map(g => g.count));

    // Get time values based on type
    const getTime = (g: GenreStats) =>
        type === 'anime' ? (g.minutesWatched || 0) : (g.chaptersRead || 0);

    const maxTime = Math.max(...validGenres.map(getTime));
    const maxLogTime = maxTime > 0 ? Math.log10(maxTime + 1) : 1;

    return validGenres
        .map(g => {
            const time = getTime(g);

            // Normalized scores (0-1 range)
            const countScore = maxCount > 0 ? g.count / maxCount : 0;
            const timeScore = maxLogTime > 0 ? Math.log10(time + 1) / maxLogTime : 0;
            const ratingScore = (g.meanScore || 50) / 100; // Default 50 if no score

            // Weighted sum
            const score =
                WEIGHTS.count * countScore +
                WEIGHTS.time * timeScore +
                WEIGHTS.rating * ratingScore;

            return {
                genre: g.genre,
                score,
                components: { countScore, timeScore, ratingScore }
            };
        })
        .sort((a, b) => b.score - a.score);
}

/**
 * Get top N genres for recommendations
 * Returns genre names sorted by affinity score
 */
export function getTopGenres(
    genres: GenreStats[],
    type: 'anime' | 'manga',
    count: number = 3
): string[] {
    const scores = calculateGenreAffinityScores(genres, type);
    return scores.slice(0, count).map(g => g.genre);
}

/**
 * Format genres for display
 * e.g., ["Slice of Life", "Romance", "Comedy"] -> "Slice of Life, Romance & Comedy"
 */
export function formatGenresForDisplay(genres: string[]): string {
    if (genres.length === 0) return '';
    if (genres.length === 1) return genres[0];
    if (genres.length === 2) return `${genres[0]} & ${genres[1]}`;

    const last = genres[genres.length - 1];
    const rest = genres.slice(0, -1).join(', ');
    return `${rest} & ${last}`;
}
