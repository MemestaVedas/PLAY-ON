import { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { updateProgress } from '../../lib/localAnimeDb';
import { syncEntryToAniList } from '../../lib/syncService';

interface DetectionResult {
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
        };
        coverImage: {
            large: string;
            medium: string;
        };
        episodes: number | null;
    } | null;
}

interface ProgressiveSearchResult {
    title: {
        english: string | null;
        romaji: string | null;
    };
    matched_query: string;
    words_used: number;
    total_words: number;
}

interface NowPlayingProps {
    onAnimeDetected?: (result: DetectionResult) => void;
}

export function NowPlaying({ onAnimeDetected }: NowPlayingProps) {
    const [detection, setDetection] = useState<DetectionResult | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [progressiveResult, setProgressiveResult] = useState<ProgressiveSearchResult | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [syncStatus, setSyncStatus] = useState<'idle' | 'waiting' | 'saving' | 'syncing' | 'synced' | 'error'>('idle');
    const [watchProgress, setWatchProgress] = useState<number>(0); // 0-100%
    const [remainingTime, setRemainingTime] = useState<number>(0); // Seconds remaining

    // Track last saved episode to avoid duplicate saves
    const lastSavedRef = useRef<string | null>(null);

    // Track watch time for 80% threshold sync
    const watchTimeRef = useRef<{
        key: string;
        startTime: number;
        synced: boolean;
        lastSeen?: number;
    } | null>(null);

    // Sync threshold: 10 minutes of watch time (set to 30 seconds for testing if DEBUG_MODE is true)
    const DEBUG_MODE = false; // Set to true for testing with 30 second threshold
    const SYNC_THRESHOLD_MS = DEBUG_MODE ? 30 * 1000 : 10 * 60 * 1000;

    // Test progressive search with a sample title
    const testProgressiveSearch = async () => {
        setIsSearching(true);
        try {
            const testTitle = detection?.parsed?.title || 'Frieren Beyond Journey End';
            console.log('[Test] Starting progressive search for:', testTitle);
            const result = await invoke<string>('progressive_search_command', { title: testTitle });
            const parsed: ProgressiveSearchResult | null = JSON.parse(result);
            console.log('[Test] Progressive search result:', parsed);
            setProgressiveResult(parsed);
        } catch (err) {
            console.error('[Test] Progressive search error:', err);
        } finally {
            setIsSearching(false);
        }
    };

    // Save progress locally and sync to AniList
    const saveAndSync = async (result: DetectionResult) => {
        if (!result.parsed?.title || !result.parsed?.episode) return;

        const anilistMatch = result.anilist_match;
        const saveKey = `${anilistMatch?.id || result.parsed.title}-ep${result.parsed.episode}`;

        // Skip if already saved this episode
        if (lastSavedRef.current === saveKey) return;
        lastSavedRef.current = saveKey;

        try {
            setSyncStatus('saving');

            // Save to local DB first (instant)
            const entry = updateProgress(
                String(anilistMatch?.id || result.parsed.title),
                {
                    title: anilistMatch?.title.english || anilistMatch?.title.romaji || result.parsed.title,
                    titleRomaji: anilistMatch?.title.romaji,
                    episode: result.parsed.episode,
                    totalEpisodes: anilistMatch?.episodes || undefined,
                    anilistId: anilistMatch?.id,
                    coverImage: anilistMatch?.coverImage.large || anilistMatch?.coverImage.medium,
                }
            );

            console.log('[NowPlaying] Saved to local DB:', entry.title, 'Ep', entry.episode);

            // Sync to AniList in background if we have a match
            if (anilistMatch?.id) {
                setSyncStatus('syncing');
                const synced = await syncEntryToAniList(entry);
                setSyncStatus(synced ? 'synced' : 'error');
            } else {
                setSyncStatus('idle'); // No AniList match, just saved locally
            }
        } catch (err) {
            console.error('[NowPlaying] Save/sync error:', err);
            setSyncStatus('error');
        }
    };

    useEffect(() => {
        const detectAnime = async () => {
            try {
                const result = await invoke<string>('detect_anime_command');
                const parsed: DetectionResult = JSON.parse(result);
                setDetection(parsed);
                setError(null);

                if (parsed.status === 'detected' && parsed.parsed?.episode) {
                    if (onAnimeDetected) {
                        onAnimeDetected(parsed);
                    }

                    const anilistMatch = parsed.anilist_match;
                    const episodeKey = `${anilistMatch?.id || parsed.parsed.title}-ep${parsed.parsed.episode}`;

                    // New episode or different episode detected
                    if (!watchTimeRef.current || watchTimeRef.current.key !== episodeKey) {
                        console.log('[NowPlaying] New tracking session:', episodeKey);
                        watchTimeRef.current = { key: episodeKey, startTime: Date.now(), synced: false };
                        lastSavedRef.current = null;
                        setSyncStatus('waiting');
                        setWatchProgress(0);
                        setRemainingTime(SYNC_THRESHOLD_MS / 1000);
                    }

                    // Calculate watch progress
                    const watchedMs = Date.now() - watchTimeRef.current.startTime;
                    const progress = Math.min((watchedMs / SYNC_THRESHOLD_MS) * 100, 100);
                    const remaining = Math.max(0, Math.ceil((SYNC_THRESHOLD_MS - watchedMs) / 1000));
                    setWatchProgress(progress);
                    setRemainingTime(remaining);

                    // Sync after reaching threshold
                    if (watchedMs >= SYNC_THRESHOLD_MS && !watchTimeRef.current.synced) {
                        watchTimeRef.current.synced = true;
                        console.log('[NowPlaying] ✓ Threshold reached! Syncing...');
                        saveAndSync(parsed);
                    }
                } else {
                    // Not playing or no episode info - use grace period before resetting
                    // This prevents resets if detection fails for a few seconds
                    if (watchTimeRef.current && !watchTimeRef.current.synced) {
                        const gracePeriodMs = 60 * 1000; // 60 seconds grace
                        const timeSinceLastDetection = Date.now() - (watchTimeRef.current.lastSeen || Date.now());

                        if (!watchTimeRef.current.lastSeen) {
                            watchTimeRef.current.lastSeen = Date.now();
                        }

                        if (timeSinceLastDetection > gracePeriodMs) {
                            console.log('[NowPlaying] Playback lost for >60s, resetting tracker');
                            watchTimeRef.current = null;
                            setWatchProgress(0);
                            setSyncStatus('idle');
                        } else {
                            // Still in grace period, just show as "waiting"
                            // We don't update progress while "lost"
                        }
                    }
                }

                // Update last seen timestamp if detected
                if (parsed.status === 'detected' && watchTimeRef.current) {
                    watchTimeRef.current.lastSeen = Date.now();
                }

            } catch (err) {
                console.error('Error detecting anime:', err);
                setError('Detection error');
            } finally {
                setIsLoading(false);
            }
        };

        detectAnime();
        const interval = setInterval(detectAnime, 3000);
        return () => clearInterval(interval);
    }, [onAnimeDetected]);

    const isPlaying = detection?.status === 'detected';
    const hasMatch = isPlaying && detection?.anilist_match;

    return (
        <div style={{
            background: isPlaying
                ? 'linear-gradient(135deg, rgba(180, 162, 246, 0.15) 0%, rgba(157, 240, 179, 0.1) 100%)'
                : 'linear-gradient(135deg, rgba(75, 75, 110, 0.1) 0%, rgba(50, 50, 75, 0.1) 100%)',
            borderRadius: '16px',
            border: isPlaying
                ? '1px solid rgba(180, 162, 246, 0.3)'
                : '1px solid rgba(255, 255, 255, 0.08)',
            padding: '1.5rem',
            transition: 'all 0.4s ease',
            overflow: 'hidden',
            position: 'relative',
        }}>
            {/* Animated glow effect when playing */}
            {isPlaying && (
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'radial-gradient(ellipse at center, rgba(180, 162, 246, 0.1) 0%, transparent 70%)',
                    animation: 'pulse 3s ease-in-out infinite',
                    pointerEvents: 'none',
                }} />
            )}

            <div style={{ position: 'relative', zIndex: 1 }}>
                {/* Header */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    marginBottom: '1rem',
                }}>
                    <div style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        background: isPlaying ? '#86EFAC' : '#6B7280',
                        boxShadow: isPlaying ? '0 0 10px rgba(134, 239, 172, 0.6)' : 'none',
                        animation: isPlaying ? 'pulse 2s ease-in-out infinite' : 'none',
                    }} />
                    <h3 style={{
                        margin: 0,
                        fontSize: '1rem',
                        fontWeight: '600',
                        color: '#E5E7EB',
                        letterSpacing: '0.02em',
                    }}>
                        {isPlaying ? 'Now Playing' : 'Not Playing'}
                    </h3>
                    {isPlaying && detection?.player && (
                        <span style={{
                            fontSize: '0.75rem',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '6px',
                            background: 'rgba(180, 162, 246, 0.2)',
                            color: '#B4A2F6',
                            fontWeight: '500',
                        }}>
                            {detection.player}
                        </span>
                    )}
                </div>

                {isLoading ? (
                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        padding: '2rem',
                    }}>
                        <div style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            border: '2px solid rgba(180, 162, 246, 0.3)',
                            borderTopColor: '#B4A2F6',
                            animation: 'spin 1s linear infinite',
                        }} />
                    </div>
                ) : error ? (
                    <p style={{ color: '#EF4444', textAlign: 'center', padding: '1rem' }}>
                        {error}
                    </p>
                ) : isPlaying ? (
                    <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
                        {/* Cover Image */}
                        {hasMatch && detection.anilist_match?.coverImage && (
                            <div style={{
                                flexShrink: 0,
                                width: '100px',
                                height: '140px',
                                borderRadius: '12px',
                                overflow: 'hidden',
                                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                            }}>
                                <img
                                    src={detection.anilist_match.coverImage.large || detection.anilist_match.coverImage.medium}
                                    alt={detection.anilist_match.title.english || detection.anilist_match.title.romaji}
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover',
                                    }}
                                />
                            </div>
                        )}

                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                            {/* Anime Title */}
                            <h4 style={{
                                margin: '0 0 0.5rem 0',
                                fontSize: '1.25rem',
                                fontWeight: '600',
                                color: '#FFFFFF',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                            }}>
                                {hasMatch
                                    ? (detection.anilist_match?.title.english || detection.anilist_match?.title.romaji)
                                    : detection?.parsed?.title || 'Unknown Title'
                                }
                            </h4>

                            {/* Episode Info */}
                            {detection?.parsed?.episode && (
                                <div style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.5rem 0.75rem',
                                    background: 'rgba(157, 240, 179, 0.15)',
                                    borderRadius: '8px',
                                    marginBottom: '0.75rem',
                                }}>
                                    <span style={{ fontSize: '1.1rem' }}>▶️</span>
                                    <span style={{
                                        fontSize: '0.9rem',
                                        fontWeight: '600',
                                        color: '#9DF0B3',
                                    }}>
                                        Episode {detection.parsed.episode}
                                        {detection.parsed.season && ` • Season ${detection.parsed.season}`}
                                    </span>
                                    {hasMatch && detection.anilist_match?.episodes && (
                                        <span style={{
                                            fontSize: '0.75rem',
                                            color: '#9CA3AF',
                                        }}>
                                            / {detection.anilist_match.episodes}
                                        </span>
                                    )}
                                </div>
                            )}

                            {/* AniList Match Status */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                fontSize: '0.8rem',
                                color: hasMatch ? '#86EFAC' : '#9CA3AF',
                            }}>
                                {hasMatch ? (
                                    <>
                                        <span>✓</span>
                                        <span>Matched on AniList</span>
                                    </>
                                ) : (
                                    <>
                                        <span>○</span>
                                        <span>No AniList match</span>
                                    </>
                                )}
                            </div>

                            {/* Sync Status Indicator */}
                            {syncStatus !== 'idle' && (
                                <div style={{
                                    marginTop: '0.5rem',
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        fontSize: '0.75rem',
                                        padding: '0.35rem 0.6rem',
                                        borderRadius: '6px',
                                        background: syncStatus === 'synced'
                                            ? 'rgba(134, 239, 172, 0.15)'
                                            : syncStatus === 'error'
                                                ? 'rgba(239, 68, 68, 0.15)'
                                                : 'rgba(180, 162, 246, 0.15)',
                                        color: syncStatus === 'synced'
                                            ? '#86EFAC'
                                            : syncStatus === 'error'
                                                ? '#EF4444'
                                                : '#B4A2F6',
                                    }}>
                                        <span>
                                            {syncStatus === 'waiting' && '⏳'}
                                            {syncStatus === 'saving' && '💾'}
                                            {syncStatus === 'syncing' && '🔄'}
                                            {syncStatus === 'synced' && '☁️'}
                                            {syncStatus === 'error' && '⚠️'}
                                        </span>
                                        <span>
                                            {syncStatus === 'waiting' && (() => {
                                                const mins = Math.floor(remainingTime / 60);
                                                const secs = remainingTime % 60;
                                                return `Watching... ${mins}:${secs.toString().padStart(2, '0')} until sync`;
                                            })()}
                                            {syncStatus === 'saving' && 'Saving locally...'}
                                            {syncStatus === 'syncing' && 'Syncing to AniList...'}
                                            {syncStatus === 'synced' && 'Synced!'}
                                            {syncStatus === 'error' && 'Sync failed (queued)'}
                                        </span>
                                    </div>

                                    {/* Progress bar for waiting state */}
                                    {syncStatus === 'waiting' && (
                                        <div style={{
                                            marginTop: '0.5rem',
                                            height: '4px',
                                            background: 'rgba(180, 162, 246, 0.2)',
                                            borderRadius: '2px',
                                            overflow: 'hidden',
                                        }}>
                                            <div style={{
                                                width: `${watchProgress}%`,
                                                height: '100%',
                                                background: 'linear-gradient(90deg, #B4A2F6, #9DF0B3)',
                                                borderRadius: '2px',
                                                transition: 'width 0.3s ease',
                                            }} />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div style={{
                        textAlign: 'center',
                        padding: '1.5rem',
                        color: '#9CA3AF',
                    }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem', opacity: 0.5 }}>
                            📺
                        </div>
                        <p style={{ margin: 0, fontSize: '0.95rem' }}>
                            Start playing anime in VLC, MPV, or MPC to see it here
                        </p>
                    </div>
                )}

                {/* Test Progressive Search Section */}
                <div style={{
                    marginTop: '1rem',
                    padding: '1rem',
                    background: 'rgba(180, 162, 246, 0.1)',
                    borderRadius: '12px',
                    border: '1px solid rgba(180, 162, 246, 0.2)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                        <span style={{ fontSize: '0.9rem', color: '#B4A2F6' }}>🔬 Test Progressive Search</span>
                        <button
                            onClick={testProgressiveSearch}
                            disabled={isSearching}
                            style={{
                                padding: '0.4rem 0.8rem',
                                borderRadius: '8px',
                                border: 'none',
                                background: isSearching ? '#6B7280' : '#B4A2F6',
                                color: '#FFFFFF',
                                fontSize: '0.8rem',
                                fontWeight: '500',
                                cursor: isSearching ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s ease',
                            }}
                        >
                            {isSearching ? 'Searching...' : 'Test Search'}
                        </button>
                    </div>
                    {progressiveResult && (
                        <div style={{
                            fontSize: '0.85rem',
                            color: '#9CA3AF',
                            background: 'rgba(0, 0, 0, 0.2)',
                            padding: '0.75rem',
                            borderRadius: '8px',
                        }}>
                            <div style={{ marginBottom: '0.25rem' }}>
                                <strong style={{ color: '#86EFAC' }}>Found:</strong>{' '}
                                {progressiveResult.title.english || progressiveResult.title.romaji}
                            </div>
                            <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>
                                Matched with "{progressiveResult.matched_query}" ({progressiveResult.words_used}/{progressiveResult.total_words} words)
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* CSS Animations */}
            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.6; }
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div >
    );
}

export default NowPlaying;
