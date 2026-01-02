import { Anime } from '../../hooks/useAnimeData';

interface AnimeProgressCardProps {
    anime: Anime;
    progress: number;
    onUpdate: (newProgress: number) => void;
    updating: boolean;
}

export function AnimeProgressCard({ anime, progress, onUpdate, updating }: AnimeProgressCardProps) {
    const percentage = anime.episodes ? Math.min((progress / anime.episodes) * 100, 100) : 0;

    return (
        <div className="p-1 rounded-2xl bg-gradient-to-r from-white/10 to-transparent p-[1px]">
            <div className="bg-[#121214]/80 backdrop-blur-xl rounded-2xl p-6 border border-white/5 flex flex-col md:flex-row items-center gap-6">
                <div className="flex-1 w-full">
                    <div className="flex justify-between items-center mb-3">
                        <span className="font-mono text-xs text-lavender-mist uppercase tracking-widest">PROGRESS</span>
                        <span className="font-mono text-xl font-bold">{progress} <span className="text-white/30">/ {anime.episodes || '?'}</span></span>
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
                        onClick={() => onUpdate(progress - 1)}
                        className="w-12 h-12 rounded-xl flex items-center justify-center border border-white/10 bg-white/5 hover:bg-white/10 active:scale-95 transition-all text-white disabled:opacity-30"
                    >
                        −
                    </button>
                    <button
                        onClick={() => onUpdate(progress + 1)}
                        disabled={(anime.episodes ? progress >= anime.episodes : false) || updating}
                        className="h-12 px-6 rounded-xl flex items-center justify-center font-bold bg-white text-black hover:bg-gray-200 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] disabled:opacity-50 disabled:shadow-none"
                    >
                        TRACK +1
                    </button>
                </div>
            </div>
        </div>
    );
}
