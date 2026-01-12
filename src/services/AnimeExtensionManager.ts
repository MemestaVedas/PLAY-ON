/**
 * ====================================================================
 * ANIME EXTENSION MANAGER
 * ====================================================================
 *
 * Manages all available anime sources.
 * Think of this as the "plugin registry" for anime in the app.
 * 
 * Supports dynamic extension loading from external repositories.
 * ====================================================================
 */

import { AnimeSource } from './anime-sources/AnimeSource';
import { AnimeLoader } from './anime-extensions/AnimeLoader';
import { HiAnimeExtension } from '../extensions/hianime';

import { GogoAnimeExtension } from '../extensions/gogoanime';
import { AnimePaheExtension } from '../extensions/animepahe';

class AnimeExtensionManagerClass {
    private sources: Map<string, AnimeSource> = new Map();
    private initialized: boolean = false;

    /**
     * Initialize the anime extension manager - must be called before using sources
     */
    async initialize(): Promise<void> {
        if (this.initialized) return;

        console.log('[AnimeExtensionManager] Initializing...');

        // Register built-in extensions
        this.registerSource(HiAnimeExtension);
        this.registerSource(GogoAnimeExtension);
        this.registerSource(AnimePaheExtension);

        // Initialize the loader (loads extensions from storage)
        await AnimeLoader.initialize();

        // Register all loaded extensions
        const extensions = AnimeLoader.getExtensions();
        extensions.forEach(ext => this.registerSource(ext));

        this.initialized = true;
        console.log(`[AnimeExtensionManager] Ready with ${this.sources.size} sources`);
    }

    /**
     * Register a source with the manager.
     */
    registerSource(source: AnimeSource): void {
        if (this.sources.has(source.id)) {
            console.warn(`Source with id '${source.id}' already registered. Skipping.`);
            return;
        }
        this.sources.set(source.id, source);
        console.log(`[AnimeExtensionManager] Registered source: ${source.name}`);
    }

    /**
     * Unregister a source.
     */
    unregisterSource(id: string): boolean {
        const deleted = this.sources.delete(id);
        if (deleted) {
            console.log(`[AnimeExtensionManager] Unregistered source: ${id}`);
        }
        return deleted;
    }

    /**
     * Reload all extensions from storage
     */
    async reload(): Promise<void> {
        console.log('[AnimeExtensionManager] Reloading extensions...');
        this.sources.clear();
        this.initialized = false;

        // Re-register built-in extensions
        this.registerSource(HiAnimeExtension);

        await AnimeLoader.reload();

        const extensions = AnimeLoader.getExtensions();
        extensions.forEach(ext => this.registerSource(ext));

        this.initialized = true;
        console.log(`[AnimeExtensionManager] Reloaded with ${this.sources.size} sources`);
    }

    /**
     * Get a source by its ID.
     */
    getSource(id: string): AnimeSource | undefined {
        return this.sources.get(id);
    }

    /**
     * Get all registered sources.
     */
    getAllSources(): AnimeSource[] {
        return Array.from(this.sources.values());
    }

    /**
     * Get sources by language.
     */
    getSourcesByLang(lang: string): AnimeSource[] {
        return this.getAllSources().filter((s) => s.lang === lang);
    }

    /**
     * Check if a source is registered.
     */
    hasSource(id: string): boolean {
        return this.sources.has(id);
    }

    /**
     * Check if manager is initialized
     */
    isInitialized(): boolean {
        return this.initialized;
    }
}

// Singleton instance
export const AnimeExtensionManager = new AnimeExtensionManagerClass();

// Re-export types for convenience
export type { AnimeSource, Anime, Episode, EpisodeSources, VideoSource, AnimeSearchResult } from './anime-sources/AnimeSource';
