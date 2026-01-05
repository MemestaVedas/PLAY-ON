import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { SectionHeader } from '../components/ui/UIComponents';
import {
    getStats,
    UserStats,
    formatTime,
    getTopGenre,
    getActivityStreak
} from '../services/StatsService';
import { useAuth } from '../hooks/useAuth';
import { fetchUserStats } from '../api/anilistClient';
import { ChartIcon, FilmIcon, BookIcon, FlameIcon } from '../components/ui/Icons';

function Statistics() {
    const { isAuthenticated } = useAuth();
    const [stats, setStats] = useState<UserStats | null>(null);
    const [anilistStats, setAnilistStats] = useState<{
        minutesWatched: number;
        episodesWatched: number;
        chaptersRead: number;
        volumesRead: number;
        animeGenres: { genre: string; count: number; meanScore: number; minutesWatched: number }[];
        mangaGenres: { genre: string; count: number; meanScore: number; chaptersRead: number }[];
    } | null>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'anime' | 'manga'>('overview');

    // Load stats on mount
    useEffect(() => {
        setStats(getStats());
    }, []);

    // Fetch AniList stats if authenticated
    useEffect(() => {
        if (isAuthenticated) {
            fetchUserStats().then(data => {
                if (data?.data?.Viewer?.statistics) {
                    const { anime, manga } = data.data.Viewer.statistics;
                    setAnilistStats({
                        minutesWatched: anime?.minutesWatched || 0,
                        episodesWatched: anime?.episodesWatched || 0,
                        chaptersRead: manga?.chaptersRead || 0,
                        volumesRead: manga?.volumesRead || 0,
                        animeGenres: anime?.genres || [],
                        mangaGenres: manga?.genres || [],
                    });
                }
            }).catch(console.error);
        }
    }, [isAuthenticated]);

    const streak = useMemo(() => {
        return stats ? getActivityStreak(stats.daily) : 0;
    }, [stats]);

    const topAnimeGenre = useMemo(() => {
        // Prefer AniList genre data if available
        if (anilistStats?.animeGenres && anilistStats.animeGenres.length > 0) {
            const top = anilistStats.animeGenres[0]; // Already sorted by COUNT_DESC
            return { genre: top.genre, value: top.minutesWatched };
        }
        // Fall back to local stats
        return stats ? getTopGenre(stats.anime.byGenre) : null;
    }, [stats, anilistStats]);

    const topMangaGenre = useMemo(() => {
        // Prefer AniList genre data if available
        if (anilistStats?.mangaGenres && anilistStats.mangaGenres.length > 0) {
            const top = anilistStats.mangaGenres[0]; // Already sorted by COUNT_DESC
            return { genre: top.genre, value: top.chaptersRead };
        }
        // Fall back to local stats
        return stats ? getTopGenre(stats.manga.byGenre) : null;
    }, [stats, anilistStats]);

    // Calculate manga read time from chapters (10 minutes per chapter)
    const mangaReadMinutes = useMemo(() => {
        const chaptersRead = stats?.manga.chaptersRead || anilistStats?.chaptersRead || 0;
        return chaptersRead * 10; // 10 minutes per chapter
    }, [stats, anilistStats]);

    // Calculate combined time
    const totalTime = useMemo(() => {
        const animeTime = stats?.anime.totalMinutesWatched || anilistStats?.minutesWatched || 0;
        return animeTime + mangaReadMinutes;
    }, [stats, anilistStats, mangaReadMinutes]);

    const tabs = [
        { id: 'overview', label: 'Overview', icon: <ChartIcon size={18} /> },
        { id: 'anime', label: 'Anime', icon: <FilmIcon size={18} /> },
        { id: 'manga', label: 'Manga', icon: <BookIcon size={18} /> },
    ] as const;

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <SectionHeader
                title="Statistics"
                subtitle="Your anime & manga journey"
                icon={<ChartIcon size={24} />}
            />

            {/* Tab Navigation */}
            <div className="flex gap-2 mb-8">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-sm transition-all ${activeTab === tab.id
                            ? 'bg-white text-black shadow-lg'
                            : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                            }`}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
                <div className="space-y-8">
                    {/* LOCAL APP STATS SECTION */}
                    <div>
                        <div className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <span className="px-2 py-1 rounded-md bg-emerald-500/20 text-emerald-400 text-xs font-mono">LOCAL</span>
                            Tracked in this App
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Local Watch Time */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-5 rounded-xl bg-gradient-to-br from-emerald-500/15 to-teal-600/10 border border-emerald-500/20"
                            >
                                <div className="text-xs text-white/40 font-mono uppercase tracking-wider mb-1">Watch Time</div>
                                <div className="text-3xl font-bold text-white mb-1">
                                    {formatTime(stats?.anime.totalMinutesWatched || 0)}
                                </div>
                                <div className="text-xs text-emerald-400/60">anime in this app</div>
                            </motion.div>

                            {/* Local Episodes */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.05 }}
                                className="p-5 rounded-xl bg-gradient-to-br from-emerald-500/15 to-teal-600/10 border border-emerald-500/20"
                            >
                                <div className="text-xs text-white/40 font-mono uppercase tracking-wider mb-1">Episodes</div>
                                <div className="text-3xl font-bold text-white mb-1">
                                    {stats?.anime.episodesWatched || 0}
                                </div>
                                <div className="text-xs text-emerald-400/60">watched in this app</div>
                            </motion.div>

                            {/* Local Read Time */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="p-5 rounded-xl bg-gradient-to-br from-emerald-500/15 to-teal-600/10 border border-emerald-500/20"
                            >
                                <div className="text-xs text-white/40 font-mono uppercase tracking-wider mb-1">Read Time</div>
                                <div className="text-3xl font-bold text-white mb-1">
                                    {formatTime(stats?.manga.totalMinutesRead || 0)}
                                </div>
                                <div className="text-xs text-emerald-400/60">manga in this app</div>
                            </motion.div>

                            {/* Local Chapters */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.15 }}
                                className="p-5 rounded-xl bg-gradient-to-br from-emerald-500/15 to-teal-600/10 border border-emerald-500/20"
                            >
                                <div className="text-xs text-white/40 font-mono uppercase tracking-wider mb-1">Chapters</div>
                                <div className="text-3xl font-bold text-white mb-1">
                                    {stats?.manga.chaptersRead || 0}
                                </div>
                                <div className="text-xs text-emerald-400/60">read in this app</div>
                            </motion.div>
                        </div>

                        {/* Activity Row - Streak and Sessions */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                            {/* Activity Streak */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="p-5 rounded-xl bg-gradient-to-br from-amber-500/15 to-orange-600/10 border border-amber-500/20"
                            >
                                <div className="text-xs text-white/40 font-mono uppercase tracking-wider mb-1">Streak</div>
                                <div className="text-3xl font-bold text-white mb-1 flex items-center gap-2">
                                    {streak}
                                    <span className="text-amber-500"><FlameIcon size={24} /></span>
                                </div>
                                <div className="text-xs text-amber-400/60">{streak === 1 ? 'day' : 'days'} in a row</div>
                            </motion.div>

                            {/* Anime Sessions */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.25 }}
                                className="p-5 rounded-xl bg-white/5 border border-white/10"
                            >
                                <div className="text-xs text-white/40 font-mono uppercase tracking-wider mb-1">Anime Sessions</div>
                                <div className="text-3xl font-bold text-white mb-1">
                                    {stats?.anime.sessionsCount || 0}
                                </div>
                                <div className="text-xs text-white/40">watching sessions</div>
                            </motion.div>

                            {/* Manga Sessions */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="p-5 rounded-xl bg-white/5 border border-white/10"
                            >
                                <div className="text-xs text-white/40 font-mono uppercase tracking-wider mb-1">Manga Sessions</div>
                                <div className="text-3xl font-bold text-white mb-1">
                                    {stats?.manga.sessionsCount || 0}
                                </div>
                                <div className="text-xs text-white/40">reading sessions</div>
                            </motion.div>
                        </div>

                        {/* Last Watched */}
                        {stats?.anime.lastWatched && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.35 }}
                                className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10 flex items-center gap-4"
                            >
                                {stats.anime.lastWatched.coverImage && (
                                    <img
                                        src={stats.anime.lastWatched.coverImage}
                                        alt=""
                                        className="w-14 h-20 object-cover rounded-lg"
                                    />
                                )}
                                <div>
                                    <div className="text-xs text-white/40 font-mono uppercase tracking-wider">Last Watched</div>
                                    <div className="text-lg font-semibold text-white">{stats.anime.lastWatched.title}</div>
                                    <div className="text-sm text-white/40">
                                        {new Date(stats.anime.lastWatched.timestamp).toLocaleDateString()}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </div>

                    {/* ANILIST STATS SECTION */}
                    {isAuthenticated && anilistStats && (
                        <div>
                            <div className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <span className="px-2 py-1 rounded-md bg-sky-500/20 text-sky-400 text-xs font-mono">ANILIST</span>
                                Profile Statistics
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {/* AniList Total Time */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.4 }}
                                    className="p-5 rounded-xl bg-gradient-to-br from-sky-500/15 to-blue-600/10 border border-sky-500/20"
                                >
                                    <div className="text-xs text-white/40 font-mono uppercase tracking-wider mb-1">Total Watch Time</div>
                                    <div className="text-3xl font-bold text-white mb-1">
                                        {formatTime(anilistStats.minutesWatched)}
                                    </div>
                                    <div className="text-xs text-sky-400/60">all-time anime</div>
                                </motion.div>

                                {/* AniList Episodes */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.45 }}
                                    className="p-5 rounded-xl bg-gradient-to-br from-sky-500/15 to-blue-600/10 border border-sky-500/20"
                                >
                                    <div className="text-xs text-white/40 font-mono uppercase tracking-wider mb-1">Episodes</div>
                                    <div className="text-3xl font-bold text-white mb-1">
                                        {anilistStats.episodesWatched}
                                    </div>
                                    <div className="text-xs text-sky-400/60">all-time watched</div>
                                </motion.div>

                                {/* AniList Chapters */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.5 }}
                                    className="p-5 rounded-xl bg-gradient-to-br from-rose-500/15 to-pink-600/10 border border-rose-500/20"
                                >
                                    <div className="text-xs text-white/40 font-mono uppercase tracking-wider mb-1">Chapters</div>
                                    <div className="text-3xl font-bold text-white mb-1">
                                        {anilistStats.chaptersRead}
                                    </div>
                                    <div className="text-xs text-rose-400/60">all-time read</div>
                                </motion.div>

                                {/* AniList Volumes */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.55 }}
                                    className="p-5 rounded-xl bg-gradient-to-br from-rose-500/15 to-pink-600/10 border border-rose-500/20"
                                >
                                    <div className="text-xs text-white/40 font-mono uppercase tracking-wider mb-1">Volumes</div>
                                    <div className="text-3xl font-bold text-white mb-1">
                                        {anilistStats.volumesRead}
                                    </div>
                                    <div className="text-xs text-rose-400/60">all-time read</div>
                                </motion.div>
                            </div>

                            {/* Top Genres Row */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                {/* Top Anime Genre */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.6 }}
                                    className="p-5 rounded-xl bg-white/5 border border-white/10"
                                >
                                    <div className="text-xs text-white/40 font-mono uppercase tracking-wider mb-1">Top Anime Genre</div>
                                    <div className="text-2xl font-bold text-white mb-1">
                                        {topAnimeGenre?.genre || 'Not enough data'}
                                    </div>
                                    {topAnimeGenre && (
                                        <div className="text-xs text-white/40">{formatTime(topAnimeGenre.value)} watched</div>
                                    )}
                                </motion.div>

                                {/* Top Manga Genre */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.65 }}
                                    className="p-5 rounded-xl bg-white/5 border border-white/10"
                                >
                                    <div className="text-xs text-white/40 font-mono uppercase tracking-wider mb-1">Top Manga Genre</div>
                                    <div className="text-2xl font-bold text-white mb-1">
                                        {topMangaGenre?.genre || 'Not enough data'}
                                    </div>
                                    {topMangaGenre && (
                                        <div className="text-xs text-white/40">{topMangaGenre.value} chapters read</div>
                                    )}
                                </motion.div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Anime Tab */}
            {activeTab === 'anime' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-6 rounded-2xl bg-gradient-to-br from-sky-500/20 to-blue-600/10 border border-sky-500/20"
                    >
                        <div className="text-sm text-white/40 font-mono uppercase tracking-wider mb-2">Watch Time</div>
                        <div className="text-4xl font-bold text-white mb-1">
                            {formatTime(stats?.anime.totalMinutesWatched || anilistStats?.minutesWatched || 0)}
                        </div>
                        <div className="text-sm text-white/40">total anime watch time</div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="p-6 rounded-2xl bg-white/5 border border-white/10"
                    >
                        <div className="text-sm text-white/40 font-mono uppercase tracking-wider mb-2">Episodes</div>
                        <div className="text-4xl font-bold text-white mb-1">
                            {stats?.anime.episodesWatched || anilistStats?.episodesWatched || 0}
                        </div>
                        <div className="text-sm text-white/40">episodes watched</div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="p-6 rounded-2xl bg-white/5 border border-white/10"
                    >
                        <div className="text-sm text-white/40 font-mono uppercase tracking-wider mb-2">Sessions</div>
                        <div className="text-4xl font-bold text-white mb-1">
                            {stats?.anime.sessionsCount || 0}
                        </div>
                        <div className="text-sm text-white/40">watching sessions</div>
                    </motion.div>

                    {/* Genre breakdown */}
                    {((anilistStats?.animeGenres && anilistStats.animeGenres.length > 0) || (stats && Object.keys(stats.anime.byGenre).length > 0)) && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="col-span-full p-6 rounded-2xl bg-white/5 border border-white/10"
                        >
                            <div className="text-sm text-white/40 font-mono uppercase tracking-wider mb-4">Genre Breakdown</div>
                            <div className="flex flex-wrap gap-3">
                                {anilistStats?.animeGenres && anilistStats.animeGenres.length > 0
                                    ? anilistStats.animeGenres.slice(0, 8).map((g) => (
                                        <div
                                            key={g.genre}
                                            className="px-4 py-2 rounded-full bg-sky-500/10 border border-sky-500/20 text-sm"
                                        >
                                            <span className="font-medium text-white">{g.genre}</span>
                                            <span className="ml-2 text-white/40">{formatTime(g.minutesWatched)}</span>
                                        </div>
                                    ))
                                    : Object.entries(stats?.anime.byGenre || {})
                                        .sort((a, b) => b[1] - a[1])
                                        .slice(0, 8)
                                        .map(([genre, minutes]) => (
                                            <div
                                                key={genre}
                                                className="px-4 py-2 rounded-full bg-sky-500/10 border border-sky-500/20 text-sm"
                                            >
                                                <span className="font-medium text-white">{genre}</span>
                                                <span className="ml-2 text-white/40">{formatTime(minutes)}</span>
                                            </div>
                                        ))
                                }
                            </div>
                        </motion.div>
                    )}
                </div>
            )}

            {/* Manga Tab */}
            {activeTab === 'manga' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-6 rounded-2xl bg-gradient-to-br from-rose-500/20 to-pink-600/10 border border-rose-500/20"
                    >
                        <div className="text-sm text-white/40 font-mono uppercase tracking-wider mb-2">Read Time</div>
                        <div className="text-4xl font-bold text-white mb-1">
                            {formatTime(mangaReadMinutes)}
                        </div>
                        <div className="text-sm text-white/40">~10 min per chapter</div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="p-6 rounded-2xl bg-white/5 border border-white/10"
                    >
                        <div className="text-sm text-white/40 font-mono uppercase tracking-wider mb-2">Chapters</div>
                        <div className="text-4xl font-bold text-white mb-1">
                            {stats?.manga.chaptersRead || anilistStats?.chaptersRead || 0}
                        </div>
                        <div className="text-sm text-white/40">chapters read</div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="p-6 rounded-2xl bg-white/5 border border-white/10"
                    >
                        <div className="text-sm text-white/40 font-mono uppercase tracking-wider mb-2">Sessions</div>
                        <div className="text-4xl font-bold text-white mb-1">
                            {stats?.manga.sessionsCount || 0}
                        </div>
                        <div className="text-sm text-white/40">reading sessions</div>
                    </motion.div>

                    {/* AniList Volumes */}
                    {anilistStats && anilistStats.volumesRead > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="p-6 rounded-2xl bg-white/5 border border-white/10"
                        >
                            <div className="text-sm text-white/40 font-mono uppercase tracking-wider mb-2">Volumes</div>
                            <div className="text-4xl font-bold text-white mb-1">
                                {anilistStats.volumesRead}
                            </div>
                            <div className="text-sm text-white/40">volumes read (AniList)</div>
                        </motion.div>
                    )}

                    {/* Genre breakdown */}
                    {((anilistStats?.mangaGenres && anilistStats.mangaGenres.length > 0) || (stats && Object.keys(stats.manga.byGenre).length > 0)) && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="col-span-full p-6 rounded-2xl bg-white/5 border border-white/10"
                        >
                            <div className="text-sm text-white/40 font-mono uppercase tracking-wider mb-4">Genre Breakdown</div>
                            <div className="flex flex-wrap gap-3">
                                {anilistStats?.mangaGenres && anilistStats.mangaGenres.length > 0
                                    ? anilistStats.mangaGenres.slice(0, 8).map((g) => (
                                        <div
                                            key={g.genre}
                                            className="px-4 py-2 rounded-full bg-rose-500/10 border border-rose-500/20 text-sm"
                                        >
                                            <span className="font-medium text-white">{g.genre}</span>
                                            <span className="ml-2 text-white/40">{g.chaptersRead} ch</span>
                                        </div>
                                    ))
                                    : Object.entries(stats?.manga.byGenre || {})
                                        .sort((a, b) => b[1] - a[1])
                                        .slice(0, 8)
                                        .map(([genre, chapters]) => (
                                            <div
                                                key={genre}
                                                className="px-4 py-2 rounded-full bg-rose-500/10 border border-rose-500/20 text-sm"
                                            >
                                                <span className="font-medium text-white">{genre}</span>
                                                <span className="ml-2 text-white/40">{chapters} ch</span>
                                            </div>
                                        ))
                                }
                            </div>
                        </motion.div>
                    )}
                </div>
            )}

            {/* Empty state for new users */}
            {(!stats || (totalTime === 0 && !anilistStats)) && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-16 text-white/40"
                >
                    <div className="flex justify-center mb-4 text-white/20">
                        <ChartIcon size={64} />
                    </div>
                    <div className="text-xl font-medium mb-2">Start Your Journey!</div>
                    <div className="text-sm max-w-md mx-auto">
                        Your statistics will appear here as you watch anime and read manga.
                        Connect to AniList to sync your existing progress.
                    </div>
                </motion.div>
            )}
        </div>
    );
}

export default Statistics;
