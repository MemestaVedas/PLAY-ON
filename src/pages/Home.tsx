import Layout from '../components/Layout';

/**
 * Home Component
 * 
 * PURPOSE: The main landing page after onboarding
 * 
 * NAVIGATION:
 * Now handled by PillNav component in Layout
 * No need for individual navigation buttons on each page
 */
function Home() {
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
                        fontSize: '4rem',
                        background: 'linear-gradient(135deg, #C7B8EA 0%, #B8A4E8 100%)', // Pastel purple
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        marginBottom: '1rem',
                        fontWeight: '700',
                    }}>
                        Home Page
                    </h1>
                    <p style={{
                        fontSize: '1.2rem',
                        color: '#6B7280',
                        marginTop: '1rem',
                    }}>
                        Welcome to PLAY-ON! Use the navigation bar above to explore.
                    </p>
                </div>
            </div>
        </Layout>
    );
}

export default Home;
