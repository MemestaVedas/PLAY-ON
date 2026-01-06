import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAnimeData, Anime } from '../hooks/useAnimeData';
import { updateMediaProgress, updateMediaStatus } from '../api/anilistClient';
import { useFolderMappings } from '../hooks/useFolderMappings';
import { useMalAuth } from '../context/MalAuthContext';
import * as malClient from '../api/malClient';
import AnimeCard from '../components/ui/AnimeCard';
import Loading from '../components/ui/Loading';
import { AnimeStats } from '../components/anime/AnimeStats';
import { AnimeProgressCard } from '../components/anime/AnimeProgressCard';
import { AnimeResumeButton } from '../components/anime/AnimeResumeButton';
import { StatusDropdown } from '../components/ui/StatusDropdown';
import { PlayIcon, CheckIcon, PauseIcon, XIcon, ClipboardIcon, RotateCwIcon } from '../components/ui/Icons';

// Status options for AniList
const STATUS_OPTIONS = [
    { value: 'CURRENT', label: 'Watching', icon: <PlayIcon size={16} /> },
    { value: 'COMPLETED', label: 'Completed', icon: <CheckIcon size={16} /> },
    { value: 'PAUSED', label: 'Paused', icon: <PauseIcon size={16} /> },
    { value: 'DROPPED', label: 'Dropped', icon: <XIcon size={16} /> },
    { value: 'PLANNING', label: 'Planning', icon: <ClipboardIcon size={16} /> },
    { value: 'REPEATING', label: 'Rewatching', icon: <RotateCwIcon size={16} /> },
];


