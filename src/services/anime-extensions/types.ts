import { AnimeSource } from '../anime-sources/AnimeSource';

/**
 * Interface that all dynamic anime extensions must implement.
 * This mirrors the internal AnimeSource interface but is designed for external consumption.
 */
export interface AnimeExtension extends AnimeSource {
    /** Unique identifier for the extension (e.g., "hianime") */
    id: string;
    /** Display name (e.g., "HiAnime") */
    name: string;
    /** Version string (e.g., "1.0.0") */
    version: string;
    /** Base URL of the source */
    baseUrl: string;
    /** Language code (e.g., "en") */
    lang: string;
}

/**
 * Helper to define an extension - useful for type checking in development.
 */
export function defineAnimeExtension(ext: AnimeExtension): AnimeExtension {
    return ext;
}

// ============================================================================
// ANIME EXTENSION REPOSITORY TYPES
// ============================================================================

/**
 * Metadata for an anime extension as listed in a repository index.
 */
export interface AnimeExtensionMeta {
    id: string;
    name: string;
    type: 'anime';
    version: string;
    lang: string;
    nsfw: boolean;
    iconUrl?: string;
    /** URL to download the JS bundle */
    bundleUrl: string;
    /** Optional description */
    description?: string;
}

/**
 * Installed anime extension stored in localStorage
 */
export interface InstalledAnimeExtension {
    id: string;
    name: string;
    version: string;
    lang: string;
    nsfw: boolean;
    iconUrl?: string;
    /** The repository URL this extension was installed from */
    repoUrl: string;
    /** The bundled JavaScript code */
    bundleCode: string;
    /** Whether this extension is enabled */
    enabled: boolean;
    /** Installation timestamp */
    installedAt: number;
}
