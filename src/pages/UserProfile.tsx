import { useParams } from 'react-router-dom';
// import { Edit2 } from 'lucide-react'; // Removed due to build error
import { useQuery } from '@apollo/client';
import { USER_PROFILE_QUERY } from '../api/anilistClient';
import Loading from '../components/ui/Loading';
import { SectionHeader, EmptyState } from '../components/ui/UIComponents';
import AnimeCard from '../components/ui/AnimeCard';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';
import { useState } from 'react';
import { FilmIcon, BookIcon, EditIcon } from '../components/ui/Icons';
import { ProfileSettingsModal } from '../components/settings/ProfileSettings';
import SpotlightCard from '../components/ui/SpotlightCard';

function UserProfile() {
    const { username } = useParams<{ username: string }>();
    const navigate = useNavigate();
    const { user: currentUser, isAuthenticated } = useAuthContext();

    // Check if viewing own profile
    const isOwnProfile = isAuthenticated && currentUser?.name === username;

    const { data, loading, error, refetch } = useQuery(USER_PROFILE_QUERY, {
        variables: { name: username },
        skip: !username,
        fetchPolicy: 'cache-first', // Use cached data, only fetch if not in cache
    });

    // Edit mode state
    const [isEditing, setIsEditing] = useState(false);

    if (loading) return <Loading />;

    if (error) {
        return (
            <div className="max-w-[1200px] mx-auto p-8">
                <SectionHeader title="Profile Not Found" subtitle="Could not load user data" />
                <EmptyState icon="😕" title="Oops!" description={error.message || "User not found"} />
            </div>
        );
    }

    const user = data?.User;

    if (!user) {
        return (
            <div className="max-w-[1200px] mx-auto p-8">
                <EmptyState icon="👤" title="User not found" description={`Could not find user "${username}"`} />
            </div>
        );
    }

    return (
        <div className="relative min-h-full font-rounded pb-20" style={{ color: 'var(--color-text-main)', margin: '-96px -32px 0 -32px' }}>
            {/* Edge-to-Edge Banner */}
            <div className="relative w-full h-[300px] md:h-[400px]">
                {user.bannerImage ? (
                    <img src={user.bannerImage} alt="Banner" className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full bg-gradient-to-r from-[var(--color-zen-accent)]/20 to-purple-500/20" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/40 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0f]/80 via-transparent to-transparent" />
            </div>

            {/* Content Container - Overlapping Banner */}
            <div className="relative z-10 max-w-[1200px] mx-auto px-8 -mt-32 md:-mt-48">

                {/* Header Info */}
                <div className="flex items-end gap-8 mb-10">
                    {/* Avatar - no background or border */}
                    <div className="w-32 h-32 md:w-48 md:h-48 rounded-2xl overflow-hidden shadow-2xl shrink-0">
                        <img src={user.avatar?.large} alt={user.name} className="w-full h-full object-cover" />
                    </div>

                    {/* Name & Quick Stats */}
                    <div className="mb-4 flex-1 min-w-0">
                        <div className="flex items-center justify-between w-full">
                            <h1 className="text-4xl md:text-6xl font-black mb-2 flex items-center gap-3 drop-shadow-xl tracking-tight text-white">
                                {user.name}
                            </h1>
                            {/* Edit Profile Button - Only for own profile */}
                            {isOwnProfile && (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="flex items-center justify-center p-3 rounded-xl font-bold text-sm transition-all duration-200"
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.1)',
                                        border: '1px solid rgba(255, 255, 255, 0.2)',
                                        color: 'white',
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = 'var(--color-zen-accent)';
                                        e.currentTarget.style.borderColor = 'var(--color-zen-accent)';
                                        e.currentTarget.style.color = '#000';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                                        e.currentTarget.style.color = 'white';
                                    }}
                                    title="Edit Profile"
                                >
                                    <EditIcon size={20} />
                                </button>
                            )}
                        </div>
                        <div className="flex gap-6 text-sm font-bold text-white/60 tracking-wider">
                            <span className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                                ANIME: {user.statistics?.anime?.count || 0}
                            </span>
                            <span className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-400"></span>
                                MANGA: {user.statistics?.manga?.count || 0}
                            </span>
                        </div>
                    </div>
                </div>

                {/* About / Bio */}
                {user.about && (
                    <div className="mb-12">
                        <SectionHeader title="About" />
                        <div className="max-w-4xl bg-white/5 p-8 rounded-2xl border border-white/5 backdrop-blur-sm shadow-inner">
                            <div className="whitespace-pre-wrap font-medium leading-relaxed opacity-90 text-lg">
                                {user.about}
                            </div>
                        </div>
                    </div>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                    {/* Anime Stats */}
                    <SpotlightCard
                        className="p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md"
                        spotlightColor="rgba(59, 130, 246, 0.25)"
                    >
                        <h3 className="text-xl font-bold mb-8 flex items-center gap-3 text-blue-400">
                            <FilmIcon size={28} /> Anime Stats
                        </h3>
                        <div className="grid grid-cols-2 gap-6">
                            <StatBox label="Count" value={user.statistics?.anime?.count} />
                            <StatBox label="Mean Score" value={user.statistics?.anime?.meanScore + '%'} />
                            <StatBox label="Episodes" value={user.statistics?.anime?.episodesWatched} />
                            <StatBox label="Minutes" value={Math.floor((user.statistics?.anime?.minutesWatched || 0) / 60) + ' hrs'} />
                        </div>
                    </SpotlightCard>

                    {/* Manga Stats */}
                    <SpotlightCard
                        className="p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md"
                        spotlightColor="rgba(34, 197, 94, 0.25)"
                    >
                        <h3 className="text-xl font-bold mb-8 flex items-center gap-3 text-green-400">
                            <BookIcon size={28} /> Manga Stats
                        </h3>
                        <div className="grid grid-cols-2 gap-6">
                            <StatBox label="Count" value={user.statistics?.manga?.count} />
                            <StatBox label="Mean Score" value={user.statistics?.manga?.meanScore + '%'} />
                            <StatBox label="Chapters" value={user.statistics?.manga?.chaptersRead} />
                            <StatBox label="Volumes" value={user.statistics?.manga?.volumesRead} />
                        </div>
                    </SpotlightCard>
                </div>

                {/* Favorites - Anime */}
                {user.favourites?.anime?.nodes?.length > 0 && (
                    <div className="mb-12">
                        <div className="flex items-center justify-between mb-4">
                            <SectionHeader title="Favorite Anime" />
                            <a
                                href={`https://anilist.co/user/${username}/favorites`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm font-bold text-white/40 hover:text-[var(--color-zen-accent)] transition-colors"
                            >
                                View All →
                            </a>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                            {user.favourites.anime.nodes.map((anime: any) => (
                                <AnimeCard
                                    key={anime.id}
                                    anime={anime}
                                    onClick={() => navigate(`/anime/${anime.id}`)}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Favorites - Manga */}
                {user.favourites?.manga?.nodes?.length > 0 && (
                    <div className="mb-12">
                        <div className="flex items-center justify-between mb-4">
                            <SectionHeader title="Favorite Manga" />
                            <a
                                href={`https://anilist.co/user/${username}/favorites`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm font-bold text-white/40 hover:text-[var(--color-zen-accent)] transition-colors"
                            >
                                View All →
                            </a>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                            {user.favourites.manga.nodes.map((manga: any) => (
                                <AnimeCard
                                    key={manga.id}
                                    anime={manga}
                                    onClick={() => navigate(`/manga-details/${manga.id}`)}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Favorites - Characters */}
                {user.favourites?.characters?.nodes?.length > 0 && (
                    <div className="mb-12">
                        <div className="flex items-center justify-between mb-4">
                            <SectionHeader title="Favorite Characters" />
                            <a
                                href={`https://anilist.co/user/${username}/favorites`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm font-bold text-white/40 hover:text-[var(--color-zen-accent)] transition-colors"
                            >
                                View All →
                            </a>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                            {user.favourites.characters.nodes.map((char: any) => (
                                <div key={char.id} className="group relative aspect-[3/4] rounded-xl overflow-hidden bg-white/5 border border-white/10 shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:border-white/20">
                                    <img src={char.image?.large} alt={char.name?.full} className="w-full h-full object-cover" />
                                    <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/90 via-black/60 to-transparent pt-10">
                                        <div className="text-sm font-bold text-white truncate text-center drop-shadow-md">
                                            {char.name?.full}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Edit Profile Modal - Uses shared component */}
            <ProfileSettingsModal
                isOpen={isEditing}
                onClose={async () => {
                    setIsEditing(false);
                    // Refetch profile data after closing
                    await refetch();
                }}
            />
        </div>
    );
}

function StatBox({ label, value }: { label: string, value: string | number }) {
    return (
        <div className="bg-white/5 rounded-xl p-4 border border-white/5 text-center">
            <div className="text-2xl font-bold text-white mb-1" style={{ fontFamily: 'var(--font-mono)' }}>{value || 0}</div>
            <div className="text-xs uppercase font-bold text-white/40 tracking-widest">{label}</div>
        </div>
    );
}

export default UserProfile;
