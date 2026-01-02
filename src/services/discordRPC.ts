/**
 * Discord Rich Presence Service
 * 
 * Uses tauri-plugin-drpc to show currently watching anime on Discord.
 * 
 * SETUP REQUIRED:
 * 1. Go to https://discord.com/developers/applications
 * 2. Create a new application (or use existing)
 * 3. Copy the Application ID and paste below
 * 4. Go to "Rich Presence" -> "Art Assets"
 * 5. Upload your app icon with the key name "app_icon"
 * 
 * USAGE:
 * - Call initDiscordRPC() on app startup
 * - Call updateActivity() when anime detection changes
 * - Call clearActivity() when nothing is playing
 * - Call stopDiscordRPC() when app closes
 */

import { start, stop, setActivity, clearActivity } from 'tauri-plugin-drpc';
import { Activity, Assets, Timestamps, Button } from 'tauri-plugin-drpc/activity';

// ============================================================================
// CONFIGURATION - UPDATE THIS WITH YOUR DISCORD APPLICATION ID
// ============================================================================
// Get this from: https://discord.com/developers/applications -> Your App -> General Information
const DISCORD_APPLICATION_ID = '1455963833373032448';

// Asset key names (upload these in Discord Developer Portal -> Rich Presence -> Art Assets)
const APP_ICON_ASSET = 'app_icon';

// ============================================================================
// STATE
// ============================================================================
// Connection state tracking
let isInitialized = false;
let isConnecting = false;
let currentAnimeId: number | null = null;
let watchStartTime: number | null = null;
let retryTimeout: ReturnType<typeof setTimeout> | null = null;

/**
 * Initialize Discord Rich Presence
 * Call this on app startup
 */
export async function initDiscordRPC(retryCount = 0): Promise<boolean> {
    if (isInitialized) return true;
    if (isConnecting) return false;

    isConnecting = true;
    try {
        console.log(`[Discord RPC] Initializing... (Attempt ${retryCount + 1})`);
        await start(DISCORD_APPLICATION_ID);
        isInitialized = true;
        isConnecting = false;
        console.log('[Discord RPC] Initialized successfully');
        return true;
    } catch (err) {
        console.error('[Discord RPC] Failed to initialize:', err);
        isConnecting = false;

        // Retry logic for "thread not found" or other startup errors
        // This handles race conditions where stop() hasn't fully cleaned up yet
        if (retryCount < 3) {
            console.log(`[Discord RPC] Retrying in 1s...`);
            return new Promise((resolve) => {
                retryTimeout = setTimeout(async () => {
                    const success = await initDiscordRPC(retryCount + 1);
                    resolve(success);
                }, 1000);
            });
        }

        return false;
    }
}

/**
 * Stop Discord Rich Presence
 * Call this on app close
 */
export async function stopDiscordRPC(): Promise<void> {
    if (retryTimeout) {
        clearTimeout(retryTimeout);
        retryTimeout = null;
    }

    try {
        await stop();
        isInitialized = false;
        isConnecting = false;
        currentAnimeId = null;
        watchStartTime = null;
        console.log('[Discord RPC] Stopped');
    } catch (err) {
        console.error('[Discord RPC] Failed to stop:', err);
    }
}

/**
 * Update Discord activity with currently watching anime
 * ONLY updates if there's a valid AniList match
 */
