import { Card, AnimeCard, SectionHeader } from '../components/ui/UIComponents';

function Seasons() {
    const seasons = [
        {
            name: 'Winter 2024',
            anime: [
                { id: 1, title: 'Solo Leveling', episodes: 12, status: 'Watching', progress: 75 },
                { id: 2, title: 'Frieren', episodes: 28, status: 'Watching', progress: 60 },
                { id: 3, title: 'Mashle S2', episodes: 12, status: 'Watching', progress: 50 },
            ]
        },
        {
            name: 'Fall 2023',
            anime: [
                { id: 4, title: 'Spy x Family S2', episodes: 12, status: 'Completed', progress: 100 },
                { id: 5, title: 'Jujutsu Kaisen S2', episodes: 23, status: 'Completed', progress: 100 },
                { id: 6, title: 'Goblin Slayer II', episodes: 12, status: 'Watching', progress: 83 },
            ]
        },
    ];

    return (
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
            <SectionHeader
                title="Seasonal Anime"
                subtitle="Discover anime by season"
                icon="🌸"
            />

            {/* Season Selector */}
            <div style={{
                display: 'flex',
                gap: '1rem',
                marginBottom: '2rem',
                flexWrap: 'wrap',
            }}>
                {['Winter 2024', 'Fall 2023', 'Summer 2023', 'Spring 2023'].map((season, i) => (
                    <button
                        key={i}
                        style={{
                            padding: '0.75rem 1.5rem',
                            borderRadius: '12px',
                            border: i === 0 ? '2px solid #C7B8EA' : '1px solid rgba(200, 200, 220, 0.4)',
                            background: i === 0 ? 'rgba(199, 184, 234, 0.1)' : 'rgba(255, 255, 255, 0.9)',
                            color: i === 0 ? '#6B21A8' : '#6B7280',
                            fontSize: '1rem',
                            fontWeight: i === 0 ? '600' : '500',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                        }}
                    >
                        {season}
                    </button>
                ))}
            </div>

            {/* Seasons List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
                {seasons.map((season, i) => (
                    <div key={i}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem',
                            marginBottom: '1.5rem',
                        }}>
                            <h3 style={{
                                fontSize: '1.5rem',
                                fontWeight: '600',
                                color: '#374151',
                            }}>
                                {season.name}
                            </h3>
                            <div style={{
                                padding: '0.25rem 0.75rem',
                                borderRadius: '12px',
                                background: 'rgba(199, 184, 234, 0.2)',
                                fontSize: '0.85rem',
                                color: '#6B21A8',
                                fontWeight: '600',
                            }}>
                                {season.anime.length} anime
                            </div>
                        </div>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                            gap: '1.5rem',
                        }}>
                            {season.anime.map((anime) => (
                                <AnimeCard
                                    key={anime.id}
                                    title={anime.title}
                                    episodes={anime.episodes}
                                    status={anime.status}
                                    progress={anime.progress}
                                    onClick={() => console.log(`Clicked ${anime.title}`)}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Upcoming Section */}
            <div style={{ marginTop: '3rem' }}>
                <h3 style={{
                    fontSize: '1.5rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '1rem',
                }}>
                    🔜 Coming Soon
                </h3>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                    gap: '1rem',
                }}>
                    {[
                        { title: 'Demon Slayer S4', date: 'Spring 2024', studio: 'ufotable' },
                        { title: 'My Hero Academia S7', date: 'Spring 2024', studio: 'Bones' },
                        { title: 'Overlord V', date: 'Summer 2024', studio: 'Madhouse' },
                    ].map((anime, i) => (
                        <Card key={i} hover>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <div style={{
                                    width: '80px',
                                    height: '80px',
                                    borderRadius: '12px',
                                    background: 'linear-gradient(135deg, #B5E7FF 0%, #9DD9F3 100%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '2rem',
                                }}>
                                    📅
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{
                                        fontWeight: '600',
                                        color: '#374151',
                                        marginBottom: '0.5rem',
                                    }}>
                                        {anime.title}
                                    </div>
                                    <div style={{
                                        fontSize: '0.9rem',
                                        color: '#6B7280',
                                        marginBottom: '0.25rem',
                                    }}>
                                        {anime.date}
                                    </div>
                                    <div style={{
                                        fontSize: '0.85rem',
                                        color: '#9CA3AF',
                                    }}>
                                        Studio: {anime.studio}
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default Seasons;
