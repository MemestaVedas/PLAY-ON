import { motion } from 'motion/react';

const Loading = ({ inline = false }: { inline?: boolean }) => {
    return (
        <div className={`${inline ? 'flex py-20' : 'fixed inset-0 z-50 flex'} items-center justify-center bg-[#0a0a0f] text-lavender-mist`}>
            <div className="flex flex-col items-center gap-6">
                {/* Rotating Tech Ring */}
                <div className="relative w-24 h-24">
                    <motion.div
                        className="absolute inset-0 rounded-full border-2 border-transparent border-t-lavender-mist border-r-lavender-mist opacity-50"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    />
                    <motion.div
                        className="absolute inset-2 rounded-full border-2 border-transparent border-b-sky-blue border-l-sky-blue opacity-50"
                        animate={{ rotate: -360 }}
                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    />
                    <motion.div
                        className="absolute inset-0 m-auto w-12 h-12 bg-white/5 rounded-full blur-md"
                        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                    />
                </div>

                {/* Text Glitch Effect */}
                <div className="flex flex-col items-center gap-1 font-mono text-xs tracking-[0.2em]">
                    <motion.span
                        animate={{ opacity: [1, 0.5, 1] }}
                        transition={{ duration: 0.2, repeat: Infinity, repeatDelay: 3 }}
                    >
                        INITIALIZING_SIGNAL
                    </motion.span>
                    <span className="text-[10px] text-white/20">PLEASE WA1T...</span>
                </div>
            </div>
        </div>
    );
};

export default Loading;
