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

// Poll interval in milliseconds (check every 10 seconds - less aggressive)
const POLL_INTERVAL = 10000;

// How many consecutive "not detected" polls before switching to browsing
// 6 * 10s = 60 seconds of no detection before switching to browsing
const BROWSING_DEBOUNCE_COUNT = 6;

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

export function useDiscordRPC(enabled: boolean = true) {
    const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const lastDetectionRef = useRef<LastDetection | null>(null);
    const notDetectedCountRef = useRef<number>(0);
    const isWatchingRef = useRef<boolean>(false);

    // Function to check for media and update Discord
    const checkAndUpdateActivity = useCallback(async () => {
        try {
            const result = await invoke<string>('detect_anime_command');
            const data: DetectedAnime = JSON.parse(result);

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
                        const imageUrl = newDetection.coverImage || undefined;

                        sendDesktopNotification(title, body, imageUrl);
                    }

                    await updateAnimeActivity({
                        animeName: newDetection.animeName,
                        episode: newDetection.episode,
                        season: newDetection.season,
                        anilistId: newDetection.anilistId,
                        coverImage: newDetection.coverImage,
                        totalEpisodes: newDetection.totalEpisodes,
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
                    await setBrowsingActivity();
                }
                // Otherwise, keep showing the current anime (the debounce is protecting us)
            }
        } catch (err) {
            console.error('[useDiscordRPC] Error checking media:', err);
            // On error, increment the counter but don't immediately switch
            notDetectedCountRef.current++;
        }
    }, []);

    useEffect(() => {
        if (!enabled) {
            return;
        }

        // Initialize Discord RPC on mount
        initDiscordRPC().then((success) => {
            if (success) {
                // Set initial browsing activity
                setBrowsingActivity();

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
    }, [enabled, checkAndUpdateActivity]);

    // Expose manual controls
    return {
        refresh: checkAndUpdateActivity,
        clear: clearDiscordActivity,
        setBrowsing: setBrowsingActivity,
    };
}
