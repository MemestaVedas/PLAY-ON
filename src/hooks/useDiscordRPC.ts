/**
 * useDiscordRPC Hook
 * 
 * A React hook that automatically updates Discord Rich Presence
 * based on what anime is currently being detected.
 * 
 * Features:
 * - Aggressive debouncing to prevent flapping
 * - Only updates Discord when AniList match is found
 * - Persists "watching" state even when detection briefly fails
 */

import { useEffect, useRef, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
    initDiscordRPC,
    stopDiscordRPC,
    updateAnimeActivity,
    setBrowsingActivity,
    clearDiscordActivity,
} from '../services/discordRPC';
import { sendDesktopNotification } from '../services/notification';
import { useNowPlaying } from '../context/NowPlayingContext';
import { useFolderMappings } from './useFolderMappings';

// Poll interval in milliseconds (check every 10 seconds - less aggressive)
const POLL_INTERVAL = 10000;

// How many consecutive "not detected" polls before switching to browsing
// 3 * 10s = 30 seconds of no detection before switching to browsing
const BROWSING_DEBOUNCE_COUNT = 3;

/**
 * Parse episode number from a string (window title or filename)
 * Handles formats: 1x01, S01E01, E01, Ep01, Episode 01, - 01, 01.mkv
 */
function parseEpisodeFromString(str: string): number | null {
    // Try various episode patterns
    const patterns = [
        /(\d+)x(\d+)/i,                    // 1x01 format -> returns episode
        /S\d+E(\d+)/i,                     // S01E01 format
        /(?:E|EP|Episode)\s*(\d+)/i,       // E01, EP01, Episode 01
        /\s-\s(\d{1,3})(?:\s|\.|\[)/,      // " - 01 " or " - 01." or " - 01["
        /(\d{1,3})(?:v\d)?\.(?:mkv|mp4|avi)/i,  // 01.mkv, 01v2.mkv
    ];

    for (const pattern of patterns) {
        const match = str.match(pattern);
        if (match) {
            // For 1x01 format, episode is in group 2
            if (pattern.source.includes('x')) {
                return parseInt(match[2], 10);
            }
            return parseInt(match[1], 10);
        }
    }
    return null;
}

interface DetectedAnime {
    status: 'detected' | 'not_media_player' | 'no_window';
    player?: string;
    window_title?: string;
    parsed?: {
        title: string | null;
        episode: number | null;
        season: number | null;
    };
    anilist_match?: {
        id: number;
        title: {
            romaji: string;
            english: string | null;
            native: string | null;
        };
        coverImage: {
            large: string;
            medium: string;
        };
        episodes: number | null;
    } | null;
}

// Store last successful detection to persist during brief failures
interface LastDetection {
    anilistId: number;
    animeName: string;
    episode: number | null;
    season: number | null;
    coverImage: string | null;
    totalEpisodes: number | null;
    timestamp: number;
}

export function useDiscordRPC(enabled: boolean = true, privacyLevel: 'full' | 'minimal' | 'hidden' = 'full') {
    const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const lastDetectionRef = useRef<LastDetection | null>(null);
    const notDetectedCountRef = useRef<number>(0);
    const isWatchingRef = useRef<boolean>(false);

    // Get manual session from context
    const { manualSession, clearManualSession } = useNowPlaying();

    // Get folder mappings for fallback detection
    const { getMappingForFilePath } = useFolderMappings();

    // Function to check for media and update Discord
    const checkAndUpdateActivity = useCallback(async () => {
        try {
            // Run detection to get window info (we need this even for manual sessions to parse episode)
            const result = await invoke<string>('detect_anime_command');
            const data: DetectedAnime = JSON.parse(result);

            // Check if auto-detection found a DIFFERENT anime than manual session
            // If so, the user switched to something else - clear the manual session
            if (manualSession && data.status === 'detected' && data.anilist_match?.id) {
                if (data.anilist_match.id !== manualSession.anilistId) {
                    console.log('[useDiscordRPC] Auto-detection found different anime, clearing manual session');
                    console.log('[useDiscordRPC] Manual:', manualSession.animeName, 'vs Auto:', data.anilist_match.title?.english || data.anilist_match.title?.romaji);
                    clearManualSession();
                    // Continue to auto-detection below (don't return)
                }
            }

            // PRIORITY 1: Manual session is active AND detection matches - use its anime info, just parse episode
            // BUT FIRST: Check if window title still contains video content
            if (manualSession && data.status === 'detected') {
                const windowTitle = data.window_title || '';
                const hasVideoContent = /\.(mkv|mp4|avi|mov|wmv|flv|webm)/i.test(windowTitle) ||
                    /episode|ep\s*\d|s\d+e\d+|\d+x\d+/i.test(windowTitle);

                if (!hasVideoContent && !data.parsed?.episode) {
                    // Player is open but not playing video - clear the session
                    console.log('[useDiscordRPC] Player open but no video content, clearing session');
                    console.log('[useDiscordRPC] Window title was:', windowTitle);
                    clearManualSession();
                    notDetectedCountRef.current++;
                    // Fall through to browsing logic
                }
            }

            if (manualSession && data.status === 'detected' && (!data.anilist_match?.id || data.anilist_match.id === manualSession.anilistId)) {
                const windowTitle = data.window_title || data.parsed?.title || '';
                const episode = data.parsed?.episode || parseEpisodeFromString(windowTitle);

                if (episode !== null) {
                    console.log('[useDiscordRPC] Manual session + parsed episode:', manualSession.animeName, 'Ep', episode);
                    notDetectedCountRef.current = 0;

                    const newDetection: LastDetection = {
                        anilistId: manualSession.anilistId,
                        animeName: manualSession.animeName,
                        episode,
                        season: null,
                        coverImage: manualSession.coverImage || null,
                        totalEpisodes: null,
                        timestamp: Date.now(),
                    };

                    const isDifferent = lastDetectionRef.current?.episode !== episode
                        || lastDetectionRef.current?.anilistId !== manualSession.anilistId
                        || !isWatchingRef.current;

                    if (isDifferent) {
                        console.log('[useDiscordRPC] Updating to:', manualSession.animeName, 'Ep', episode);
                        lastDetectionRef.current = newDetection;
                        isWatchingRef.current = true;

                        const episodeText = episode ? ` Ep ${episode}` : '';
                        sendDesktopNotification(manualSession.animeName, `Now Watching${episodeText}`);

                        await updateAnimeActivity({
                            animeName: manualSession.animeName,
                            episode,
                            season: null,
                            anilistId: manualSession.anilistId,
                            coverImage: manualSession.coverImage || null,
                            totalEpisodes: null,
                            privacyLevel,
                        });
                    }
                    return; // Done, skip everything else
                }
            }

            // PRIORITY 2: Auto-detection with AniList match
            let hasAutoDetection: boolean = data.status === 'detected' && !!data.parsed?.episode;
            let episode: number | null = data.parsed?.episode || null;
            let anilistId = data.anilist_match?.id;
            let animeName = data.anilist_match?.title?.english || data.anilist_match?.title?.romaji || data.parsed?.title;
            let coverImage = data.anilist_match?.coverImage?.large || null;

            // Folder mapping fallback (for when there's no manual session but file is from mapped folder)
            if (data.status === 'detected' && (!data.parsed?.episode || !data.anilist_match)) {
                const windowTitle = data.window_title || data.parsed?.title || '';
                const folderMapping = getMappingForFilePath(windowTitle);

                if (folderMapping) {
                    const parsedEpisode = parseEpisodeFromString(windowTitle);
                    if (parsedEpisode !== null) {
                        console.log('[useDiscordRPC] Folder mapping fallback:', folderMapping.animeName, 'Ep', parsedEpisode);
                        hasAutoDetection = true;
                        episode = parsedEpisode;
                        anilistId = folderMapping.anilistId;
                        animeName = folderMapping.animeName;
                        coverImage = folderMapping.coverImage || null;
                    }
                }
            }

            // If auto-detection found something, use it (this handles episode changes in player)
            if (hasAutoDetection && anilistId) {
                console.log('[useDiscordRPC] Auto-detection found:', animeName, 'Ep', episode);
                notDetectedCountRef.current = 0;

                const newDetection: LastDetection = {
                    anilistId,
                    animeName: animeName || 'Unknown Anime',
                    episode,
                    season: data.parsed?.season || null,
                    coverImage,
                    totalEpisodes: data.anilist_match?.episodes || null,
                    timestamp: Date.now(),
                };

                const isDifferent = lastDetectionRef.current?.anilistId !== newDetection.anilistId
                    || lastDetectionRef.current?.episode !== newDetection.episode
                    || !isWatchingRef.current;

                if (isDifferent) {
                    console.log('[useDiscordRPC] Updating to:', animeName, 'Ep', newDetection.episode);
                    lastDetectionRef.current = newDetection;
                    isWatchingRef.current = true;

                    // Send notification for episode changes
                    const episodeText = newDetection.episode ? ` Ep ${newDetection.episode}` : '';
                    sendDesktopNotification(newDetection.animeName, `Now Watching${episodeText}`);

                    await updateAnimeActivity({
                        animeName: newDetection.animeName,
                        episode: newDetection.episode,
                        season: newDetection.season,
                        anilistId: newDetection.anilistId,
                        coverImage: newDetection.coverImage,
                        totalEpisodes: newDetection.totalEpisodes,
                        privacyLevel,
                    });
                }
                return; // Successfully detected, don't fall through
            }

            // Fallback: Use manual session ONLY when media player is actively detected
            // (This handles the case where we have a manual session but no parsed episode)
            if (manualSession && data.status === 'detected' && !hasAutoDetection) {
                console.log('[useDiscordRPC] Using manual session (detected but no episode):', manualSession.animeName, 'Ep', manualSession.episode);
                notDetectedCountRef.current = 0;

                const newDetection: LastDetection = {
                    anilistId: manualSession.anilistId,
                    animeName: manualSession.animeName,
                    episode: manualSession.episode,
                    season: null,
                    coverImage: manualSession.coverImage || null,
                    totalEpisodes: null,
                    timestamp: manualSession.startedAt,
                };

                const isDifferent = lastDetectionRef.current?.anilistId !== newDetection.anilistId
                    || lastDetectionRef.current?.episode !== newDetection.episode
                    || !isWatchingRef.current;

                if (isDifferent) {
                    lastDetectionRef.current = newDetection;
                    isWatchingRef.current = true;

                    const episodeText = newDetection.episode ? ` Ep ${newDetection.episode}` : '';
                    sendDesktopNotification(newDetection.animeName, `Now Watching${episodeText}`);

                    await updateAnimeActivity({
                        animeName: newDetection.animeName,
                        episode: newDetection.episode,
                        season: null,
                        anilistId: newDetection.anilistId,
                        coverImage: newDetection.coverImage,
                        totalEpisodes: null,
                        privacyLevel,
                    });
                }
                return;
            }

            console.log('[useDiscordRPC] Detection result:', data.status,
                data.anilist_match?.id ? `AniList ID: ${data.anilist_match.id}` : 'No match');

            if (data.status === 'detected' && data.anilist_match?.id) {
                // Anime is being watched AND we have an AniList match!
                notDetectedCountRef.current = 0; // Reset the counter

                const newDetection: LastDetection = {
                    anilistId: data.anilist_match.id,
                    animeName: data.anilist_match.title?.english
                        || data.anilist_match.title?.romaji
                        || data.parsed?.title || 'Unknown Anime',
                    episode: data.parsed?.episode || null,
                    season: data.parsed?.season || null,
                    coverImage: data.anilist_match.coverImage?.large || null,
                    totalEpisodes: data.anilist_match.episodes || null,
                    timestamp: Date.now(),
                };

                // Only update if it's a different anime or we weren't watching before
                const isDifferentAnime = lastDetectionRef.current?.anilistId !== newDetection.anilistId;
                const isDifferentEpisode = lastDetectionRef.current?.episode !== newDetection.episode;
                const isDifferentSeason = lastDetectionRef.current?.season !== newDetection.season;
                const wasNotWatching = !isWatchingRef.current;



                if (isDifferentAnime || isDifferentEpisode || isDifferentSeason || wasNotWatching) {
                    lastDetectionRef.current = newDetection;
                    isWatchingRef.current = true;

                    // Send notification if it's a new anime or we weren't watching
                    // We can also notify on episode change if desired
                    if (isDifferentAnime || isDifferentEpisode || wasNotWatching) {
                        const seasonText = newDetection.season ? ` S${newDetection.season}` : '';
                        const episodeText = newDetection.episode ? ` Ep ${newDetection.episode}` : '';
                        const title = newDetection.animeName;
                        const body = `Now Watching${seasonText}${episodeText}`;

                        sendDesktopNotification(title, body);
                    }

                    await updateAnimeActivity({
                        animeName: newDetection.animeName,
                        episode: newDetection.episode,
                        season: newDetection.season,
                        anilistId: newDetection.anilistId,
                        coverImage: newDetection.coverImage,
                        totalEpisodes: newDetection.totalEpisodes,
                        privacyLevel,
                    });
                }
            } else {
                // Not detecting anime right now
                notDetectedCountRef.current++;

                console.log('[useDiscordRPC] Not detected count:', notDetectedCountRef.current,
                    '/', BROWSING_DEBOUNCE_COUNT);

                // Only switch to browsing after many consecutive failures AND we were watching
                if (notDetectedCountRef.current >= BROWSING_DEBOUNCE_COUNT && isWatchingRef.current) {
                    console.log('[useDiscordRPC] Switching to browsing mode after debounce');
                    isWatchingRef.current = false;
                    lastDetectionRef.current = null;

                    // Clear manual session when no media player is detected
                    if (manualSession) {
                        console.log('[useDiscordRPC] Clearing manual session - no media player detected');
                        clearManualSession();
                    }

                    await setBrowsingActivity(privacyLevel);
                }
                // Otherwise, keep showing the current anime (the debounce is protecting us)
            }
        } catch (err) {
            console.error('[useDiscordRPC] Error checking media:', err);
            // On error, increment the counter but don't immediately switch
            notDetectedCountRef.current++;
        }
    }, [manualSession, getMappingForFilePath, clearManualSession, privacyLevel]);

    useEffect(() => {
        if (!enabled) {
            // Ensure we clean up if disabled dynamically
            if (isInitialized) {
                clearDiscordActivity();
                stopDiscordRPC();
            }
            return;
        }

        // Initialize Discord RPC on mount
        initDiscordRPC().then((success) => {
            if (success) {
                // Set initial browsing activity
                setBrowsingActivity(privacyLevel);

                // Do an initial check after a short delay
                setTimeout(checkAndUpdateActivity, 2000);

                // Start polling
                pollIntervalRef.current = setInterval(checkAndUpdateActivity, POLL_INTERVAL);
            }
        });

        // Cleanup on unmount
        return () => {
            console.log('[useDiscordRPC] Cleanup triggered - stopping RPC');
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
            }
            stopDiscordRPC();
        };
    }, [enabled, privacyLevel, checkAndUpdateActivity]);

    // Expose manual controls
    return {
        refresh: checkAndUpdateActivity,
        clear: clearDiscordActivity,
        setBrowsing: () => setBrowsingActivity(privacyLevel),
    };
}
