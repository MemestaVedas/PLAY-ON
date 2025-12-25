import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Card, StatCard, SectionHeader } from '../components/ui/UIComponents';
import BounceCards from '../components/ui/BounceCards';
// Premium generated mock images
const PLACEHOLDER_IMAGES = [
    '/brain/d4275da3-9954-484c-802f-296cee8f613a/anime_mock_1_1766681754438.png',
    '/brain/d4275da3-9954-484c-802f-296cee8f613a/anime_mock_2_1766682269853.png',
    '/brain/d4275da3-9954-484c-802f-296cee8f613a/anime_mock_3_1766682294612.png',
    '/brain/d4275da3-9954-484c-802f-296cee8f613a/anime_mock_4_1766682324192.png',
    '/brain/d4275da3-9954-484c-802f-296cee8f613a/anime_mock_5_1766682347429.png',
];

function Home() {
    const [mediaWindow, setMediaWindow] = useState<string>('Loading...');
    const [error, setError] = useState<string | null>(null);

    const coverImages = PLACEHOLDER_IMAGES;
    const animeLoading = false;

    const transformStyles = [
        "rotate(5deg) translate(-150px)",
        "rotate(0deg) translate(-70px)",
        "rotate(-5deg)",
        "rotate(5deg) translate(70px)",
        "rotate(-5deg) translate(150px)"
    ];

    useEffect(() => {
        const fetchMediaWindow = async () => {
            try {
                const result = await invoke<string>('get_active_media_window');
                setMediaWindow(result);
                setError(null);
            } catch (err) {
                console.error('Error fetching media window:', err);
                setError('Failed to get media window');
            }
        };

        fetchMediaWindow();
        const interval = setInterval(fetchMediaWindow, 2000);
        return () => clearInterval(interval);
    }, []);

    const isNoMedia = mediaWindow === 'No media playing' || mediaWindow === 'No active window';

    return (
        <>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <SectionHeader
                    title="Dashboard"
                    subtitle="Track your anime watching activity"
                    icon="🏠"
                />

                {/* Stats Grid */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '1.5rem',
                    marginBottom: '2rem',
                }}>
                    <StatCard icon="📺" label="Total Anime" value={24} color="#C7B8EA" />
                    <StatCard icon="✅" label="Completed" value={12} color="#86EFAC" />
                    <StatCard icon="▶️" label="Watching" value={8} color="#FFB5C5" />
                    <StatCard icon="⏸️" label="On Hold" value={4} color="#FFE5B4" />
                </div>

                {/* BounceCards Section */}
                <div style={{
                    marginBottom: '2rem',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    minHeight: '250px',
                }}>
                    {animeLoading ? (
                        <p style={{ color: '#9CA3AF' }}>Loading anime covers...</p>
                    ) : coverImages.length > 0 ? (
                        <BounceCards
                            className="custom-bounceCards"
                            images={coverImages}
                            containerWidth={500}
                            containerHeight={250}
                            animationDelay={1}
                            animationStagger={0.08}
                            easeType="elastic.out(1, 0.5)"
                            transformStyles={transformStyles}
                            enableHover={true}
                        />
                    ) : (
                        <p style={{ color: '#9CA3AF' }}>
                            Loading anime covers...
                        </p>
                    )}
                </div>

                {/* Currently Playing Section */}
                <div style={{ marginBottom: '2rem' }}>
                    <h3 style={{
                        fontSize: '1.5rem',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '1rem',
                    }}>
                        🎬 Now Playing
                    </h3>

                    <Card gradient={isNoMedia
                        ? 'linear-gradient(135deg, rgba(156, 163, 175, 0.1) 0%, rgba(107, 114, 128, 0.1) 100%)'
                        : 'linear-gradient(135deg, rgba(199, 184, 234, 0.1) 0%, rgba(184, 164, 232, 0.1) 100%)'
                    }>
                        <div style={{ textAlign: 'center', padding: '2rem' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
                                {isNoMedia ? '⏸️' : '▶️'}
                            </div>

                            {error ? (
                                <p style={{ fontSize: '1.1rem', color: '#EF4444', fontFamily: 'monospace' }}>
                                    {error}
                                </p>
                            ) : (
                                <>
                                    <p style={{
                                        fontSize: '1.1rem',
                                        color: isNoMedia ? '#9CA3AF' : '#374151',
                                        fontFamily: 'monospace',
                                        fontStyle: isNoMedia ? 'italic' : 'normal',
                                        marginBottom: '1rem',
                                    }}>
                                        {mediaWindow}
                                    </p>

                                    {!isNoMedia && (
                                        <div style={{
                                            display: 'inline-block',
                                            padding: '0.5rem 1rem',
                                            background: 'rgba(134, 239, 172, 0.3)',
                                            borderRadius: '12px',
                                            border: '1px solid rgba(134, 239, 172, 0.5)',
                                        }}>
                                            <span style={{ fontSize: '0.9rem', color: '#15803D', fontWeight: '600' }}>
                                                ✓ Media player detected
                                            </span>
                                        </div>
                                    )}
                                </>
                            )}

                            <p style={{
                                fontSize: '0.85rem',
                                color: '#9CA3AF',
                                marginTop: '1rem',
                                fontStyle: 'italic',
                            }}>
                                Updates every 2 seconds • Filters non-media windows
                            </p>
                        </div>
                    </Card>
                </div>

                {/* Recent Activity */}
                <div>
                    <h3 style={{
                        fontSize: '1.5rem',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '1rem',
                    }}>
                        📊 Recent Activity
                    </h3>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                        gap: '1rem',
                    }}>
                        {[
                            { title: 'Attack on Titan S4', episode: 'Episode 16', time: '2 hours ago' },
                            { title: 'Demon Slayer', episode: 'Episode 8', time: '1 day ago' },
                            { title: 'My Hero Academia', episode: 'Episode 23', time: '2 days ago' },
                        ].map((item, i) => (
                            <Card key={i} hover>
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                    <div style={{
                                        width: '60px',
                                        height: '60px',
                                        borderRadius: '12px',
                                        background: 'linear-gradient(135deg, #E0BBE4 0%, #C7B8EA 100%)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '1.5rem',
                                    }}>
                                        📺
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: '600', color: '#374151', marginBottom: '0.25rem' }}>
                                            {item.title}
                                        </div>
                                        <div style={{ fontSize: '0.9rem', color: '#6B7280' }}>
                                            {item.episode}
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: '#9CA3AF', marginTop: '0.25rem' }}>
                                            {item.time}
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
}

export default Home;
