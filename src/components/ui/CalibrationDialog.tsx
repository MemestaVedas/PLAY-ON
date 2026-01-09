import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckIcon, SettingsIcon } from './Icons';

interface CalibrationDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (value: number) => void;
    initialValue: number;
    mediaType?: 'ANIME' | 'MANGA';
    isLoading?: boolean;
}

export function CalibrationDialog({ isOpen, onClose, onConfirm, initialValue, mediaType = 'ANIME', isLoading = false }: CalibrationDialogProps) {
    const [value, setValue] = useState<string>('');

    useEffect(() => {
        if (isOpen) {
            setValue(initialValue.toString());
        }
    }, [isOpen, initialValue]);

    const handleSubmit = () => {
        const num = parseInt(value);
        if (!isNaN(num)) {
            onConfirm(num);
            onClose();
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="relative bg-[#15151e] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl overflow-hidden"
                    >
                        {/* Glow Effect */}
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-mint-tonic/50 to-transparent opacity-50" />

                        <div className="flex flex-col items-center">
                            <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-4 text-white/50">
                                <SettingsIcon size={24} />
                            </div>

                            <h3 className="text-lg font-bold text-white mb-1">
                                Calibrate Progress
                            </h3>
                            <p className="text-sm text-white/40 text-center mb-6">
                                Set your current {mediaType === 'MANGA' ? 'chapter' : 'episode'} manually.
                            </p>

                            <input
                                type="number"
                                value={value}
                                onChange={(e) => setValue(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSubmit();
                                    if (e.key === 'Escape' && !isLoading) onClose();
                                }}
                                autoFocus
                                disabled={isLoading}
                                className="w-24 bg-white/5 border border-white/10 rounded-lg py-2 text-center text-xl font-bold text-white outline-none focus:border-mint-tonic/50 focus:bg-white/10 transition-colors mb-6 disabled:opacity-50"
                                placeholder="#"
                            />

                            <p className="text-xs text-white/30 text-center mb-6 -mt-4 font-medium">
                                Type or scroll to adjust
                            </p>

                            <div className="flex gap-3 w-full">
                                <button
                                    onClick={onClose}
                                    disabled={isLoading}
                                    className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white/60 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-all disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={isLoading}
                                    className="flex-1 py-2.5 rounded-xl text-sm font-bold text-[#0a0a0f] bg-mint-tonic hover:brightness-110 transition-all shadow-lg shadow-mint-tonic/20 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? (
                                        <>
                                            <span className="animate-spin w-4 h-4 border-2 border-black/20 border-t-black rounded-full" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <CheckIcon size={16} strokeWidth={3} />
                                            Update
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
