import Layout from '../components/Layout';

/**
 * History Page
 * 
 * Displays user's watch history
 * Wrapped in Layout component for consistent navigation
 */
function History() {
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
                        background: 'linear-gradient(135deg, #FFB5C5 0%, #FFA8BA 100%)', // Pastel pink
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        marginBottom: '1rem',
                        fontWeight: '700',
                    }}>
                        History
                    </h1>
                    <p style={{
                        fontSize: '1.2rem',
                        color: '#6B7280',
                        marginTop: '1rem',
                    }}>
                        Your watch history will appear here
                    </p>
                </div>
            </div>
        </Layout>
    );
}

export default History;
