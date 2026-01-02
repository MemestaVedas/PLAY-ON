import { Extension } from './types';
// In the future, this would load from a file/URL.
// For now, we will import "built-in" external extensions here.
import { WeebCentralExtension } from '../../extensions/weebcentral';

class ExtensionLoaderService {
    private loadedExtensions: Map<string, Extension> = new Map();

    constructor() {
        // Load initial extensions
        this.loadLocalExtensions();
    }

    private loadLocalExtensions() {
        console.log('[ExtensionLoader] Loading local extensions...');

        // In a real dynamic system, we would scan a directory specific to the OS.
        // For this hybrid approach, we explicitly register our 'external' extensions.

        // WeebCentral
        try {
            this.loadExtension(WeebCentralExtension);
        } catch (e) {
            console.error('[ExtensionLoader] Failed to load WeebCentral:', e);
        }
    }

    public loadExtension(extension: Extension) {
        if (this.loadedExtensions.has(extension.id)) {
            console.warn(`[ExtensionLoader] Extension ${extension.id} already loaded.`);
            return;
        }

        console.log(`[ExtensionLoader] Loaded extension: ${extension.name} v${extension.version}`);
        this.loadedExtensions.set(extension.id, extension);
    }

    public getExtensions(): Extension[] {
        return Array.from(this.loadedExtensions.values());
    }

    public getExtension(id: string): Extension | undefined {
        return this.loadedExtensions.get(id);
    }
}

export const ExtensionLoader = new ExtensionLoaderService();
