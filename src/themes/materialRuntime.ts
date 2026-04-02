import {
    Hct,
    SchemeTonalSpot,
    hexFromArgb,
    sourceColorFromImage,
} from '@material/material-color-utilities';

export type ThemeFamily = 'classic' | 'material-you-3';

export interface MaterialRuntimeTokens {
    primary: string;
    onPrimary: string;
    primaryContainer: string;
    onPrimaryContainer: string;
    secondary: string;
    onSecondary: string;
    secondaryContainer: string;
    onSecondaryContainer: string;
    tertiary: string;
    onTertiary: string;
    tertiaryContainer: string;
    onTertiaryContainer: string;
    surface: string;
    onSurface: string;
    surfaceVariant: string;
    onSurfaceVariant: string;
    surfaceContainerLowest: string;
    surfaceContainerLow: string;
    surfaceContainer: string;
    surfaceContainerHigh: string;
    surfaceContainerHighest: string;
    outline: string;
    outlineVariant: string;
    error: string;
    onError: string;
    errorContainer: string;
    onErrorContainer: string;
    sourceColor: string;
}

const RUNTIME_VARIABLES = [
    '--md-sys-color-primary',
    '--md-sys-color-on-primary',
    '--md-sys-color-primary-container',
    '--md-sys-color-on-primary-container',
    '--md-sys-color-secondary',
    '--md-sys-color-on-secondary',
    '--md-sys-color-secondary-container',
    '--md-sys-color-on-secondary-container',
    '--md-sys-color-tertiary',
    '--md-sys-color-on-tertiary',
    '--md-sys-color-tertiary-container',
    '--md-sys-color-on-tertiary-container',
    '--md-sys-color-surface',
    '--md-sys-color-on-surface',
    '--md-sys-color-surface-variant',
    '--md-sys-color-on-surface-variant',
    '--md-sys-color-surface-container-lowest',
    '--md-sys-color-surface-container-low',
    '--md-sys-color-surface-container',
    '--md-sys-color-surface-container-high',
    '--md-sys-color-surface-container-highest',
    '--md-sys-color-outline',
    '--md-sys-color-outline-variant',
    '--md-sys-color-error',
    '--md-sys-color-on-error',
    '--md-sys-color-error-container',
    '--md-sys-color-on-error-container',
    '--theme-bg-main',
    '--theme-bg-content',
    '--theme-bg-card',
    '--theme-bg-glass',
    '--theme-bg-glass-hover',
    '--theme-bg-overlay',
    '--theme-zen-black',
    '--theme-zen-gray',
    '--theme-zen-surface-low',
    '--theme-zen-surface-high',
    '--theme-text-main',
    '--theme-text-muted',
    '--theme-text-highlight',
    '--theme-text-inverse',
    '--theme-accent-primary',
    '--theme-accent-primary-rgb',
    '--theme-accent-primary-hover',
    '--theme-accent-primary-muted',
    '--theme-accent-secondary',
    '--theme-accent-secondary-rgb',
    '--theme-accent-secondary-hover',
    '--theme-accent-secondary-muted',
    '--theme-accent-tertiary',
    '--theme-accent-tertiary-rgb',
    '--theme-accent-tertiary-muted',
    '--theme-accent-success',
    '--theme-accent-success-rgb',
    '--theme-accent-success-muted',
    '--theme-accent-warning',
    '--theme-accent-warning-rgb',
    '--theme-accent-warning-muted',
    '--theme-accent-danger',
    '--theme-accent-danger-rgb',
    '--theme-accent-danger-muted',
    '--theme-accent-danger-strong',
    '--theme-accent-info',
    '--theme-accent-info-rgb',
    '--theme-accent-info-muted',
    '--theme-border-subtle',
    '--theme-border-highlight',
    '--theme-border-accent',
    '--theme-border-accent-strong',
    '--theme-shadow-glow',
    '--theme-shadow-button',
    '--theme-gradient-primary',
    '--theme-gradient-secondary',
    '--theme-gradient-bg-mesh',
    '--theme-selection-bg',
    '--theme-selection-text',
    '--theme-focus-ring',
    '--color-lavender',
    '--color-lavender-mist',
    '--color-sky-blue',
    '--color-soft-peach',
    '--color-mint-tonic',
    '--color-star-glow',
    '--color-zen-accent',
] as const;

const sourceColorCache = new Map<string, number>();
const MAX_CACHE_SIZE = 40;

function clampSeedHex(color: string): string {
    const normalized = color.trim();
    if (/^#[0-9A-Fa-f]{6}$/.test(normalized)) {
        return normalized;
    }
    return '#B4A2F6';
}

function hexToRgbTuple(hex: string): string {
    const clean = hex.replace('#', '');
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    return `${r}, ${g}, ${b}`;
}

