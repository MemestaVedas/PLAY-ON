import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import logo from '../../assets/logo.png';

interface SplashScreenProps {
    onComplete: () => void;
    minDuration?: number;
}

/**
 * Animated Splash Screen Component
 * Shows on app startup with logo animation
 */
function SplashScreen({ onComplete, minDuration = 2000 }: SplashScreenProps) {
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        // Minimum display time for splash screen
        const timer = setTimeout(() => {
            setIsExiting(true);
        }, minDuration);

        return () => clearTimeout(timer);
    }, [minDuration]);

    const handleAnimationComplete = () => {
        if (isExiting) {
            onComplete();
        }
    };

    return (
        <AnimatePresence>
            {!isExiting && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    onAnimationComplete={handleAnimationComplete}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'linear-gradient(135deg, #0a0a12 0%, #1a1a2e 50%, #16213e 100%)',
                        zIndex: 99999,
                    }}
                >
                    {/* Logo with bounce animation */}
                    <motion.img
                        src={logo}
                        alt="PLAY-ON!"
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{
                            scale: 1,
                            rotate: 0,
                        }}
                        transition={{
                            type: 'spring',
                            stiffness: 260,
                            damping: 20,
                            duration: 0.8,
                        }}
                        style={{
                            width: '120px',
                            height: '120px',
                            marginBottom: '24px',
                            filter: 'drop-shadow(0 0 20px rgba(255, 105, 145, 0.5))',
                        }}
                    />

                    {/* Title with staggered letter animation */}
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4, duration: 0.5 }}
                        style={{
                            fontSize: '2.5rem',
                            fontWeight: '800',
                            letterSpacing: '4px',
                            background: 'linear-gradient(135deg, #ff6991 0%, #fbb9dc 50%, #a855f7 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                            marginBottom: '12px',
                            textTransform: 'uppercase',
                        }}
                    >
                        PLAY-ON!
                    </motion.h1>

                    {/* Tagline */}
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.7 }}
                        transition={{ delay: 0.7, duration: 0.5 }}
                        style={{
                            fontSize: '0.9rem',
                            color: 'rgba(255, 255, 255, 0.6)',
                            letterSpacing: '2px',
                            textTransform: 'uppercase',
                        }}
                    >
                        Your Anime & Manga Companion
                    </motion.p>

                    {/* Loading dots */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1, duration: 0.3 }}
                        style={{
                            display: 'flex',
                            gap: '8px',
                            marginTop: '40px',
                        }}
                    >
                        {[0, 1, 2].map((i) => (
                            <motion.div
                                key={i}
                                animate={{
                                    scale: [1, 1.3, 1],
                                    opacity: [0.5, 1, 0.5],
                                }}
                                transition={{
                                    duration: 0.8,
                                    repeat: Infinity,
                                    delay: i * 0.15,
                                }}
                                style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    background: '#ff6991',
                                }}
                            />
                        ))}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export default SplashScreen;
