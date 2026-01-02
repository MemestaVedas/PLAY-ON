import { MangaSource } from '../sources/Source';

/**
 * Interface that all dynamic extensions must implement.
 * This mirrors the internal MangaSource interface but is designed for external consumption.
 */
export interface Extension extends MangaSource {
    /** Unique identifier for the extension (e.g., "weebcentral") */
    id: string;
    /** Display name (e.g., "WeebCentral") */
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
export function defineExtension(ext: Extension): Extension {
    return ext;
}
