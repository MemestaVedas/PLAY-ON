import Layout from '../components/Layout';
import { Card, SectionHeader, EmptyState } from '../components/UIComponents';

function NowPlaying() {
    // Sample currently airing anime
    const nowAiring = [
        {
            title: 'Solo Leveling',
            episode: 'Episode 9',
            airTime: 'Saturday 11:00 PM',
            nextEpisode: 'In 2 days',
            status: 'Watching'
        },
        {
            title: 'Frieren',
            episode: 'Episode 24',
            airTime: 'Friday 11:30 PM',
            nextEpisode: 'Tomorrow',
            status: 'Watching'
        },
        {
            title: 'Mashle S2',
            episode: 'Episode 6',
            airTime: 'Saturday 10:30 PM',
            nextEpisode: 'In 2 days',
            status: 'Watching'
        },
    ];

    const recentlyAired = [
        { title: 'Demon Slayer S3', episode: 'Episode 11 (Finale)', aired: '2 hours ago' },
        { title: 'Jujutsu Kaisen S2', episode: 'Episode 23 (Finale)', aired: '5 hours ago' },
        { title: 'Spy x Family S2', episode: 'Episode 12 (Finale)', aired: '1 day ago' },
    ];

    return (
        <Layout>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <SectionHeader
                    title="Now Playing"
                    subtitle="Currently airing anime you're watching"
                    icon="▶️"
                />

                {/* Airing Schedule */}
                <div style={{ marginBottom: '3rem' }}>
                    <h3 style={{
                        fontSize: '1.5rem',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '1rem',
                    }}>
                        📅 Your Airing Schedule
                    </h3>

                    {nowAiring.length > 0 ? (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
                            gap: '1.5rem',
                        }}>
                            {nowAiring.map((anime, i) => (
                                <Card key={i} hover>
                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                        {/* Thumbnail */}
                                        <div style={{
                                            width: '100px',
                                            height: '140px',
                                            borderRadius: '12px',
                                            background: 'linear-gradient(135deg, #B5E7FF 0%, #9DD9F3 100%)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '2.5rem',
                                            flexShrink: 0,
                                        }}>
                                            📺
                                        </div>

                                        {/* Info */}
                                        <div style={{ flex: 1 }}>
                                            <h4 style={{
                                                fontWeight: '600',
                                                color: '#374151',
                                                marginBottom: '0.5rem',
                                                fontSize: '1.1rem',
                                            }}>
                                                {anime.title}
                                            </h4>

                                            <div style={{
                                                fontSize: '0.9rem',
                                                color: '#6B7280',
                                                marginBottom: '0.75rem',
                                            }}>
                                                {anime.episode}
                                            </div>

                                            <div style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '0.5rem',
                                            }}>
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.5rem',
                                                    fontSize: '0.85rem',
                                                    color: '#9CA3AF',
                                                }}>
                                                    <span>🕐</span>
                                                    <span>{anime.airTime}</span>
                                                </div>

                                                <div style={{
                                                    display: 'inline-block',
                                                    padding: '0.4rem 0.75rem',
                                                    borderRadius: '8px',
                                                    background: 'rgba(134, 239, 172, 0.2)',
                                                    fontSize: '0.85rem',
                                                    color: '#15803D',
                                                    fontWeight: '600',
                                                    alignSelf: 'flex-start',
                                                }}>
                                                    Next: {anime.nextEpisode}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <EmptyState
                            icon="📺"
                            title="No airing anime"
                            description="Add currently airing anime to see them here"
                        />
                    )}
                </div>

                {/* Recently Aired */}
                <div>
                    <h3 style={{
                        fontSize: '1.5rem',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '1rem',
                    }}>
                        🆕 Recently Aired
                    </h3>

                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem',
                    }}>
                        {recentlyAired.map((anime, i) => (
                            <Card key={i} hover>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    gap: '1rem',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <div style={{
                                            width: '50px',
                                            height: '50px',
                                            borderRadius: '10px',
                                            background: 'linear-gradient(135deg, #FFB5C5 0%, #FFA8BA 100%)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '1.5rem',
                                        }}>
                                            🎬
                                        </div>

                                        <div>
                                            <div style={{
                                                fontWeight: '600',
                                                color: '#374151',
                                                marginBottom: '0.25rem',
                                            }}>
                                                {anime.title}
                                            </div>
                                            <div style={{
                                                fontSize: '0.9rem',
                                                color: '#6B7280',
                                            }}>
                                                {anime.episode}
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{
                                        fontSize: '0.85rem',
                                        color: '#9CA3AF',
                                        fontStyle: 'italic',
                                    }}>
                                        {anime.aired}
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

export default NowPlaying;