function rgba(hex: string, alpha: number): string {
    return `rgba(${hexToRgbTuple(hex)}, ${alpha})`;
}

export function seedIntFromHex(seedHex: string): number {
    const normalized = clampSeedHex(seedHex).replace('#', '');
    return Number.parseInt(`FF${normalized}`, 16);
}

export function buildMaterialRuntimeTokens(
    seedColorInt: number,
    isDark: boolean,
): MaterialRuntimeTokens {
    const scheme = new SchemeTonalSpot(Hct.fromInt(seedColorInt), isDark, 0.0);

    if (isDark) {
        return {
            primary: hexFromArgb(scheme.primaryPalette.tone(80)),
            onPrimary: hexFromArgb(scheme.primaryPalette.tone(20)),
            primaryContainer: hexFromArgb(scheme.primaryPalette.tone(30)),
            onPrimaryContainer: hexFromArgb(scheme.primaryPalette.tone(90)),
            secondary: hexFromArgb(scheme.secondaryPalette.tone(80)),
            onSecondary: hexFromArgb(scheme.secondaryPalette.tone(20)),
            secondaryContainer: hexFromArgb(scheme.secondaryPalette.tone(30)),
            onSecondaryContainer: hexFromArgb(scheme.secondaryPalette.tone(90)),
            tertiary: hexFromArgb(scheme.tertiaryPalette.tone(80)),
            onTertiary: hexFromArgb(scheme.tertiaryPalette.tone(20)),
            tertiaryContainer: hexFromArgb(scheme.tertiaryPalette.tone(30)),
            onTertiaryContainer: hexFromArgb(scheme.tertiaryPalette.tone(90)),
            surface: hexFromArgb(scheme.neutralPalette.tone(6)),
            onSurface: hexFromArgb(scheme.neutralPalette.tone(90)),
            surfaceVariant: hexFromArgb(scheme.neutralVariantPalette.tone(30)),
            onSurfaceVariant: hexFromArgb(scheme.neutralVariantPalette.tone(80)),
            surfaceContainerLowest: hexFromArgb(scheme.neutralPalette.tone(4)),
            surfaceContainerLow: hexFromArgb(scheme.neutralPalette.tone(10)),
            surfaceContainer: hexFromArgb(scheme.neutralPalette.tone(12)),
            surfaceContainerHigh: hexFromArgb(scheme.neutralPalette.tone(17)),
            surfaceContainerHighest: hexFromArgb(scheme.neutralPalette.tone(22)),
            outline: hexFromArgb(scheme.neutralVariantPalette.tone(60)),
            outlineVariant: hexFromArgb(scheme.neutralVariantPalette.tone(30)),
            error: hexFromArgb(scheme.errorPalette.tone(80)),
            onError: hexFromArgb(scheme.errorPalette.tone(20)),
            errorContainer: hexFromArgb(scheme.errorPalette.tone(30)),
            onErrorContainer: hexFromArgb(scheme.errorPalette.tone(90)),
            sourceColor: hexFromArgb(seedColorInt),
        };
    }

    return {
        primary: hexFromArgb(scheme.primaryPalette.tone(40)),
        onPrimary: hexFromArgb(scheme.primaryPalette.tone(100)),
        primaryContainer: hexFromArgb(scheme.primaryPalette.tone(90)),
        onPrimaryContainer: hexFromArgb(scheme.primaryPalette.tone(10)),
        secondary: hexFromArgb(scheme.secondaryPalette.tone(40)),
        onSecondary: hexFromArgb(scheme.secondaryPalette.tone(100)),
        secondaryContainer: hexFromArgb(scheme.secondaryPalette.tone(90)),
        onSecondaryContainer: hexFromArgb(scheme.secondaryPalette.tone(10)),
        tertiary: hexFromArgb(scheme.tertiaryPalette.tone(40)),
        onTertiary: hexFromArgb(scheme.tertiaryPalette.tone(100)),
        tertiaryContainer: hexFromArgb(scheme.tertiaryPalette.tone(90)),
        onTertiaryContainer: hexFromArgb(scheme.tertiaryPalette.tone(10)),
        surface: hexFromArgb(scheme.neutralPalette.tone(98)),
        onSurface: hexFromArgb(scheme.neutralPalette.tone(10)),
        surfaceVariant: hexFromArgb(scheme.neutralVariantPalette.tone(90)),
        onSurfaceVariant: hexFromArgb(scheme.neutralVariantPalette.tone(30)),
        surfaceContainerLowest: hexFromArgb(scheme.neutralPalette.tone(100)),
        surfaceContainerLow: hexFromArgb(scheme.neutralPalette.tone(96)),
        surfaceContainer: hexFromArgb(scheme.neutralPalette.tone(94)),
        surfaceContainerHigh: hexFromArgb(scheme.neutralPalette.tone(92)),
        surfaceContainerHighest: hexFromArgb(scheme.neutralPalette.tone(90)),
        outline: hexFromArgb(scheme.neutralVariantPalette.tone(50)),
        outlineVariant: hexFromArgb(scheme.neutralVariantPalette.tone(80)),
        error: hexFromArgb(scheme.errorPalette.tone(40)),
        onError: hexFromArgb(scheme.errorPalette.tone(100)),
        errorContainer: hexFromArgb(scheme.errorPalette.tone(90)),
        onErrorContainer: hexFromArgb(scheme.errorPalette.tone(10)),
        sourceColor: hexFromArgb(seedColorInt),
    };
}

