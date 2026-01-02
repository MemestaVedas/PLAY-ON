import { PlayIcon, ArrowRightIcon } from '../ui/Icons';
import { motion } from 'framer-motion';

interface AnimeResumeButtonProps {
    onClick: () => void;
    folderPath: string;
}

export function AnimeResumeButton({ onClick, folderPath }: AnimeResumeButtonProps) {
    const folderName = folderPath.split(/[\\/]/).pop() || folderPath;

    return (
        <motion.button
            onClick={onClick}
            whileHover={{ scale: 1.01, borderColor: 'rgba(56, 189, 248, 0.5)' }} // Mint/Sky color
            whileTap={{ scale: 0.98 }}
            className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a1a1e] to-[#121214] border border-white/10 p-4 text-left shadow-lg"
        >
            {/* Hover Gradient */}
            <motion.div
                className="absolute inset-0 bg-gradient-to-r from-mint-tonic/10 to-transparent"
                initial={{ opacity: 0 }}
                whileHover={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
            />

            <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-4">
                    {/* Icon Box */}
                    <motion.div
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-mint-tonic/10 text-mint-tonic border border-mint-tonic/20"
                        whileHover={{ rotate: 15, scale: 1.1 }}
                        transition={{ type: "spring", stiffness: 400, damping: 10 }}
                    >
                        <PlayIcon size={20} className="fill-mint-tonic/20" />
                    </motion.div>

                    {/* Text */}
                    <div className="flex flex-col gap-0.5">
                        <span className="font-mono text-[10px] uppercase tracking-widest text-mint-tonic font-bold">
                            RESUME WATCHING
                        </span>
                        <motion.span
                            className="font-bold text-white text-lg truncate max-w-[200px] md:max-w-[300px]"
                            whileHover={{ color: '#A0E9E5', x: 2 }} // Mint Tonic color
                        >
                            {folderName}
                        </motion.span>
                    </div>
                </div>

                {/* Arrow */}
                <motion.div
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-white/5 bg-white/5 text-white/40"
                    whileHover={{
                        backgroundColor: '#A0E9E5', // Mint Tonic
                        color: '#121214',
                        borderColor: '#A0E9E5',
                        x: 5
                    }}
                >
                    <ArrowRightIcon size={16} />
                </motion.div>
            </div>
        </motion.button>
    );
}