function AnimeDetails() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { getAnimeDetails } = useAnimeData();
    const { getMappingByAnilistId } = useFolderMappings();
    const malAuth = useMalAuth();
    const [anime, setAnime] = useState<Anime | null>(null);
    const [loading, setLoading] = useState(true);
    const [progress, setProgress] = useState(0);
    const [updating, setUpdating] = useState(false);
    const [currentStatus, setCurrentStatus] = useState('CURRENT');
    const [statusUpdating, setStatusUpdating] = useState(false);

    // Check if this anime is linked to a local folder
    const folderMapping = anime ? getMappingByAnilistId(anime.id) : undefined;

    useEffect(() => {
        if (!id) return;
        async function load() {
            setLoading(true);
            try {
                const data = await getAnimeDetails(parseInt(id!));
                if (data) {
                    setAnime(data);
                    if (data.mediaListEntry) {
                        setProgress(data.mediaListEntry.progress);
                        setCurrentStatus(data.mediaListEntry.status || 'CURRENT');
                    }
                }
            } catch (err) {
                console.error('[AnimeDetails] Error loading anime:', err);
            }
            setLoading(false);
        }
        load();
    }, [id, getAnimeDetails]);



    const handleProgressUpdate = async (newProgress: number) => {
        if (!anime || updating) return;
        setUpdating(true);
        try {
            // Update AniList
            await updateMediaProgress(anime.id, newProgress);
            setProgress(newProgress);

            // Also update MAL if authenticated
            if (malAuth.isAuthenticated && malAuth.accessToken) {
                const animeTitle = anime.title?.english || anime.title?.romaji || '';
                try {
                    // Search MAL for this anime to get MAL ID
                    const malResults = await malClient.searchAnime(
                        malAuth.accessToken,
                        animeTitle,
                        1
                    );
                    if (malResults.length > 0) {
                        const malId = malResults[0].id;
                        const malStatus = newProgress > 0 ? 'watching' : undefined;
                        await malClient.updateAnimeProgress(
                            malAuth.accessToken,
                            malId,
                            newProgress,
                            malStatus
                        );
                        console.log('[AnimeDetails] MAL progress synced:', newProgress);
                    }
                } catch (malErr) {
                    console.error('[AnimeDetails] MAL sync failed:', malErr);
                    // Don't fail the whole operation if MAL sync fails
                }
            }
        } catch (err) {
            console.error("Failed to update progress:", err);
        } finally {
            setUpdating(false);
        }
    };

    const handleStatusChange = async (newStatus: string) => {
        if (!anime || statusUpdating || newStatus === currentStatus) return;

        setStatusUpdating(true);
        try {
            await updateMediaStatus(anime.id, newStatus);
            setCurrentStatus(newStatus);
        } catch (err) {
            console.error('Failed to update status:', err);
        } finally {
            setStatusUpdating(false);
        }
    };

    if (loading) return <Loading />;

    if (!anime) return (
        <div className="flex h-screen items-center justify-center font-mono text-red-400">
            SIGNAL_LOST: ANIME_NOT_FOUND
        </div>
    );


    const title = anime.title?.english || anime.title?.romaji || 'Unknown Title';
    const recommendations = anime.recommendations?.nodes.map(n => n.mediaRecommendation) || [];

    return (
        <div className="relative min-h-full font-rounded pb-20" style={{ color: 'var(--color-text-main)', margin: '-96px -32px 0 -32px' }}>
            {/* Banner - Full Width & Top Bleed */}
            <div
                className="relative w-full h-[250px] md:h-[350px]"
            >
                <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{
                        backgroundImage: anime.bannerImage
                            ? `url(${anime.bannerImage})`
                            : `url(${anime.coverImage?.extraLarge})`
                    }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/40 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0f]/80 via-transparent to-transparent" />
            </div>

            {/* Main Content Grid - Overlapping Banner */}
            <div className="relative z-10 max-w-[1400px] mx-auto px-6 md:px-10 -mt-32 md:-mt-48 flex flex-col gap-8">
                <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr] gap-8 md:gap-12 items-start">

                    {/* Left Column: Single Poster Cover */}
                    <div className="relative group shrink-0 mx-auto md:mx-0 w-[180px] md:w-full">
                        <div className="relative rounded-xl overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.5)] ring-1 ring-white/10 transition-transform duration-500 group-hover:scale-[1.02]">
                            <img
                                src={anime.coverImage.extraLarge || anime.coverImage.large}
                                alt={title}
                                className="w-full h-auto object-cover aspect-[2/3]"
                            />
                            {/* Glass Glint Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                        </div>
                    </div>

                    {/* Status Dropdown */}
                    <div className="mt-4">
                        <StatusDropdown
                            currentStatus={currentStatus}
                            onStatusChange={handleStatusChange}
                            options={STATUS_OPTIONS}
                            loading={statusUpdating}
                        />
                    </div>
                </div>

                {/* Right Column: Details */}
                <div className="flex flex-col gap-8">

                    {/* Title Block */}
                    <div>
                        <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-none mb-4 drop-shadow-xl bg-clip-text text-transparent bg-gradient-to-br from-white via-white to-lavender-mist">
                            {title}
                        </h1>
                        <div className="flex flex-wrap gap-2 text-sm text-white/60 font-mono">
                            <span>{anime.seasonYear || 'YEAR_UNKNOWN'}</span>
                            <span>//</span>
                            <span>{anime.format || 'FORMAT_UNKNOWN'}</span>
                            <span>//</span>
                            <span>{anime.episodes ? `${anime.episodes} EPS` : 'EPS_UNKNOWN'}</span>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <AnimeStats anime={anime} />

                    {/* Description Box */}
                    <div className="relative p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md shadow-inner">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-lavender-mist via-sky-blue to-transparent opacity-50 rounded-t-2xl" />
                        <div
                            className="text-base leading-relaxed text-gray-200/90 font-light pr-4"
                            dangerouslySetInnerHTML={{ __html: anime.description || 'No data available.' }}
                        />
                    </div>

                    {/* Resume Button (Separated Action) */}
                    {folderMapping && (
                        <AnimeResumeButton
                            onClick={() => navigate(`/local/${encodeURIComponent(folderMapping.folderPath)}`)}
                            folderPath={folderMapping.folderPath}
                        />
                    )}



                    {/* Progress Control */}
                    <AnimeProgressCard
                        anime={anime}
                        progress={progress}
                        onUpdate={handleProgressUpdate}
                        updating={updating}
                    />

                    {/* Genres */}
                    <div className="flex flex-wrap gap-2">
                        {anime.genres?.map(g => (
                            <span key={g} className="px-4 py-1.5 rounded-full text-xs font-mono border border-white/20 bg-white/5 text-white/80 hover:bg-white/10 hover:border-lavender-mist/50 transition-colors cursor-default">
                                #{g.toUpperCase()}
                            </span>
                        ))}
                    </div>

                </div>
            </div>

            {/* Related Anime Section */}
            {recommendations.length > 0 && (
                <div className="mt-10">
                    <div className="flex items-center gap-4 mb-6">
                        <h2 className="text-2xl font-bold tracking-tight">SIMILAR_SIGNALS</h2>
                        <div className="h-px flex-1 bg-white/10" />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                        {recommendations.map((rec) => (
                            <AnimeCard
                                key={rec.id}
                                anime={rec as unknown as Anime}
                                onClick={(id) => navigate(`/anime/${id}`)}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default AnimeDetails;
