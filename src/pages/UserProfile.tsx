import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { USER_STATS_QUERY } from '../api/anilistClient';
import { FilmIcon, BookOpenIcon } from '../components/ui/Icons';

const STATUS_COLORS: Record<string, { color: string, gradient: string, glow: string }> = {
    'COMPLETED': {
        color: '#6ee7b7', // emerald-300
        gradient: 'linear-gradient(90deg, #34d399 0%, #6ee7b7 100%)',
        glow: 'rgba(110, 231, 183, 0.3)'
    },
    'PLANNING': {
        color: '#93c5fd', // blue-300
        gradient: 'linear-gradient(90deg, #60a5fa 0%, #93c5fd 100%)',
        glow: 'rgba(147, 197, 253, 0.3)'
    },
    'CURRENT': {
        color: '#c4b5fd', // violet-300
        gradient: 'linear-gradient(90deg, #a78bfa 0%, #c4b5fd 100%)',
        glow: 'rgba(196, 181, 253, 0.3)'
    },
    'PAUSED': {
        color: '#fcd34d', // amber-300
        gradient: 'linear-gradient(90deg, #fbbf24 0%, #fcd34d 100%)',
        glow: 'rgba(252, 211, 77, 0.3)'
    },
    'DROPPED': {
        color: '#fca5a5', // red-300
        gradient: 'linear-gradient(90deg, #f87171 0%, #fca5a5 100%)',
        glow: 'rgba(252, 165, 165, 0.3)'
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

            {/* Header Island - Relative (Not Sticky) */}
            <div className="relative z-30 max-w-[1100px] mx-auto px-10 -mt-[50px] mb-12 pointer-events-none">
                <div className="flex items-center justify-between">
                    {/* Left: Profile Pill */}
                    <div className="pointer-events-auto flex items-center gap-5 px-4 py-3 pr-8 rounded-full bg-[#0a0a0f]/80 backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)] ring-1 ring-white/5 transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_8px_32px_rgba(168,85,247,0.25)] hover:border-purple-500/30 group">
                        <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0 shadow-xl ring-2 ring-white/10 group-hover:ring-purple-500/40 transition-all">
                            {user?.avatar?.large ? (
                                <img
                                    src={user.avatar.large}
                                    alt={user.name}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-2xl bg-white/10">👤</div>
                            )}
                        </div>

                        <div className="flex flex-col justify-center">
                            <h1 className="text-2xl font-black text-white tracking-tight leading-none drop-shadow-md" style={{ fontFamily: 'var(--font-rounded)' }}>
                                {user?.name || 'User'}
                            </h1>
                        </div>
                    </div>

                    {/* Right: Actions Pill */}
                    <div className="pointer-events-auto flex items-center gap-2 px-2 py-2 bg-black/60 backdrop-blur-2xl border border-white/10 rounded-full shadow-2xl h-fit self-center">
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
                        <div className="bg-[#1a1a1f]/50 backdrop-blur-xl rounded-[2rem] p-8 border border-white/5 shadow-xl text-white/80 leading-relaxed whitespace-pre-line">
                            {statsData.User.about}
                        </div>
                    </div>
                )}

                {/* Stats Section */}
                <div className="mb-12">
                    <h2 className="text-2xl font-black text-white mb-6 tracking-tight flex items-center gap-3" style={{ fontFamily: 'var(--font-rounded)' }}>
                        <div className="w-1 h-8 bg-purple-500 rounded-full shadow-[0_0_10px_rgba(168,85,247,0.5)]" />
                        Statistics
                    </h2>

                    {/* Anime & Manga Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Anime Stats */}
                        <div className="space-y-6">
                            <h3 className="text-lg font-bold text-white/60 uppercase tracking-widest px-2">Anime</h3>
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

                        {/* Manga Stats */}
                        <div className="space-y-6">
                            <h3 className="text-lg font-bold text-white/60 uppercase tracking-widest px-2">Manga</h3>
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
                    <div className="lg:col-span-3 bg-[#1a1a1f]/50 backdrop-blur-xl rounded-[2.5rem] p-10 border border-white/5 shadow-2xl relative overflow-hidden group">
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
                    </div>
                )}
            </div>
        </div>
    );
}

function StatCard({ label, value, loading, icon, variant = 'purple' }: { label: string; value: string | number; loading?: boolean; icon?: React.ReactNode; variant?: string }) {
    const variants: Record<string, string> = {
        purple: 'from-purple-300/20 to-purple-400/5 hover:to-purple-300/10 text-purple-200',
        indigo: 'from-indigo-300/20 to-indigo-400/5 hover:to-indigo-300/10 text-indigo-200',
        pink: 'from-pink-300/20 to-pink-400/5 hover:to-pink-300/10 text-pink-200',
        blue: 'from-blue-300/20 to-blue-400/5 hover:to-blue-300/10 text-blue-200',
        cyan: 'from-cyan-300/20 to-cyan-400/5 hover:to-cyan-300/10 text-cyan-200',
        teal: 'from-teal-300/20 to-teal-400/5 hover:to-teal-300/10 text-teal-200',
        emerald: 'from-emerald-300/20 to-emerald-400/5 hover:to-emerald-300/10 text-emerald-200',
    };

    const gradientClass = variants[variant] || variants.purple;

    return (
        <div className={`
            bg-gradient-to-br ${gradientClass} backdrop-blur-xl 
            rounded-[2rem] p-6 border border-white/5 shadow-xl 
            group transition-all duration-500 relative overflow-hidden flex flex-col justify-between h-32
        `}>
            <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-all transform translate-x-1 translate-y-[-5px] scale-125`}>
                {icon}
            </div>

            <div className="text-white/40 text-xs uppercase tracking-[0.2em] font-black group-hover:text-white/60 transition-colors z-10">{label}</div>
            <div className="text-3xl font-black text-white tracking-tighter z-10 relative drop-shadow-sm" style={{ fontFamily: 'var(--font-rounded)' }}>
                {loading ? <div className="h-10 w-20 bg-white/5 animate-pulse rounded-full" /> : value}
            </div>
        </div>
    );
}

export default UserProfile;
