import { useState, useEffect, useCallback } from 'react';

/**
 * Represents a mapping between a local folder and an AniList anime
 */
export interface FolderAnimeMapping {
    folderPath: string;           // Full path to the folder
    folderName: string;           // Display name (folder basename)
    anilistId: number;            // AniList media ID
    animeName: string;            // Display name (romaji/english)
    coverImage?: string;          // For quick display
    linkedAt: number;             // Timestamp when linked
}

const STORAGE_KEY = 'folder-anime-mappings';

/**
 * Hook to manage folder-to-AniList ID mappings
 * Persists mappings to localStorage and provides CRUD operations
 */
export function useFolderMappings() {
    const [mappings, setMappings] = useState<FolderAnimeMapping[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    // Load from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setMappings(parsed);
            } catch (e) {
                console.error('Failed to parse folder mappings', e);
            }
        }
        setIsLoaded(true);
    }, []);

    // Persist to localStorage when mappings change
    useEffect(() => {
        if (!isLoaded) return;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(mappings));
    }, [mappings, isLoaded]);

    /**
     * Add a new folder-to-anime mapping
     */
    const addMapping = useCallback((
        folderPath: string,
        anilistId: number,
        animeName: string,
        coverImage?: string
    ) => {
        // Extract folder name from path
        const folderName = folderPath.split(/[\\/]/).pop() || folderPath;

        setMappings(prev => {
            // Remove existing mapping for this folder if any
            const filtered = prev.filter(m => m.folderPath !== folderPath);
            return [...filtered, {
                folderPath,
                folderName,
                anilistId,
                animeName,
                coverImage,
                linkedAt: Date.now()
            }];
        });
    }, []);

    /**
     * Remove a mapping by folder path
     */
    const removeMapping = useCallback((folderPath: string) => {
        setMappings(prev => prev.filter(m => m.folderPath !== folderPath));
    }, []);

    /**
     * Get mapping for a specific folder path
     */
    const getMappingByPath = useCallback((folderPath: string): FolderAnimeMapping | undefined => {
        return mappings.find(m => m.folderPath === folderPath);
    }, [mappings]);

    /**
     * Get mapping by AniList ID
     * Used to check if an anime has a linked local folder
     */
    const getMappingByAnilistId = useCallback((anilistId: number): FolderAnimeMapping | undefined => {
        return mappings.find(m => m.anilistId === anilistId);
    }, [mappings]);

    /**
     * Find mapping for a file path by checking if any mapped folder is a parent
     * This is used during detection - if a video file is inside a mapped folder,
     * we can use that mapping as a fallback
     */
    const getMappingForFilePath = useCallback((filePath: string): FolderAnimeMapping | undefined => {
        // Normalize path separators for comparison
        const normalizedFilePath = filePath.replace(/\\/g, '/').toLowerCase();

        return mappings.find(m => {
            const normalizedFolderPath = m.folderPath.replace(/\\/g, '/').toLowerCase();
            return normalizedFilePath.startsWith(normalizedFolderPath + '/') ||
                normalizedFilePath === normalizedFolderPath;
        });
    }, [mappings]);

    return {
        mappings,
        isLoaded,
        addMapping,
        removeMapping,
        getMappingByPath,
        getMappingByAnilistId,
        getMappingForFilePath
    };
}

export default useFolderMappings;
