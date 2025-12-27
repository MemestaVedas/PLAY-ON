import { useNavigate } from 'react-router-dom';
import AnimeCard from '../components/ui/AnimeCard';
import { useAnimeData } from '../hooks/useAnimeData';

function AnimeList() {
    const navigate = useNavigate();
    const { trending, loading, error } = useAnimeData();

    const handleAnimeClick = (id: number) => {
        navigate(`/anime/${id}`);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full text-text-secondary">
                <div className="animate-pulse">Loading Trending Anime...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-full text-red-400">
                {error}
            </div>
        );
    }

    return (
        <div className="max-w-[1600px] mx-auto pb-10">
            {/* Header */}
            <div className="mb-8 flex items-end justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white mb-2">Trending Now</h2>
                    <p className="text-text-secondary text-sm">Top rated anime this season</p>
                </div>
            </div>

            {/* Grid Layout */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                {trending.map((anime) => (
                    <AnimeCard
                        key={anime.id}
                        anime={anime}
                        onClick={handleAnimeClick}
                    />
                ))}
            </div>
        </div>
    );
}

export default AnimeList;
