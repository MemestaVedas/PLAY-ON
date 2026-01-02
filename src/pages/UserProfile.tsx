import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { USER_STATS_QUERY } from '../api/anilistClient';
import { clearAllCache } from '../lib/cacheUtils';
import { relaunch } from '@tauri-apps/plugin-process';

const STATUS_COLORS: Record<string, { color: string, gradient: string, glow: string }> = {
    'COMPLETED': {
        color: '#10b981',
        gradient: 'linear-gradient(90deg, #059669 0%, #10b981 100%)',
        glow: 'rgba(16, 185, 129, 0.3)'
    },
    'PLANNING': {
        color: '#3b82f6',
        gradient: 'linear-gradient(90deg, #2563eb 0%, #3b82f6 100%)',
        glow: 'rgba(59, 130, 246, 0.3)'
    },
    'CURRENT': {
        color: '#8b5cf6',
        gradient: 'linear-gradient(90deg, #7c3aed 0%, #8b5cf6 100%)',
        glow: 'rgba(139, 92, 246, 0.3)'
    },
    'PAUSED': {
        color: '#f59e0b',
        gradient: 'linear-gradient(90deg, #d97706 0%, #f59e0b 100%)',
        glow: 'rgba(245, 158, 11, 0.3)'
    },
    'DROPPED': {
        color: '#ef4444',
        gradient: 'linear-gradient(90deg, #dc2626 0%, #ef4444 100%)',
        glow: 'rgba(239, 68, 68, 0.3)'
    }
};

