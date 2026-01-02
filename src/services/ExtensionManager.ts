/**
 * ====================================================================
 * EXTENSION MANAGER
 * ====================================================================
 *
 * Manages all available manga sources.
 * Think of this as the "plugin registry" for the app.
 *
 * Future features:
 * - Loading external extensions from URLs (like Mihon repos)
 * - Enabling/disabling sources
 * - Source-specific settings
 * ====================================================================
 */

import { MangaSource } from './sources/Source';
import { ExtensionLoader } from './extensions/loader';

class ExtensionManagerClass {
    private sources: Map<string, MangaSource> = new Map();

    constructor() {
        // Register built-in sources

        // Load dynamic extensions
        const extensions = ExtensionLoader.getExtensions();
        extensions.forEach(ext => this.registerSource(ext));
    }

    /**
     * Register a source with the manager.
     */
    registerSource(source: MangaSource): void {
        if (this.sources.has(source.id)) {
            console.warn(`Source with id '${source.id}' already registered. Skipping.`);
            return;
        }
        this.sources.set(source.id, source);
        console.log(`[ExtensionManager] Registered source: ${source.name}`);
    }

    /**
     * Get a source by its ID.
     */
    getSource(id: string): MangaSource | undefined {
        return this.sources.get(id);
    }

    /**
     * Get all registered sources.
     */
    getAllSources(): MangaSource[] {
        return Array.from(this.sources.values());
    }

    /**
     * Get sources by language.
     */
    getSourcesByLang(lang: string): MangaSource[] {
        return this.getAllSources().filter((s) => s.lang === lang);
    }

    /**
     * Check if a source is registered.
     */
    hasSource(id: string): boolean {
        return this.sources.has(id);
    }

    /**
     * Unregister a source.
     */
    unregisterSource(id: string): boolean {
        return this.sources.delete(id);
    }
}

// Singleton instance
export const ExtensionManager = new ExtensionManagerClass();

// Re-export types for convenience
export type { MangaSource, Manga, Chapter, Page, SearchFilter, SearchResult } from './sources/Source';

