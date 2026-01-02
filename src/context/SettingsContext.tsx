import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// ============================================================================
// SETTINGS CONTEXT
// Manages all application settings with localStorage persistence
// ============================================================================

export interface Settings {
    // General
    theme: 'light' | 'dark';
    defaultPage: 'home' | 'anime-list' | 'manga-list';

    // Player
    autoPlay: boolean;
    subtitleLanguage: string;

    // Integrations
    discordRpcEnabled: boolean;
    discordPrivacyLevel: 'full' | 'minimal' | 'hidden';
    anilistAutoSync: boolean;

    // Storage
    scanDepth: number;
    ignoredTerms: string[];

    // Advanced
    developerMode: boolean;
}

const DEFAULT_SETTINGS: Settings = {
    // General
    theme: 'dark',
    defaultPage: 'home',

    // Player
    autoPlay: true,
    subtitleLanguage: 'English',

    // Integrations
    discordRpcEnabled: true,
    discordPrivacyLevel: 'full',
    anilistAutoSync: true,

    // Storage
    scanDepth: 3,
    ignoredTerms: ['SAMPLE', 'Creditless', 'NCOP', 'NCED', 'Preview'],

    // Advanced
    developerMode: false,
};

interface SettingsContextType {
    settings: Settings;
    updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
    updateSettings: (updates: Partial<Settings>) => void;
    resetSettings: () => void;
    clearCache: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const STORAGE_KEY = 'app-settings';

export function SettingsProvider({ children }: { children: React.ReactNode }) {
    const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
    const [isLoaded, setIsLoaded] = useState(false);

    // Load settings from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // Merge with defaults to handle new settings added in updates
                setSettings({ ...DEFAULT_SETTINGS, ...parsed });
            } catch (e) {
                console.error('Failed to parse saved settings:', e);
            }
        }
        setIsLoaded(true);
    }, []);

    // Apply theme when settings change
    useEffect(() => {
        if (!isLoaded) return;

        // Apply theme to document
        // FORCED DARK MODE: User requested removal of white theme option.
        document.documentElement.setAttribute('data-theme', 'dark');

        // No longer manually setting properties here; handled by CSS variables in App.css based on [data-theme]
    }, [settings.theme, isLoaded]);

    // Save to localStorage when settings change
    useEffect(() => {
        if (!isLoaded) return;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    }, [settings, isLoaded]);

    const updateSetting = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    }, []);

    const updateSettings = useCallback((updates: Partial<Settings>) => {
        setSettings(prev => ({ ...prev, ...updates }));
    }, []);

    const resetSettings = useCallback(() => {
        setSettings(DEFAULT_SETTINGS);
        localStorage.removeItem(STORAGE_KEY);
    }, []);

    const clearCache = useCallback(async () => {
        // Clear Apollo cache if available
        try {
            const { apolloClient } = await import('../lib/apollo');
            await apolloClient.clearStore();
        } catch (e) {
            console.error('Failed to clear Apollo cache:', e);
        }

        // Clear any cached images (localStorage entries that look like cache)
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.startsWith('cache-') || key.startsWith('image-'))) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));

        console.log('Cache cleared successfully');
    }, []);

    const value: SettingsContextType = {
        settings,
        updateSetting,
        updateSettings,
        resetSettings,
        clearCache,
    };

    return (
        <SettingsContext.Provider value={value}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
}

export { DEFAULT_SETTINGS };
