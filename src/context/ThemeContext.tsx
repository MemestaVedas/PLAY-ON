import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { AVAILABLE_THEMES } from '../themes';
import { useDynamicTheme } from './DynamicThemeContext';
import {
    applyMaterialRuntimeVariables,
    buildMaterialRuntimeTokens,
    clearMaterialRuntimeVariables,
    extractSourceColorFromImage,
    seedIntFromHex,
} from '../themes/materialRuntime';

type ThemeId = typeof AVAILABLE_THEMES[number]['id'];
type DynamicColorSource = 'manual' | 'cover-art';
type ThemeFamilyMode = 'classic' | 'material-you-3';

interface ThemeRuntimeState {
    theme: ThemeId;
    themeFamily: ThemeFamilyMode;
    dynamicColorEnabled: boolean;
    dynamicColorSource: DynamicColorSource;
    seedColor: string;
}

interface ThemeContextType {
    /** Current theme ID */
    theme: ThemeId;
    /** Set the active theme */
    setTheme: (themeId: ThemeId) => void;
    /** Toggle between dark and light themes */
    toggleTheme: () => void;
    /** Whether current theme is dark mode */
    isDark: boolean;
    /** List of available themes */
    availableThemes: typeof AVAILABLE_THEMES;
    /** Active runtime family for theme token generation */
    themeFamily: ThemeFamilyMode;
    /** Enable/disable runtime material token overrides */
    dynamicColorEnabled: boolean;
    /** Source for runtime seed generation */
    dynamicColorSource: DynamicColorSource;
    /** User-defined seed color */
    seedColor: string;
    /** Update active runtime family */
    setThemeFamily: (family: ThemeFamilyMode) => void;
    /** Toggle runtime material token generation */
    setDynamicColorEnabled: (enabled: boolean) => void;
    /** Set where runtime seed should come from */
    setDynamicColorSource: (source: DynamicColorSource) => void;
    /** Set manual seed color used by runtime generation */
    setSeedColor: (hex: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const LEGACY_THEME_STORAGE_KEY = 'playon-theme';
const RUNTIME_STORAGE_KEY = 'playon-theme-runtime';
const DEFAULT_THEME: ThemeId = 'default-dark';
const DEFAULT_RUNTIME_STATE: Omit<ThemeRuntimeState, 'theme'> = {
    themeFamily: 'classic',
    dynamicColorEnabled: false,
    dynamicColorSource: 'manual',
    seedColor: '#B4A2F6',
};

/**
 * Apply theme to the document
 */
function applyTheme(themeId: ThemeId): void {
    const root = document.documentElement;
    root.setAttribute('data-theme', themeId);

    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    const isDark = themeId.includes('dark') || themeId === 'default-dark';
    const themeColor = isDark ? '#0c0c0e' : '#f5f5f7';

    if (metaThemeColor) {
        metaThemeColor.setAttribute('content', themeColor);
    }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const { coverImageUrl } = useDynamicTheme();
    const [theme, setThemeState] = useState<ThemeId>(DEFAULT_THEME);
    const [themeFamily, setThemeFamilyState] = useState<ThemeFamilyMode>(DEFAULT_RUNTIME_STATE.themeFamily);
    const [dynamicColorEnabled, setDynamicColorEnabledState] = useState<boolean>(DEFAULT_RUNTIME_STATE.dynamicColorEnabled);
    const [dynamicColorSource, setDynamicColorSourceState] = useState<DynamicColorSource>(DEFAULT_RUNTIME_STATE.dynamicColorSource);
    const [seedColor, setSeedColorState] = useState<string>(DEFAULT_RUNTIME_STATE.seedColor);

    useEffect(() => {
        const stored = localStorage.getItem(RUNTIME_STORAGE_KEY);

        if (stored) {
            try {
                const parsed = JSON.parse(stored) as Partial<ThemeRuntimeState>;
                if (parsed.theme && AVAILABLE_THEMES.some((candidate) => candidate.id === parsed.theme)) {
                    setThemeState(parsed.theme);
                } else {
                    const legacyTheme = localStorage.getItem(LEGACY_THEME_STORAGE_KEY) as ThemeId | null;
                    if (legacyTheme && AVAILABLE_THEMES.some((candidate) => candidate.id === legacyTheme)) {
                        setThemeState(legacyTheme);
                    } else if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches) {
                        setThemeState('light');
                    }
                }

                if (parsed.themeFamily === 'classic' || parsed.themeFamily === 'material-you-3') {
                    setThemeFamilyState(parsed.themeFamily);
                }

                if (typeof parsed.dynamicColorEnabled === 'boolean') {
                    setDynamicColorEnabledState(parsed.dynamicColorEnabled);
                }

                if (parsed.dynamicColorSource === 'manual' || parsed.dynamicColorSource === 'cover-art') {
                    setDynamicColorSourceState(parsed.dynamicColorSource);
                }

                if (typeof parsed.seedColor === 'string') {
                    setSeedColorState(parsed.seedColor);
                }
            } catch (error) {
                console.error('Failed to read theme runtime settings:', error);
            }
            return;
        }

        const legacyTheme = localStorage.getItem(LEGACY_THEME_STORAGE_KEY) as ThemeId | null;
        if (legacyTheme && AVAILABLE_THEMES.some((candidate) => candidate.id === legacyTheme)) {
            setThemeState(legacyTheme);
        } else if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches) {
            setThemeState('light');
        }
    }, []);

