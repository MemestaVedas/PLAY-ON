/**
 * ====================================================================
 * ANIME EXTENSION STORAGE SERVICE
 * ====================================================================
 * 
 * Manages installed anime extensions in localStorage.
 * Handles install, uninstall, enable/disable operations.
 * ====================================================================
 */

import { InstalledAnimeExtension, AnimeExtensionMeta } from './types';

const INSTALLED_STORAGE_KEY = 'installed-anime-extensions';

class AnimeExtensionStorageService {
    private extensions: Map<string, InstalledAnimeExtension> = new Map();

    constructor() {
        this.loadExtensions();
    }

    /**
     * Load installed extensions from localStorage
     */
    private loadExtensions(): void {
        try {
            const saved = localStorage.getItem(INSTALLED_STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved) as Record<string, InstalledAnimeExtension>;
                this.extensions = new Map(Object.entries(parsed));
            }
        } catch (e) {
            console.error('[AnimeExtensionStorage] Failed to load extensions:', e);
            this.extensions = new Map();
        }
    }

    /**
     * Save installed extensions to localStorage
     */
    private saveExtensions(): void {
        const obj: Record<string, InstalledAnimeExtension> = {};
        this.extensions.forEach((ext, id) => {
            obj[id] = ext;
        });
        localStorage.setItem(INSTALLED_STORAGE_KEY, JSON.stringify(obj));
    }

    /**
     * Install an extension
     */
    installExtension(meta: AnimeExtensionMeta, repoUrl: string, bundleCode: string): void {
        const installed: InstalledAnimeExtension = {
            id: meta.id,
            name: meta.name,
            version: meta.version,
            lang: meta.lang,
            nsfw: meta.nsfw,
            iconUrl: meta.iconUrl,
            repoUrl,
            bundleCode,
            enabled: true,
            installedAt: Date.now()
        };

        this.extensions.set(meta.id, installed);
        this.saveExtensions();
        console.log(`[AnimeExtensionStorage] Installed: ${meta.name} v${meta.version}`);
    }

    /**
     * Uninstall an extension
     */
    uninstallExtension(id: string): boolean {
        const deleted = this.extensions.delete(id);
        if (deleted) {
            this.saveExtensions();
            console.log(`[AnimeExtensionStorage] Uninstalled: ${id}`);
        }
        return deleted;
    }

    /**
     * Enable an extension
     */
    enableExtension(id: string): void {
        const ext = this.extensions.get(id);
        if (ext) {
            ext.enabled = true;
            this.saveExtensions();
            console.log(`[AnimeExtensionStorage] Enabled: ${id}`);
        }
    }

    /**
     * Disable an extension
     */
    disableExtension(id: string): void {
        const ext = this.extensions.get(id);
        if (ext) {
            ext.enabled = false;
            this.saveExtensions();
            console.log(`[AnimeExtensionStorage] Disabled: ${id}`);
        }
    }

    /**
     * Toggle extension enabled state
     */
    toggleExtension(id: string): boolean {
        const ext = this.extensions.get(id);
        if (ext) {
            ext.enabled = !ext.enabled;
            this.saveExtensions();
            console.log(`[AnimeExtensionStorage] Toggled ${id}: ${ext.enabled ? 'enabled' : 'disabled'}`);
            return ext.enabled;
        }
        return false;
    }

    /**
     * Check if an extension is installed
     */
    isInstalled(id: string): boolean {
        return this.extensions.has(id);
    }

    /**
     * Get an installed extension by ID
     */
    getExtension(id: string): InstalledAnimeExtension | undefined {
        return this.extensions.get(id);
    }

    /**
     * Get all installed extensions
     */
    getAllExtensions(): InstalledAnimeExtension[] {
        return Array.from(this.extensions.values());
    }

    /**
     * Get only enabled extensions
     */
    getEnabledExtensions(): InstalledAnimeExtension[] {
        return this.getAllExtensions().filter(ext => ext.enabled);
    }

    /**
     * Update an extension with new version
     */
    updateExtension(meta: AnimeExtensionMeta, bundleCode: string): void {
        const existing = this.extensions.get(meta.id);
        if (existing) {
            existing.version = meta.version;
            existing.bundleCode = bundleCode;
            existing.iconUrl = meta.iconUrl;
            this.saveExtensions();
            console.log(`[AnimeExtensionStorage] Updated: ${meta.name} to v${meta.version}`);
        }
    }

    /**
     * Check if an update is available
     */
    hasUpdate(id: string, newVersion: string): boolean {
        const installed = this.extensions.get(id);
        if (!installed) return false;
        return this.compareVersions(newVersion, installed.version) > 0;
    }

    /**
     * Simple semver comparison (returns 1 if a > b, -1 if a < b, 0 if equal)
     */
    private compareVersions(a: string, b: string): number {
        const partsA = a.split('.').map(Number);
        const partsB = b.split('.').map(Number);

        for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
            const numA = partsA[i] || 0;
            const numB = partsB[i] || 0;
            if (numA > numB) return 1;
            if (numA < numB) return -1;
        }
        return 0;
    }
}

// Singleton instance
export const AnimeExtensionStorage = new AnimeExtensionStorageService();
