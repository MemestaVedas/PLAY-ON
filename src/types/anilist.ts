// TypeScript types for AniList API responses

export interface AnimeTitle {
    romaji: string | null;
    english: string | null;
    native: string | null;
}

export interface CoverImage {
    large: string | null;
    medium: string | null;
}

export interface Anime {
    id: number;
    title: AnimeTitle;
    coverImage: CoverImage;
    episodes: number | null;
    status: string | null;
    description: string | null;
}

/**
 * Get the best title for display
 */
export function getAnimeTitle(anime: Anime): string {
    return anime.title.english || anime.title.romaji || anime.title.native || 'Unknown';
}

/**
 * Get the cover image URL (prefer large, fallback to medium)
 */
export function getAnimeCover(anime: Anime): string | null {
    return anime.coverImage.large || anime.coverImage.medium;
}
