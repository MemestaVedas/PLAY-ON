import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAnimeData, Anime } from '../hooks/useAnimeData';

function AnimeDetails() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { getAnimeDetails } = useAnimeData();
    const [anime, setAnime] = useState<Anime | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;
        async function load() {
            setLoading(true);
            const data = await getAnimeDetails(parseInt(id!));
            if (data) setAnime(data);
            setLoading(false);
        }
        load();
    }, [id]);

    if (loading) return <div className="p-10 text-center text-text-secondary">Loading details...</div>;
    if (!anime) return <div className="p-10 text-center text-red-400">Anime not found.</div>;

    // Use banner or fallback to extra large cover
    const heroImage = anime.bannerImage || anime.coverImage.extraLarge;
    const title = anime.title.english || anime.title.romaji;

    return (
        <div className="h-full overflow-hidden flex flex-col pt-4 pb-10 px-6 max-w-[1800px] mx-auto">
            {/* Back Button */}
            <button
                onClick={() => navigate(-1)}
                className="self-start text-text-secondary hover:text-white mb-4 flex items-center gap-2 transition-colors"
            >
                ← Back
            </button>

            {/* 3-Column Layout: Left+Center (Visual) | Right (Info) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">

                {/* Visual Section (Spans 2 columns on large screens) */}
                <div className="lg:col-span-2 relative rounded-2xl overflow-hidden group shadow-2xl h-[50vh] lg:h-auto">
                    <img
                        src={heroImage}
                        alt={title}
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-shell via-shell/20 to-transparent opacity-90" />

                    {/* Floating Title on Visual (Optional, Netflix style) */}
                    <div className="absolute bottom-10 left-10 max-w-2xl">
                        <h1 className="text-4xl md:text-6xl font-black text-white drop-shadow-lg leading-tight mb-4">
                            {title}
                        </h1>
                        <p className="text-lg text-gray-200 line-clamp-3 md:line-clamp-4 max-w-xl drop-shadow-md">
                            {anime.description?.replace(/<[^>]*>/g, '')}
                        </p>
                    </div>
                </div>

                {/* Info Panel (Right Column) */}
                <div className="flex flex-col gap-6 h-full overflow-y-auto pr-2 custom-scrollbar">

                    {/* Metadata Stack */}
                    <div className="flex flex-col gap-4 p-6 bg-tab rounded-xl border border-white/5">
                        <div className="flex items-baseline justify-between border-b border-white/5 pb-4">
                            <span className="text-sm text-text-secondary uppercase tracking-wider">Format</span>
                            <span className="font-semibold text-white">{anime.format || 'Unknown'}</span>
                        </div>
                        <div className="flex items-baseline justify-between border-b border-white/5 pb-4">
                            <span className="text-sm text-text-secondary uppercase tracking-wider">Year</span>
                            <span className="font-semibold text-white">{anime.seasonYear || 'N/A'}</span>
                        </div>
                        <div className="flex items-baseline justify-between border-b border-white/5 pb-4">
                            <span className="text-sm text-text-secondary uppercase tracking-wider">Episodes</span>
                            <span className="font-semibold text-white">{anime.episodes || '?'}</span>
                        </div>
                        <div className="flex items-baseline justify-between border-b border-white/5 pb-4">
                            <span className="text-sm text-text-secondary uppercase tracking-wider">Score</span>
                            <span className="font-bold text-green-400 text-lg">{anime.averageScore ? `${anime.averageScore}%` : 'N/A'}</span>
                        </div>
                        <div className="flex items-baseline justify-between pb-2">
                            <span className="text-sm text-text-secondary uppercase tracking-wider">Status</span>
                            <span className={`font-semibold px-2 py-1 rounded text-xs ${anime.status === 'RELEASING' ? 'bg-green-900/50 text-green-400' : 'bg-gray-800 text-gray-400'}`}>
                                {anime.status}
                            </span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-3">
                        <button className="w-full py-4 bg-white text-black font-bold text-lg rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2">
                            <span>▶</span> Play Episode 1
                        </button>
                        <button className="w-full py-3 bg-white/10 text-white font-semibold rounded-lg hover:bg-white/20 transition-colors border border-white/5">
                            + Add to List
                        </button>
                    </div>

                    {/* Genres */}
                    <div className="flex flex-wrap gap-2 mt-2">
                        {anime.genres?.map(g => (
                            <span key={g} className="px-3 py-1 bg-curve text-text-secondary text-xs rounded-full border border-white/5">
                                {g}
                            </span>
                        ))}
                    </div>

                    {/* Studios */}
                    {anime.studios?.nodes && anime.studios.nodes.length > 0 && (
                        <div className="mt-auto pt-6 text-sm text-text-secondary">
                            Studios: <span className="text-white">{anime.studios.nodes.map(s => s.name).join(', ')}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default AnimeDetails;
