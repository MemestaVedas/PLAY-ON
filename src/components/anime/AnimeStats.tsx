import { Anime } from '../../hooks/useAnimeData';

interface AnimeStatsProps {
    anime: Anime;
}

export function AnimeStats({ anime }: AnimeStatsProps) {
    // Find the highest rank (usually "RATED" or "POPULAR")
    const allTimeRank = anime.rankings?.find(r => r.allTime && r.type === 'RATED')?.rank;
    const popularity = anime.popularity?.toLocaleString();
    const source = anime.source?.replace(/_/g, ' ') || 'Original';

    const stats = [
        { label: 'SCORE', value: anime.averageScore ? `${anime.averageScore}%` : 'N/A', color: 'text-mint-tonic' },
        { label: 'RANK', value: allTimeRank ? `#${allTimeRank}` : 'N/A', color: 'text-sky-blue' },
        { label: 'POPULARITY', value: popularity ? popularity : 'N/A', color: 'text-pastels-pink' },
        { label: 'SOURCE', value: source, color: 'text-white' }
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((stat, i) => (
                <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/5 backdrop-blur-sm flex flex-col items-center justify-center gap-1 hover:bg-white/10 transition-colors">
                    <span className="font-mono text-[10px] text-white/40 uppercase tracking-widest">{stat.label}</span>
                    <span className={`font-bold text-xl ${stat.color} drop-shadow-md`}>{stat.value}</span>
                </div>
            ))}
        </div>
    );
}
