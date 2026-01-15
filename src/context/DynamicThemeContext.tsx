import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface DynamicThemeContextType {
    /** URL of the cover image for ambient background */
    coverImageUrl: string | null;
    /** Set the cover image URL for dynamic theming */
    setCoverImage: (url: string | null) => void;
    /** Clear the dynamic theme (reset to default) */
    clearTheme: () => void;
}

const DynamicThemeContext = createContext<DynamicThemeContextType>({
    coverImageUrl: null,
    setCoverImage: () => { },
    clearTheme: () => { }
});

interface DynamicThemeProviderProps {
    children: ReactNode;
}

/**
 * Provides dynamic theme tinting based on content cover art.
 * Uses a heavily blurred version of the cover image as an ambient background.
 */
export function DynamicThemeProvider({ children }: DynamicThemeProviderProps) {
    const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);

    const setCoverImage = useCallback((url: string | null) => {
        setCoverImageUrl(url);
    }, []);

    const clearTheme = useCallback(() => {
        setCoverImageUrl(null);
    }, []);

    return (
        <DynamicThemeContext.Provider value={{ coverImageUrl, setCoverImage, clearTheme }}>
            {/* Dynamic Ambient Background - Blurred cover art creates immersive atmosphere */}
            {coverImageUrl && (
                <>
                    {/* Main blurred image layer */}
                    <div
                        aria-hidden="true"
                        className="dynamic-theme-image"
                        style={{
                            position: 'fixed',
                            top: '-50%',
                            left: '-25%',
                            width: '150%',
                            height: '100%',
                            pointerEvents: 'none',
                            zIndex: 0,
                            backgroundImage: `url(${coverImageUrl})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center top',
                            backgroundRepeat: 'no-repeat',
                            filter: 'blur(80px) saturate(1.5)',
                            opacity: 0.35,
                            transform: 'scale(1.2)',
                            transition: 'opacity 0.8s ease-out, background-image 0.8s ease-out'
                        }}
                    />
                    {/* Gradient fade overlay for smooth blending */}
                    <div
                        aria-hidden="true"
                        className="dynamic-theme-fade"
                        style={{
                            position: 'fixed',
                            inset: 0,
                            pointerEvents: 'none',
                            zIndex: 0,
                            background: `
                                linear-gradient(to bottom, 
                                    transparent 0%, 
                                    var(--theme-bg-main) 60%,
                                    var(--theme-bg-main) 100%
                                )
                            `,
                            transition: 'opacity 0.8s ease-out'
                        }}
                    />
                </>
            )}
            {children}
        </DynamicThemeContext.Provider>
    );
}

/**
 * Hook to access and control the dynamic theme.
 */
export function useDynamicTheme() {
    const context = useContext(DynamicThemeContext);
    if (!context) {
        throw new Error('useDynamicTheme must be used within a DynamicThemeProvider');
    }
    return context;
}

export default DynamicThemeProvider;