export async function extractSourceColorFromImage(imageUrl: string): Promise<number> {
    if (sourceColorCache.has(imageUrl)) {
        return sourceColorCache.get(imageUrl)!;
    }

    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = imageUrl;

    await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Unable to load image for dynamic color extraction'));
    });

    const sourceColor = await sourceColorFromImage(img);

    if (sourceColorCache.size >= MAX_CACHE_SIZE) {
        const oldest = sourceColorCache.keys().next().value;
        if (oldest) {
            sourceColorCache.delete(oldest);
        }
    }
    sourceColorCache.set(imageUrl, sourceColor);

    img.src = '';
    return sourceColor;
}

export function clearMaterialRuntimeVariables(): void {
    const root = document.documentElement;
    RUNTIME_VARIABLES.forEach((property) => {
        root.style.removeProperty(property);
    });
}

export function applyMaterialRuntimeVariables(tokens: MaterialRuntimeTokens, isDark: boolean): void {
    const root = document.documentElement;

    root.style.setProperty('--md-sys-color-primary', tokens.primary);
    root.style.setProperty('--md-sys-color-on-primary', tokens.onPrimary);
    root.style.setProperty('--md-sys-color-primary-container', tokens.primaryContainer);
    root.style.setProperty('--md-sys-color-on-primary-container', tokens.onPrimaryContainer);
    root.style.setProperty('--md-sys-color-secondary', tokens.secondary);
    root.style.setProperty('--md-sys-color-on-secondary', tokens.onSecondary);
    root.style.setProperty('--md-sys-color-secondary-container', tokens.secondaryContainer);
    root.style.setProperty('--md-sys-color-on-secondary-container', tokens.onSecondaryContainer);
    root.style.setProperty('--md-sys-color-tertiary', tokens.tertiary);
    root.style.setProperty('--md-sys-color-on-tertiary', tokens.onTertiary);
    root.style.setProperty('--md-sys-color-tertiary-container', tokens.tertiaryContainer);
    root.style.setProperty('--md-sys-color-on-tertiary-container', tokens.onTertiaryContainer);
    root.style.setProperty('--md-sys-color-surface', tokens.surface);
    root.style.setProperty('--md-sys-color-on-surface', tokens.onSurface);
    root.style.setProperty('--md-sys-color-surface-variant', tokens.surfaceVariant);
    root.style.setProperty('--md-sys-color-on-surface-variant', tokens.onSurfaceVariant);
    root.style.setProperty('--md-sys-color-surface-container-lowest', tokens.surfaceContainerLowest);
    root.style.setProperty('--md-sys-color-surface-container-low', tokens.surfaceContainerLow);
    root.style.setProperty('--md-sys-color-surface-container', tokens.surfaceContainer);
    root.style.setProperty('--md-sys-color-surface-container-high', tokens.surfaceContainerHigh);
    root.style.setProperty('--md-sys-color-surface-container-highest', tokens.surfaceContainerHighest);
    root.style.setProperty('--md-sys-color-outline', tokens.outline);
    root.style.setProperty('--md-sys-color-outline-variant', tokens.outlineVariant);
    root.style.setProperty('--md-sys-color-error', tokens.error);
    root.style.setProperty('--md-sys-color-on-error', tokens.onError);
    root.style.setProperty('--md-sys-color-error-container', tokens.errorContainer);
    root.style.setProperty('--md-sys-color-on-error-container', tokens.onErrorContainer);

    root.style.setProperty('--theme-bg-main', tokens.surface);
    root.style.setProperty('--theme-bg-content', rgba(tokens.surfaceContainer, isDark ? 0.72 : 0.92));
    root.style.setProperty('--theme-bg-card', tokens.surfaceContainerHigh);
    root.style.setProperty('--theme-bg-glass', rgba(tokens.surfaceContainerHigh, isDark ? 0.78 : 0.88));
    root.style.setProperty('--theme-bg-glass-hover', rgba(tokens.onSurface, isDark ? 0.08 : 0.05));
    root.style.setProperty('--theme-bg-overlay', isDark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0.18)');

    root.style.setProperty('--theme-zen-black', tokens.surfaceContainerLowest);
    root.style.setProperty('--theme-zen-gray', tokens.surfaceContainerHigh);
    root.style.setProperty('--theme-zen-surface-low', tokens.surfaceContainerLow);
    root.style.setProperty('--theme-zen-surface-high', tokens.surfaceContainerHighest);

    root.style.setProperty('--theme-text-main', tokens.onSurface);
    root.style.setProperty('--theme-text-muted', tokens.onSurfaceVariant);
    root.style.setProperty('--theme-text-highlight', tokens.primary);
    root.style.setProperty('--theme-text-inverse', tokens.onPrimary);

    root.style.setProperty('--theme-accent-primary', tokens.primary);
    root.style.setProperty('--theme-accent-primary-rgb', hexToRgbTuple(tokens.primary));
    root.style.setProperty('--theme-accent-primary-hover', tokens.primaryContainer);
    root.style.setProperty('--theme-accent-primary-muted', rgba(tokens.primary, 0.16));

    root.style.setProperty('--theme-accent-secondary', tokens.secondary);
    root.style.setProperty('--theme-accent-secondary-rgb', hexToRgbTuple(tokens.secondary));
    root.style.setProperty('--theme-accent-secondary-hover', tokens.secondaryContainer);
    root.style.setProperty('--theme-accent-secondary-muted', rgba(tokens.secondary, 0.15));

    root.style.setProperty('--theme-accent-tertiary', tokens.tertiary);
    root.style.setProperty('--theme-accent-tertiary-rgb', hexToRgbTuple(tokens.tertiary));
    root.style.setProperty('--theme-accent-tertiary-muted', rgba(tokens.tertiary, 0.15));

    root.style.setProperty('--theme-accent-success', tokens.tertiary);
    root.style.setProperty('--theme-accent-success-rgb', hexToRgbTuple(tokens.tertiary));
    root.style.setProperty('--theme-accent-success-muted', rgba(tokens.tertiary, 0.15));
    root.style.setProperty('--theme-accent-warning', tokens.secondary);
    root.style.setProperty('--theme-accent-warning-rgb', hexToRgbTuple(tokens.secondary));
    root.style.setProperty('--theme-accent-warning-muted', rgba(tokens.secondary, 0.15));
    root.style.setProperty('--theme-accent-danger', tokens.error);
    root.style.setProperty('--theme-accent-danger-rgb', hexToRgbTuple(tokens.error));
    root.style.setProperty('--theme-accent-danger-muted', rgba(tokens.error, 0.15));
    root.style.setProperty('--theme-accent-danger-strong', tokens.errorContainer);
    root.style.setProperty('--theme-accent-info', tokens.primary);
    root.style.setProperty('--theme-accent-info-rgb', hexToRgbTuple(tokens.primary));
    root.style.setProperty('--theme-accent-info-muted', rgba(tokens.primary, 0.15));

    root.style.setProperty('--theme-border-subtle', rgba(tokens.outlineVariant, isDark ? 0.45 : 0.3));
    root.style.setProperty('--theme-border-highlight', rgba(tokens.outline, isDark ? 0.5 : 0.4));
    root.style.setProperty('--theme-border-accent', rgba(tokens.primary, 0.3));
    root.style.setProperty('--theme-border-accent-strong', rgba(tokens.primary, 0.5));

    root.style.setProperty('--theme-shadow-glow', `0 0 20px ${rgba(tokens.primary, 0.2)}`);
    root.style.setProperty('--theme-shadow-button', `0 4px 15px ${rgba(tokens.primary, 0.25)}`);

    root.style.setProperty('--theme-gradient-primary', `linear-gradient(135deg, ${tokens.primary} 0%, ${tokens.secondary} 100%)`);
    root.style.setProperty('--theme-gradient-secondary', `linear-gradient(135deg, ${tokens.secondary} 0%, ${tokens.tertiary} 100%)`);
    root.style.setProperty('--theme-gradient-bg-mesh', `radial-gradient(ellipse at top, ${rgba(tokens.primary, 0.14)} 0%, transparent 52%)`);

    root.style.setProperty('--theme-selection-bg', rgba(tokens.primary, 0.3));
    root.style.setProperty('--theme-selection-text', tokens.onPrimary);
    root.style.setProperty('--theme-focus-ring', `0 0 0 2px ${rgba(tokens.primary, 0.45)}`);

    // Legacy aliases used throughout older screens.
    root.style.setProperty('--color-lavender', tokens.primary);
    root.style.setProperty('--color-lavender-mist', tokens.primary);
    root.style.setProperty('--color-sky-blue', tokens.secondary);
    root.style.setProperty('--color-soft-peach', tokens.tertiary);
    root.style.setProperty('--color-mint-tonic', tokens.tertiary);
    root.style.setProperty('--color-star-glow', tokens.secondary);
    root.style.setProperty('--color-zen-accent', tokens.primary);
}
