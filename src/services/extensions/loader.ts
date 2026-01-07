/**
 * ====================================================================
 * EXTENSION LOADER
 * ====================================================================
 * 
 * Dynamically loads installed extensions from ExtensionStorage.
 * Executes bundled JavaScript to create MangaSource instances.
 * 
 * This replaces the hardcoded extension loading with a dynamic system
 * where users can install extensions from external repositories.
 * ====================================================================
 */

import { Extension } from './types';
import { ExtensionStorage } from './ExtensionStorage';
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';

// Production fix: Ensure we have a valid fetch function
// Try Tauri's fetch first, fall back to window.fetch
const getFetch = () => {
    if (typeof tauriFetch === 'function') return tauriFetch;
    if (typeof window !== 'undefined' && window.fetch) return window.fetch.bind(window); // Bind to window for safety
    if (typeof globalThis !== 'undefined' && globalThis.fetch) return globalThis.fetch.bind(globalThis);
    throw new Error('No fetch implementation found!');
};

class ExtensionLoaderService {
    private loadedExtensions: Map<string, Extension> = new Map();
    private loadErrors: Map<string, string> = new Map();
    private initialized: boolean = false;

    // Use robust fetch getter
    private readonly fetch = getFetch();

    /**
     * Initialize the loader - load all enabled extensions from storage
     */
    async initialize(): Promise<void> {
        if (this.initialized) return;

        console.log('[ExtensionLoader] Initializing...');
        this.loadErrors.clear();

        // Load enabled extensions from storage
        const enabledExtensions = ExtensionStorage.getEnabledExtensions();
        console.log(`[ExtensionLoader] Found ${enabledExtensions.length} enabled extensions in storage`);

        // Debug: Log all installed extensions (including disabled)
        const allExtensions = ExtensionStorage.getAllExtensions();
        console.log(`[ExtensionLoader] Total installed extensions: ${allExtensions.length}`);
        allExtensions.forEach(ext => {
            console.log(`[ExtensionLoader]   - ${ext.name} (${ext.id}): enabled=${ext.enabled}, bundleCode length=${ext.bundleCode?.length || 0}`);
        });

        for (const installed of enabledExtensions) {
            try {
                console.log(`[ExtensionLoader] Executing bundle for ${installed.id}...`);
                const extension = this.executeBundle(installed.bundleCode, installed.id);
                if (extension) {
                    this.loadedExtensions.set(installed.id, extension);
                    console.log(`[ExtensionLoader] ✓ Loaded: ${extension.name} v${extension.version}`);
                } else {
                    console.error(`[ExtensionLoader] ✗ Bundle execution returned null for ${installed.id}`);
                }
            } catch (error) {
                const msg = error instanceof Error ? error.message : String(error);
                console.error(`[ExtensionLoader] ✗ Failed to load ${installed.id}:`, error);
                this.loadErrors.set(installed.id, msg);
            }
        }

        this.initialized = true;
        console.log(`[ExtensionLoader] Initialization complete. ${this.loadedExtensions.size} extensions loaded.`);
    }

    /**
     * Execute a bundled JavaScript extension and return the MangaSource
     */
    private executeBundle(code: string, id: string): Extension | null {
        try {
            console.log(`[ExtensionLoader] executeBundle called for ${id}, code length: ${code?.length || 0}`);

            if (!code || code.length === 0) {
                const msg = `Empty bundle code`;
                console.error(`[ExtensionLoader] ${msg} for ${id}`);
                this.loadErrors.set(id, msg);
                return null;
            }

            // The bundle code should be: "return { id, name, search, ... };"
            // We create a function that accepts 'fetch' as a parameter and contains the bundle code
            // When called with the actual fetch, it returns the extension object
            console.log(`[ExtensionLoader] Creating function from bundle...`);

            // new Function('fetch', code) creates: function(fetch) { return { ... }; }
            const extensionFactory = new Function('fetch', code);
            console.log(`[ExtensionLoader] Factory created, type: ${typeof extensionFactory}`);

            // Call the factory with the fetch API from Tauri HTTP plugin
            const extension = extensionFactory(this.fetch);
            console.log(`[ExtensionLoader] Extension created:`, extension ? `id=${extension.id}, name=${extension.name}` : 'null');

            // Validate the returned object has required methods
            if (!extension || typeof extension.search !== 'function') {
                const msg = `Invalid extension bundle: missing required methods (search)`;
                console.error(`[ExtensionLoader] ${msg} for ${id}`);
                console.error(`[ExtensionLoader] Extension object:`, extension);
                this.loadErrors.set(id, msg);
                return null;
            }

            // Ensure id matches
            if (extension.id !== id) {
                console.warn(`[ExtensionLoader] Extension id mismatch: expected ${id}, got ${extension.id}`);
                extension.id = id;
            }

            console.log(`[ExtensionLoader] Successfully executed bundle for ${id}`);
            return extension as Extension;
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            console.error(`[ExtensionLoader] Failed to execute bundle for ${id}:`, error);
            console.error(`[ExtensionLoader] Stack:`, (error as Error).stack);
            this.loadErrors.set(id, `Bundle execution failed: ${msg}`);
            return null;
        }
    }

    /**
     * Load a single extension dynamically (after install)
     */
    loadExtension(id: string): Extension | null {
        // Clear previous error
        this.loadErrors.delete(id);

        const installed = ExtensionStorage.getExtension(id);
        if (!installed || !installed.enabled) {
            return null;
        }

        try {
            const extension = this.executeBundle(installed.bundleCode, id);
            if (extension) {
                this.loadedExtensions.set(id, extension);
                console.log(`[ExtensionLoader] Dynamically loaded: ${extension.name}`);
                return extension;
            }
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            console.error(`[ExtensionLoader] Failed to load ${id}:`, error);
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
        console.log(`[ExtensionLoader] Unloaded: ${id}`);
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
    getExtensions(): Extension[] {
        return Array.from(this.loadedExtensions.values());
    }

    /**
     * Get a specific extension by ID
     */
    getExtension(id: string): Extension | undefined {
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

export const ExtensionLoader = new ExtensionLoaderService();

