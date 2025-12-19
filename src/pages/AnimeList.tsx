import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { AnimeCard, SectionHeader } from '../components/UIComponents';

// Sample anime data with more details
const animeData = [
    { id: 1, title: 'Attack on Titan', episodes: 75, status: 'Watching', progress: 67 },
    { id: 2, title: 'Demon Slayer', episodes: 44, status: 'Watching', progress: 82 },
    { id: 3, title: 'My Hero Academia', episodes: 113, status: 'Watching', progress: 45 },
    { id: 4, title: 'Jujutsu Kaisen', episodes: 24, status: 'Completed', progress: 100 },
    { id: 5, title: 'One Piece', episodes: 1000, status: 'Watching', progress: 12 },
    { id: 6, title: 'Naruto Shippuden', episodes: 500, status: 'Completed', progress: 100 },
    { id: 7, title: 'Death Note', episodes: 37, status: 'Completed', progress: 100 },
    { id: 8, title: 'Steins;Gate', episodes: 24, status: 'Watching', progress: 58 },
    { id: 9, title: 'Fullmetal Alchemist', episodes: 64, status: 'Completed', progress: 100 },
    { id: 10, title: 'Tokyo Ghoul', episodes: 48, status: 'On Hold', progress: 33 },
    { id: 11, title: 'Sword Art Online', episodes: 96, status: 'Watching', progress: 71 },
    { id: 12, title: 'Code Geass', episodes: 50, status: 'Completed', progress: 100 },
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
        <Layout>
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
                                    onClick={() => handleAnimeClick(anime.id)}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}

export default AnimeList;
