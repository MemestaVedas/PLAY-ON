import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAnimeData, Anime } from '../hooks/useAnimeData';
import { updateMediaProgress } from '../api/anilistClient';
import { useFolderMappings } from '../hooks/useFolderMappings';
import AnimeCard from '../components/ui/AnimeCard';
import Loading from '../components/ui/Loading';
import { AnimeStats } from '../components/anime/AnimeStats';
import { AnimeProgressCard } from '../components/anime/AnimeProgressCard';
import { AnimeResumeButton } from '../components/anime/AnimeResumeButton';

function AnimeDetails() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { getAnimeDetails } = useAnimeData();
    const { getMappingByAnilistId } = useFolderMappings();
    const [anime, setAnime] = useState<Anime | null>(null);
    const [loading, setLoading] = useState(true);
    const [progress, setProgress] = useState(0);
    const [updating, setUpdating] = useState(false);

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
            await updateMediaProgress(anime.id, newProgress);
            setProgress(newProgress);
        } catch (err) {
            console.error("Failed to update progress:", err);
        } finally {
            setUpdating(false);
        }
    };

    if (loading) return <Loading />;

    if (!anime) return (
        <div className="flex h-screen items-center justify-center font-mono text-red-400">
            SIGNAL_LOST: ANIME_NOT_FOUND
        </div>
    );

    const heroImage = anime.bannerImage || anime.coverImage?.extraLarge || anime.coverImage?.large || '';
    const title = anime.title?.english || anime.title?.romaji || 'Unknown Title';
    const recommendations = anime.recommendations?.nodes.map(n => n.mediaRecommendation) || [];

    return (
        <div className="relative min-h-full font-rounded overflow-hidden pb-20" style={{ color: 'var(--color-text-main)' }}>
            {/* --- Y2K Glass Background --- */}
            <div className="fixed inset-0 z-0 select-none pointer-events-none">
                {/* Blurred Hero Background */}
                <div
                    className="absolute inset-0 bg-cover bg-center blur-3xl opacity-20 scale-110"
                    style={{ backgroundImage: `url(${heroImage})` }}
                />
                {/* Mesh Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/80 to-transparent" />
                {/* Grid Lines Pattern */}
                <div
                    className="absolute inset-0 opacity-10"
                    style={{
                        backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)',
                        backgroundSize: '40px 40px'
                    }}
                />
            </div>

            <div className="relative z-10 max-w-[1600px] mx-auto p-6 flex flex-col gap-10">
                {/* Header / Nav */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="px-4 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-md hover:bg-white/10 hover:scale-105 transition-all flex items-center gap-2 group"
                    >
                        <span className="font-mono text-xs text-lavender-mist group-hover:text-white">&lt; RETURN</span>
                    </button>
                    <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-10 items-start">

                    {/* Left Column: Cover Art */}
                    <div className="relative group perspective-1000">
                        {/* Glowing "Aura" */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-lavender-mist to-sky-blue blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-700" />

                        <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-transform duration-500 group-hover:rotate-y-2 group-hover:scale-[1.02]">
                            <img
                                src={anime.coverImage.extraLarge || anime.coverImage.large}
                                alt={title}
                                className="w-full h-auto object-cover aspect-[2/3]"
                            />
                            {/* Glass Glint */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                        </div>

                        {/* Status Pill */}
                        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 px-6 py-2 rounded-full bg-black/60 backdrop-blur-xl border border-white/10 shadow-lg flex items-center gap-2 whitespace-nowrap">
                            <div className={`w-2 h-2 rounded-full ${anime.status === 'RELEASING' ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`} />
                            <span className="font-mono text-xs font-bold tracking-widest uppercase">{anime.status}</span>
                        </div>
                    </div>

                    {/* Right Column: Details */}
                    <div className="flex flex-col gap-8">

                        {/* Title Block */}
                        <div>
                            <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-none mb-4 drop-shadow-xl bg-clip-text text-transparent bg-gradient-to-br from-white via-white to-lavender-mist">
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
                                className="text-lg leading-relaxed text-gray-200/90 font-light max-h-[200px] overflow-y-auto custom-scrollbar pr-4"
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
        </div>
    );
}

export default AnimeDetails;
