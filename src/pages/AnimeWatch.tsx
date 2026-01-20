/**
 * ====================================================================
 * ANIME WATCH PAGE
 * ====================================================================
 *
 * Full-screen video player for anime episodes.
 * Uses the existing StreamPlayer component with sources from extensions.
 * ====================================================================
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { AnimeExtensionManager, EpisodeSources, VideoSource } from '../services/AnimeExtensionManager';
import StreamPlayer from '../components/ui/StreamPlayer';
import type { StreamingSource } from '../services/streamingService';
import { getAnimeEntryBySourceId, updateAnimeProgress, markAnimeAsSynced } from '../lib/localAnimeDb';
import { updateMediaProgress } from '../api/anilistClient';
import { updateAnimeActivity, setBrowsingActivity } from '../services/discordRPC';
import { sendDesktopNotification } from '../services/notification';
import { getSkipTimes, SkipTime } from '../services/skipTimes';
import { fetchAnimeDetails, searchAnime } from '../api/anilistClient';
import { trackAnimeSession } from '../services/StatsService';
import './AnimeWatch.css';

function AnimeWatch() {
    const { sourceId, episodeId } = useParams<{ sourceId: string; episodeId: string }>();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const animeTitle = searchParams.get('title') || 'Anime';
    const episodeNum = searchParams.get('ep') || '1';
    const animeId = searchParams.get('animeId');

    const [sources, setSources] = useState<StreamingSource[]>([]);
    const [embedUrl, setEmbedUrl] = useState<string | null>(null); // For iframe fallback
    const [subtitles, setSubtitles] = useState<{ url: string; lang: string }[]>([]);
    const [skipTimes, setSkipTimes] = useState<SkipTime[]>([]);
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
    // Returns null if all sources are embeds (need iframe fallback)
    const convertSources = (episodeSources: EpisodeSources): { sources: StreamingSource[], embedUrl: string | null } => {
        // Separate embed sources from direct sources
        const directSources = episodeSources.sources.filter((s: VideoSource) => !s.isEmbed);
        const embedSources = episodeSources.sources.filter((s: VideoSource) => s.isEmbed);

        // If we have direct sources, use those
        if (directSources.length > 0) {
            return {
                sources: directSources.map((s: VideoSource) => ({
                    url: s.url,
                    quality: s.quality,
                    isM3U8: s.isM3U8,
                })),
                embedUrl: null
            };
        }

        // Otherwise, use the first embed source
        if (embedSources.length > 0) {
            console.log('[AnimeWatch] Only embed sources available, using iframe fallback');
            return {
                sources: [],
                embedUrl: embedSources[0].url
            };
        }

        return { sources: [], embedUrl: null };
    };

    // Fetch episode sources
    useEffect(() => {
        if (!source || !episodeId) return;

        const fetchSources = async () => {
            setLoading(true);
            setError(null);
            setSkipTimes([]); // Reset skip times

            try {
                const decodedEpisodeId = decodeURIComponent(episodeId);
                const decodedAnimeId = animeId ? decodeURIComponent(animeId) : '';
                const epNum = parseInt(episodeNum);

                // --- Step 1: Resolve AniList ID and MAL ID (needed for vidsrc fallback and skip times) ---
                let malId: number | null = null;
                let anilistId: number | null = null;
                try {
                    const localEntry = sourceId ? getAnimeEntryBySourceId(sourceId, decodedAnimeId) : null;
                    if (localEntry && localEntry.anilistId) {
                        anilistId = localEntry.anilistId;
                        const { data } = await fetchAnimeDetails(localEntry.anilistId);
                        malId = data?.Media?.idMal;
                        statsMeta.current = { id: anilistId!, cover: data?.Media?.coverImage?.large, genres: data?.Media?.genres };
                    } else if (!isNaN(parseInt(decodedAnimeId))) {
                        anilistId = parseInt(decodedAnimeId);
                        const { data } = await fetchAnimeDetails(anilistId);
                        malId = data?.Media?.idMal;
                        statsMeta.current = { id: anilistId!, cover: data?.Media?.coverImage?.large, genres: data?.Media?.genres };
                    } else if (animeTitle) {
                        console.log(`[AnimeWatch] Searching AniList for: ${animeTitle}`);
                        const { data } = await searchAnime(animeTitle, 1, 1);
                        if (data?.Page?.media?.length > 0) {
                            const foundAnime = data.Page.media[0];
                            if (foundAnime.id) {
                                anilistId = foundAnime.id;
                                const { data: detailsData } = await fetchAnimeDetails(foundAnime.id);
                                malId = detailsData?.Media?.idMal;
                                statsMeta.current = { id: anilistId!, cover: detailsData?.Media?.coverImage?.large, genres: detailsData?.Media?.genres };
                            }
                        }
                    }
                    console.log(`[AnimeWatch] Resolved AniList ID: ${anilistId || 'none'}, MAL ID: ${malId || 'none'}`);
                } catch (e) {
                    console.warn('[AnimeWatch] Failed to resolve IDs:', e);
                }

                // --- Step 2: Fetch sources from extension ---
                const episodeSources = await source.getEpisodeSources(decodedEpisodeId);

                if (episodeSources.sources.length === 0) {
                    throw new Error('No video sources found');
                }

                let { sources: convertedSources, embedUrl: convertedEmbed } = convertSources(episodeSources);

                // --- Step 3: If only embeds and we have AniList ID, use vidsrc.icu instead ---
                if (convertedSources.length === 0 && convertedEmbed && anilistId) {
                    // Use vidsrc.icu with AniList ID for reliable playback
                    // Format: https://vidsrc.icu/embed/anime/{anilistId}/{episode}/{dub} (0=sub, 1=dub)
                    const vidsrcUrl = `https://vidsrc.icu/embed/anime/${anilistId}/${epNum || 1}/0`;
                    console.log(`[AnimeWatch] Using vidsrc.icu with AniList ID: ${vidsrcUrl}`);
                    convertedEmbed = vidsrcUrl;
                }

                setSources(convertedSources);
                setEmbedUrl(convertedEmbed);

                // Set subtitles if available
                if (episodeSources.subtitles && episodeSources.subtitles.length > 0) {
                    console.log('[AnimeWatch] Subtitles found:', episodeSources.subtitles);
                    setSubtitles(episodeSources.subtitles);
                }

                if (episodeSources.headers) {
                    setHeaders(episodeSources.headers);
                }

                // --- Step 4: Fetch Skip Times using the MAL ID we already resolved ---
                if (malId && !isNaN(epNum)) {
                    try {
                        console.log(`[AnimeWatch] Fetching skip times for MAL ${malId} Ep ${epNum}`);
                        const skips = await getSkipTimes(malId, epNum);
                        if (skips.length > 0) {
                            console.log('[AnimeWatch] Skip times found:', skips);
                            setSkipTimes(skips);
                        } else {
                            console.log('[AnimeWatch] No skip times found for this episode.');
                        }
                    } catch (e) {
                        console.warn('[AnimeWatch] Failed to fetch skip times:', e);
                    }
                } else {
                    console.warn('[AnimeWatch] Could not resolve MAL ID for skip times.');
                }

                // Discord RPC Update
                if (animeId && sourceId) {
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
    }, [source, episodeId, animeId, sourceId]);

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

    const accumulatedWatchTime = useRef<number>(0);
    const lastProgressTime = useRef<number>(0);
    const statsMeta = useRef<{ id: number; cover?: string; genres?: string[] }>({ id: 0 });

    // Reset stats tracking on new episode
    useEffect(() => {
        accumulatedWatchTime.current = 0;
        lastProgressTime.current = 0;
        // metadata is updated in the data fetching effect
    }, [episodeId, sourceId]);

    const handleProgress = async (progress: number, currentTime: number, _duration: number) => {
        // --- Stats Tracking Logic ---
        const delta = currentTime - lastProgressTime.current;
        // Only count positive increments that look like normal playback (e.g., < 5s)
        // This avoids counting seek jumps as "watched time"
        if (delta > 0 && delta < 5) {
            accumulatedWatchTime.current += delta;

            if (accumulatedWatchTime.current >= 60) {
                const minutes = Math.floor(accumulatedWatchTime.current / 60);
                accumulatedWatchTime.current %= 60; // Keep remainder

                if (statsMeta.current.id) {
                    trackAnimeSession(
                        statsMeta.current.id,
                        animeTitle,
                        statsMeta.current.cover,
                        minutes,
                        statsMeta.current.genres || []
                    );
                } else {
                    // Try to resolve generic ID if metadata isn't fully loaded yet but we have a title
                    // Use a hash or temporary ID 0
                    trackAnimeSession(
                        0,
                        animeTitle,
                        undefined,
                        minutes,
                        []
                    );
                }
            }
        }
        lastProgressTime.current = currentTime;
        // -----------------------------

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
                        episode: epNum,
                        anilistId: localEntry.anilistId === null ? undefined : localEntry.anilistId
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

            {/* Video Player - Use iframe for embeds, StreamPlayer for direct sources */}
            {embedUrl ? (
                <div className="embed-player">
                    <div className="embed-title">{animeTitle} - Episode {episodeNum}</div>
                    <iframe
                        src={embedUrl}
                        title={`${animeTitle} - Episode ${episodeNum}`}
                        allowFullScreen
                        allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                        style={{
                            width: '100%',
                            height: '100%',
                            border: 'none',
                            backgroundColor: '#000'
                        }}
                    />
                    <div className="embed-nav">
                        {prevEpisodeId && (
                            <button onClick={handlePrevEpisode} className="nav-btn prev">
                                ← Previous
                            </button>
                        )}
                        {nextEpisodeId && (
                            <button onClick={handleNextEpisode} className="nav-btn next">
                                Next →
                            </button>
                        )}
                    </div>
                </div>
            ) : (
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
                    skipTimes={skipTimes}
                />
            )}
        </div>
    );
}

export default AnimeWatch;
