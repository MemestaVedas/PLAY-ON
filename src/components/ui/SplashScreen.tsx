import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import logo from '../../assets/play-on-logo-new.png';
import Aurora from './Aurora';

interface SplashScreenProps {
    onComplete: () => void;
    minDuration?: number;
}

/**
 * Cinematic Splash Screen
 * "Awwwards" worthy intro with Aurora background and glassmorphism.
 */
function SplashScreen({ onComplete, minDuration = 2500 }: SplashScreenProps) {
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsExiting(true);
        }, minDuration);

        return () => clearTimeout(timer);
    }, [minDuration]);

    return (
        <AnimatePresence onExitComplete={onComplete}>
            {!isExiting && (
                <motion.div
                    key="splash"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, scale: 1.05, filter: "blur(20px)" }} // More cinematic exit
                    transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                    className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#050505] overflow-hidden"
                >
                    {/* Aurora Background Layer */}
                    <div className="absolute inset-0 z-0 opacity-40">
                        <Aurora
                            colorStops={["#7B61FF", "#E88AB3", "#5A99C2"]}
                            speed={0.5}
                            amplitude={1.2}
                        />
                    </div>

                    {/* Vignette & Grain Overlay for Texture */}
                    <div className="absolute inset-0 z-10 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,#000000_100%)] opacity-80" />

                    {/* Main Content */}
                    <motion.div
                        className="relative z-20 flex flex-col items-center"
                        initial={{ y: 20 }}
                        animate={{ y: 0 }}
                        transition={{ duration: 1, ease: "easeOut" }}
                    >
                        {/* Logo Animation */}
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0, rotate: -10 }}
                            animate={{
                                scale: 1,
                                opacity: 1,
                                rotate: 0,
                                transition: {
                                    type: "spring",
                                    stiffness: 100,
                                    damping: 20,
                                    duration: 1.5
                                }
                            }}
                            className="relative mb-8"
                        >
                            {/* Subtle Breathing Animation wrapper */}
                            <motion.div
                                animate={{ scale: [1, 1.03, 1] }}
                                transition={{
                                    duration: 4,
                                    repeat: Infinity,
                                    ease: "easeInOut",
                                    delay: 1.5
                                }}
                            >
                                <div className="absolute inset-0 bg-[#7B61FF] rounded-full blur-3xl opacity-20 animate-pulse" />
                                <img
                                    src={logo}
                                    alt="Logo"
                                    className="w-32 h-32 md:w-40 md:h-40 object-contain relative z-10 drop-shadow-[0_0_35px_rgba(123,97,255,0.4)]"
                                />
                            </motion.div>
                        </motion.div>

                        {/* Text Reveal Animation */}
                        <div className="overflow-hidden">
                            <motion.h1
                                initial={{ y: "100%", opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{
                                    delay: 0.3,
                                    duration: 0.8,
                                    ease: [0.22, 1, 0.36, 1]
                                }}
                                className="text-5xl md:text-7xl font-black text-white tracking-widest font-heavy text-center"
                                style={{
                                    textShadow: "0 0 40px rgba(123,97,255,0.3)",
                                    background: "linear-gradient(to bottom right, #fff, #a5a5a5)",
                                    WebkitBackgroundClip: "text",
                                    WebkitTextFillColor: "transparent"
                                }}
                            >
                                PLAY-ON!
                            </motion.h1>
                        </div>

                        {/* Subtitle / Loader Line */}
                        <motion.div
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: "100px", opacity: 0.5 }}
                            transition={{ delay: 0.6, duration: 1.2, ease: "circOut" }}
                            className="h-[2px] bg-white/50 mt-6 rounded-full"
                        />
                    </motion.div>

                </motion.div>
            )}
        </AnimatePresence>
    );
}

export default SplashScreen;
