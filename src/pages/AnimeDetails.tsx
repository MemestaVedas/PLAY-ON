import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';

/**
 * Anime Details Page
 * 
 * PURPOSE: Displays detailed information about a specific anime
 * 
 * HOW IT WORKS:
 * - Uses useParams() to get anime ID from URL (/anime/:id)
 * - Displays anime information (placeholder for now)
 * - Includes back button to return to anime list
 * 
 * ROUTE PARAMETER:
 * The :id in the route (/anime/:id) becomes available via useParams()
 * Example: /anime/123 → params.id = "123"
 */
function AnimeDetails() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    return (
        <Layout>
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 'calc(100vh - 200px)',
            }}>
                <div style={{
                    background: 'rgba(255, 255, 255, 0.9)',
                    padding: '3rem 4rem',
                    borderRadius: '24px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
                    border: '1px solid rgba(200, 200, 220, 0.3)',
                    textAlign: 'center',
                    maxWidth: '800px',
                    width: '100%',
                }}>
                    <h1 style={{
                        fontSize: '3rem',
                        background: 'linear-gradient(135deg, #E0BBE4 0%, #D4A5D8 100%)', // Pastel lavender
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        marginBottom: '1rem',
                        fontWeight: '700',
                    }}>
                        Anime Details
                    </h1>

                    <div style={{
                        background: 'rgba(224, 187, 228, 0.1)',
                        padding: '2rem',
                        borderRadius: '16px',
                        marginTop: '2rem',
                        marginBottom: '2rem',
                    }}>
                        <p style={{
                            fontSize: '1.5rem',
                            color: '#4B5563',
                            marginBottom: '1rem',
                            fontWeight: '600',
                        }}>
                            Anime ID: {id}
                        </p>
                        <p style={{
                            fontSize: '1.1rem',
                            color: '#6B7280',
                            lineHeight: '1.6',
                        }}>
                            Detailed information about this anime will be displayed here.
                            <br />
                            This includes title, description, episodes, rating, and more.
                        </p>
                    </div>

                    <button
                        onClick={() => navigate('/anime-list')}
                        style={{
                            padding: '0.75rem 2rem',
                            fontSize: '1rem',
                            background: 'linear-gradient(135deg, #E0BBE4 0%, #D4A5D8 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '25px',
                            cursor: 'pointer',
                            fontWeight: '600',
                            boxShadow: '0 4px 12px rgba(224, 187, 228, 0.3)',
                            transition: 'all 0.3s ease',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 6px 20px rgba(224, 187, 228, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(224, 187, 228, 0.3)';
                        }}
                    >
                        Back to Anime List
                    </button>
                </div>
            </div>
        </Layout>
    );
}

export default AnimeDetails;
