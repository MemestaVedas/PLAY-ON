/**
 * ====================================================================
 * MANGA DETAILS PAGE (AniList-based)
 * ====================================================================
 *
 * Shows manga details from AniList with:
 * - Cover image, title, description
 * - Reading progress with tracking controls
 * - Action button: "Continue Reading" if in library, "Search this manga" if not
 * - Similar manga recommendations
 * ====================================================================
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchMangaDetails, updateMangaProgress, updateMediaStatus, toggleFavourite } from '../api/anilistClient';
import { useMangaMappings } from '../hooks/useMangaMappings';
import { StatusDropdown } from '../components/ui/StatusDropdown';
import { useMalAuth } from '../context/MalAuthContext';
import * as malClient from '../api/malClient';
import { updateMediaProgress } from '../api/anilistClient';
import AnimeCard from '../components/ui/AnimeCard';
import { MediaRelations } from '../components/media/MediaRelations';
import { ReadMoreText } from '../components/ui/ReadMoreText';
import ElasticSlider from '../components/ui/ElasticSlider';

import { SearchIcon, BookOpenIcon, ArrowRightIcon, HeartIcon, PlusIcon, CheckIcon } from '../components/ui/Icons';
import { DetailsSkeleton } from '../components/ui/SkeletonLoader';
import { motion } from 'framer-motion';
import { PlayIcon, PauseIcon, XIcon, ClipboardIcon, RotateCwIcon } from '../components/ui/Icons';
import { useAuth } from '../hooks/useAuth';
import { setBrowsingActivity } from '../services/discordRPC';
import { useDynamicTheme } from '../context/DynamicThemeContext';
import { StatsGrid, StatItem } from '../components/ui/StatsGrid';

// Status options for AniList
const STATUS_OPTIONS = [
    { value: 'CURRENT', label: 'Reading', icon: <PlayIcon size={16} /> },
    { value: 'COMPLETED', label: 'Completed', icon: <CheckIcon size={16} /> },
    { value: 'PAUSED', label: 'Paused', icon: <PauseIcon size={16} /> },
    { value: 'DROPPED', label: 'Dropped', icon: <XIcon size={16} /> },
    { value: 'PLANNING', label: 'Planning', icon: <ClipboardIcon size={16} /> },
    { value: 'REPEATING', label: 'Rereading', icon: <RotateCwIcon size={16} /> },
];

interface Manga {
    id: number;
    title: {
        english?: string;
        romaji: string;
        native?: string;
    };
    coverImage: {
        extraLarge: string;
        large: string;
        color?: string;
    };
    bannerImage?: string;
    chapters?: number;
    volumes?: number;
    status?: string;
    format?: string;
    source?: string;
    popularity?: number;
    rankings?: {
        rank: number;
        type: string;
        context: string;
        allTime: boolean;
    }[];
    averageScore?: number;
    startDate?: {
        year?: number;
    };
    genres?: string[];
    relations?: {
        edges: {
            relationType: string;
            node: {
                id: number;
                title: {
                    romaji: string;
                    english?: string;
                    native?: string;
                };
                format?: string;
                type?: string;
                status?: string;
                coverImage?: {
                    large: string;
                    medium: string;
                };
            };
        }[];
    };
    description?: string;
    staff?: {
        nodes: { name: { full: string } }[];
    };
    mediaListEntry?: {
        id: number;
        status: string;
        progress: number;
        progressVolumes?: number;
        score?: number;
    };
    recommendations?: {
        nodes: {
            mediaRecommendation: {
                id: number;
                title: {
                    english?: string;
                    romaji: string;
                };
                coverImage: {
                    large: string;
                    medium: string;
                };
                chapters?: number;
                volumes?: number;
                status?: string;
                averageScore?: number;
                format?: string;
            };
        }[];
    };
}

function MangaDetails() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { getMappingByAnilistId } = useMangaMappings();
    const malAuth = useMalAuth();
    const { user, isAuthenticated } = useAuth();

    // Debug Auth
    useEffect(() => {
        console.log('[MangaDetails] Auth State:', isAuthenticated);
    }, [isAuthenticated]);

    const [manga, setManga] = useState<Manga | null>(null);
    const [loading, setLoading] = useState(true);
    const [progress, setProgress] = useState(0);
    const [updating, setUpdating] = useState(false);
    const [currentStatus, setCurrentStatus] = useState<string | null>(null);
    const [statusUpdating, setStatusUpdating] = useState(false);
    const [isFavorite, setIsFavorite] = useState(false);
    const [favoriteUpdating, setFavoriteUpdating] = useState(false);
    const [score, setScore] = useState(0);
    const [updatingScore, setUpdatingScore] = useState(false);

    // Dynamic theme - use blurred banner as ambient background (fallback to cover)
    const bgImage = manga?.bannerImage || manga?.coverImage?.extraLarge || manga?.coverImage?.large;
    const { setCoverImage, clearTheme } = useDynamicTheme();

    // Set background image for dynamic theming when manga loads
    useEffect(() => {
        if (bgImage) {
            setCoverImage(bgImage);
        }
        // Clear when leaving the page
        return () => clearTheme();
    }, [bgImage, setCoverImage, clearTheme]);

    // Check if this manga is linked to a source in library
    const mangaMapping = manga ? getMappingByAnilistId(manga.id) : undefined;

    useEffect(() => {
        if (!id) return;
        async function load() {
            setLoading(true);
            try {
                const data = await fetchMangaDetails(parseInt(id!));
                if (data.data?.Media) {
                    setManga(data.data.Media as Manga);
                    // Set favorite status from API response
                    setIsFavorite(data.data.Media.isFavourite || false);
                    if (data.data.Media.mediaListEntry) {
                        setProgress(data.data.Media.mediaListEntry.progress);
                        setCurrentStatus(data.data.Media.mediaListEntry.status);
                        setScore(data.data.Media.mediaListEntry.score || 0);
                    } else {
                        setCurrentStatus(null);
                    }
                }
            } catch (err) {
                console.error('[MangaDetails] Error loading manga:', err);
            }
            setLoading(false);
        }
        load();
    }, [id]);

    // Discord RPC - Set browsing activity (Viewing Manga)
    useEffect(() => {
        setBrowsingActivity('full', user?.avatar?.medium || null, user?.name ? `Logged in as ${user.name}` : null);
    }, [user]);



    const handleProgressUpdate = async (newProgress: number) => {
        if (!manga || updating) return;
        setUpdating(true);
        try {
            // Update AniList
            await updateMangaProgress(manga.id, newProgress);
            setProgress(newProgress);

            // Also update MAL if authenticated
            if (malAuth.isAuthenticated && malAuth.accessToken) {
                const mangaTitle = manga.title?.english || manga.title?.romaji || '';
                try {
                    // Search MAL for this manga to get MAL ID
                    const malResults = await malClient.searchManga(
                        malAuth.accessToken,
                        mangaTitle,
                        1
                    );
                    if (malResults.length > 0) {
                        const malId = malResults[0].id;
                        const malStatus = newProgress > 0 ? 'reading' : undefined;
                        await malClient.updateMangaProgress(
                            malAuth.accessToken,
                            malId,
                            newProgress,
                            malStatus
                        );
                        console.log('[MangaDetails] MAL progress synced:', newProgress);
                    }
                } catch (malErr) {
                    console.error('[MangaDetails] MAL sync failed:', malErr);
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
        if (!manga || statusUpdating || newStatus === currentStatus) {
            return;
        }

        setStatusUpdating(true);
        try {
            await updateMediaStatus(manga.id, newStatus);
            setCurrentStatus(newStatus);
        } catch (err) {
            console.error('Failed to update status:', err);
        } finally {
            setStatusUpdating(false);
        }
    };



    const handleActionClick = () => {
        if (mangaMapping) {
            // Navigate to the source manga page (continue reading)
            navigate(`/manga/${mangaMapping.sourceId}/${mangaMapping.sourceMangaId}`);
        } else {
            // Search this manga in browse
            const title = manga?.title?.english || manga?.title?.romaji || '';
            navigate(`/manga-browse?q=${encodeURIComponent(title)}`);
        }
    };

    const handleFavoriteToggle = async () => {
        if (!manga || favoriteUpdating || !isAuthenticated) return;

        setFavoriteUpdating(true);
        try {
            await toggleFavourite(undefined, manga.id);
            setIsFavorite(!isFavorite);
        } catch (err) {
            console.error('Failed to toggle favorite:', err);
        } finally {
            setFavoriteUpdating(false);
        }
    };

    if (loading) return <DetailsSkeleton />;

    if (!manga) return (
        <div className="flex h-screen items-center justify-center font-mono text-red-400">
            SIGNAL_LOST: MANGA_NOT_FOUND
        </div>
    );


    const title = manga.title?.english || manga.title?.romaji || 'Unknown Title';
    const recommendations = manga.recommendations?.nodes.map(n => n.mediaRecommendation) || [];
    const percentage = manga.chapters ? Math.min((progress / manga.chapters) * 100, 100) : 0;

    // Stats Logic
    const allTimeRank = manga.rankings?.find(r => r.allTime && r.type === 'RATED')?.rank;
    const popularity = manga.popularity?.toLocaleString();
    const source = manga.source?.replace(/_/g, ' ') || 'Original';

    const stats: StatItem[] = [
        { label: 'SCORE', value: manga.averageScore ? `${manga.averageScore}%` : 'N/A', color: 'text-mint-tonic', icon: 'score' },
        { label: 'RANK', value: allTimeRank ? `#${allTimeRank}` : 'N/A', color: 'text-sky-blue', icon: 'rank' },
        { label: 'POPULARITY', value: popularity ? popularity : 'N/A', color: 'text-pastels-pink', icon: 'popularity' },
        { label: 'SOURCE', value: source, color: 'text-white', icon: 'manga' }
    ];

    return (
        <div className="relative min-h-full font-rounded pb-20" style={{ color: 'var(--color-text-main)', margin: '-96px -32px 0 -32px' }}>
            {/* Banner - Full Width & Top Bleed */}
            <div
                className="relative w-full h-[250px] md:h-[350px]"
            >
                <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{
                        backgroundImage: manga.bannerImage
                            ? `url(${manga.bannerImage})`
                            : `url(${manga.coverImage?.extraLarge})`
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
                                src={manga.coverImage.extraLarge || manga.coverImage.large}
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

                    {/* Right Column: Status, Title, Stats, Genres */}
                    <div className="flex flex-col gap-6">
                        {/* Status Dropdown - Now at top of right column */}
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
                                <span>{manga.startDate?.year || 'YEAR_UNKNOWN'}</span>
                                <span>//</span>
                                <span>{manga.format || 'FORMAT_UNKNOWN'}</span>
                                <span>//</span>
                                <span>{manga.chapters ? `${manga.chapters} CHS` : 'CHS_UNKNOWN'}</span>
                                {manga.volumes && (
                                    <>
                                        <span>//</span>
                                        <span>{manga.volumes} VOLS</span>
                                    </>
                                )}
                            </div>
                        </div>


                        {/* Stats Grid */}
                        <StatsGrid stats={stats} />

                        {/* Genres - In right column with stats */}
                        <div className="flex flex-wrap gap-2">
                            {manga.genres?.map(g => (
                                <span key={g} className="px-4 py-1.5 rounded-full text-xs font-mono border border-white/20 bg-white/5 text-white/80 hover:bg-white/10 hover:border-lavender-mist/50 transition-colors cursor-default">
                                    #{g.toUpperCase()}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

                    {/* Left Column: Description */}
                    <div className="lg:col-span-3 relative p-5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md shadow-inner h-fit">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-lavender-mist via-sky-blue to-transparent opacity-50 rounded-t-xl" />
                        <h3 className="text-xs font-mono text-lavender-mist uppercase tracking-widest mb-3">Synopsis</h3>
                        <ReadMoreText
                            content={manga.description || 'No data available.'}
                            maxHeight={200}
                        />
                    </div>

                    {/* Right Column: Progress & Actions */}
                    <div className="lg:col-span-2 flex flex-col gap-4">
                        {/* Progress Control */}
                        <div className="p-1 rounded-2xl bg-gradient-to-r from-white/10 to-transparent p-[1px]">
                            <div className="bg-[#121214]/80 backdrop-blur-xl rounded-2xl p-6 border border-white/5 flex flex-col gap-4">
                                {/* Progress Row */}
                                <div className="flex flex-col md:flex-row items-center gap-6">
                                    <div className="flex-1 w-full">
                                        <div className="flex justify-between items-center mb-3">
                                            <span className="font-mono text-xs text-lavender-mist uppercase tracking-widest">PROGRESS</span>
                                            <span className="font-mono text-xl font-bold">{progress} <span className="text-white/30">/ {manga.chapters || '?'}</span></span>
                                        </div>
                                        <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-lavender-mist to-sky-blue relative transition-all duration-300 ease-out"
                                                style={{ width: `${percentage}%` }}
                                            >
                                                <div className="absolute right-0 top-0 bottom-0 w-[2px] bg-white shadow-[0_0_10px_white]" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 shrink-0">
                                        <button
                                            disabled={progress <= 0 || updating}
                                            onClick={() => handleProgressUpdate(progress - 1)}
                                            className="w-8 h-8 rounded-lg flex items-center justify-center border border-white/10 bg-white/5 hover:bg-white/10 active:scale-95 transition-all text-white disabled:opacity-30"
                                        >
                                            −
                                        </button>
                                        <button
                                            onClick={() => handleProgressUpdate(progress + 1)}
                                            disabled={(manga.chapters ? progress >= manga.chapters : false) || updating}
                                            className="w-8 h-8 rounded-lg flex items-center justify-center bg-white text-black hover:bg-gray-200 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] disabled:opacity-50 disabled:shadow-none"
                                        >
                                            <PlusIcon size={14} strokeWidth={3} />
                                        </button>
                                    </div>
                                </div>

                                {/* Score Slider */}
                                <div className="mt-8 pt-6 border-t border-white/5 w-full">
                                    <div className="flex flex-col md:flex-row items-center gap-6">
                                        <div className="flex-1 w-full flex items-center justify-between">
                                            <span className="font-mono text-xs text-mint-tonic uppercase tracking-widest">SCORING</span>

                                            <div className="w-64">
                                                <ElasticSlider
                                                    leftIcon={<span className="text-xs font-mono">0</span>}
                                                    rightIcon={<span className="text-xs font-mono">100</span>}
                                                    startingValue={0}
                                                    defaultValue={manga.mediaListEntry?.score || 0}
                                                    maxValue={100}
                                                    isStepped
                                                    stepSize={1}
                                                    className="w-full"
                                                    onChange={(val) => {
                                                        setScore(val);
                                                    }}
                                                />
                                            </div>
                                            <button
                                                onClick={async () => {
                                                    if (updatingScore || !manga) return;
                                                    setUpdatingScore(true);
                                                    try {
                                                        await updateMediaProgress(
                                                            manga.id,
                                                            progress,
                                                            manga.mediaListEntry?.status || 'CURRENT',
                                                            Math.round(score)
                                                        );
                                                    } catch (e) {
                                                        console.error(e);
                                                    } finally {
                                                        setUpdatingScore(false);
                                                    }
                                                }}
                                                disabled={updatingScore}
                                                className="ml-4 w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 transition-all text-mint-tonic"
                                            >
                                                {updatingScore ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckIcon size={14} />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Action Button - Search or Continue Reading */}
                        <motion.button
                            onClick={handleActionClick}
                            whileHover={{ scale: 1.01, borderColor: mangaMapping ? 'rgba(56, 189, 248, 0.5)' : 'rgba(180, 162, 246, 0.5)' }}
                            whileTap={{ scale: 0.98 }}
                            className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a1a1e] to-[#121214] border border-white/10 p-4 text-left shadow-lg"
                        >
                            {/* Hover Gradient */}
                            <motion.div
                                className={`absolute inset-0 bg-gradient-to-r ${mangaMapping ? 'from-mint-tonic/10' : 'from-lavender-mist/10'} to-transparent`}
                                initial={{ opacity: 0 }}
                                whileHover={{ opacity: 1 }}
                                transition={{ duration: 0.3 }}
                            />

                            <div className="relative flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    {/* Icon Box */}
                                    <motion.div
                                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${mangaMapping ? 'bg-mint-tonic/10 text-mint-tonic border-mint-tonic/20' : 'bg-lavender-mist/10 text-lavender-mist border-lavender-mist/20'} border`}
                                        whileHover={{ rotate: 15, scale: 1.1 }}
                                        transition={{ type: "spring", stiffness: 400, damping: 10 }}
                                    >
                                        {mangaMapping ? (
                                            <BookOpenIcon size={20} />
                                        ) : (
                                            <SearchIcon size={20} />
                                        )}
                                    </motion.div>

                                    {/* Text */}
                                    <div className="flex flex-col gap-0.5">
                                        <span className={`font-mono text-[10px] uppercase tracking-widest ${mangaMapping ? 'text-mint-tonic' : 'text-lavender-mist'} font-bold`}>
                                            {mangaMapping ? 'CONTINUE READING' : 'SEARCH THIS MANGA'}
                                        </span>
                                        <motion.span
                                            className="font-bold text-white text-lg truncate max-w-[200px] md:max-w-[300px]"
                                            whileHover={{ color: mangaMapping ? '#A0E9E5' : '#B4A2F6', x: 2 }}
                                        >
                                            {mangaMapping ? mangaMapping.sourceTitle : 'Browse Extensions'}
                                        </motion.span>
                                    </div>
                                </div>

                                {/* Arrow */}
                                <motion.div
                                    className="flex h-8 w-8 items-center justify-center rounded-full border border-white/5 bg-white/5 text-white/40"
                                    whileHover={{
                                        backgroundColor: mangaMapping ? '#A0E9E5' : '#B4A2F6',
                                        color: '#121214',
                                        borderColor: mangaMapping ? '#A0E9E5' : '#B4A2F6',
                                        x: 5
                                    }}
                                >
                                    <ArrowRightIcon size={16} />
                                </motion.div>
                            </div>
                        </motion.button>
                    </div>

                </div>
                <div className="max-w-[1400px] mx-auto px-6 md:px-10 -mt-6">
                    <MediaRelations relations={manga.relations} />
                </div>

                {/* Alternative Titles */}
                <div className="mt-10 mb-8 border-t border-white/10 pt-8 max-w-[1400px] mx-auto px-6 md:px-10">
                    <h3 className="text-sm font-mono text-white/40 uppercase tracking-widest mb-4">Alternative Titles</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {manga.title?.romaji && (
                            <div>
                                <span className="text-xs text-lavender-mist/70 block mb-1">Romaji</span>
                                <span className="text-white/80 font-medium">{manga.title.romaji}</span>
                            </div>
                        )}
                        {manga.title?.english && (
                            <div>
                                <span className="text-xs text-lavender-mist/70 block mb-1">English</span>
                                <span className="text-white/80 font-medium">{manga.title.english}</span>
                            </div>
                        )}
                        {manga.title?.native && (
                            <div>
                                <span className="text-xs text-lavender-mist/70 block mb-1">Native</span>
                                <span className="text-white/80 font-medium font-jp">{manga.title.native}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Related Manga Section */}
                {recommendations.length > 0 && (
                    <div className="mt-10 max-w-[1400px] mx-auto px-6 md:px-10">
                        <div className="flex items-center gap-4 mb-6">
                            <h2 className="text-2xl font-bold tracking-tight">SIMILAR_READS</h2>
                            <div className="h-px flex-1 bg-white/10" />
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                            {recommendations.map((rec) => (
                                <AnimeCard
                                    key={rec.id}
                                    anime={{
                                        ...rec,
                                        episodes: rec.chapters // Map chapters to episodes for card
                                    } as any}
                                    onClick={(id) => navigate(`/manga-details/${id}`)}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
}

export default MangaDetails;
