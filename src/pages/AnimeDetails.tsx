import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAnimeData, Anime } from '../hooks/useAnimeData';
import { updateMediaProgress, updateMediaStatus, toggleFavourite } from '../api/anilistClient';
import { useFolderMappings } from '../hooks/useFolderMappings';
import { useMalAuth } from '../context/MalAuthContext';
import { useAuthContext } from '../context/AuthContext';
import * as malClient from '../api/malClient';
import AnimeCard from '../components/ui/AnimeCard';

import { AnimeStats } from '../components/anime/AnimeStats';
import { AnimeProgressCard } from '../components/anime/AnimeProgressCard';
import { AnimeResumeButton } from '../components/anime/AnimeResumeButton';
import { MediaRelations } from '../components/media/MediaRelations';
import { ReadMoreText } from '../components/ui/ReadMoreText';
import { StatusDropdown } from '../components/ui/StatusDropdown';
import { PlayIcon, CheckIcon, PauseIcon, XIcon, ClipboardIcon, RotateCwIcon, HeartIcon, ArrowRightIcon } from '../components/ui/Icons';
import { motion } from 'framer-motion';
import { useDynamicTheme } from '../context/DynamicThemeContext';
import { DetailsSkeleton } from '../components/ui/SkeletonLoader';

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
    const { isAuthenticated } = useAuthContext();

    // Debug Auth State
    useEffect(() => {
        console.log('[AnimeDetails] Auth State:', isAuthenticated);
    }, [isAuthenticated]);

    const malAuth = useMalAuth();
    const [anime, setAnime] = useState<Anime | null>(null);
    const [loading, setLoading] = useState(true);
    const [progress, setProgress] = useState(0);
    const [updating, setUpdating] = useState(false);
    const [currentStatus, setCurrentStatus] = useState<string | null>(null);
    const [statusUpdating, setStatusUpdating] = useState(false);
    const [isFavorite, setIsFavorite] = useState(false);
    const [favoriteUpdating, setFavoriteUpdating] = useState(false);

    // Dynamic theme - use blurred banner as ambient background (fallback to cover)
    const bgImage = anime?.bannerImage || anime?.coverImage?.extraLarge || anime?.coverImage?.large;
    const { setCoverImage, clearTheme } = useDynamicTheme();

    // Set background image for dynamic theming when anime loads
    useEffect(() => {
        if (bgImage) {
            setCoverImage(bgImage);
        }
        // Clear when leaving the page
        return () => clearTheme();
    }, [bgImage, setCoverImage, clearTheme]);

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
                    // Set favorite status from API response
                    setIsFavorite((data as any).isFavourite || false);
                    if (data.mediaListEntry) {
                        setProgress(data.mediaListEntry.progress);
                        setCurrentStatus(data.mediaListEntry.status);
                    } else {
                        setCurrentStatus(null);
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

    const handleFavoriteToggle = async () => {
        if (!anime || favoriteUpdating || !isAuthenticated) return;

        setFavoriteUpdating(true);
        try {
            await toggleFavourite(anime.id, undefined);
            setIsFavorite(!isFavorite);
        } catch (err) {
            console.error('Failed to toggle favorite:', err);
        } finally {
            setFavoriteUpdating(false);
        }
    };

    if (loading) return <DetailsSkeleton />;

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

                        {/* Favorite Heart Button */}
                        {isAuthenticated && (
                            <motion.button
                                onClick={handleFavoriteToggle}
                                disabled={favoriteUpdating}
                                className="absolute bottom-3 right-3 w-10 h-10 rounded-full flex items-center justify-center z-50"
                                style={{
                                    background: isFavorite ? 'rgba(239, 68, 68, 0.9)' : 'rgba(0, 0, 0, 0.6)',
                                    backdropFilter: 'blur(8px)',
                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                                }}
                                title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                animate={{
                                    scale: isFavorite ? 1 : 1, // Reset scale
                                    backgroundColor: isFavorite ? 'rgba(239, 68, 68, 0.9)' : 'rgba(0, 0, 0, 0.6)'
                                }}
                                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                            >
                                <motion.div
                                    key={isFavorite ? 'fav' : 'not-fav'}
                                    initial={{ scale: 0.5 }} // Removed opacity: 0 to ensure visibility
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                                >
                                    <HeartIcon
                                        size={20}
                                        filled={isFavorite}
                                        className={`${isFavorite ? 'text-white' : 'text-white/80'} ${favoriteUpdating ? 'animate-pulse' : ''}`}
                                    />
                                </motion.div>
                            </motion.button>
                        )}
                    </div>

                    {/* Right Column: Title, Status, Stats */}
                    <div className="flex flex-col gap-6">
                        {/* Status Dropdown */}
                        <div className="mt-4">
                            <StatusDropdown
                                currentStatus={currentStatus}
                                onStatusChange={handleStatusChange}
                                options={STATUS_OPTIONS}
                                loading={statusUpdating}
                            />
                        </div>

                        {/* Title Block */}
                        <div>
                            <h1 className="text-2xl md:text-4xl font-black tracking-tight leading-none mb-3 drop-shadow-xl bg-clip-text text-transparent bg-gradient-to-br from-white via-white to-lavender-mist">
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

                        {/* Stats Grid - Now in right column */}
                        <AnimeStats anime={anime} />

                        {/* Genres - Also in right column */}
                        <div className="flex flex-wrap gap-2">
                            {anime.genres?.map(g => (
                                <span key={g} className="px-4 py-1.5 rounded-full text-xs font-mono border border-white/20 bg-white/5 text-white/80 hover:bg-white/10 hover:border-lavender-mist/50 transition-colors cursor-default">
                                    #{g.toUpperCase()}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Full Width Content Below */}
                {/* Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

                    {/* Left Column: Description */}
                    <div className="lg:col-span-3 relative p-5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md shadow-inner h-fit">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-lavender-mist via-sky-blue to-transparent opacity-50 rounded-t-xl" />
                        <h3 className="text-xs font-mono text-lavender-mist uppercase tracking-widest mb-3">Synopsis</h3>
                        <ReadMoreText
                            content={anime.description || 'No data available.'}
                            maxHeight={200}
                        />
                    </div>

                    {/* Right Column: Progress & Actions */}
                    <div className="lg:col-span-2 flex flex-col gap-4">
                        {/* Resume Button */}
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

                        {/* Action Button - Search or Browse Extensions */}
                        <motion.button
                            onClick={() => {
                                if (folderMapping) {
                                    // Navigate to local folder
                                    navigate(`/local/${encodeURIComponent(folderMapping.folderPath)}`);
                                } else {
                                    // Search in browse
                                    // Default to 9anime or similar if we had an extension linking system, 
                                    // for now just go to browse with query
                                    navigate(`/anime-browse?q=${encodeURIComponent(title)}`);
                                }
                            }}
                            whileHover={{ scale: 1.01, borderColor: folderMapping ? 'rgba(56, 189, 248, 0.5)' : 'rgba(180, 162, 246, 0.5)' }}
                            whileTap={{ scale: 0.98 }}
                            className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a1a1e] to-[#121214] border border-white/10 p-4 text-left shadow-lg"
                        >
                            {/* Hover Gradient */}
                            <motion.div
                                className={`absolute inset-0 bg-gradient-to-r ${folderMapping ? 'from-mint-tonic/10' : 'from-lavender-mist/10'} to-transparent`}
                                initial={{ opacity: 0 }}
                                whileHover={{ opacity: 1 }}
                                transition={{ duration: 0.3 }}
                            />

                            <div className="relative flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    {/* Icon Box */}
                                    <motion.div
                                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${folderMapping ? 'bg-mint-tonic/10 text-mint-tonic border-mint-tonic/20' : 'bg-lavender-mist/10 text-lavender-mist border-lavender-mist/20'} border`}
                                        whileHover={{ rotate: 15, scale: 1.1 }}
                                        transition={{ type: "spring", stiffness: 400, damping: 10 }}
                                    >
                                        <PlayIcon size={20} />
                                    </motion.div>

                                    {/* Text */}
                                    <div className="flex flex-col gap-0.5">
                                        <span className={`font-mono text-[10px] uppercase tracking-widest ${folderMapping ? 'text-mint-tonic' : 'text-lavender-mist'} font-bold`}>
                                            {folderMapping ? 'CONTINUE WATCHING' : 'SEARCH THIS ANIME'}
                                        </span>
                                        <motion.span
                                            className="font-bold text-white text-lg truncate max-w-[200px] md:max-w-[300px]"
                                            whileHover={{ color: folderMapping ? '#A0E9E5' : '#B4A2F6', x: 2 }}
                                        >
                                            {folderMapping ? 'Local Folder' : 'Browse Extensions'}
                                        </motion.span>
                                    </div>
                                </div>

                                {/* Arrow */}
                                <motion.div
                                    className="flex h-8 w-8 items-center justify-center rounded-full border border-white/5 bg-white/5 text-white/40"
                                    whileHover={{
                                        backgroundColor: folderMapping ? '#A0E9E5' : '#B4A2F6',
                                        color: '#121214',
                                        borderColor: folderMapping ? '#A0E9E5' : '#B4A2F6',
                                        x: 5
                                    }}
                                >
                                    <ArrowRightIcon size={16} />
                                </motion.div>
                            </div>
                        </motion.button>
                    </div>

                </div>

                {/* Relations Section */}
                <div className="-mt-8">
                    <MediaRelations relations={anime.relations} />
                </div>

                {/* Alternative Titles */}
                <div className="mt-10 mb-8 border-t border-white/10 pt-8">
                    <h3 className="text-sm font-mono text-white/40 uppercase tracking-widest mb-4">Alternative Titles</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {anime.title?.romaji && (
                            <div>
                                <span className="text-xs text-lavender-mist/70 block mb-1">Romaji</span>
                                <span className="text-white/80 font-medium">{anime.title.romaji}</span>
                            </div>
                        )}
                        {anime.title?.english && (
                            <div>
                                <span className="text-xs text-lavender-mist/70 block mb-1">English</span>
                                <span className="text-white/80 font-medium">{anime.title.english}</span>
                            </div>
                        )}
                        {anime.title?.native && (
                            <div>
                                <span className="text-xs text-lavender-mist/70 block mb-1">Native</span>
                                <span className="text-white/80 font-medium font-jp">{anime.title.native}</span>
                            </div>
                        )}
                        {/* Synonyms if available could go here, but type def doesn't show them yet */}
                    </div>
                </div>

                {/* Because You Liked Section */}
                {recommendations.length > 0 && (
                    <div className="mt-10">
                        <div className="flex items-center gap-4 mb-6">
                            <h2 className="text-xl font-bold tracking-tight" style={{ color: 'var(--color-text-main)' }}>Because you liked {title}</h2>
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
        </div >
    );
}

export default AnimeDetails;
