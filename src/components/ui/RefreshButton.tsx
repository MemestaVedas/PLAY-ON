import { motion } from 'framer-motion';
import { RefreshIcon } from './Icons';

interface RefreshButtonProps {
    onClick: () => void;
    loading?: boolean;
    className?: string;
    iconSize?: number;
    title?: string;
    disabled?: boolean;
}

export default function RefreshButton({
    onClick,
    loading = false,
    className = "",
    iconSize = 20,
    title = "Refresh",
    disabled = false
}: RefreshButtonProps) {
    return (
        <motion.button
            onClick={onClick}
            disabled={loading || disabled}
            title={title}
            className={`
                p-2 rounded-full flex items-center justify-center relative
                text-white/60 hover:text-white hover:bg-white/10 transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed
                ${className}
            `}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
        >
            <motion.div
                animate={loading ? { rotate: 360 } : { rotate: 0 }}
                transition={
                    loading
                        ? {
                            repeat: Infinity,
                            ease: "linear",
                            duration: 1,
                            type: "tween" // fast spin during load
                        }
                        : {
                            type: "spring",
                            stiffness: 260,
                            damping: 20
                        }
                }
            >
                <RefreshIcon size={iconSize} />
            </motion.div>
        </motion.button>
    );
}

// Bouncy variant specifically requested ("bouncy rotating motion")
// The standard transition above is a smooth spin for loading.
// Let's make sure the "bouncy" part comes in when it *starts* or *stops* or just on hover?
// The user asked for "bouncy rotating motion".
// Usually means: Rotate 360 with a spring type when clicked or continuously?
// If it's for 'refresh in all pages', it implies the loading state.
// A continuous spring rotation isn't really possible (springs settle).
// So we'll stick to a loop for loading, but maybe the interaction (hover/click) is bouncy.
