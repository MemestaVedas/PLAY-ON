import MagicBento from '../components/ui/MagicBento';
import { SectionHeader } from '../components/ui/UIComponents';

function Statistics() {
    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <SectionHeader
                title="Statistics"
                subtitle="Your anime watching insights"
                icon="📊"
            />

            {/* MagicBento Grid */}
            <div style={{ marginBottom: '3rem' }}>
                <MagicBento
                    textAutoHide={true}
                    enableStars={true}
                    enableSpotlight={true}
                    enableBorderGlow={true}
                    enableTilt={true}
                    enableMagnetism={true}
                    clickEffect={true}
                    spotlightRadius={300}
                    particleCount={12}
                    glowColor="199, 184, 234"
                />
            </div>
        </div>
    );
}

export default Statistics;
