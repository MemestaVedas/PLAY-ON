import Layout from '../components/Layout';
import MagicBento from '../components/MagicBento';
import { SectionHeader } from '../components/UIComponents';

function Statistics() {
    return (
        <Layout>
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
        </Layout>
    );
}

export default Statistics;
