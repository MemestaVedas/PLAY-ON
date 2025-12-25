import { useParams, useNavigate } from 'react-router-dom';
import { Card, SectionHeader } from '../components/UIComponents';

function AnimeDetails() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    // Sample anime data (in real app, fetch based on ID)
    const anime = {
        title: 'Attack on Titan',
        japaneseTitle: '進撃の巨人',
        episodes: 75,
        status: 'Watching',
        progress: 50,
        score: 9.1,
        genres: ['Action', 'Drama', 'Fantasy', 'Military'],
        studio: 'MAPPA',
        year: 2013,
        synopsis: 'Centuries ago, mankind was slaughtered to near extinction by monstrous humanoid creatures called Titans, forcing humans to hide in fear behind enormous concentric walls.',
    };

    const episodes = [
        { number: 1, title: 'To You, in 2000 Years', watched: true, duration: '24m' },
        { number: 2, title: 'That Day', watched: true, duration: '24m' },
        { number: 3, title: 'A Dim Light Amid Despair', watched: true, duration: '24m' },
        { number: 4, title: 'The Night of the Closing Ceremony', watched: false, duration: '24m' },
        { number: 5, title: 'First Battle', watched: false, duration: '24m' },
    ];

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            {/* Back Button */}
            <button
                onClick={() => navigate('/anime-list')}
                style={{
                    padding: '0.75rem 1.5rem',
                    borderRadius: '12px',
                    border: '1px solid rgba(200, 200, 220, 0.4)',
                    background: 'rgba(255, 255, 255, 0.9)',
                    color: '#6B7280',
                    fontSize: '1rem',
                    cursor: 'pointer',
                    marginBottom: '2rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                }}
            >
                ← Back to List
            </button>

            {/* Header Section */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: '300px 1fr',
                gap: '2rem',
                marginBottom: '3rem',
            }}>
                {/* Poster */}
                <div style={{
                    width: '100%',
                    height: '420px',
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, #E0BBE4 0%, #C7B8EA 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '5rem',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
                }}>
                    🎬
                </div>

                {/* Info */}
                <div>
                    <h1 style={{
                        fontSize: '2.5rem',
                        fontWeight: '700',
                        color: '#374151',
                        marginBottom: '0.5rem',
                    }}>
                        {anime.title}
                    </h1>

                    <p style={{
                        fontSize: '1.1rem',
                        color: '#9CA3AF',
                        marginBottom: '1.5rem',
                    }}>
                        {anime.japaneseTitle}
                    </p>

                    {/* Stats */}
                    <div style={{
                        display: 'flex',
                        gap: '2rem',
                        marginBottom: '2rem',
                        flexWrap: 'wrap',
                    }}>
                        <div>
                            <div style={{ fontSize: '0.85rem', color: '#9CA3AF', marginBottom: '0.25rem' }}>
                                Score
                            </div>
                            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#C7B8EA' }}>
                                ⭐ {anime.score}
                            </div>
                        </div>

                        <div>
                            <div style={{ fontSize: '0.85rem', color: '#9CA3AF', marginBottom: '0.25rem' }}>
                                Episodes
                            </div>
                            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#374151' }}>
                                {anime.episodes}
                            </div>
                        </div>

                        <div>
                            <div style={{ fontSize: '0.85rem', color: '#9CA3AF', marginBottom: '0.25rem' }}>
                                Progress
                            </div>
                            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#86EFAC' }}>
                                {anime.progress}%
                            </div>
                        </div>
                    </div>

                    {/* Genres */}
                    <div style={{ marginBottom: '2rem' }}>
                        <div style={{ fontSize: '0.85rem', color: '#9CA3AF', marginBottom: '0.75rem' }}>
                            Genres
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {anime.genres.map((genre, i) => (
                                <span
                                    key={i}
                                    style={{
                                        padding: '0.5rem 1rem',
                                        borderRadius: '12px',
                                        background: 'rgba(199, 184, 234, 0.2)',
                                        color: '#6B21A8',
                                        fontSize: '0.9rem',
                                        fontWeight: '600',
                                    }}
                                >
                                    {genre}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Synopsis */}
                    <div>
                        <div style={{ fontSize: '0.85rem', color: '#9CA3AF', marginBottom: '0.75rem' }}>
                            Synopsis
                        </div>
                        <p style={{
                            fontSize: '1rem',
                            color: '#6B7280',
                            lineHeight: '1.6',
                        }}>
                            {anime.synopsis}
                        </p>
                    </div>
                </div>
            </div>

            {/* Episodes Section */}
            <div>
                <h3 style={{
                    fontSize: '1.5rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '1rem',
                }}>
                    📺 Episodes
                </h3>

                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                }}>
                    {episodes.map((episode) => (
                        <Card key={episode.number} hover>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: '60px 1fr auto auto',
                                gap: '1rem',
                                alignItems: 'center',
                            }}>
                                {/* Episode Number */}
                                <div style={{
                                    width: '60px',
                                    height: '60px',
                                    borderRadius: '12px',
                                    background: episode.watched
                                        ? 'linear-gradient(135deg, #86EFAC 0%, #6EE7B7 100%)'
                                        : 'linear-gradient(135deg, #E5E7EB 0%, #D1D5DB 100%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '1.25rem',
                                    fontWeight: '700',
                                    color: episode.watched ? '#15803D' : '#6B7280',
                                }}>
                                    {episode.number}
                                </div>

                                {/* Title */}
                                <div>
                                    <div style={{
                                        fontWeight: '600',
                                        color: '#374151',
                                        marginBottom: '0.25rem',
                                    }}>
                                        {episode.title}
                                    </div>
                                    <div style={{
                                        fontSize: '0.85rem',
                                        color: '#9CA3AF',
                                    }}>
                                        Episode {episode.number}
                                    </div>
                                </div>

                                {/* Duration */}
                                <div style={{
                                    fontSize: '0.9rem',
                                    color: '#6B7280',
                                }}>
                                    {episode.duration}
                                </div>

                                {/* Status */}
                                <div style={{
                                    padding: '0.5rem 1rem',
                                    borderRadius: '8px',
                                    background: episode.watched
                                        ? 'rgba(134, 239, 172, 0.2)'
                                        : 'rgba(229, 231, 235, 0.5)',
                                    fontSize: '0.85rem',
                                    color: episode.watched ? '#15803D' : '#6B7280',
                                    fontWeight: '600',
                                }}>
                                    {episode.watched ? '✓ Watched' : 'Not Watched'}
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default AnimeDetails;