    const isDark = theme.includes('dark') || theme === 'default-dark';

    // Apply theme on mount and when it changes
    useEffect(() => {
        applyTheme(theme);
    }, [theme]);

    useEffect(() => {
        localStorage.setItem(RUNTIME_STORAGE_KEY, JSON.stringify({
            theme,
            themeFamily,
            dynamicColorEnabled,
            dynamicColorSource,
            seedColor,
        } satisfies ThemeRuntimeState));
        localStorage.setItem(LEGACY_THEME_STORAGE_KEY, theme);
    }, [theme, themeFamily, dynamicColorEnabled, dynamicColorSource, seedColor]);

    useEffect(() => {
        let active = true;

        const runMaterialRuntime = async () => {
            if (themeFamily === 'classic' || !dynamicColorEnabled) {
                clearMaterialRuntimeVariables();
                return;
            }

            let sourceSeed = seedIntFromHex(seedColor);

            if (dynamicColorSource === 'cover-art' && coverImageUrl) {
                try {
                    sourceSeed = await extractSourceColorFromImage(coverImageUrl);
                } catch (error) {
                    console.error('Failed to extract dynamic cover color. Falling back to manual seed.', error);
                }
            }

            if (!active) {
                return;
            }

            const tokens = buildMaterialRuntimeTokens(sourceSeed, isDark);
            applyMaterialRuntimeVariables(tokens, isDark);
        };

        runMaterialRuntime();

        return () => {
            active = false;
        };
    }, [themeFamily, dynamicColorEnabled, dynamicColorSource, seedColor, coverImageUrl, isDark]);

    // Listen for system theme changes
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        const handleChange = (e: MediaQueryListEvent) => {
            // Only auto-switch if user hasn't explicitly set a preference
            const stored = localStorage.getItem(RUNTIME_STORAGE_KEY);
            if (!stored) {
                setThemeState(e.matches ? 'default-dark' : 'light');
            }
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    const setTheme = useCallback((themeId: ThemeId) => {
        setThemeState(themeId);
    }, []);

    const setThemeFamily = useCallback((family: ThemeFamilyMode) => {
        setThemeFamilyState(family);
    }, []);

    const setDynamicColorEnabled = useCallback((enabled: boolean) => {
        setDynamicColorEnabledState(enabled);
    }, []);

    const setDynamicColorSource = useCallback((source: DynamicColorSource) => {
        setDynamicColorSourceState(source);
    }, []);

    const setSeedColor = useCallback((hex: string) => {
        setSeedColorState(hex);
    }, []);

    const toggleTheme = useCallback(() => {
        const newTheme: ThemeId = isDark ? 'light' : 'default-dark';
        setTheme(newTheme);
    }, [isDark, setTheme]);

    return (
        <ThemeContext.Provider
            value={{
                theme,
                setTheme,
                toggleTheme,
                isDark,
                availableThemes: AVAILABLE_THEMES,
                themeFamily,
                dynamicColorEnabled,
                dynamicColorSource,
                seedColor,
                setThemeFamily,
                setDynamicColorEnabled,
                setDynamicColorSource,
                setSeedColor,
            }}
        >
            {children}
        </ThemeContext.Provider>
    );
}

/**
 * Hook to access theme context
 */
export function useTheme(): ThemeContextType {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}

export default ThemeContext;
