import Layout from '../components/Layout';
import { Card, StatCard, SectionHeader } from '../components/UIComponents';

function Statistics() {
    // Sample statistics data
    const stats = {
        totalWatchTime: '248h 32m',
        episodesWatched: 1247,
        averagePerDay: '2.4 episodes',
        favoriteGenre: 'Action',
    };

    const genreData = [
        { name: 'Action', count: 45, color: '#FFB5C5' },
        { name: 'Adventure', count: 38, color: '#C7B8EA' },
        { name: 'Comedy', count: 32, color: '#A8E6CF' },
        { name: 'Drama', count: 28, color: '#FFE5B4' },
        { name: 'Fantasy', count: 25, color: '#B5E7FF' },
    ];

    const monthlyData = [
        { month: 'Jan', episodes: 45 },
        { month: 'Feb', episodes: 52 },
        { month: 'Mar', episodes: 48 },
        { month: 'Apr', episodes: 61 },
        { month: 'May', episodes: 55 },
        { month: 'Jun', episodes: 58 },
    ];

    const maxEpisodes = Math.max(...monthlyData.map(d => d.episodes));

    return (
        <Layout>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <SectionHeader
                    title="Statistics"
                    subtitle="Your anime watching insights"
                    icon="📊"
                />

                {/* Main Stats */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: '1.5rem',
                    marginBottom: '3rem',
                }}>
                    <StatCard icon="⏱️" label="Total Watch Time" value={stats.totalWatchTime} color="#C7B8EA" />
                    <StatCard icon="📺" label="Episodes Watched" value={stats.episodesWatched} color="#FFB5C5" />
                    <StatCard icon="📅" label="Average Per Day" value={stats.averagePerDay} color="#A8E6CF" />
                    <StatCard icon="⭐" label="Favorite Genre" value={stats.favoriteGenre} color="#FFE5B4" />
                </div>

                {/* Monthly Activity */}
                <div style={{ marginBottom: '3rem' }}>
                    <h3 style={{
                        fontSize: '1.5rem',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '1rem',
                    }}>
                        📈 Monthly Activity
                    </h3>

                    <Card>
                        <div style={{
                            display: 'flex',
                            alignItems: 'flex-end',
                            gap: '1rem',
                            height: '250px',
                            padding: '1rem',
                        }}>
                            {monthlyData.map((data, i) => (
                                <div key={i} style={{
                                    flex: 1,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                }}>
                                    <div style={{
                                        fontSize: '0.9rem',
                                        fontWeight: '600',
                                        color: '#6B7280',
                                    }}>
                                        {data.episodes}
                                    </div>
                                    <div style={{
                                        width: '100%',
                                        height: `${(data.episodes / maxEpisodes) * 180}px`,
                                        background: 'linear-gradient(180deg, #C7B8EA 0%, #B8A4E8 100%)',
                                        borderRadius: '8px 8px 0 0',
                                        transition: 'all 0.3s ease',
                                    }} />
                                    <div style={{
                                        fontSize: '0.85rem',
                                        color: '#9CA3AF',
                                        fontWeight: '600',
                                    }}>
                                        {data.month}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>

                {/* Genre Distribution */}
                <div>
                    <h3 style={{
                        fontSize: '1.5rem',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '1rem',
                    }}>
                        🎭 Genre Distribution
                    </h3>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                        gap: '1rem',
                    }}>
                        {genreData.map((genre, i) => (
                            <Card key={i} hover>
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.75rem',
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                    }}>
                                        <span style={{
                                            fontWeight: '600',
                                            color: '#374151',
                                        }}>
                                            {genre.name}
                                        </span>
                                        <span style={{
                                            fontSize: '1.25rem',
                                            fontWeight: '700',
                                            color: genre.color,
                                        }}>
                                            {genre.count}
                                        </span>
                                    </div>

                                    {/* Progress bar */}
                                    <div style={{
                                        width: '100%',
                                        height: '8px',
                                        background: 'rgba(200, 200, 220, 0.3)',
                                        borderRadius: '4px',
                                        overflow: 'hidden',
                                    }}>
                                        <div style={{
                                            width: `${(genre.count / genreData[0].count) * 100}%`,
                                            height: '100%',
                                            background: genre.color,
                                            transition: 'width 0.3s ease',
                                        }} />
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>
        </Layout>
    );
}

export default Statistics;
