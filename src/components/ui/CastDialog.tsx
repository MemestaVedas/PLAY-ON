import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { motion, AnimatePresence } from 'framer-motion';
import { XIcon, RotateCwIcon } from './Icons';

// Simple Cast Icon
export const CastIcon = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
    <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 16.1A5 5 0 0 1 5.9 20M2 12.05A9 9 0 0 1 9.95 20M2 8V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6" />
        <line x1="2" y1="20" x2="2.01" y2="20" />
    </svg>
);

interface CastDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConnect: (deviceName: string) => void;
}

export function CastDialog({ isOpen, onClose, onConnect }: CastDialogProps) {
    const [devices, setDevices] = useState<string[]>([]);
    const [scanning, setScanning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [connecting, setConnecting] = useState<string | null>(null);

    const scanDevices = async () => {
        setScanning(true);
        setError(null);
        try {
            const list = await invoke<string[]>('cast_discover');
            setDevices(list);
            if (list.length === 0) {
                setError("No devices found. Make sure your device is on the same network.");
            }
        } catch (err) {
            console.error(err);
            setError("Failed to scan for devices.");
        } finally {
            setScanning(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            scanDevices();
        }
    }, [isOpen]);

    const handleConnect = async (device: string) => {
        setConnecting(device);
        try {
            await onConnect(device);
            onClose();
        } catch (err) {
            console.error(err);
            setError(`Failed to connect to ${device}`);
        } finally {
            setConnecting(null);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    onClick={onClose}
                />

                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 10 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 10 }}
                    className="relative w-full max-w-md bg-[#121214] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-white/5 bg-white/5">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <CastIcon size={20} className="text-lavender-mist" />
                            Cast to Device
                        </h3>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/10 rounded-full text-white/60 hover:text-white transition-colors"
                        >
                            <XIcon size={18} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-4 min-h-[200px] max-h-[400px] overflow-y-auto custom-scrollbar">
                        {scanning ? (
                            <div className="flex flex-col items-center justify-center py-8 gap-3 text-white/40">
                                <RotateCwIcon className="animate-spin" size={32} />
                                <span className="text-sm font-mono">Scanning for devices...</span>
                            </div>
                        ) : error ? (
                            <div className="text-center py-8 text-red-400">
                                <p className="mb-4">{error}</p>
                                <button
                                    onClick={scanDevices}
                                    className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-white/80 transition-colors"
                                >
                                    Try Again
                                </button>
                            </div>
                        ) : devices.length === 0 ? (
                            <div className="text-center py-8 text-white/40">
                                <p>No Chromecast devices found.</p>
                                <button
                                    onClick={scanDevices}
                                    className="mt-4 text-lavender-mist hover:underline text-sm"
                                >
                                    Refresh
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2">
                                {devices.map(device => (
                                    <button
                                        key={device}
                                        onClick={() => handleConnect(device)}
                                        disabled={!!connecting}
                                        className="flex items-center gap-3 w-full p-4 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10 transition-all group text-left"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-lavender-mist/10 flex items-center justify-center text-lavender-mist group-hover:scale-110 transition-transform">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <rect x="2" y="4" width="20" height="16" rx="2" />
                                                <path d="M12 16v4" />
                                                <path d="M8 20h8" />
                                            </svg>
                                        </div>
                                        <div className="flex-1">
                                            <span className="block font-medium text-white group-hover:text-lavender-mist transition-colors">
                                                {device}
                                            </span>
                                            <span className="text-xs text-white/40">Google Cast</span>
                                        </div>
                                        {connecting === device && (
                                            <RotateCwIcon className="animate-spin text-lavender-mist" size={16} />
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}

// Add these icons if needed or import them
// Assuming Icons.tsx exist based on prev files