export async function updateAnimeActivity(params: {
    animeName: string;
    episode?: number | null;
    season?: number | null;
    anilistId: number;  // Required - must have AniList match
    coverImage?: string | null;
    totalEpisodes?: number | null;
    privacyLevel?: 'full' | 'minimal' | 'hidden';
}): Promise<void> {
    const { animeName, episode, season, anilistId, coverImage, totalEpisodes, privacyLevel = 'full' } = params;

    // hidden: Do not update activity (effectively invisible)
    if (privacyLevel === 'hidden') {
        return;
    }

    if (!isInitialized) {
        const success = await initDiscordRPC();
        if (!success) return;
    }

    // Require AniList ID - skip if no match found
    if (!anilistId) {
        console.log('[Discord RPC] Skipping update - no AniList match');
        return;
    }

    // Check if this is the same anime (avoid unnecessary updates)
    const isSameAnime = anilistId === currentAnimeId;

    // If different anime, reset the watch start time
    if (!isSameAnime) {
        currentAnimeId = anilistId;
        watchStartTime = Date.now();
    }

    try {
        // Build the activity
        let activity = new Activity();

        if (privacyLevel === 'minimal') {
            // Minimal: Generic text, no episode details
            activity = activity.setDetails('Watching Anime');
            activity = activity.setState('Relaxing');

            // Assets: Generic icon
            const assets = new Assets()
                .setLargeImage(APP_ICON_ASSET)
                .setLargeText('PLAY-ON!');

            // No small image/text to keep it clean
            activity = activity.setAssets(assets);
        } else {
            // Full: Detailed info

            // Set details (main text) - anime name (max 128 chars)
            const truncatedName = animeName.length > 128 ? animeName.substring(0, 125) + '...' : animeName;
            activity = activity.setDetails(truncatedName);

            // Set state (secondary text) - episode info
            let stateText = '';
            if (episode !== null && episode !== undefined) {
                stateText = `Episode ${episode}`;
                if (totalEpisodes) {
                    stateText += ` of ${totalEpisodes}`;
                }
                if (season !== null && season !== undefined && season > 1) {
                    stateText = `S${season} • ${stateText}`;
                }
            } else {
                stateText = 'Watching';
            }
            activity = activity.setState(stateText);

            // Set assets (images)
            const assets = new Assets();

            // Use AniList cover image as large image (Discord supports external URLs)
            if (coverImage) {
                assets.setLargeImage(coverImage);
                assets.setLargeText(animeName);
            } else {
                assets.setLargeImage(APP_ICON_ASSET);
                assets.setLargeText(animeName);
            }

            // Use app icon as small image (must be uploaded to Discord Developer Portal)
            assets.setSmallImage(APP_ICON_ASSET);
            assets.setSmallText('PLAY-ON!');

            activity = activity.setAssets(assets);

            // Add buttons - Discord allows max 2 buttons
            activity = activity.setButton([
                new Button('View on AniList', `https://anilist.co/anime/${anilistId}`),
                new Button('GitHub', 'https://github.com/MemestaVedas/PLAY-ON')
            ]);
        }

        // Set timestamps (shows elapsed time on Discord) - applies to both modes
        if (watchStartTime) {
            const timestamps = new Timestamps(watchStartTime);
            activity = activity.setTimestamps(timestamps);
        }

        await setActivity(activity);
        const logMsg = episode ? `Ep ${episode}${season ? ` S${season}` : ''}` : 'Activity updated';
        console.log(`[Discord RPC] ${animeName} - ${logMsg} (${privacyLevel})`);
    } catch (err) {
        console.error('[Discord RPC] Failed to update activity:', err);
    }
}

/**
 * Set a generic "browsing" activity when not watching anything
 */
export async function setBrowsingActivity(privacyLevel: 'full' | 'minimal' | 'hidden' = 'full'): Promise<void> {
    if (privacyLevel === 'hidden') {
        return;
    }

    if (!isInitialized) {
        const success = await initDiscordRPC();
        if (!success) return;
    }

    try {
        let activity = new Activity()
            .setDetails('Browsing anime')
            .setState('Looking for something to watch');

        const timestamps = new Timestamps(Date.now());
        activity = activity.setTimestamps(timestamps);

        const assets = new Assets()
            .setLargeImage(APP_ICON_ASSET)
            .setLargeText('PLAY-ON!');

        activity = activity.setAssets(assets);

        // Add GitHub button for browsing mode
        activity = activity.setButton([
            new Button('GitHub', 'https://github.com/MemestaVedas/PLAY-ON')
        ]);

        await setActivity(activity);
        currentAnimeId = null;
        watchStartTime = null;
        console.log('[Discord RPC] Set to browsing mode');
    } catch (err) {
        console.error('[Discord RPC] Failed to set browsing activity:', err);
    }
}

/**
 * Clear the Discord activity
 */
export async function clearDiscordActivity(): Promise<void> {
    try {
        await clearActivity();
        currentAnimeId = null;
        watchStartTime = null;
        console.log('[Discord RPC] Activity cleared');
    } catch (err) {
        console.error('[Discord RPC] Failed to clear activity:', err);
    }
}

/**
 * Check if Discord RPC is initialized
 */
export function isDiscordRPCInitialized(): boolean {
    return isInitialized;
}

/**
 * Update Discord activity with currently reading manga
 */
