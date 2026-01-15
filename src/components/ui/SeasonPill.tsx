import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { SnowflakeIcon, FlowerIcon, SunIcon, LeafIcon } from './Icons';

type Season = 'WINTER' | 'SPRING' | 'SUMMER' | 'FALL';

interface SeasonPillProps {
    season: Season;
    label: string;
    isActive: boolean;
    onClick: () => void;
}

// Generate random particles for falling animations
const generateParticles = (count: number) => {
    return Array.from({ length: count }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 2,
        duration: 2 + Math.random() * 2,
        size: 4 + Math.random() * 4,
    }));
};

// Snowflake particle component
const Snowflake: React.FC<{ x: number; delay: number; duration: number; size: number }> = ({ x, delay, duration, size }) => (
    <motion.div
        className="absolute pointer-events-none"
        style={{
            left: `${x}%`,
            top: -8,
            fontSize: size,
            color: 'rgba(255, 255, 255, 0.8)',
        }}
        initial={{ y: 0, opacity: 0, rotate: 0 }}
        animate={{
            y: [0, 40],
            opacity: [0, 0.9, 0.9, 0],
            rotate: [0, 180],
        }}
        transition={{
            duration,
            delay,
            repeat: Infinity,
            ease: 'linear',
        }}
    >
        ❄
    </motion.div>
);

// Cherry blossom petal component
const Petal: React.FC<{ x: number; delay: number; duration: number; size: number }> = ({ x, delay, duration, size }) => (
    <motion.div
        className="absolute pointer-events-none"
        style={{
            left: `${x}%`,
            top: -8,
            fontSize: size,
            color: '#FFB7C5',
        }}
        initial={{ y: 0, opacity: 0, rotate: 0, x: 0 }}
        animate={{
            y: [0, 45],
            opacity: [0, 1, 1, 0],
            rotate: [0, 45, -30, 60],
            x: [0, 5, -5, 3],
        }}
        transition={{
            duration,
            delay,
            repeat: Infinity,
            ease: 'easeInOut',
        }}
    >
        🌸
    </motion.div>
);

// Maple leaf component
const MapleLeaf: React.FC<{ x: number; delay: number; duration: number; size: number }> = ({ x, delay, duration, size }) => (
    <motion.div
        className="absolute pointer-events-none"
        style={{
            left: `${x}%`,
            top: -8,
            fontSize: size,
            color: '#E25822',
        }}
        initial={{ y: 0, opacity: 0, rotate: 0, x: 0 }}
        animate={{
            y: [0, 45],
            opacity: [0, 1, 1, 0],
            rotate: [-20, 40, -30, 50],
            x: [0, 8, -6, 4],
        }}
        transition={{
            duration: duration * 1.2,
            delay,
            repeat: Infinity,
            ease: 'easeInOut',
        }}
    >
        🍂
    </motion.div>
);

// Season config for icons and colors
const SEASON_CONFIG: Record<Season, {
    icon: React.ReactNode;
    bgColor: string;
    borderColor: string;
    glowColor: string;
    textColor: string;
}> = {
    WINTER: {
        icon: <SnowflakeIcon size={14} />,
        bgColor: 'linear-gradient(135deg, rgba(100, 180, 255, 0.9), rgba(150, 200, 255, 0.8))',
        borderColor: 'rgba(180, 220, 255, 0.5)',
        glowColor: 'rgba(100, 180, 255, 0.6)',
        textColor: 'white',
    },
    SPRING: {
        icon: <FlowerIcon size={14} />,
        bgColor: 'linear-gradient(135deg, rgba(255, 183, 197, 0.9), rgba(255, 200, 210, 0.8))',
        borderColor: 'rgba(255, 183, 197, 0.5)',
        glowColor: 'rgba(255, 150, 170, 0.5)',
        textColor: '#4a2c3d',
    },
    SUMMER: {
        icon: <SunIcon size={14} />,
        bgColor: 'linear-gradient(135deg, rgba(255, 200, 50, 0.9), rgba(255, 180, 80, 0.85))',
        borderColor: 'rgba(255, 220, 100, 0.6)',
        glowColor: 'rgba(255, 200, 50, 0.7)',
        textColor: '#5c3d00',
    },
    FALL: {
        icon: <LeafIcon size={14} />,
        bgColor: 'linear-gradient(135deg, rgba(210, 105, 30, 0.9), rgba(180, 90, 40, 0.85))',
        borderColor: 'rgba(230, 130, 50, 0.5)',
        glowColor: 'rgba(210, 105, 30, 0.5)',
        textColor: 'white',
    },
};

export const SeasonPill: React.FC<SeasonPillProps> = ({ season, label, isActive, onClick }) => {
    const config = SEASON_CONFIG[season];
    const particles = useMemo(() => generateParticles(5), []);

    return (
        <motion.button
            onClick={onClick}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            className="relative px-5 py-2.5 rounded-full text-sm font-bold transition-all flex items-center gap-2.5 border overflow-hidden"
            style={{
                color: isActive ? config.textColor : 'rgba(255,255,255,0.6)',
                background: isActive ? config.bgColor : 'rgba(255,255,255,0.05)',
                borderColor: isActive ? config.borderColor : 'rgba(255,255,255,0.1)',
                boxShadow: isActive ? `0 0 25px ${config.glowColor}, 0 4px 15px rgba(0,0,0,0.2)` : 'none',
                minWidth: '100px',
            }}
        >
            {/* Falling particles - Winter snowflakes */}
            {isActive && season === 'WINTER' && (
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    {particles.map(p => (
                        <Snowflake key={p.id} {...p} />
                    ))}
                </div>
            )}

            {/* Falling particles - Spring petals */}
            {isActive && season === 'SPRING' && (
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    {particles.map(p => (
                        <Petal key={p.id} {...p} />
                    ))}
                </div>
            )}

            {/* Summer sunny glow pulse */}
            {isActive && season === 'SUMMER' && (
                <motion.div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        background: 'radial-gradient(circle at 50% 50%, rgba(255, 255, 200, 0.4), transparent 60%)',
                    }}
                    animate={{
                        opacity: [0.4, 0.8, 0.4],
                        scale: [1, 1.1, 1],
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                />
            )}

            {/* Falling particles - Fall maple leaves */}
            {isActive && season === 'FALL' && (
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    {particles.map(p => (
                        <MapleLeaf key={p.id} {...p} />
                    ))}
                </div>
            )}

            {/* Content */}
            <span className="relative z-10 opacity-90">{config.icon}</span>
            <span className="relative z-10">{label}</span>
        </motion.button>
    );
};

export default SeasonPill;
