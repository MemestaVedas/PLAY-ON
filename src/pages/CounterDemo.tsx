import { useState, useEffect } from 'react';
import Counter from '../components/Counter';
import { Card, SectionHeader } from '../components/UIComponents';
import colors from '../styles/colors';

function CounterDemo() {
    const [count, setCount] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCount(prev => (prev + 1) % 100);
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <SectionHeader
                title="Counter Animation Demo"
                subtitle="Watch the numbers animate smoothly"
                icon="🔢"
            />

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '2rem',
                marginBottom: '3rem',
            }}>
                {/* Auto-incrementing counter */}
                <Card>
                    <div style={{ textAlign: 'center', padding: '2rem' }}>
                        <h3 style={{ marginBottom: '1rem', color: colors.darkGray }}>
                            Auto Incrementing
                        </h3>
                        <Counter
                            value={count}
                            places={[10, 1]}
                            fontSize={80}
                            padding={10}
                            gap={8}
                            textColor={colors.pastelPurple}
                            fontWeight={900}
                            gradientHeight={0}
                        />
                        <p style={{ marginTop: '1rem', color: colors.mediumGray, fontSize: '0.9rem' }}>
                            Changes every 2 seconds
                        </p>
                    </div>
                </Card>

                {/* Manual controls */}
                <Card>
                    <div style={{ textAlign: 'center', padding: '2rem' }}>
                        <h3 style={{ marginBottom: '1rem', color: colors.darkGray }}>
                            Manual Control
                        </h3>
                        <Counter
                            value={count}
                            places={count >= 100 ? [100, 10, 1] : [10, 1]}
                            fontSize={80}
                            padding={10}
                            gap={8}
                            textColor={colors.pastelPink}
                            fontWeight={900}
                            gradientHeight={0}
                        />
                        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                            <button
                                onClick={() => setCount(prev => Math.max(0, prev - 1))}
                                style={{
                                    padding: '0.75rem 1.5rem',
                                    borderRadius: '12px',
                                    border: 'none',
                                    background: colors.pastelPink,
                                    color: colors.white,
                                    fontSize: '1.5rem',
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                }}
                            >
                                −
                            </button>
                            <button
                                onClick={() => setCount(prev => prev + 1)}
                                style={{
                                    padding: '0.75rem 1.5rem',
                                    borderRadius: '12px',
                                    border: 'none',
                                    background: colors.pastelGreen,
                                    color: colors.white,
                                    fontSize: '1.5rem',
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                }}
                            >
                                +
                            </button>
                        </div>
                    </div>
                </Card>

                {/* Different colors */}
                <Card>
                    <div style={{ textAlign: 'center', padding: '2rem' }}>
                        <h3 style={{ marginBottom: '1rem', color: colors.darkGray }}>
                            Different Styles
                        </h3>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <Counter
                                value={count}
                                places={[10, 1]}
                                fontSize={60}
                                padding={5}
                                gap={6}
                                textColor={colors.pastelBlue}
                                fontWeight={700}
                                gradientHeight={0}
                            />
                        </div>
                        <div>
                            <Counter
                                value={count * 2}
                                places={count * 2 >= 100 ? [100, 10, 1] : [10, 1]}
                                fontSize={40}
                                padding={3}
                                gap={4}
                                textColor={colors.pastelPeach}
                                fontWeight={600}
                                gradientHeight={0}
                            />
                        </div>
                    </div>
                </Card>
            </div>

            {/* Large display */}
            <Card>
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                    <h2 style={{ marginBottom: '2rem', color: colors.darkGray }}>
                        Large Counter Display
                    </h2>
                    <Counter
                        value={count}
                        places={count >= 100 ? [100, 10, 1] : [10, 1]}
                        fontSize={120}
                        padding={15}
                        gap={12}
                        textColor={colors.pastelLavender}
                        fontWeight={900}
                        gradientHeight={0}
                    />
                </div>
            </Card>
        </div>
    );
}

export default CounterDemo;
