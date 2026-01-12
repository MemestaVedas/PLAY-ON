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
import './AnimeWatch.css';

function AnimeWatch() {
    const { sourceId, episodeId } = useParams<{ sourceId: string; episodeId: string }>();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const animeTitle = searchParams.get('title') || 'Anime';
    const episodeNum = searchParams.get('ep') || '1';
    const animeId = searchParams.get('animeId');

    const [sources, setSources] = useState<StreamingSource[]>([]);
    const [headers, setHeaders] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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
                if (episodeSources.headers) {
                    setHeaders(episodeSources.headers);
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

    const handleBack = () => {
        if (animeId && sourceId) {
            navigate(`/anime-source/${sourceId}/${encodeURIComponent(animeId)}`);
        } else {
            navigate(-1);
        }
    };

    const handleEnded = () => {
        // Could auto-play next episode here
        console.log('Episode ended');
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
                <button onClick={handleBack}>Go Back</button>
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
                title={`${animeTitle} - Episode ${episodeNum}`}
                onEnded={handleEnded}
                headers={headers}
            />
        </div>
    );
}

export default AnimeWatch;
