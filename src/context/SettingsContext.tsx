import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// ============================================================================
// SETTINGS CONTEXT
// Manages all application settings with localStorage persistence
// ============================================================================

// Keyboard shortcut action IDs
export type ShortcutAction =
    | 'searchAnime'
    | 'searchManga'
    | 'goHome'
    | 'goAnimeList'
    | 'goMangaList'
    | 'goSettings'
    | 'goProfile'
    | 'goBack'
    | 'escape';

export interface Settings {
    // General
    theme: 'light' | 'dark';
    defaultPage: 'home' | 'anime-list' | 'manga-list';
    defaultSearchMode: 'anime' | 'manga';

    // Player
    autoPlay: boolean;
    subtitleLanguage: string;

    // Integrations
    discordRpcEnabled: boolean;
    discordPrivacyLevel: 'full' | 'minimal' | 'hidden';
    anilistAutoSync: boolean;

    // Window Behavior
    closeToTray: boolean; // When true, close button minimizes to tray; when false, quits app
    startMinimized: boolean; // When true, app starts minimized to tray

    // Storage
    scanDepth: number;
    ignoredTerms: string[];
    mangaDownloadPath: string;
    downloadFolderPromptShown: boolean;

    // Manga Reading
    defaultChapterSort: 'asc' | 'desc';

    // Advanced
    developerMode: boolean;

    // Keyboard Shortcuts
    keyboardShortcuts: Record<ShortcutAction, string>;
}

export const DEFAULT_KEYBOARD_SHORTCUTS: Record<ShortcutAction, string> = {
    searchAnime: 'Ctrl+A',
    searchManga: 'Ctrl+M',
    goHome: 'Ctrl+H',
    goAnimeList: 'Ctrl+Shift+A',
    goMangaList: 'Ctrl+Shift+M',
    goSettings: 'Ctrl+,',
    goProfile: 'Ctrl+P',
    goBack: 'Ctrl+Backspace',
    escape: 'Escape',
};

const DEFAULT_SETTINGS: Settings = {
    // General
    theme: 'dark',
    defaultPage: 'home',
    defaultSearchMode: 'anime',

    // Player
    autoPlay: true,
    subtitleLanguage: 'English',

    // Integrations
    discordRpcEnabled: true,
    discordPrivacyLevel: 'full',
    anilistAutoSync: true,

    // Window Behavior
    closeToTray: true, // Default: minimize to tray on close
    startMinimized: false, // Default: show window on startup

    // Storage
    scanDepth: 3,
    ignoredTerms: ['SAMPLE', 'Creditless', 'NCOP', 'NCED', 'Preview'],
    mangaDownloadPath: '',
    downloadFolderPromptShown: false,

    // Manga Reading
    defaultChapterSort: 'desc',

    // Advanced
    developerMode: false,

    // Keyboard Shortcuts
    keyboardShortcuts: { ...DEFAULT_KEYBOARD_SHORTCUTS },
};

interface SettingsContextType {
    settings: Settings;
    updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
    updateSettings: (updates: Partial<Settings>) => void;
    resetSettings: () => void;
    clearCache: () => Promise<void>;
    factoryReset: () => Promise<void>;
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

                // Deep merge keyboardShortcuts to ensure new shortcuts (like goProfile) are added
                // even if the user has saved settings from a previous version
                const mergedShortcuts = {
                    ...DEFAULT_SETTINGS.keyboardShortcuts,
                    ...(parsed.keyboardShortcuts || {})
                };

                // Merge with defaults to handle new settings added in updates
                setSettings({
                    ...DEFAULT_SETTINGS,
                    ...parsed,
                    keyboardShortcuts: mergedShortcuts
                });
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

    const factoryReset = useCallback(async () => {
        // Clear all local storage
        localStorage.clear();

        // Clear Apollo cache
        try {
            const { apolloClient } = await import('../lib/apollo');
            await apolloClient.clearStore();
        } catch (e) {
            console.error('Failed to clear Apollo cache:', e);
        }

        // Reload the application to reset all state
        try {
            const { relaunch } = await import('@tauri-apps/plugin-process');
            await relaunch();
        } catch (e) {
            console.error("Failed to relaunch, falling back to reload", e);
            window.location.reload();
        }
    }, []);

    const value = React.useMemo<SettingsContextType>(() => ({
        settings,
        updateSetting,
        updateSettings,
        resetSettings,
        clearCache,
        factoryReset,
    }), [settings, updateSetting, updateSettings, resetSettings, clearCache, factoryReset]);

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
