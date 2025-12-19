import Layout from '../components/Layout';

/**
 * Now Playing Page
 * 
 * Displays currently playing anime
 * Wrapped in Layout component for consistent navigation
 */
function NowPlaying() {
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
                }}>
                    <h1 style={{
                        fontSize: '3rem',
                        background: 'linear-gradient(135deg, #B5E7FF 0%, #9DD9F3 100%)', // Pastel blue
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        marginBottom: '1rem',
                        fontWeight: '700',
                    }}>
                        Now Playing
                    </h1>
                    <p style={{
                        fontSize: '1.2rem',
                        color: '#6B7280',
                        marginTop: '1rem',
                    }}>
                        Currently playing anime will appear here
                    </p>
                </div>
            </div>
        </Layout>
    );
}

export default NowPlaying;
