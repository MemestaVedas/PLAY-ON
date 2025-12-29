import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

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

interface NowPlayingProps {
    onAnimeDetected?: (result: DetectionResult) => void;
}

export function NowPlaying({ onAnimeDetected }: NowPlayingProps) {
    const [detection, setDetection] = useState<DetectionResult | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const detectAnime = async () => {
            try {
                const result = await invoke<string>('detect_anime_command');
                const parsed: DetectionResult = JSON.parse(result);
                setDetection(parsed);
                setError(null);

                if (parsed.status === 'detected' && onAnimeDetected) {
                    onAnimeDetected(parsed);
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
        </div>
    );
}

export default NowPlaying;
