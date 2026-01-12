/**
 * ====================================================================
 * ANIME WATCH PAGE
 * ====================================================================
 *
 * Full-screen video player for anime episodes.
 * Uses the existing StreamPlayer component with sources from extensions.
 * ====================================================================
 */

import { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { AnimeExtensionManager, EpisodeSources, VideoSource } from '../services/AnimeExtensionManager';
import StreamPlayer from '../components/ui/StreamPlayer';
import type { StreamingSource } from '../services/streamingService';
import { getAnimeEntryBySourceId, updateAnimeProgress, markAnimeAsSynced } from '../lib/localAnimeDb';
import { updateMediaProgress } from '../api/anilistClient';
import { updateAnimeActivity, setBrowsingActivity } from '../services/discordRPC';
import { sendDesktopNotification } from '../services/notification';
import './AnimeWatch.css';

function AnimeWatch() {
    const { sourceId, episodeId } = useParams<{ sourceId: string; episodeId: string }>();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const animeTitle = searchParams.get('title') || 'Anime';
    const episodeNum = searchParams.get('ep') || '1';
    const animeId = searchParams.get('animeId');

    const [sources, setSources] = useState<StreamingSource[]>([]);
    const [subtitles, setSubtitles] = useState<{ url: string; lang: string }[]>([]);
    const [headers, setHeaders] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [episodeList, setEpisodeList] = useState<any[]>([]);
    const [nextEpisodeId, setNextEpisodeId] = useState<string | null>(null);
    const [prevEpisodeId, setPrevEpisodeId] = useState<string | null>(null);

    const source = useMemo(() => {
        return sourceId ? AnimeExtensionManager.getSource(sourceId) : null;
    }, [sourceId]);

    // Convert extension VideoSource to StreamPlayer's format
    const convertSources = (episodeSources: EpisodeSources): StreamingSource[] => {
        return episodeSources.sources.map((s: VideoSource) => ({
            url: s.url,
            quality: s.quality,
            isM3U8: s.isM3U8,
        }));
    };

    // Fetch episode sources
    useEffect(() => {
        if (!source || !episodeId) return;

        const fetchSources = async () => {
            setLoading(true);
            setError(null);

            try {
                const decodedEpisodeId = decodeURIComponent(episodeId);
                const episodeSources = await source.getEpisodeSources(decodedEpisodeId);

                if (episodeSources.sources.length === 0) {
                    throw new Error('No video sources found');
                }

                setSources(convertSources(episodeSources));

                // Set subtitles if available
                if (episodeSources.subtitles && episodeSources.subtitles.length > 0) {
                    console.log('[AnimeWatch] Subtitles found:', episodeSources.subtitles);
                    setSubtitles(episodeSources.subtitles);
                }

                if (episodeSources.headers) {
                    setHeaders(episodeSources.headers);
                }

                // Discord RPC Update
                if (animeId) {
                    const decodedAnimeId = decodeURIComponent(animeId);
                    const localEntry = getAnimeEntryBySourceId(sourceId, decodedAnimeId);

                    if (localEntry && localEntry.anilistId) {
                        updateAnimeActivity({
                            animeName: animeTitle,
                            episode: parseInt(episodeNum) || localEntry.episode,
                            season: localEntry.season,
                            anilistId: localEntry.anilistId ?? undefined,
                            coverImage: localEntry.coverImage,
                            totalEpisodes: localEntry.totalEpisodes
                        });
                    } else {
                        // Fallback logic
                    }
                }

            } catch (err) {
                console.error('Failed to fetch episode sources:', err);
                setError(err instanceof Error ? err.message : 'Failed to load video');
            } finally {
                setLoading(false);
            }
        };

        fetchSources();
    }, [source, episodeId]);

    // Fetch Episode List to find Next/Prev
    useEffect(() => {
        if (!source || !animeId) return;

        const fetchEpisodes = async () => {
            try {
                const episodes = await source.getEpisodes(decodeURIComponent(animeId));
                console.log('[AnimeWatch] Fetched episodes:', episodes.length);
                if (episodes && episodes.length > 0) {
                    setEpisodeList(episodes);

                    const decodedEpId = decodeURIComponent(episodeId as string);
                    console.log('[AnimeWatch] Looking for current episode ID:', decodedEpId);

                    const currentIndex = episodes.findIndex(ep => ep.id === decodedEpId);
                    console.log('[AnimeWatch] Current episode index:', currentIndex);

                    if (currentIndex !== -1) {
                        // Check Prev
                        if (currentIndex > 0) {
                            setPrevEpisodeId(episodes[currentIndex - 1].id);
                            console.log('[AnimeWatch] Prev Episode ID:', episodes[currentIndex - 1].id);
                        } else {
                            setPrevEpisodeId(null);
                        }

                        // Check Next
                        if (currentIndex < episodes.length - 1) {
                            setNextEpisodeId(episodes[currentIndex + 1].id);
                            console.log('[AnimeWatch] Next Episode ID:', episodes[currentIndex + 1].id);
                        } else {
                            setNextEpisodeId(null);
                        }
                    } else {
                        console.warn('[AnimeWatch] Current episode not found in list. Available IDs sample:', episodes.slice(0, 3).map(e => e.id));
                    }
                }
            } catch (e) {
                console.error("Failed to fetch episode list for navigation:", e);
            }
        };
        fetchEpisodes();
    }, [source, animeId, episodeId]);

    const handleBack = () => {
        if (animeId && sourceId) {
            navigate(`/anime-source/${sourceId}/${encodeURIComponent(animeId)}`);
        } else {
            // If we don't have context, go back to browse or history
            navigate('/anime-browse');
        }
    };

    // Escape key to go back
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                handleBack();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [animeId, sourceId]);

    // Reset to browsing when leaving
    useEffect(() => {
        return () => {
            setBrowsingActivity();
        };
    }, []);

    const [hasSynced, setHasSynced] = useState(false);

    const handleProgress = async (progress: number, _currentTime: number, _duration: number) => {
        // Sync to AniList at 80% completion
        if (progress >= 80 && !hasSynced && animeId && sourceId) {
            setHasSynced(true); // Prevent multiple syncs

            try {
                const decodedAnimeId = decodeURIComponent(animeId);
                const localEntry = getAnimeEntryBySourceId(sourceId, decodedAnimeId);

                if (localEntry && localEntry.anilistId) {
                    console.log('[AnimeWatch] Reached 80% progress, syncing to AniList...');

                    const epNum = parseInt(episodeNum);

                    // Update AniList
                    await updateMediaProgress(localEntry.anilistId, epNum, "CURRENT");

                    // Update Local DB
                    updateAnimeProgress(localEntry.id, {
                        ...localEntry,
                        episode: epNum
                    });

                    markAnimeAsSynced(localEntry.id);

                    console.log('[AnimeWatch] Synced successfully!');

                    // Send notification
                    await sendDesktopNotification(
                        'AniList Updated',
                        `Marked ${animeTitle} Episode ${epNum} as watched`,
                        localEntry.coverImage
                    );
                }
            } catch (err) {
                console.error('[AnimeWatch] Failed to sync progress:', err);
                setHasSynced(false); // Retry on next update if failed (optional, careful with loops)
            }
        }
    };

    const handleEnded = () => {
        // Auto-play next if available (optional, maybe configurable later)
        if (nextEpisodeId) {
            handleNextEpisode();
        }
    };

    const handleNextEpisode = () => {
        if (nextEpisodeId && sourceId && animeId) {
            // Find episode number for the next episode
            const nextEp = episodeList.find(e => e.id === nextEpisodeId);
            const nextEpNum = nextEp ? nextEp.number : (parseInt(episodeNum) + 1).toString();

            navigate(`/watch/${sourceId}/${encodeURIComponent(nextEpisodeId)}?animeId=${encodeURIComponent(animeId)}&title=${encodeURIComponent(animeTitle)}&ep=${nextEpNum}`);
        }
    };

    const handlePrevEpisode = () => {
        if (prevEpisodeId && sourceId && animeId) {
            // Find episode number for the prev episode
            const prevEp = episodeList.find(e => e.id === prevEpisodeId);
            const prevEpNum = prevEp ? prevEp.number : (parseInt(episodeNum) - 1).toString();

            navigate(`/watch/${sourceId}/${encodeURIComponent(prevEpisodeId)}?animeId=${encodeURIComponent(animeId)}&title=${encodeURIComponent(animeTitle)}&ep=${prevEpNum}`);
        }
    };

    if (loading) {
        return (
            <div className="anime-watch loading">
                <div className="loader"></div>
                <p>Loading video...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="anime-watch error">
                <h2>Error Loading Video</h2>
                <p>{error}</p>
                <div className="error-actions">
                    <button onClick={handleBack}>Go Back</button>
                    {sourceId === 'hianime' && animeId && episodeId && (
                        <button
                            className="primary"
                            onClick={() => window.open(`https://hianime.to/watch/${animeId}?ep=${episodeId}`, '_blank')}
                        >
                            Watch on HiAnime
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="anime-watch">
            {/* Back Button */}
            <button className="back-btn" onClick={handleBack}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
            </button>

            {/* Video Player */}
            <StreamPlayer
                sources={sources}
                subtitles={subtitles}
                title={`${animeTitle} - Episode ${episodeNum}`}
                onProgress={handleProgress}
                onEnded={handleEnded}
                headers={headers}
                onNext={nextEpisodeId ? handleNextEpisode : undefined}
                hasNextEpisode={!!nextEpisodeId}
                onPrev={prevEpisodeId ? handlePrevEpisode : undefined}
                hasPrevEpisode={!!prevEpisodeId}
            />
        </div>
    );
}

export default AnimeWatch;
