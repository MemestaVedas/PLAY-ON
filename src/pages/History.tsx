import Layout from '../components/Layout';
import { Card, SectionHeader, EmptyState } from '../components/UIComponents';

function History() {
    // Sample history data
    const historyData = [
        {
            date: 'Today', items: [
                { anime: 'Attack on Titan', episode: 'S4 E16', duration: '24 min', time: '2:30 PM' },
                { anime: 'Demon Slayer', episode: 'S2 E8', duration: '24 min', time: '11:15 AM' },
            ]
        },
        {
            date: 'Yesterday', items: [
                { anime: 'My Hero Academia', episode: 'S5 E23', duration: '24 min', time: '8:45 PM' },
                { anime: 'Jujutsu Kaisen', episode: 'S1 E12', duration: '24 min', time: '3:20 PM' },
            ]
        },
        {
            date: '2 days ago', items: [
                { anime: 'One Piece', episode: 'E1045', duration: '24 min', time: '7:00 PM' },
            ]
        },
    ];

    return (
        <Layout>
            <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                <SectionHeader
                    title="Watch History"
                    subtitle="Your recent anime viewing activity"
                    icon="🕒"
                />

                {historyData.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        {historyData.map((day, i) => (
                            <div key={i}>
                                <h3 style={{
                                    fontSize: '1.2rem',
                                    fontWeight: '600',
                                    color: '#6B7280',
                                    marginBottom: '1rem',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                }}>
                                    {day.date}
                                </h3>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {day.items.map((item, j) => (
                                        <Card key={j} hover>
                                            <div style={{
                                                display: 'grid',
                                                gridTemplateColumns: '60px 1fr auto auto',
                                                gap: '1rem',
                                                alignItems: 'center',
                                            }}>
                                                {/* Icon */}
                                                <div style={{
                                                    width: '60px',
                                                    height: '60px',
                                                    borderRadius: '12px',
                                                    background: 'linear-gradient(135deg, #FFB5C5 0%, #FFA8BA 100%)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '1.5rem',
                                                }}>
                                                    ▶️
                                                </div>

                                                {/* Info */}
                                                <div>
                                                    <div style={{
                                                        fontWeight: '600',
                                                        color: '#374151',
                                                        marginBottom: '0.25rem',
                                                    }}>
                                                        {item.anime}
                                                    </div>
                                                    <div style={{
                                                        fontSize: '0.9rem',
                                                        color: '#6B7280',
                                                    }}>
                                                        {item.episode}
                                                    </div>
                                                </div>

                                                {/* Duration */}
                                                <div style={{
                                                    padding: '0.5rem 1rem',
                                                    borderRadius: '8px',
                                                    background: 'rgba(199, 184, 234, 0.2)',
                                                    fontSize: '0.9rem',
                                                    color: '#6B21A8',
                                                    fontWeight: '600',
                                                }}>
                                                    {item.duration}
                                                </div>

                                                {/* Time */}
                                                <div style={{
                                                    fontSize: '0.9rem',
                                                    color: '#9CA3AF',
                                                    minWidth: '80px',
                                                    textAlign: 'right',
                                                }}>
                                                    {item.time}
                                                </div>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <EmptyState
                        icon="📭"
                        title="No watch history yet"
                        description="Start watching anime to see your history here"
                    />
                )}
            </div>
        </Layout>
    );
}

export default History;
