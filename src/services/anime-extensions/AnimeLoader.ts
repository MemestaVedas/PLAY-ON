/**
 * ====================================================================
 * ANIME EXTENSION LOADER
 * ====================================================================
 * 
 * Dynamically loads installed anime extensions from AnimeExtensionStorage.
 * Executes bundled JavaScript to create AnimeSource instances.
 * 
 * This uses the same pattern as the manga extension loader.
 * ====================================================================
 */

import { AnimeExtension } from './types';
import { AnimeExtensionStorage } from './AnimeExtensionStorage';
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';

// Production fix: Ensure we have a valid fetch function
const getFetch = () => {
    if (typeof tauriFetch === 'function') return tauriFetch;
    if (typeof window !== 'undefined' && window.fetch) return window.fetch.bind(window);
    if (typeof globalThis !== 'undefined' && globalThis.fetch) return globalThis.fetch.bind(globalThis);
    throw new Error('No fetch implementation found!');
};

class AnimeLoaderService {
    private loadedExtensions: Map<string, AnimeExtension> = new Map();
    private loadErrors: Map<string, string> = new Map();
    private initialized: boolean = false;

    private readonly fetch = getFetch();

    /**
     * Initialize the loader - load all enabled extensions from storage
     */
    async initialize(): Promise<void> {
        if (this.initialized) return;

        console.log('[AnimeLoader] Initializing...');
        this.loadErrors.clear();

        const enabledExtensions = AnimeExtensionStorage.getEnabledExtensions();
        console.log(`[AnimeLoader] Found ${enabledExtensions.length} enabled extensions in storage`);

        const allExtensions = AnimeExtensionStorage.getAllExtensions();
        console.log(`[AnimeLoader] Total installed extensions: ${allExtensions.length}`);
        allExtensions.forEach(ext => {
            console.log(`[AnimeLoader]   - ${ext.name} (${ext.id}): enabled=${ext.enabled}, bundleCode length=${ext.bundleCode?.length || 0}`);
        });

        for (const installed of enabledExtensions) {
            try {
                console.log(`[AnimeLoader] Executing bundle for ${installed.id}...`);
                const extension = this.executeBundle(installed.bundleCode, installed.id);
                if (extension) {
                    this.loadedExtensions.set(installed.id, extension);
                    console.log(`[AnimeLoader] ✓ Loaded: ${extension.name} v${extension.version}`);
                } else {
                    console.error(`[AnimeLoader] ✗ Bundle execution returned null for ${installed.id}`);
                }
            } catch (error) {
                const msg = error instanceof Error ? error.message : String(error);
                console.error(`[AnimeLoader] ✗ Failed to load ${installed.id}:`, error);
                this.loadErrors.set(installed.id, msg);
            }
        }

        this.initialized = true;
        console.log(`[AnimeLoader] Initialization complete. ${this.loadedExtensions.size} extensions loaded.`);
    }

    /**
     * Execute a bundled JavaScript extension and return the AnimeSource
     */
    private executeBundle(code: string, id: string): AnimeExtension | null {
        try {
            console.log(`[AnimeLoader] executeBundle called for ${id}, code length: ${code?.length || 0}`);

            if (!code || code.length === 0) {
                const msg = `Empty bundle code`;
                console.error(`[AnimeLoader] ${msg} for ${id}`);
                this.loadErrors.set(id, msg);
                return null;
            }

            // The bundle code should be: "return { id, name, search, ... };"
            console.log(`[AnimeLoader] Creating function from bundle...`);

            const extensionFactory = new Function('fetch', code);
            console.log(`[AnimeLoader] Factory created, type: ${typeof extensionFactory}`);

            // Call the factory with the fetch API from Tauri HTTP plugin
            const extension = extensionFactory(this.fetch);
            console.log(`[AnimeLoader] Extension created:`, extension ? `id=${extension.id}, name=${extension.name}` : 'null');

            // Validate the returned object has required methods
            if (!extension || typeof extension.search !== 'function') {
                const msg = `Invalid extension bundle: missing required methods (search)`;
                console.error(`[AnimeLoader] ${msg} for ${id}`);
                this.loadErrors.set(id, msg);
                return null;
            }

            // Ensure id matches
            if (extension.id !== id) {
                console.warn(`[AnimeLoader] Extension id mismatch: expected ${id}, got ${extension.id}`);
                extension.id = id;
            }

            console.log(`[AnimeLoader] Successfully executed bundle for ${id}`);
            return extension as AnimeExtension;
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            console.error(`[AnimeLoader] Failed to execute bundle for ${id}:`, error);
            this.loadErrors.set(id, `Bundle execution failed: ${msg}`);
            return null;
        }
    }

    /**
     * Load a single extension dynamically (after install)
     */
    loadExtension(id: string): AnimeExtension | null {
        this.loadErrors.delete(id);

        const installed = AnimeExtensionStorage.getExtension(id);
        if (!installed || !installed.enabled) {
            return null;
        }

        try {
            const extension = this.executeBundle(installed.bundleCode, id);
            if (extension) {
                this.loadedExtensions.set(id, extension);
                console.log(`[AnimeLoader] Dynamically loaded: ${extension.name}`);
                return extension;
            }
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            console.error(`[AnimeLoader] Failed to load ${id}:`, error);
            this.loadErrors.set(id, msg);
        }
        return null;
    }

    /**
     * Unload an extension (after uninstall or disable)
     */
    unloadExtension(id: string): void {
        this.loadedExtensions.delete(id);
        this.loadErrors.delete(id);
        console.log(`[AnimeLoader] Unloaded: ${id}`);
    }

    /**
     * Reload all extensions from storage
     */
    async reload(): Promise<void> {
        this.loadedExtensions.clear();
        this.loadErrors.clear();
        this.initialized = false;
        await this.initialize();
    }

    /**
     * Get all loaded extensions
     */
    getExtensions(): AnimeExtension[] {
        return Array.from(this.loadedExtensions.values());
    }

    /**
     * Get a specific extension by ID
     */
    getExtension(id: string): AnimeExtension | undefined {
        return this.loadedExtensions.get(id);
    }

    /**
     * Check if an extension is loaded
     */
    isLoaded(id: string): boolean {
        return this.loadedExtensions.has(id);
    }

    /**
     * Get load error for an extension if it failed
     */
    getLoadError(id: string): string | undefined {
        return this.loadErrors.get(id);
    }
}

export const AnimeLoader = new AnimeLoaderService();
