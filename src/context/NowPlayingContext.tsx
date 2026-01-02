import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

/**
 * Represents a manually triggered anime session
 * Used when opening a video from a linked folder
 */
export interface ManualAnimeSession {
    anilistId: number;
    animeName: string;
    coverImage?: string;
    episode: number;
    filePath: string;
    startedAt: number;
}

interface NowPlayingContextType {
    manualSession: ManualAnimeSession | null;
    startManualSession: (session: Omit<ManualAnimeSession, 'startedAt'>) => void;
    clearManualSession: () => void;
}

const NowPlayingContext = createContext<NowPlayingContextType | undefined>(undefined);

export function NowPlayingProvider({ children }: { children: ReactNode }) {
    const [manualSession, setManualSession] = useState<ManualAnimeSession | null>(null);

    const startManualSession = useCallback((session: Omit<ManualAnimeSession, 'startedAt'>) => {
        console.log('[NowPlayingContext] Starting manual session:', session.animeName, 'Ep', session.episode);
        setManualSession({
            ...session,
            startedAt: Date.now()
        });
    }, []);

    const clearManualSession = useCallback(() => {
        setManualSession(null);
    }, []);

    return (
        <NowPlayingContext.Provider value={{ manualSession, startManualSession, clearManualSession }}>
            {children}
        </NowPlayingContext.Provider>
    );
}

export function useNowPlaying(): NowPlayingContextType {
    const context = useContext(NowPlayingContext);
    // Return safe defaults when used outside provider (e.g., in App.tsx before provider mounts)
    if (context === undefined) {
        return {
            manualSession: null,
            startManualSession: () => { },
            clearManualSession: () => { }
        };
    }
    return context;
}