export async function updateMangaActivity(params: {
    mangaTitle: string;
    chapter?: number | null;
    anilistId?: number | null;
    coverImage?: string | null;
    totalChapters?: number | null;
    privacyLevel?: 'full' | 'minimal' | 'hidden';
}): Promise<void> {
    const { mangaTitle, chapter, anilistId, coverImage, totalChapters, privacyLevel = 'full' } = params;

    if (privacyLevel === 'hidden') return;

    if (!isInitialized) {
        const success = await initDiscordRPC();
        if (!success) return;
    }

    // Check if this is the same manga
    const isSameManga = anilistId && anilistId === currentAnimeId; // Reusing currentAnimeId for generic media ID

    if (!isSameManga && anilistId) {
        currentAnimeId = anilistId;
        watchStartTime = Date.now();
    } else if (!anilistId && !currentAnimeId) {
        watchStartTime = Date.now();
    }

    try {
        let activity = new Activity();

        if (privacyLevel === 'minimal') {
            activity = activity.setDetails('Reading Manga');
            activity = activity.setState('Relaxing');
            const assets = new Assets()
                .setLargeImage(APP_ICON_ASSET)
                .setLargeText('PLAY-ON!');
            activity = activity.setAssets(assets);
        } else {
            const truncatedTitle = mangaTitle.length > 128 ? mangaTitle.substring(0, 125) + '...' : mangaTitle;
            activity = activity.setDetails(truncatedTitle);

            let stateText = 'Reading';
            if (chapter) {
                stateText = `Chapter ${chapter}`;
                if (totalChapters) {
                    stateText += ` of ${totalChapters}`;
                }
            }
            activity = activity.setState(stateText);

            const assets = new Assets();
            if (coverImage) {
                assets.setLargeImage(coverImage);
                assets.setLargeText(mangaTitle);
            } else {
                assets.setLargeImage(APP_ICON_ASSET);
                assets.setLargeText(mangaTitle);
            }
            assets.setSmallImage(APP_ICON_ASSET);
            assets.setSmallText('PLAY-ON!');
            activity = activity.setAssets(assets);

            if (anilistId) {
                activity = activity.setButton([
                    new Button('View on AniList', `https://anilist.co/manga/${anilistId}`),
                    new Button('GitHub', 'https://github.com/MemestaVedas/PLAY-ON')
                ]);
            } else {
                activity = activity.setButton([
                    new Button('GitHub', 'https://github.com/MemestaVedas/PLAY-ON')
                ]);
            }
        }

        if (watchStartTime) {
            activity = activity.setTimestamps(new Timestamps(watchStartTime));
        }

        await setActivity(activity);
        const logMsg = chapter ? `Ch ${chapter}` : 'Activity updated';
        console.log(`[Discord RPC] ${mangaTitle} - ${logMsg} (${privacyLevel})`);
    } catch (err) {
        console.error('[Discord RPC] Failed to update manga activity:', err);
    }
}

/**
 * Set activity when browsing a specific manga's details
 */
export async function setBrowsingMangaActivity(mangaTitle: string, coverImage?: string | null): Promise<void> {
    if (!isInitialized) {
        const success = await initDiscordRPC();
        if (!success) return;
    }

    try {
        let activity = new Activity();
        const truncatedTitle = mangaTitle.length > 128 ? mangaTitle.substring(0, 125) + '...' : mangaTitle;

        activity = activity
            .setDetails('Browsing Manga')
            .setState(truncatedTitle);

        const assets = new Assets();
        if (coverImage) {
            assets.setLargeImage(coverImage);
            assets.setLargeText(mangaTitle);
        } else {
            assets.setLargeImage(APP_ICON_ASSET);
            assets.setLargeText(mangaTitle);
        }
        assets.setSmallImage(APP_ICON_ASSET);
        assets.setSmallText('PLAY-ON!');

        activity = activity.setAssets(assets);
        activity = activity.setButton([
            new Button('GitHub', 'https://github.com/MemestaVedas/PLAY-ON')
        ]);

        await setActivity(activity);
        // Don't reset generic browsing timestamp/state excessively
        console.log(`[Discord RPC] Browsing manga: ${mangaTitle}`);
    } catch (err) {
        console.error('[Discord RPC] Failed to set browsing manga activity:', err);
    }
}

/**
 * Get current watching anime ID
 */
export function getCurrentAnimeId(): number | null {
    return currentAnimeId;
}
