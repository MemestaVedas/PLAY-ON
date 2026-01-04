import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { USER_STATS_QUERY } from '../api/anilistClient';
import { FilmIcon, BookOpenIcon } from '../components/ui/Icons';
import SpotlightCard from '../components/ui/SpotlightCard';

const STATUS_COLORS: Record<string, { color: string, gradient: string, glow: string }> = {
    'COMPLETED': {
        color: '#10b981', // emerald-500
        gradient: 'linear-gradient(90deg, #10b981 0%, #34d399 100%)',
        glow: 'rgba(16, 185, 129, 0.4)'
    },
    'PLANNING': {
        color: '#3b82f6', // blue-500
        gradient: 'linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%)',
        glow: 'rgba(59, 130, 246, 0.4)'
    },
    'CURRENT': {
        color: '#8b5cf6', // violet-500
        gradient: 'linear-gradient(90deg, #8b5cf6 0%, #a78bfa 100%)',
        glow: 'rgba(139, 92, 246, 0.4)'
    },
    'PAUSED': {
        color: '#f59e0b', // amber-500
        gradient: 'linear-gradient(90deg, #f59e0b 0%, #fcd34d 100%)',
        glow: 'rgba(245, 158, 11, 0.4)'
    },
    'DROPPED': {
        color: '#ef4444', // red-500
        gradient: 'linear-gradient(90deg, #ef4444 0%, #f87171 100%)',
        glow: 'rgba(239, 68, 68, 0.4)'
    }
};

