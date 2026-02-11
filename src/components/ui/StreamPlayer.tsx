/**
 * StreamPlayer - Video player component for streaming anime
 * 
 * Features:
 * - HLS stream support via hls.js
 * - Quality selection (from HLS levels)
 * - Subtitle track selection
 * - Standard playback controls
 * - Keyboard shortcuts
 */

import { useRef, useEffect, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { invoke } from '@tauri-apps/api/core';
import type { StreamingSource } from '../../services/streamingService';
import { SkipTime } from '../../services/skipTimes';
import { CastDialog, CastIcon } from './CastDialog';
import ElasticSlider from './ElasticSlider';
import './StreamPlayer.css';

// Subtitle type
interface SubtitleTrack {
    url: string;
    lang: string;
}

// Custom HLS Loader that proxies requests through Tauri
const createTauriLoader = (headers: Record<string, string> = {}) => {
    return class TauriLoader extends Hls.DefaultConfig.loader {
        private _stats: any;

        constructor(config: any) {
            super(config);
            this._stats = {
                aborted: false,
                loaded: 0,
                retry: 0,
                total: 0,
                chunkCount: 0,
                bwEstimate: 0,
                loading: { start: 0, first: 0, end: 0 },
                parsing: { start: 0, end: 0 },
                buffering: { start: 0, first: 0, end: 0 },
            };
        }

        load(context: any, _config: any, callbacks: any) {
            const { url } = context;
            const isPlaylist = url.includes('.m3u8') || context.type === 'manifest' || context.type === 'level';

            // Initialize stats timing
            this._stats.loading.start = performance.now();

            // Use Tauri proxy to fetch content
            invoke<number[]>('stream_proxy', { url, headers })
                .then((response) => {
                    const now = performance.now();
                    this._stats.loading.first = now;
                    this._stats.loading.end = now;
                    this._stats.loaded = response.length;
                    this._stats.total = response.length;
                    this._stats.parsing.start = now;
                    this._stats.parsing.end = now;

                    const uint8Array = new Uint8Array(response);

                    // HLS.js expects string for playlists, ArrayBuffer for segments
                    let data: string | ArrayBuffer;
                    if (isPlaylist) {
                        // Decode as UTF-8 string for playlist files
                        data = new TextDecoder('utf-8').decode(uint8Array);
                    } else {
                        // Keep as ArrayBuffer for media segments
                        data = uint8Array.buffer;
                    }

                    callbacks.onSuccess(
                        {
                            url,
                            data,
                        },
                        this._stats,
                        context,
                        null // networkDetails
                    );
                })
                .catch((error) => {
                    console.error('[StreamProxy] Error:', error);
                    callbacks.onError(
                        { code: 404, text: error.toString() },
                        context,
                        null, // networkDetails
                        this._stats
                    );
                });
        }

        abort() {
            this._stats.aborted = true;
        }

        destroy() {
            // Cleanup if needed
        }
    };
};

interface StreamPlayerProps {
    sources: StreamingSource[];
    subtitles?: SubtitleTrack[];
    title?: string;
    onProgress?: (progress: number, currentTime: number, duration: number) => void;
    onEnded?: () => void;
    onNext?: () => void;
    hasNextEpisode?: boolean;
    onPrev?: () => void;
    hasPrevEpisode?: boolean;
    startTime?: number;

    headers?: Record<string, string>;
    skipTimes?: SkipTime[];
}

// Quality level from HLS.js
interface QualityLevel {
    index: number;
    height: number;
    bitrate: number;
    label: string;
}

export default function StreamPlayer({
    sources,
    subtitles = [],
    title,
    onProgress,
    onEnded,
    onNext,
    hasNextEpisode,
    onPrev,
    hasPrevEpisode,
    startTime = 0,

    headers,
    skipTimes = [],

    onBack,
}: StreamPlayerProps & { onBack?: () => void }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const hlsRef = useRef<Hls | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [activeSkip, setActiveSkip] = useState<SkipTime | null>(null);

    // Autoplay State
    const [showAutoplayOverlay, setShowAutoplayOverlay] = useState(false);
    const [autoplayTimer, setAutoplayTimer] = useState(5);
    const [isAutoplayEnabled] = useState(() => {
        return localStorage.getItem('player_autoplay') !== 'false'; // Default true
    });
    const autoplayIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Persisted State
    const [volume, setVolume] = useState(() => {
        const s = localStorage.getItem('player_volume');
        return s ? parseFloat(s) : 1;
    });
    const [isMuted, setIsMuted] = useState(() => {
        return localStorage.getItem('player_muted') === 'true';
    });

    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [selectedSourceIdx, setSelectedSourceIdx] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Menu State
    const [activeMenu, setActiveMenu] = useState<'none' | 'quality' | 'subtitles' | 'speed' | 'source'>('none');

    // HLS quality levels (from the stream)
    const [qualityLevels, setQualityLevels] = useState<QualityLevel[]>([]);
    const [selectedQuality, setSelectedQuality] = useState(() => {
        const s = localStorage.getItem('player_quality');
        return s ? parseInt(s) : -1;
    });

    // Subtitle state
    const [selectedSubtitle, setSelectedSubtitle] = useState(-1); // -1 = off

    // Playback Speed State
    const [playbackSpeed, setPlaybackSpeed] = useState(() => {
        const s = localStorage.getItem('player_speed');
        return s ? parseFloat(s) : 1.0;
    });
    const speedOptions = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

    // Casting State
    const [isCastDialogOpen, setIsCastDialogOpen] = useState(false);


    // Get current source
    const currentSource = sources[selectedSourceIdx] || sources[0];

    // Handle source change
    const handleSourceChange = useCallback((idx: number) => {
        setSelectedSourceIdx(idx);
        setActiveMenu('none');
        setIsLoading(true);
        // The useEffect for sources/episodeId will handle reloading
    }, []);

    // Handle quality change
    const handleQualityChange = useCallback((levelIndex: number) => {
        if (hlsRef.current) {
            hlsRef.current.currentLevel = levelIndex;
            setSelectedQuality(levelIndex);
            localStorage.setItem('player_quality', levelIndex.toString());
            console.log('[StreamPlayer] Quality changed to:', levelIndex);
            setActiveMenu('none');
        }
    }, []);

    // Handle speed change
    const handleSpeedChange = useCallback((speed: number) => {
        const video = videoRef.current;
        if (!video) return;

        video.playbackRate = speed;
        setPlaybackSpeed(speed);
        localStorage.setItem('player_speed', speed.toString());
        setActiveMenu('none');
    }, []);

    // Handle subtitle change
    const handleSubtitleChange = useCallback((trackIndex: number) => {
        setSelectedSubtitle(trackIndex);
        setActiveMenu('none');

        const video = videoRef.current;
        if (!video) return;

        // Remove existing text tracks
        Array.from(video.textTracks).forEach((track) => {
            track.mode = 'disabled';
        });

        if (trackIndex >= 0 && subtitles[trackIndex]) {
            // Check if track already exists
            let existingTrack: TextTrack | null = null;
            for (let i = 0; i < video.textTracks.length; i++) {
                if (video.textTracks[i].label === subtitles[trackIndex].lang) {
                    existingTrack = video.textTracks[i];
                    break;
                }
            }

            if (existingTrack) {
                existingTrack.mode = 'showing';
            } else {
                // Add new track
                const track = document.createElement('track');
                track.kind = 'subtitles';
                track.label = subtitles[trackIndex].lang;
                track.srclang = subtitles[trackIndex].lang.substring(0, 2).toLowerCase();
                track.src = subtitles[trackIndex].url;
                track.default = true;
                video.appendChild(track);

                // Enable the track after adding
                setTimeout(() => {
                    const newTrack = video.textTracks[video.textTracks.length - 1];
                    if (newTrack) {
                        newTrack.mode = 'showing';
                    }
                }, 100);
            }
        }
    }, [subtitles]);

    // Initialize HLS or native playback
    useEffect(() => {
        const video = videoRef.current;
        if (!video || !currentSource) return;

        setIsLoading(true);
        setError(null);
        setQualityLevels([]);
        // Don't reset selectedQuality, use persisted value

        // Apply persisted video settings
        video.volume = isMuted ? 0 : volume;
        video.muted = isMuted;
        video.playbackRate = playbackSpeed;

        // Cleanup previous HLS instance
        if (hlsRef.current) {
            hlsRef.current.destroy();
            hlsRef.current = null;
        }

        if (currentSource.isM3U8 && Hls.isSupported()) {
            console.log('[StreamPlayer] Initializing HLS with proxy');

            // Use custom loader to bypass CORS
            const hls = new Hls({
                loader: createTauriLoader(headers),
                debug: false,
                startLevel: selectedQuality // Start with saved quality
            });

            hls.loadSource(currentSource.url);
            hls.attachMedia(video);

            hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
                setIsLoading(false);

                // Extract quality levels
                const levels: QualityLevel[] = data.levels.map((level, index) => ({
                    index,
                    height: level.height,
                    bitrate: level.bitrate,
                    label: level.height ? `${level.height}p` : `${Math.round(level.bitrate / 1000)}kbps`
                }));

                // Add "Auto" option at the beginning
                levels.unshift({ index: -1, height: 0, bitrate: 0, label: 'Auto' });
                setQualityLevels(levels);

                if (startTime > 0) {
                    video.currentTime = startTime;
                }
                video.play().catch(console.error);
            });

            hls.on(Hls.Events.ERROR, (_event, data) => {
                if (data.fatal) {
                    console.error('[StreamPlayer] HLS error:', data);
                    setError('Failed to load video stream');
                    setIsLoading(false);
                    hls.destroy();
                }
            });

            hlsRef.current = hls;
        } else {
            // Native HLS or MP4
            video.src = currentSource.url;
            video.addEventListener('loadedmetadata', () => {
                setIsLoading(false);
                if (startTime > 0) {
                    video.currentTime = startTime;
                }
                video.play().catch(console.error);
            });
        }

        return () => {
            if (hlsRef.current) {
                hlsRef.current.destroy();
                hlsRef.current = null;
            }
        };
    }, [currentSource, startTime, headers]);

    // Progress tracking
    useEffect(() => {
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

        progressIntervalRef.current = setInterval(() => {
            const video = videoRef.current;
            if (video && !video.paused) {
                setCurrentTime(video.currentTime);
                setDuration(video.duration || 0);

                if (onProgress && video.duration > 0) {
                    const progress = (video.currentTime / video.duration) * 100;
                    onProgress(progress, video.currentTime, video.duration);
                }

                // Check for skip intervals
                const currentSkip = skipTimes.find(skip =>
                    video.currentTime >= skip.interval.startTime &&
                    video.currentTime < skip.interval.endTime
                );
                setActiveSkip(currentSkip || null);
            }
        }, 1000);

        return () => {
            if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        };
    }, [onProgress, skipTimes]);

    // Autoplay Logic
    const handleEnded = useCallback(() => {
        setIsPlaying(false);
        setShowControls(true);
        if (onEnded) onEnded();

        if (hasNextEpisode && isAutoplayEnabled && onNext) {
            setShowAutoplayOverlay(true);
            setAutoplayTimer(5);

            // Start Countdown
            if (autoplayIntervalRef.current) clearInterval(autoplayIntervalRef.current);
            autoplayIntervalRef.current = setInterval(() => {
                setAutoplayTimer((prev) => {
                    if (prev <= 1) {
                        if (autoplayIntervalRef.current) clearInterval(autoplayIntervalRef.current);
                        onNext();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
    }, [onEnded, hasNextEpisode, isAutoplayEnabled, onNext]);

    // Clean up autoplay timer on unmount
    useEffect(() => {
        return () => {
            if (autoplayIntervalRef.current) clearInterval(autoplayIntervalRef.current);
        };
    }, []);

    // Reset autoplay state on source change
    useEffect(() => {
        setShowAutoplayOverlay(false);
        setAutoplayTimer(5);
        if (autoplayIntervalRef.current) clearInterval(autoplayIntervalRef.current);
    }, [sources]);

    // Enhanced Auto-hide controls
    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;
        const container = containerRef.current;

        const show = () => {
            setShowControls(true);
            container?.classList.remove('hide-cursor');
            clearTimeout(timer);
        };

        const scheduleHide = () => {
            clearTimeout(timer);
            if (isPlaying && activeMenu === 'none') {
                timer = setTimeout(() => {
                    setShowControls(false);
                    container?.classList.add('hide-cursor');
                }, 3000); // 3 seconds inactivity
            }
        };

        const handleActivity = () => {
            show();
            scheduleHide();
        };

        if (container) {
            container.addEventListener('mousemove', handleActivity);
            container.addEventListener('click', handleActivity);
            container.addEventListener('keydown', handleActivity);
        }

        // Trigger initial check or when playing state changes
        if (isPlaying && activeMenu === 'none') {
            scheduleHide();
        } else {
            show();
        }

        return () => {
            if (container) {
                container.removeEventListener('mousemove', handleActivity);
                container.removeEventListener('click', handleActivity);
                container.removeEventListener('keydown', handleActivity);
            }
            clearTimeout(timer);
        };
    }, [isPlaying, activeMenu]);

    // Playback controls
    const togglePlay = useCallback(() => {
        const video = videoRef.current;
        if (!video) return;

        if (video.paused) {
            video.play().catch(console.error);
        } else {
            video.pause();
        }
    }, []);

    const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const video = videoRef.current;
        if (!video) return;

        const time = parseFloat(e.target.value);
        video.currentTime = time;
        setCurrentTime(time);
    }, []);


    const toggleMute = useCallback(() => {
        const video = videoRef.current;
        if (!video) return;

        video.muted = !video.muted;
        setIsMuted(video.muted);
        localStorage.setItem('player_muted', video.muted.toString());
    }, []);

    const toggleFullscreen = useCallback(async () => {
        const container = containerRef.current;
        if (!container) return;

        try {
            if (!document.fullscreenElement) {
                await container.requestFullscreen();
            } else {
                await document.exitFullscreen();
            }
        } catch (e) {
            console.error('Fullscreen error:', e);
        }
    }, []);

    // Smart Subtitle Toggle
    const handleSubtitleClick = () => {
        // If 1 track: Off (-1) <-> On (0)
        // If >1 tracks: Open menu
        if (subtitles.length === 1) {
            if (selectedSubtitle === -1) handleSubtitleChange(0);
            else handleSubtitleChange(-1);
        } else {
            setActiveMenu(activeMenu === 'subtitles' ? 'none' : 'subtitles');
        }
    };

    // Video event handlers
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handlePlay = () => setIsPlaying(true);
        const handlePause = () => setIsPlaying(false);
        // defined above via useCallback: handleEnded
        const handleError = () => {
            setError('Video playback error');
            setIsLoading(false);
        };

        video.addEventListener('play', handlePlay);
        video.addEventListener('pause', handlePause);
        video.addEventListener('ended', handleEnded);
        video.addEventListener('error', handleError);

        return () => {
            video.removeEventListener('play', handlePlay);
            video.removeEventListener('pause', handlePause);
            video.removeEventListener('ended', handleEnded);
            video.removeEventListener('error', handleError);
        };
    }, [onEnded, handleEnded]);

    useEffect(() => {
        const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // Format time
    const formatTime = (seconds: number): string => {
        if (!isFinite(seconds)) return '0:00';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    // Keyboard shortcuts - MUST be before any early returns to follow React hooks rules
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if typing in an input or textarea
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }

            const video = videoRef.current;
            if (!video) return;

            switch (e.key.toLowerCase()) {
                case ' ':
                case 'k':
                    e.preventDefault();
                    togglePlay();
                    break;
                case 'arrowright':
                case 'd':
                    e.preventDefault();
                    video.currentTime = Math.min(video.duration, video.currentTime + 5);
                    setCurrentTime(video.currentTime);
                    break;
                case 'arrowleft':
                case 'a':
                    e.preventDefault();
                    video.currentTime = Math.max(0, video.currentTime - 5);
                    setCurrentTime(video.currentTime);
                    break;
                case 'arrowup':
                case 'w':
                    e.preventDefault();
                    const newVolUp = Math.min(1, video.volume + 0.1);
                    video.volume = newVolUp;
                    video.volume = newVolUp;
                    setVolume(newVolUp);
                    setIsMuted(newVolUp === 0);
                    localStorage.setItem('player_volume', newVolUp.toString());
                    break;
                case 'arrowdown':
                    e.preventDefault();
                    const newVolDown = Math.max(0, video.volume - 0.1);
                    video.volume = newVolDown;
                    setVolume(newVolDown);
                    setIsMuted(newVolDown === 0);
                    localStorage.setItem('player_volume', newVolDown.toString());
                    break;
                case 'm':
                    e.preventDefault();
                    toggleMute();
                    break;
                case 'f':
                    e.preventDefault();
                    toggleFullscreen();
                    break;
                case 's':
                    if (e.shiftKey && activeSkip) {
                        e.preventDefault();
                        const video = videoRef.current;
                        if (video) {
                            video.currentTime = activeSkip.interval.endTime;
                            setCurrentTime(activeSkip.interval.endTime);
                            setActiveSkip(null);
                        }
                    } else {
                        // Volume Down
                        e.preventDefault();
                        const newVolDown = Math.max(0, video.volume - 0.1);
                        video.volume = newVolDown;
                        setVolume(newVolDown);
                        setIsMuted(newVolDown === 0);
                        localStorage.setItem('player_volume', newVolDown.toString());
                    }
                    break;

                case '.':
                    // Next frame (approx 1/24s)
                    e.preventDefault();
                    if (video.paused) {
                        video.currentTime = Math.min(video.duration, video.currentTime + (1 / 24));
                        setCurrentTime(video.currentTime);
                    }
                    break;
                case ',':
                    // Prev frame (approx 1/24s)
                    e.preventDefault();
                    if (video.paused) {
                        video.currentTime = Math.max(0, video.currentTime - (1 / 24));
                        setCurrentTime(video.currentTime);
                    }
                    break;
                case 'c': // Existing 's' is used for volume down, 'S' could be skip?
                    e.preventDefault();
                    // Toggle captions: If -1 (off), set to 0 (first). If >= 0, set to -1.
                    const newSub = selectedSubtitle === -1 ? 0 : -1;
                    // Only toggle if track 0 exists or we are turning off
                    if (newSub === -1 || (subtitles.length > 0)) {
                        handleSubtitleChange(newSub);
                    }
                    break;
                case 'n':
                    if (e.shiftKey && hasNextEpisode && onNext) {
                        e.preventDefault();
                        onNext();
                    }
                    break;
                case 'p':
                    if (e.shiftKey && hasPrevEpisode && onPrev) {
                        e.preventDefault();
                        onPrev();
                    }
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [togglePlay, toggleMute, toggleFullscreen, hasNextEpisode, onNext, hasPrevEpisode, onPrev, handleSubtitleChange, subtitles.length, selectedSubtitle, activeSkip]);

    // Click outside to close menus
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (activeMenu === 'none') return;

            const target = event.target as HTMLElement;

            // If click is inside a menu, do nothing
            if (target.closest('.settings-menu')) return;

            // If click is on a control button (which handles toggling), do nothing
            // We specifically check for buttons that might toggle menus to avoid closing immediately 
            // when clicking the trigger.
            if (target.closest('.control-btn')) return;

            setActiveMenu('none');
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [activeMenu]);

    // Error state - AFTER all hooks
    if (error) {
        return (
            <div className="stream-player error">
                <p>{error}</p>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className={`stream-player ${isFullscreen ? 'fullscreen' : ''}`}
        >
            <video
                ref={videoRef}
                className="stream-video"
                onClick={togglePlay}
                playsInline
                crossOrigin="anonymous"
                onDoubleClick={toggleFullscreen}
            />

            {/* Autoplay Overlay */}
            {showAutoplayOverlay && (
                <div className="autoplay-overlay">
                    <div className="autoplay-content">
                        <h3>Next Episode</h3>
                        <div className="autoplay-timer">
                            <svg width="60" height="60" viewBox="0 0 60 60">
                                <circle cx="30" cy="30" r="28" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="4" />
                                <circle cx="30" cy="30" r="28" fill="none" stroke="var(--color-zen-accent, #B4A2F6)" strokeWidth="4"
                                    strokeDasharray="176"
                                    strokeDashoffset={176 - (176 * autoplayTimer / 5)}
                                    transform="rotate(-90 30 30)"
                                    style={{ transition: 'stroke-dashoffset 1s linear' }}
                                />
                                <text x="50%" y="50%" textAnchor="middle" dy=".3em" fill="#fff" fontSize="20px" fontWeight="bold">
                                    {autoplayTimer}
                                </text>
                            </svg>
                        </div>
                        <div className="autoplay-actions">
                            <button
                                className="autoplay-btn cancel"
                                onClick={() => {
                                    setShowAutoplayOverlay(false);
                                    if (autoplayIntervalRef.current) clearInterval(autoplayIntervalRef.current);
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                className="autoplay-btn play-now"
                                onClick={() => {
                                    if (onNext) onNext();
                                }}
                            >
                                Play Now
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Skip Button Overlay */}
            {activeSkip && (
                <button
                    className="skip-button"
                    onClick={() => {
                        const video = videoRef.current;
                        if (video) {
                            video.currentTime = activeSkip.interval.endTime;
                            setCurrentTime(activeSkip.interval.endTime);
                            setActiveSkip(null); // Hide immediately
                        }
                    }}
                >
                    Skip {activeSkip.skipType === 'op' ? 'Intro' : 'Outro'}
                    <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                        <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                    </svg>
                </button>
            )}

            {
                isLoading && (
                    <div className="stream-loading">
                        <div className="loader"></div>
                        <p>Loading stream...</p>
                    </div>
                )
            }

            <div
                className={`stream-controls ${showControls ? 'visible' : ''}`}
                onClick={(e) => {
                    // Only toggle if clicking the overlay itself, not children
                    if (e.target === e.currentTarget) {
                        togglePlay();
                    }
                }}
            >
                <div className="stream-header">
                    {onBack && (
                        <button onClick={onBack} className="control-btn back-btn" title="Go Back">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
                                <path d="M19 12H5M12 19l-7-7 7-7" />
                            </svg>
                        </button>
                    )}
                    {title && <div className="stream-title">{title}</div>}
                </div>

                <div className="stream-progress">
                    <div className="progress-container">
                        <div
                            className={`visual-track ${isPlaying ? 'squiggly' : ''}`}
                            style={{
                                '--progress-percent': `${(currentTime / (duration || 1)) * 100}%`
                            } as React.CSSProperties}
                        />
                        <input
                            type="range"
                            min={0}
                            max={duration || 100}
                            value={currentTime}
                            onChange={handleSeek}
                            className="interactive-slider"
                        />
                    </div>
                    <span className="time-display">
                        {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                </div>

                <div className="stream-buttons">
                    <div className="left-controls">
                        {/* Previous Button */}
                        {hasPrevEpisode && (
                            <button onClick={onPrev} className="control-btn" title="Previous Episode">
                                <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                                    <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
                                </svg>
                            </button>
                        )}

                        <button onClick={togglePlay} className="control-btn" title={isPlaying ? "Pause" : "Play"}>
                            {isPlaying ? (
                                <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" /></svg>
                            ) : (
                                <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M8 5v14l11-7z" /></svg>
                            )}
                        </button>

                        {/* Next Button */}
                        {hasNextEpisode && (
                            <button onClick={onNext} className="control-btn" title="Next Episode">
                                <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                                    <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                                </svg>
                            </button>
                        )}

                        <div className="volume-control">
                            <div className="volume-elastic-wrapper">
                                <ElasticSlider
                                    defaultValue={(isMuted ? 0 : volume) * 100}
                                    startingValue={0}
                                    maxValue={100}
                                    className="volume-elastic-slider"
                                    leftIcon={
                                        <button onClick={toggleMute} className="control-btn volume-btn" title={isMuted ? "Unmute" : "Mute"}>
                                            {isMuted || volume === 0 ? (
                                                <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" /></svg>
                                            ) : (
                                                <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" /></svg>
                                            )}
                                        </button>
                                    }
                                    rightIcon={null}
                                    valuePlacement="right"
                                    onChange={(val) => {
                                        const newVol = val / 100;
                                        const video = videoRef.current;
                                        if (video) {
                                            video.volume = newVol;
                                            setVolume(newVol);
                                            const muted = newVol === 0;
                                            setIsMuted(muted);
                                            localStorage.setItem('player_volume', newVol.toString());
                                            localStorage.setItem('player_muted', muted.toString());
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="right-controls">
                        {/* Subtitles */}
                        {subtitles.length > 0 && (
                            <div className="control-group">
                                <button
                                    className={`control-btn ${selectedSubtitle !== -1 ? 'active' : ''}`}
                                    onClick={handleSubtitleClick}
                                    title="Subtitles"
                                >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
                                        <path d="M2 5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5z" />
                                        <path d="M10 9H8a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h2" />
                                        <path d="M18 9h-2a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h2" />
                                    </svg>
                                </button>
                                {activeMenu === 'subtitles' && subtitles.length > 1 && (
                                    <div className="settings-menu">
                                        <div
                                            className={`menu-item ${selectedSubtitle === -1 ? 'selected' : ''}`}
                                            onClick={() => handleSubtitleChange(-1)}
                                        >
                                            Off
                                        </div>
                                        {subtitles.map((sub, idx) => (
                                            <div
                                                key={idx}
                                                className={`menu-item ${selectedSubtitle === idx ? 'selected' : ''}`}
                                                onClick={() => handleSubtitleChange(idx)}
                                            >
                                                {sub.lang}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Quality */}
                        {qualityLevels.length > 1 && (
                            <div className="control-group">
                                <button
                                    className={`control-btn ${activeMenu === 'quality' ? 'active' : ''}`}
                                    onClick={() => setActiveMenu(activeMenu === 'quality' ? 'none' : 'quality')}
                                    title="Quality"
                                >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
                                        <circle cx="12" cy="12" r="3"></circle>
                                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                                    </svg>
                                </button>
                                {activeMenu === 'quality' && (
                                    <div className="settings-menu">
                                        {qualityLevels.map((level) => (
                                            <div
                                                key={level.index}
                                                className={`menu-item ${selectedQuality === level.index ? 'selected' : ''}`}
                                                onClick={() => handleQualityChange(level.index)}
                                            >
                                                {level.label}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}{/* End of Quality condition */}

                        {/* Playback Speed */}
                        <div className="control-group">
                            <button
                                className={`control-btn ${activeMenu === 'speed' ? 'active' : ''}`}
                                onClick={() => setActiveMenu(activeMenu === 'speed' ? 'none' : 'speed')}
                                title="Playback Speed"
                            >
                                <span style={{ fontSize: '12px', fontWeight: 'bold', width: '24px', textAlign: 'center' }}>
                                    {playbackSpeed}x
                                </span>
                            </button>
                            {activeMenu === 'speed' && (
                                <div className="settings-menu">
                                    {speedOptions.map((speed) => (
                                        <div
                                            key={speed}
                                            className={`menu-item ${playbackSpeed === speed ? 'selected' : ''}`}
                                            onClick={() => handleSpeedChange(speed)}
                                        >
                                            {speed}x
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Sources */}
                        {sources.length > 1 && (
                            <div className="control-group">
                                <button
                                    className={`control-btn ${activeMenu === 'source' ? 'active' : ''}`}
                                    onClick={() => setActiveMenu(activeMenu === 'source' ? 'none' : 'source')}
                                    title="Switch Source"
                                >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
                                        <path d="M4 17L10 11L4 5" />
                                        <path d="M12 17L18 11L12 5" />
                                    </svg>
                                </button>
                                {activeMenu === 'source' && (
                                    <div className="settings-menu">
                                        {sources.map((src, idx) => (
                                            <div
                                                key={idx}
                                                className={`menu-item ${selectedSourceIdx === idx ? 'selected' : ''}`}
                                                onClick={() => handleSourceChange(idx)}
                                            >
                                                Source {idx + 1} ({src.quality})
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Cast Button */}
                        <button
                            onClick={() => setIsCastDialogOpen(true)}
                            className={`control-btn ${isCastDialogOpen ? 'active' : ''}`}
                            title="Cast to Device"
                        >
                            <CastIcon />
                        </button>

                        <button
                            onClick={toggleFullscreen}
                            className="control-btn"
                            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                        >
                            {isFullscreen ? (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
                                    <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path>
                                </svg>
                            ) : (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
                                    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
                                </svg>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            <CastDialog
                isOpen={isCastDialogOpen}
                onClose={() => setIsCastDialogOpen(false)}
                onConnect={(device) => {
                    console.log("Connecting to", device);

                    return invoke('cast_load_media', {
                        deviceName: device,
                        url: currentSource.url,
                        contentType: currentSource.isM3U8 ? 'application/x-mpegURL' : 'video/mp4',
                        headers: headers || null
                    }).then(() => {
                        console.log("Casting started");
                        if (videoRef.current) videoRef.current.pause();
                    }).catch(err => {
                        console.error("Casting error:", err);
                        throw err; // Re-throw so CastDialog catches it
                    });
                }}
            />
        </div >
    );
}

