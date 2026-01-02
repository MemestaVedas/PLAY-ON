import { Anime } from '../../hooks/useAnimeData';

interface AnimeStatsProps {
    anime: Anime;
}

export function AnimeStats({ anime }: AnimeStatsProps) {
    const stats = [
        { label: 'SCORE', value: anime.averageScore ? `${anime.averageScore}%` : 'N/A', color: 'text-mint-tonic' },
        { label: 'RANK', value: '#--', color: 'text-sky-blue' }, // Placeholder
        { label: 'POPULARITY', value: 'High', color: 'text-pastels-pink' },
        { label: 'SOURCE', value: 'Original', color: 'text-white' }
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