function UserProfile() {
    const { user, isAuthenticated, loading: authLoading, logout } = useAuth();
    const navigate = useNavigate();

    const { data: statsData, loading: statsLoading } = useQuery(USER_STATS_QUERY, {
        variables: { userId: user?.id },
        skip: !user?.id,
    });

    const stats = statsData?.User?.statistics?.anime;

    const handleDeleteCache = async () => {
        if (confirm('Are you sure you want to delete the local cache? This will log you out but keep your media library settings.')) {
            await clearAllCache();
            window.location.reload();
        }
    };

    const handleDeleteCacheAndRelaunch = async () => {
        if (confirm('This will delete all local cache and restart the application. Continue?')) {
            await clearAllCache();
            await relaunch();
        }
    };

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

                {/* Glassmorphic Pill for Avatar and User Info */}
                <div className="absolute bottom-10 left-10 flex items-center gap-4 px-5 py-2.5 rounded-full bg-black/40 backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
                    <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0 shadow-lg ring-1 ring-white/10">
                        {user?.avatar?.large ? (
                            <img
                                src={user.avatar.large}
                                alt={user.name}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-2xl">👤</div>
                        )}
                    </div>

                    <div className="pr-4">
                        <h1 className="text-2xl font-black text-white tracking-tight" style={{ fontFamily: 'var(--font-rounded)' }}>
                            {user?.name || 'User'}
                        </h1>
                    </div>
                </div>
            </div>

            {/* Content Area with padding */}
            <div className="max-w-[1100px] mx-auto px-10 py-12">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-1 h-8 bg-purple-500 rounded-full" />
                        <h2 className="text-2xl font-black text-white tracking-tight" style={{ fontFamily: 'var(--font-rounded)' }}>Statistics</h2>
                    </div>
                    <a
                        href={`https://anilist.co/user/${user?.name}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-6 py-2.5 rounded-full bg-white/5 border border-white/10 text-white/80 hover:bg-purple-500/20 hover:text-purple-300 hover:border-purple-500/30 transition-all text-sm font-bold flex items-center gap-2 group shadow-xl"
                    >
                        View on AniList
                        <svg className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                    </a>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                    <StatCard
                        label="Anime Watched"
                        value={stats?.count || 0}
                        loading={statsLoading}
                        icon={<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19.82 2H4.18C2.97 2 2 2.97 2 4.18v15.64C2 21.03 2.97 22 4.18 22h15.64c1.21 0 2.18-.97 2.18-2.18V4.18C22 2.97 21.03 2 19.82 2z" /><path d="M7 2v20" /><path d="M17 2v20" /><path d="M2 12h5" /><path d="M2 7h5" /><path d="M2 17h5" /><path d="M17 12h5" /><path d="M17 7h5" /><path d="M17 17h5" /></svg>}
                    />
                    <StatCard
                        label="Episodes"
                        value={stats?.episodesWatched || 0}
                        loading={statsLoading}
                        icon={<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3" /></svg>}
                    />
                    <StatCard
                        label="Days Watched"
                        value={stats?.minutesWatched ? Math.round(stats.minutesWatched / 60 / 24) : 0}
                        loading={statsLoading}
                        icon={<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>}
                    />
                    <StatCard
                        label="Mean Score"
                        value={stats?.meanScore ? `${stats.meanScore.toFixed(1)}%` : '-'}
                        loading={statsLoading}
                        icon={<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>}
                    />
                </div>

                {/* Main Content Sections */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 mb-12">
                    {/* Status Breakdown */}
                    {stats?.statuses && (
                        <div className="lg:col-span-2 bg-[#1a1a1f]/50 backdrop-blur-xl rounded-[2.5rem] p-10 border border-white/5 shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-8 text-white/5 pointer-events-none group-hover:text-white/10 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path></svg>
                            </div>

                            <h3 className="text-xl font-black text-white mb-8 flex items-center gap-3" style={{ fontFamily: 'var(--font-rounded)' }}>
                                <div className="p-2 bg-white/5 rounded-xl border border-white/10">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path></svg>
                                </div>
                                Status Breakdown
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
                                            <div className="w-full bg-white/5 h-3 rounded-full overflow-hidden border border-white/5">
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

                    {/* Actions Column */}
                    <div className="flex flex-col gap-6">
                        <div className="bg-[#1a1a1f]/50 backdrop-blur-xl rounded-[2.5rem] p-10 border border-white/5 shadow-2xl flex flex-col gap-5 h-full relative overflow-hidden group">
                            <div className="absolute -bottom-10 -right-10 text-white/5 pointer-events-none group-hover:text-white/10 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                            </div>

                            <h3 className="text-xl font-black text-white mb-2" style={{ fontFamily: 'var(--font-rounded)' }}>Account Control</h3>

                            <button
                                onClick={() => navigate('/settings')}
                                className="w-full py-4 bg-white/5 hover:bg-white/10 rounded-2xl text-white font-bold transition-all border border-white/5 hover:border-white/10 flex items-center justify-center gap-3 group/btn"
                            >
                                <svg className="group-hover/btn:rotate-45 transition-transform" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                                Settings
                            </button>

                            <button
                                onClick={handleDeleteCache}
                                className="w-full py-4 bg-orange-500/10 hover:bg-orange-500/20 rounded-2xl text-orange-400 font-bold transition-all border border-orange-500/10 hover:border-orange-500/30 flex items-center justify-center gap-3 group/btn shadow-[0_0_20px_rgba(249,115,22,0.05)] hover:shadow-[0_0_30px_rgba(249,115,22,0.15)]"
                            >
                                <svg className="group-hover/btn:scale-110 transition-transform" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 6L5 20"></path><path d="M5 6l14 14"></path></svg>
                                Delete Cache
                            </button>

                            <button
                                onClick={handleDeleteCacheAndRelaunch}
                                className="w-full py-4 bg-gradient-to-r from-red-500/20 to-rose-600/20 hover:from-red-500/30 hover:to-rose-600/30 rounded-2xl text-red-400 font-bold transition-all border border-red-500/20 hover:border-red-500/40 flex items-center justify-center gap-3 group/btn shadow-[0_0_30px_rgba(239,68,68,0.1)] hover:shadow-[0_0_40px_rgba(239,68,68,0.25)]"
                            >
                                <svg className="group-hover/btn:rotate-180 transition-transform duration-500" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6"></path><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
                                Delete & Relaunch
                            </button>

                            <button
                                onClick={() => {
                                    logout();
                                    navigate('/home');
                                }}
                                className="w-full mt-auto py-4 bg-white/5 hover:bg-red-500/10 rounded-2xl text-white/50 hover:text-red-400 font-bold transition-all border border-white/5 hover:border-red-500/20 flex items-center justify-center gap-3 group/btn"
                            >
                                <svg className="group-hover/btn:-translate-x-1 transition-transform" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ label, value, loading, icon }: { label: string; value: string | number; loading?: boolean; icon?: React.ReactNode }) {
    return (
        <div className="bg-[#1a1a1f]/50 backdrop-blur-xl rounded-[2rem] p-8 border border-white/5 shadow-xl group hover:bg-[#25252b]/60 transition-all duration-500 relative overflow-hidden flex flex-col justify-between h-36">
            <div className="absolute top-0 right-0 p-4 text-white/5 pointer-events-none group-hover:text-purple-500/10 transition-colors transform translate-x-1 translate-y-[-5px]">
                {icon}
            </div>

            <div className="text-white/40 text-xs uppercase tracking-[0.2em] font-black group-hover:text-purple-400/60 transition-colors">{label}</div>
            <div className="text-4xl font-black text-white tracking-tighter" style={{ fontFamily: 'var(--font-rounded)' }}>
                {loading ? <div className="h-10 w-20 bg-white/5 animate-pulse rounded-full" /> : value}
            </div>
        </div>
    );
}

export default UserProfile;
