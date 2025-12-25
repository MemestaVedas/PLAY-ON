import { useNavigate } from 'react-router-dom';
import { AnimeCard, SectionHeader } from '../components/ui/UIComponents';
import CurrentlyWatching from '../components/ui/CurrentlyWatching';
// Sample anime data with more details
const animeData = [
    { id: 1, title: 'Attack on Titan', episodes: 75, status: 'Watching', progress: 67, image: '/brain/d4275da3-9954-484c-802f-296cee8f613a/anime_mock_5_1766682347429.png' },
    { id: 2, title: 'Demon Slayer', episodes: 44, status: 'Watching', progress: 82, image: '/brain/d4275da3-9954-484c-802f-296cee8f613a/anime_mock_1_1766681754438.png' },
    { id: 3, title: 'My Hero Academia', episodes: 113, status: 'Watching', progress: 45, image: '/brain/d4275da3-9954-484c-802f-296cee8f613a/anime_mock_3_1766682294612.png' },
    { id: 4, title: 'Jujutsu Kaisen', episodes: 24, status: 'Completed', progress: 100, image: '/brain/d4275da3-9954-484c-802f-296cee8f613a/anime_mock_2_1766682269853.png' },
    { id: 5, title: 'One Piece', episodes: 1000, status: 'Watching', progress: 12, image: '/brain/d4275da3-9954-484c-802f-296cee8f613a/anime_mock_4_1766682324192.png' },
    { id: 6, title: 'Naruto Shippuden', episodes: 500, status: 'Completed', progress: 100, image: '/brain/d4275da3-9954-484c-802f-296cee8f613a/anime_mock_1_1766681754438.png' },
    // ... rest can use defaults or recycled
    { id: 7, title: 'Death Note', episodes: 37, status: 'Completed', progress: 100 },
    { id: 8, title: 'Steins;Gate', episodes: 24, status: 'Watching', progress: 58 },
];

function AnimeList() {
    const navigate = useNavigate();

    const handleAnimeClick = (id: number) => {
        navigate(`/anime/${id}`);
    };

    // Group by status
    const watching = animeData.filter(a => a.status === 'Watching');
    const completed = animeData.filter(a => a.status === 'Completed');
    const onHold = animeData.filter(a => a.status === 'On Hold');

    return (
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
            <SectionHeader
                title="My Anime List"
                subtitle={`${animeData.length} anime in your collection`}
                icon="📚"
            />

            {/* Filter/Search Bar */}
            <div style={{
                marginBottom: '2rem',
                display: 'flex',
                gap: '1rem',
                flexWrap: 'wrap',
            }}>
                <input
                    type="text"
                    placeholder="Search anime..."
                    style={{
                        flex: '1',
                        minWidth: '250px',
                        padding: '0.75rem 1rem',
                        borderRadius: '12px',
                        border: '1px solid rgba(200, 200, 220, 0.4)',
                        background: 'rgba(255, 255, 255, 0.9)',
                        fontSize: '1rem',
                        outline: 'none',
                    }}
                />
                <select style={{
                    padding: '0.75rem 1rem',
                    borderRadius: '12px',
                    border: '1px solid rgba(200, 200, 220, 0.4)',
                    background: 'rgba(255, 255, 255, 0.9)',
                    fontSize: '1rem',
                    cursor: 'pointer',
                }}>
                    <option>All Status</option>
                    <option>Watching</option>
                    <option>Completed</option>
                    <option>On Hold</option>
                </select>
            </div>

            {/* Currently Watching Section */}
            <div style={{ marginBottom: '2.5rem' }}>
                <CurrentlyWatching />
            </div>

            {/* Watching Section */}
            {watching.length > 0 && (
                <div style={{ marginBottom: '3rem' }}>
                    <h3 style={{
                        fontSize: '1.5rem',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                    }}>
                        <span>▶️</span> Currently Watching ({watching.length})
                    </h3>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                        gap: '1.5rem',
                    }}>
                        {watching.map((anime) => (
                            <AnimeCard
                                key={anime.id}
                                title={anime.title}
                                episodes={anime.episodes}
                                status={anime.status}
                                progress={anime.progress}
                                image={anime.image}
                                onClick={() => handleAnimeClick(anime.id)}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Completed Section */}
            {completed.length > 0 && (
                <div style={{ marginBottom: '3rem' }}>
                    <h3 style={{
                        fontSize: '1.5rem',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                    }}>
                        <span>✅</span> Completed ({completed.length})
                    </h3>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                        gap: '1.5rem',
                    }}>
                        {completed.map((anime) => (
                            <AnimeCard
                                key={anime.id}
                                title={anime.title}
                                episodes={anime.episodes}
                                status={anime.status}
                                progress={anime.progress}
                                image={anime.image}
                                onClick={() => handleAnimeClick(anime.id)}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* On Hold Section */}
            {onHold.length > 0 && (
                <div>
                    <h3 style={{
                        fontSize: '1.5rem',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                    }}>
                        <span>⏸️</span> On Hold ({onHold.length})
                    </h3>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                        gap: '1.5rem',
                    }}>
                        {onHold.map((anime) => (
                            <AnimeCard
                                key={anime.id}
                                title={anime.title}
                                episodes={anime.episodes}
                                status={anime.status}
                                progress={anime.progress}
                                image={anime.image}
                                onClick={() => handleAnimeClick(anime.id)}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default AnimeList;
