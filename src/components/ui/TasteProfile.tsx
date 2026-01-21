import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { calculateGenreAffinityScores, GenreStats, GenreScore } from '../../lib/recommendationEngine';
import { FilmIcon, BookOpenIcon, ClockIcon, StarIcon, ChartIcon, HashIcon, PuzzleIcon } from './Icons';
import { GenreNetworkGraph } from './GenreNetworkGraph';

interface ListEntry {
    id: number;
    status: string;
    score: number;
    progress: number;
    media: {
        id: number;
        title: {
            english: string;
            romaji: string;
        };
        coverImage: {
            extraLarge: string;
            large: string;
            medium: string;
        };
        genres?: string[];
        averageScore?: number;
    };
}

interface TasteProfileProps {
    animeGenres: GenreStats[];
    mangaGenres: GenreStats[];
    animeList?: ListEntry[];
    mangaList?: ListEntry[];
}

/**
 * TasteProfile - Kawaii Edition 🌸
 * Features independent "Power Graph" (Radar Chart) and Network Graph
 */
export function TasteProfile({ animeGenres, mangaGenres, animeList = [], mangaList = [] }: TasteProfileProps) {
    const [activeTab, setActiveTab] = useState<'anime' | 'manga'>('anime');
    const [viewMode, setViewMode] = useState<'radar' | 'graph'>('radar');
    const [showDisclaimer, setShowDisclaimer] = useState(false);

    // Get top 6 genres for the hexagon/stats
    const animeScores = useMemo(() =>
        calculateGenreAffinityScores(animeGenres, 'anime').slice(0, 6),
        [animeGenres]
    );

    const mangaScores = useMemo(() =>
        calculateGenreAffinityScores(mangaGenres, 'manga').slice(0, 6),
        [mangaGenres]
    );

    const activeScores = activeTab === 'anime' ? animeScores : mangaScores;
    // Normalize scores relative to the highest one for the graph shape
    const maxScore = activeScores.length > 0 ? Math.max(...activeScores.map(g => g.score)) : 1;

    const hasData = activeScores.length >= 3;
    const currentList = activeTab === 'anime' ? animeList : mangaList;

    return (
        <div className="relative w-full min-h-[600px] transition-all duration-500">

            {/* View Mode Toggle */}
            <div className="absolute top-0 right-0 z-20 flex gap-2 bg-black/40 rounded-full p-1 border border-white/10 backdrop-blur-md">
                <button
                    onClick={() => setViewMode('radar')}
                    className={`p-2 rounded-full transition-all ${viewMode === 'radar' ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white'}`}
                    title="Radar Chart"
                >
                    <ChartIcon size={16} />
                </button>
                <button
                    onClick={() => setViewMode('graph')}
                    className={`p-2 rounded-full transition-all ${viewMode === 'graph' ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white'}`}
                    title="Network Graph"
                >
                    {/* Custom Network/Graph Node Icon - Rotated 90deg Counter-Clockwise */}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <g transform="rotate(-90, 12, 12)">
                            <circle cx="18" cy="5" r="3"></circle>
                            <circle cx="6" cy="12" r="3"></circle>
                            <circle cx="18" cy="19" r="3"></circle>
                            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                        </g>
                    </svg>
                </button>
            </div>

            {/* Sliding Toggle (Anime/Manga) */}
            <div className="flex justify-center mb-8 relative z-10">
                <div
                    onClick={() => setActiveTab(prev => prev === 'anime' ? 'manga' : 'anime')}
                    className="relative w-48 h-10 bg-black/20 backdrop-blur-md rounded-full border border-white/10 shadow-lg cursor-pointer select-none group"
                >
                    <div className="absolute inset-0 flex justify-between items-center px-6 text-[10px] font-bold tracking-widest text-white/40" style={{ fontFamily: 'var(--font-rounded)' }}>
                        <span className={`transition-opacity duration-300 ${activeTab === 'anime' ? 'opacity-0' : 'opacity-100'}`}>ANIME</span>
                        <span className={`transition-opacity duration-300 ${activeTab === 'manga' ? 'opacity-0' : 'opacity-100'}`}>MANGA</span>
                    </div>

                    <div
                        className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full flex items-center justify-center gap-2 shadow-sm transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) ${activeTab === 'anime'
                            ? 'left-1 bg-[#E0BBE4] text-black/70'
                            : 'left-[calc(50%+0px)] bg-[#FFB7B2] text-black/70'
                            }`}
                    >
                        <div className={`transition-all duration-300 ${activeTab === 'anime' ? 'opacity-100 scale-100' : 'opacity-0 scale-50 absolute'}`}>
                            <FilmIcon size={14} strokeWidth={2.5} />
                        </div>
                        <div className={`transition-all duration-300 ${activeTab === 'manga' ? 'opacity-100 scale-100' : 'opacity-0 scale-50 absolute'}`}>
                            <BookOpenIcon size={14} strokeWidth={2.5} />
                        </div>
                    </div>
                </div>
            </div>

            {viewMode === 'radar' ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10 animate-in fade-in duration-500">
                    {/* Visual Radar Chart */}
                    <div className="flex flex-col items-center justify-center min-h-[400px]">
                        {hasData ? (
                            <div className="relative w-full max-w-[400px] aspect-square flex items-center justify-center">
                                <RadarChart data={activeScores} maxVal={maxScore} color={activeTab === 'anime' ? '#E0BBE4' : '#FFB7B2'} />
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <p className="text-[#E0BBE4] text-lg font-bold mb-2">Needs more data! uwu</p>
                                <p className="text-white/40 text-xs">Watch at least 3 distinct genres to generate your power graph.</p>
                            </div>
                        )}
                    </div>

                    {/* Stats & Legend */}
                    <div className="space-y-6">
                        <div className="mb-4">
                            <h3 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: 'var(--font-rounded)' }}>
                                {activeTab === 'anime' ? 'Anime' : 'Manga'} Affinity
                            </h3>
                            <p className="text-sm text-white/50">Your distinctive taste profile.</p>
                        </div>

                        <div className="space-y-3">
                            <AnimatePresence>
                                {activeScores.map((g, i) => (
                                    <motion.div
                                        key={g.genre}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                        className="flex items-center gap-4 p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors group"
                                    >
                                        <div className={`
                                            w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold
                                            ${i === 0 ? 'bg-[#FFB7B2] text-black/70' :
                                                i === 1 ? 'bg-[#E0BBE4] text-black/70' :
                                                    i === 2 ? 'bg-[#B5EAD7] text-black/70' : 'bg-white/10 text-white/30'}
                                        `}>
                                            {i + 1}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-baseline">
                                                <span className="font-bold text-white/90 text-sm">{g.genre}</span>
                                                <span className="text-xs font-mono text-white/40">{(g.score * 100).toFixed(0)}</span>
                                            </div>
                                            <div className="h-1.5 bg-black/20 rounded-full mt-2 overflow-hidden">
                                                <motion.div
                                                    className={`h-full rounded-full ${i === 0 ? 'bg-[#FFB7B2]' : i === 1 ? 'bg-[#E0BBE4]' : 'bg-[#B5EAD7]'}`}
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${(g.score / maxScore) * 100}%` }}
                                                    transition={{ duration: 0.8, delay: 0.2 }}
                                                />
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>

                        {/* Algorithm Mini-Cards (Only in Radar) */}
                        <div className="grid grid-cols-3 gap-3 pt-4">
                            <MiniStat icon={<HashIcon size={12} />} title="Diversity" val="45%" color="text-[#B5EAD7]" />
                            <MiniStat icon={<ClockIcon size={12} />} title="Dedication" val="35%" color="text-[#E0BBE4]" />
                            <MiniStat icon={<StarIcon size={12} />} title="Quality" val="20%" color="text-[#FFB7B2]" />
                        </div>
                    </div>
                </div>
            ) : (
                // Graph View - Fills the content area
                <div
                    className="w-full relative z-10 animate-in fade-in duration-300 -mx-4"
                    style={{ height: 'calc(100vh - 280px)', minHeight: '400px' }}
                >
                    <GenreNetworkGraph
                        entries={currentList}
                        onNodeClick={(id) => console.log('Node clicked', id)}
                        type={activeTab}
                        parentScores={activeScores}
                    />
                </div>
            )}

            {/* Disclaimer 'i' Button */}
            <div className="fixed bottom-6 right-6 z-50">
                <button
                    onClick={() => setShowDisclaimer(!showDisclaimer)}
                    className="flex items-center justify-center w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/40 hover:text-white transition-all shadow-lg"
                    title="How this works"
                >
                    <span className="font-mono text-xs font-bold">i</span>
                </button>

                <AnimatePresence>
                    {showDisclaimer && (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setShowDisclaimer(false)}
                                className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
                            />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                className="absolute bottom-12 right-0 w-[400px] z-50 p-6 rounded-2xl bg-[#1a1a2e] border border-white/10 shadow-2xl"
                            >
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#E0BBE4] to-[#957DAD] flex items-center justify-center shadow-lg shadow-purple-500/20">
                                        <PuzzleIcon size={24} className="text-white" />
                                    </div>
                                    <div>
                                        <h4 className="text-white font-bold text-lg">Affinity Score</h4>
                                        <p className="text-xs text-white/50 font-mono tracking-wider">ALGORITHM V2.0</p>
                                    </div>
                                </div>
                                <div className="space-y-6 mb-6">
                                    <div className="p-4 rounded-xl bg-white/5 border border-white/10 relative overflow-hidden group">
                                        <div className="absolute inset-0 bg-gradient-to-r from-[#B5EAD7]/10 via-[#E0BBE4]/10 to-[#FFB7B2]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                        <div className="relative text-center">
                                            <div className="text-xs text-white/40 font-mono mb-2 uppercase tracking-widest">The Formula</div>
                                            <div className="flex items-baseline justify-center gap-1 font-bold text-lg md:text-xl text-white/90" style={{ fontFamily: 'var(--font-rounded)' }}>
                                                <span className="text-[#B5EAD7]">45%</span>
                                                <span className="text-xs mx-1 text-white/30">×</span>
                                                <span className="text-[#E0BBE4]">35%</span>
                                                <span className="text-xs mx-1 text-white/30">×</span>
                                                <span className="text-[#FFB7B2]">20%</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex items-start gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-[#B5EAD7]/20 flex items-center justify-center shrink-0 text-[#B5EAD7]">
                                                <HashIcon size={16} />
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-white mb-0.5">Diversity (Count)</div>
                                                <div className="text-xs text-white/50 leading-relaxed">
                                                    How many unique series you've completed in this genre. Rewards exploring new titles.
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-[#E0BBE4]/20 flex items-center justify-center shrink-0 text-[#E0BBE4]">
                                                <ClockIcon size={16} />
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-white mb-0.5">Dedication (Time)</div>
                                                <div className="text-xs text-white/50 leading-relaxed">
                                                    Time spent watching/reading. Log-scaled to prevent long-running series from skewing results.
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-[#FFB7B2]/20 flex items-center justify-center shrink-0 text-[#FFB7B2]">
                                                <StarIcon size={16} />
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-white mb-0.5">Quality (Rating)</div>
                                                <div className="text-xs text-white/50 leading-relaxed">
                                                    Your personal average score. We prioritize genres you actually enjoy, not just hate-watch.
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowDisclaimer(false)}
                                    className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 hover:scale-[1.02] active:scale-[0.98] text-xs font-bold text-white transition-all border border-white/5"
                                >
                                    UNDERSTOOD
                                </button>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

const MiniStat = ({ icon, title, val, color }: any) => (
    <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
        <div className={`mb-1 ${color}`}>{icon}</div>
        <div className="text-[10px] uppercase font-bold text-white/40 mb-0.5">{title}</div>
        <div className={`text-xs font-bold ${color}`}>{val}</div>
    </div>
);


// --- Radar Chart Components ---

function RadarChart({ data, maxVal, color }: { data: GenreScore[], maxVal: number, color: string }) {
    if (data.length < 3) return null;

    const size = 300;
    const center = size / 2;
    const radius = 100; // Radius of the hexagon

    // Calculate vertices for the background hexagon ring
    const hexagonPoints = data.map((_, i) => {
        const angle = (Math.PI * 2 * i) / data.length - Math.PI / 2;
        return [
            center + radius * Math.cos(angle),
            center + radius * Math.sin(angle)
        ];
    });


    // Calculate data points
    const points = data.map((d, i) => {
        const val = d.score / maxVal;
        const angle = (Math.PI * 2 * i) / data.length - Math.PI / 2;
        const r = radius * val;
        return {
            x: center + r * Math.cos(angle),
            y: center + r * Math.sin(angle),
            labelX: center + (radius + 25) * Math.cos(angle),
            labelY: center + (radius + 25) * Math.sin(angle),
            val
        };
    });

    // Create curved path (Catmull-Rom-like via Bezier approximation or simply generic smooth curve)
    // For "parabolic peaks", we pull control points out slightly relative to the center
    // For "concave parabolas" (star-shape), we pull the curves inward toward the center
    const smoothPath = getSmoothPath(points.map(p => [p.x, p.y]), center);

    return (
        <svg width="100%" height="100%" viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
            {/* Background Webs (Concentric Hexagons) */}
            {[0.2, 0.4, 0.6, 0.8, 1].map((scale, idx) => (
                <path
                    key={scale}
                    d={hexagonPoints.map((p, i) => {
                        // Scale the point relative to center
                        const x = center + (p[0] - center) * scale;
                        const y = center + (p[1] - center) * scale;
                        return (i === 0 ? 'M' : 'L') + `${x},${y}`;
                    }).join(' ') + 'Z'}
                    fill="none"
                    stroke="white"
                    strokeOpacity={idx === 4 ? 0.2 : 0.05}
                    strokeWidth={1}
                />
            ))}

            {/* Axes Lines */}
            {hexagonPoints.map((p, i) => (
                <line
                    key={i}
                    x1={center}
                    y1={center}
                    x2={p[0]}
                    y2={p[1]}
                    stroke="white"
                    strokeOpacity="0.05"
                />
            ))}

            {/* The Actual Data Shape */}
            <motion.path
                initial={{ d: hexagonPoints.map((_, i) => (i === 0 ? `M${center},${center}` : `L${center},${center}`)).join(' ') + 'Z', opacity: 0 }}
                animate={{ d: smoothPath, opacity: 0.6 }}
                transition={{ duration: 1.2, ease: "anticipate" }}
                fill={color}
            />
            <motion.path
                initial={{ d: hexagonPoints.map((_, i) => (i === 0 ? `M${center},${center}` : `L${center},${center}`)).join(' ') + 'Z', opacity: 1 }}
                animate={{ d: smoothPath, opacity: 1 }}
                transition={{ duration: 1.2, ease: "anticipate" }}
                fill="none"
                stroke={color}
                strokeWidth={3}
            />

            {/* Data Points (Dots) */}
            {points.map((p, i) => (
                <motion.circle
                    key={i}
                    cx={p.x}
                    cy={p.y}
                    r={4}
                    fill="#fff"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5 + i * 0.1 }}
                />
            ))}

            {/* Labels */}
            {points.map((p, i) => (
                <motion.text
                    key={i}
                    x={p.labelX}
                    y={p.labelY}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="white"
                    fontSize="10"
                    fontWeight="bold"
                    className="uppercase tracking-wider opacity-70"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.7 }}
                    transition={{ delay: 1 }}
                >
                    {data[i].genre.substring(0, 3)}
                </motion.text>
            ))
            }
        </svg >
    );
}

// Helper to generate a smooth closed path through points
// Helper to generate a smooth closed path with concave curvature (star-like)
function getSmoothPath(points: number[][], center: number) {
    if (points.length < 3) return "";

    const len = points.length;
    let d = `M ${points[0][0]},${points[0][1]}`;

    for (let i = 0; i < len; i++) {
        const p1 = points[i];                  // Current
        const p2 = points[(i + 1) % len];      // Next

        // Midpoint
        const mx = (p1[0] + p2[0]) / 2;
        const my = (p1[1] + p2[1]) / 2;

        // Vector from center to midpoint
        const vx = mx - center;
        const vy = my - center;

        // Pull inward factor: < 1.0 means concave (inward), > 1.0 means convex (outward)
        // 0.85 gives a nice subtle inward curve like a spider web
        const factor = 0.85;
        const cpx = center + (vx * factor);
        const cpy = center + (vy * factor);

        d += ` Q ${cpx},${cpy} ${p2[0]},${p2[1]}`;
    }

    return d + " Z";
}