function UserProfile() {
    const { user, isAuthenticated, loading: authLoading } = useAuth();
    const navigate = useNavigate();

    const { data: statsData, loading: statsLoading } = useQuery(USER_STATS_QUERY, {
        variables: { userId: user?.id },
        skip: !user?.id,
    });

    const stats = statsData?.User?.statistics?.anime;

    if (authLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-pulse text-white/60">Loading...</div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-white/60 gap-4">
                <h2 className="text-2xl font-bold text-white">Not Logged In</h2>
                <p>Please log in with AniList to view your profile.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen" style={{ margin: '-96px -32px 0 -32px' }}>
            {/* Header with Banner - Full bleed */}
            <div
                className="relative overflow-hidden"
                style={{
                    height: '350px',
                    width: '100%',
                    background: user?.bannerImage
                        ? `url(${user.bannerImage}) center/cover`
                        : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                }}
            >
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/20 to-transparent" />
            </div>

            {/* Liquid Glass Styles */}
            <style>{`
                @keyframes liquid-shine {
                    0% { transform: translateX(-100%) translateY(-100%) rotate(-45deg); }
                    100% { transform: translateX(200%) translateY(200%) rotate(-45deg); }
                }
                .animate-liquid-shine {
                    animation: liquid-shine 5s infinite linear;
                }
            `}</style>

            {/* Header Island - Relative (Not Sticky) */}
            <div className="relative z-30 max-w-[1100px] mx-auto px-10 -mt-[50px] mb-12 pointer-events-none">
                <div className="flex items-center justify-between">
                    {/* Left: Avatar & Name Section */}
                    <div className="flex items-center gap-10 pointer-events-auto">
                        {/* Huge Borderless Avatar */}
                        <div className="w-32 h-32 rounded-3xl overflow-hidden flex-shrink-0 transition-all duration-500 hover:scale-[1.1] group relative">
                            {user?.avatar?.large ? (
                                <img
                                    src={user.avatar.large}
                                    alt={user.name}
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-5xl bg-white/5">👤</div>
                            )}
                        </div>

                        {/* Liquid Glass Name Pill - Minimalist */}
                        <div className="px-12 py-6 rounded-[2.5rem] bg-white/[0.03] backdrop-blur-3xl border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.3)] ring-1 ring-white/10 transition-all duration-500 hover:scale-[1.05] hover:shadow-[0_20px_50px_rgba(168,85,247,0.15)] hover:border-purple-500/30 group relative overflow-hidden">
                            {/* Liquid Shine Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent -translate-x-full -translate-y-full rotate-45 animate-liquid-shine opacity-30 group-hover:opacity-60 transition-opacity pointer-events-none" />

                            <h1 className="text-4xl font-black text-white tracking-tight leading-none drop-shadow-[0_2px_15px_rgba(0,0,0,0.5)] relative z-10" style={{ fontFamily: 'var(--font-rounded)' }}>
                                {user?.name || 'User'}
                            </h1>
                        </div>
                    </div>

                    {/* Right: Actions Pill */}
                    <div className="pointer-events-auto flex items-center gap-2 px-2 py-2 bg-black/60 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl h-fit self-center">
                        <a
                            href={`https://anilist.co/user/${user?.name}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-3 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center"
                            title="View on AniList"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                        </a>
                        <button
                            onClick={() => navigate('/settings')}
                            className="p-3 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center border-l border-white/10 pl-4 ml-1"
                            title="Settings"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* Content Area with padding */}
            <div className="max-w-[1100px] mx-auto px-10 pb-12">

                {/* Bio Section */}
                {statsData?.User?.about && (
                    <div className="mb-12">
                        <h2 className="text-2xl font-black text-white mb-4 tracking-tight" style={{ fontFamily: 'var(--font-rounded)' }}>About</h2>
                        <SpotlightCard
                            className="bg-[#1a1a1f]/50 backdrop-blur-xl rounded-2xl p-8 border border-white/5 shadow-xl text-white/80 leading-relaxed whitespace-pre-line"
                            spotlightColor="rgba(168, 85, 247, 0.1)"
                        >
                            {statsData.User.about}
                        </SpotlightCard>
                    </div>
                )}

                {/* Stats Section */}
                <div className="mb-12">
                    <h2 className="text-2xl font-black text-white mb-6 tracking-tight flex items-center gap-3" style={{ fontFamily: 'var(--font-rounded)' }}>
                        <div className="w-1 h-8 bg-purple-500 rounded-full shadow-[0_0_10px_rgba(168,85,247,0.5)]" />
                        Statistics
                    </h2>

                    {/* Anime & Manga Stats Sections */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Anime Stats Box */}
                        <SpotlightCard
                            className="bg-sky-500/5 backdrop-blur-2xl rounded-3xl p-8 border border-sky-400/20 shadow-[0_0_50px_-12px_rgba(165,219,248,0.3)] relative group overflow-hidden"
                            spotlightColor="rgba(165, 219, 248, 0.2)"
                        >
                            <div className="absolute -inset-x-20 -top-20 h-40 bg-sky-500/10 blur-[100px] pointer-events-none opacity-50" />
                            <div className="space-y-6 relative z-10">
                                <div className="flex items-center gap-3 px-2">
                                    <h3 className="text-lg font-black text-sky-300/80 uppercase tracking-widest" style={{ color: 'var(--color-sky-blue)' }}>Anime</h3>
                                    <div className="flex-1 h-[1px] bg-sky-500/10" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <StatCard
                                        label="Watched"
                                        value={stats?.count || 0}
                                        loading={statsLoading}
                                        icon={<FilmIcon />}
                                        variant="indigo"
                                    />
                                    <StatCard
                                        label="Episodes"
                                        value={stats?.episodesWatched || 0}
                                        loading={statsLoading}
                                        icon={<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3" /></svg>}
                                        variant="purple"
                                    />
                                    <StatCard
                                        label="Days"
                                        value={stats?.minutesWatched ? (stats.minutesWatched / 60 / 24).toFixed(1) : 0}
                                        loading={statsLoading}
                                        icon={<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>}
                                        variant="pink"
                                    />
                                    <StatCard
                                        label="Mean Score"
                                        value={stats?.meanScore ? `${stats.meanScore}%` : '-'}
                                        loading={statsLoading}
                                        icon={<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>}
                                        variant="emerald"
                                    />
                                </div>
                            </div>
                        </SpotlightCard>

                        {/* Manga Stats Box */}
                        <SpotlightCard
                            className="bg-emerald-500/5 backdrop-blur-2xl rounded-3xl p-8 border border-emerald-400/20 shadow-[0_0_50px_-12px_rgba(157,240,179,0.3)] relative group overflow-hidden"
                            spotlightColor="rgba(157, 240, 179, 0.2)"
                        >
                            <div className="absolute -inset-x-20 -top-20 h-40 bg-emerald-500/10 blur-[100px] pointer-events-none opacity-50" />
                            <div className="space-y-6 relative z-10">
                                <div className="flex items-center gap-3 px-2">
                                    <h3 className="text-lg font-black text-emerald-300/80 uppercase tracking-widest" style={{ color: 'var(--color-mint-tonic)' }}>Manga</h3>
                                    <div className="flex-1 h-[1px] bg-emerald-500/10" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <StatCard
                                        label="Read"
                                        value={statsData?.User?.statistics?.manga?.count || 0}
                                        loading={statsLoading}
                                        icon={<BookOpenIcon />}
                                        variant="blue"
                                    />
                                    <StatCard
                                        label="Chapters"
                                        value={statsData?.User?.statistics?.manga?.chaptersRead || 0}
                                        loading={statsLoading}
                                        icon={<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>}
                                        variant="cyan"
                                    />
                                    <StatCard
                                        label="Volumes"
                                        value={statsData?.User?.statistics?.manga?.volumesRead || 0}
                                        loading={statsLoading}
                                        icon={<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>}
                                        variant="teal"
                                    />
                                    <StatCard
                                        label="Mean Score"
                                        value={statsData?.User?.statistics?.manga?.meanScore ? `${statsData.User.statistics.manga.meanScore}%` : '-'}
                                        loading={statsLoading}
                                        icon={<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>}
                                        variant="emerald"
                                    />
                                </div>
                            </div>
                        </SpotlightCard>
                    </div>
                </div>

                {/* Favorites Section */}
                {(statsData?.User?.favourites?.anime?.nodes?.length > 0 || statsData?.User?.favourites?.manga?.nodes?.length > 0) && (
                    <div className="mb-12">
                        <h2 className="text-2xl font-black text-white mb-6 tracking-tight flex items-center gap-3" style={{ fontFamily: 'var(--font-rounded)' }}>
                            <div className="w-1 h-8 bg-pink-500 rounded-full shadow-[0_0_10px_rgba(236,72,153,0.5)]" />
                            Favorites
                        </h2>

                        {/* Favorite Anime */}
                        {statsData?.User?.favourites?.anime?.nodes?.length > 0 && (
                            <div className="mb-8">
                                <div className="flex items-center justify-between mb-4 px-2">
                                    <h3 className="text-lg font-bold text-white/60 uppercase tracking-widest">Anime</h3>
                                    <a
                                        href={`https://anilist.co/user/${user?.name}/favorites`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs font-bold text-pink-400 hover:text-pink-300 uppercase tracking-wider hover:underline transition-all"
                                    >
                                        View More
                                    </a>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                    {statsData.User.favourites.anime.nodes.slice(0, 5).map((anime: any) => (
                                        <div key={anime.id} className="relative aspect-[2/3] rounded-xl overflow-hidden group cursor-pointer" onClick={() => navigate(`/anime/${anime.id}`)}>
                                            <img src={anime.coverImage.large} alt={anime.title.english || anime.title.romaji} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                <div className="absolute bottom-0 left-0 p-3 w-full">
                                                    <div className="text-white font-bold text-sm truncate">{anime.title.english || anime.title.romaji}</div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Favorite Manga */}
                        {statsData?.User?.favourites?.manga?.nodes?.length > 0 && (
                            <div className="mb-8">
                                <div className="flex items-center justify-between mb-4 px-2">
                                    <h3 className="text-lg font-bold text-white/60 uppercase tracking-widest">Manga</h3>
                                    <a
                                        href={`https://anilist.co/user/${user?.name}/favorites`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs font-bold text-pink-400 hover:text-pink-300 uppercase tracking-wider hover:underline transition-all"
                                    >
                                        View More
                                    </a>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                    {statsData.User.favourites.manga.nodes.slice(0, 5).map((manga: any) => (
                                        <div key={manga.id} className="relative aspect-[2/3] rounded-xl overflow-hidden group cursor-pointer" onClick={() => navigate(`/manga-details/${manga.id}`)}>
                                            <img src={manga.coverImage.large} alt={manga.title.english || manga.title.romaji} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                <div className="absolute bottom-0 left-0 p-3 w-full">
                                                    <div className="text-white font-bold text-sm truncate">{manga.title.english || manga.title.romaji}</div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Favorite Characters */}
                        {statsData?.User?.favourites?.characters?.nodes?.length > 0 && (
                            <div>
                                <div className="flex items-center justify-between mb-4 px-2">
                                    <h3 className="text-lg font-bold text-white/60 uppercase tracking-widest">Characters</h3>
                                    <a
                                        href={`https://anilist.co/user/${user?.name}/favorites`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs font-bold text-pink-400 hover:text-pink-300 uppercase tracking-wider hover:underline transition-all"
                                    >
                                        View More
                                    </a>
                                </div>
                                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                                    {statsData.User.favourites.characters.nodes.slice(0, 5).map((char: any) => (
                                        <div key={char.id} className="relative w-32 flex-shrink-0 group">
                                            <div className="aspect-square rounded-full overflow-hidden border-2 border-white/10 group-hover:border-pink-500/50 transition-colors">
                                                <img src={char.image.large} alt={char.name.full} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                            </div>
                                            <div className="text-center mt-2 text-sm text-white/80 font-medium truncate px-1 group-hover:text-pink-400 transition-colors">
                                                {char.name.full}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}


                {/* Status Breakdown (Anime) */}
                {stats?.statuses && (
                    <SpotlightCard
                        className="lg:col-span-3 bg-[#1a1a1f]/50 backdrop-blur-xl rounded-2xl p-10 border border-white/5 shadow-2xl relative overflow-hidden group"
                        spotlightColor="rgba(168, 85, 247, 0.1)"
                    >
                        <div className="absolute top-0 right-0 p-8 text-white/5 pointer-events-none group-hover:text-white/10 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path></svg>
                        </div>

                        <h3 className="text-xl font-black text-white mb-8 flex items-center gap-3" style={{ fontFamily: 'var(--font-rounded)' }}>
                            <div className="p-2 bg-white/5 rounded-xl border border-white/10">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path></svg>
                            </div>
                            Anime Status Distribution
                        </h3>

                        <div className="space-y-6">
                            {stats.statuses.map((s: any) => {
                                const style = STATUS_COLORS[s.status] || { color: '#888', gradient: '#444', glow: 'transparent' };
                                return (
                                    <div key={s.status} className="group/item">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-white/70 font-bold capitalize text-sm tracking-wide">{s.status.toLowerCase().replace('_', ' ')}</span>
                                            <span className="text-white font-black text-lg" style={{ color: style.color }}>{s.count}</span>
                                        </div>
                                        <div className="w-full bg-white/5 h-5 rounded-full overflow-hidden border border-white/5">
                                            <div
                                                className="h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(0,0,0,0.5)]"
                                                style={{
                                                    width: `${(s.count / (stats.count || 1)) * 100}%`,
                                                    background: style.gradient,
                                                    boxShadow: `0 0 20px -5px ${style.glow}`
                                                }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </SpotlightCard>
                )}
            </div>
        </div>
    );
}

function StatCard({ label, value, loading, icon, variant = 'purple' }: { label: string; value: string | number; loading?: boolean; icon?: React.ReactNode; variant?: string }) {
    const variants: Record<string, { bg: string, border: string, text: string, spotlight: string }> = {
        purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-300', spotlight: 'rgba(192, 132, 252, 0.2)' },
        indigo: { bg: 'bg-indigo-500/10', border: 'border-indigo-500/30', text: 'text-indigo-300', spotlight: 'rgba(129, 140, 248, 0.2)' },
        pink: { bg: 'bg-pink-500/10', border: 'border-pink-500/30', text: 'text-pink-300', spotlight: 'rgba(244, 114, 182, 0.2)' },
        blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-300', spotlight: 'rgba(96, 165, 250, 0.2)' },
        cyan: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-300', spotlight: 'rgba(34, 211, 238, 0.2)' },
        teal: { bg: 'bg-teal-500/10', border: 'border-teal-500/30', text: 'text-teal-300', spotlight: 'rgba(45, 212, 191, 0.2)' },
        emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-300', spotlight: 'rgba(52, 211, 153, 0.2)' },
    };

    const config = variants[variant] || variants.purple;

    return (
        <SpotlightCard
            className={`
                ${config.bg} ${config.border} backdrop-blur-xl 
                rounded-2xl p-6 border shadow-xl 
                group transition-all duration-500 relative flex flex-col justify-between h-32
            `}
            spotlightColor={config.spotlight as any}
        >
            <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-25 transition-all transform translate-x-1 translate-y-[-5px] scale-125 ${config.text}`}>
                {icon}
            </div>

            <div className="text-white/50 text-xs uppercase tracking-[0.2em] font-black group-hover:text-white/70 transition-colors z-10">{label}</div>
            <div className={`text-3xl font-black ${config.text} tracking-tighter z-10 relative drop-shadow-md`} style={{ fontFamily: 'var(--font-rounded)' }}>
                {loading ? <div className="h-10 w-20 bg-white/5 animate-pulse rounded-full" /> : value}
            </div>
        </SpotlightCard>
    );
}

export default UserProfile;
