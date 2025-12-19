import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';

/**
 * AnimeList Component
 * 
 * PURPOSE: Displays list of anime
 * 
 * NAVIGATION TO DETAILS:
 * Each anime item is clickable and navigates to /anime/:id
 * The :id is a route parameter that AnimeDetails page can access
 */

// Sample anime data
const sampleAnime = [
    { id: 1, title: 'Attack on Titan', episodes: 75 },
    { id: 2, title: 'Demon Slayer', episodes: 44 },
    { id: 3, title: 'My Hero Academia', episodes: 113 },
    { id: 4, title: 'Jujutsu Kaisen', episodes: 24 },
    { id: 5, title: 'One Piece', episodes: 1000 },
];

function AnimeList() {
    const navigate = useNavigate();

    const handleAnimeClick = (id: number) => {
        // Navigate to anime details with ID as route parameter
        navigate(`/anime/${id}`);
    };

    return (
        <Layout>
            <div style={{
                maxWidth: '1000px',
                margin: '0 auto',
            }}>
                <h1 style={{
                    fontSize: '3rem',
                    background: 'linear-gradient(135deg, #FFB5C5 0%, #FFA8BA 100%)', // Pastel pink
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    marginBottom: '2rem',
                    fontWeight: '700',
                    textAlign: 'center',
                }}>
                    Anime List
                </h1>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: '1.5rem',
                }}>
                    {sampleAnime.map((anime) => (
                        <div
                            key={anime.id}
                            onClick={() => handleAnimeClick(anime.id)}
                            style={{
                                background: 'rgba(255, 255, 255, 0.9)',
                                padding: '2rem',
                                borderRadius: '16px',
                                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
                                border: '1px solid rgba(200, 200, 220, 0.3)',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-4px)';
                                e.currentTarget.style.boxShadow = '0 8px 24px rgba(255, 181, 197, 0.3)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.08)';
                            }}
                        >
                            <h2 style={{
                                fontSize: '1.5rem',
                                color: '#374151',
                                marginBottom: '0.5rem',
                                fontWeight: '600',
                            }}>
                                {anime.title}
                            </h2>
                            <p style={{
                                fontSize: '1rem',
                                color: '#6B7280',
                            }}>
                                Episodes: {anime.episodes}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </Layout>
    );
}

export default AnimeList;

