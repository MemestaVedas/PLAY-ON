/**
 * Centralized Theme and Style Configuration
 * 
 * Use this file to define standard colors, badges, and style logic
 * to ensure consistency across the application.
 */

export interface BadgeStyle {
    bg: string;
    text: string;
    border: string;
}

// Media Types
export const MEDIA_TYPE = {
    ANIME: 'ANIME',
    MANGA: 'MANGA',
} as const;

// Status Constants
export const MEDIA_STATUS = {
    COMPLETED: 'COMPLETED',
    CURRENT: 'CURRENT',
    PLANNING: 'PLANNING',
    PAUSED: 'PAUSED',
    DROPPED: 'DROPPED',
    REPEATING: 'REPEATING',
} as const;

/**
 * Standard colors for different content types
 */
export const CONTENT_COLORS = {
    ANIME: {
        bg: 'bg-blue-500/10',
        text: 'text-blue-400',
        border: 'border-blue-500/20'
    },
    MANGA: {
        bg: 'bg-green-500/10',
        text: 'text-green-400',
        border: 'border-green-500/20'
    },
    DEFAULT: {
        bg: 'bg-white/5',
        text: 'text-white/50',
        border: 'border-white/10'
    },
    ORANGE: {
        bg: 'bg-orange-500/10',
        text: 'text-orange-400',
        border: 'border-orange-500/20'
    },
    PURPLE: {
        bg: 'bg-purple-500/10',
        text: 'text-purple-400',
        border: 'border-purple-500/20'
    },
    RED: {
        bg: 'bg-red-500/10',
        text: 'text-red-400',
        border: 'border-red-500/20'
    }
};

/**
 * Get the standard badge style for a media item
 * 
 * @param mediaType 'ANIME' | 'MANGA'
 * @param status Optional status string (e.g. 'COMPLETED')
 */
export function getMediaBadgeStyle(mediaType?: string, status?: string): BadgeStyle {
    // Priority: Green for Manga
    if (mediaType === MEDIA_TYPE.MANGA) {
        return CONTENT_COLORS.MANGA;
    }

    // Specific Status Overrides for Anime (if needed)
    if (status === MEDIA_STATUS.COMPLETED && mediaType === MEDIA_TYPE.ANIME) {
        // Example: Only Completed anime gets green? 
        // Current app logic: Completed items in history were green?
        // Let's stick to Blue for standard Anime to keep it distinct from Manga (Green)
        // OR follow previous History.tsx logic: "status === COMPLETED ? Green : Blue"
        // User requested: "manga updates should be green".
        // If we want GLOBAL modularity:
        // Anime = Blue, Manga = Green is cleaner distinction.
        // But let's support the 'Completed = Green' legacy if desired, 
        // OR enforce Type-based colors.

        // Based on "manga updates should be green", Type-based is primary.
        return CONTENT_COLORS.ANIME;
    }

    // Default to Blue for Anime/Other if not specified
    if (mediaType === MEDIA_TYPE.ANIME) {
        return CONTENT_COLORS.ANIME;
    }

    return CONTENT_COLORS.DEFAULT;
}

/**
 * Get badge style for Notifications
 */
export function getNotificationBadgeStyle(type: string, mediaType?: string): BadgeStyle {
    // 1. Force Green for Manga
    if (mediaType === MEDIA_TYPE.MANGA || type === 'READ_CHAPTER') {
        return CONTENT_COLORS.MANGA;
    }

    // 2. Type-based standard colors
    switch (type) {
        case 'AIRING':
            return CONTENT_COLORS.ANIME; // Blue
        case 'ACTIVITY_MESSAGE':
        case 'ACTIVITY_REPLY':
        case 'ACTIVITY_MENTION':
            return CONTENT_COLORS.MANGA; // Green (reused for social?) or maybe keep green as "Positive/Social"
        // Note: In Notifications.tsx, these were Green.

        case 'FOLLOWING':
        case 'ACTIVITY_LIKE':
            return CONTENT_COLORS.PURPLE;

        case 'RELATED_MEDIA_ADDITION':
        case 'MEDIA_DATA_CHANGE':
            return CONTENT_COLORS.ORANGE;

        case 'THREAD_COMMENT_MENTION':
            return CONTENT_COLORS.RED;

        default:
            return CONTENT_COLORS.DEFAULT;
    }
}
