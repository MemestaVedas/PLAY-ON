/**
 * Manga Mappings Hook
 * 
 * Similar to useFolderMappings but for manga sources.
 * Maps source manga IDs to AniList manga IDs.
 */

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'playon_manga_mappings';

export interface MangaAniListMapping {
    /** Source ID (e.g., 'weebcentral') */
    sourceId: string;
    /** Manga ID within the source */
    sourceMangaId: string;
    /** Source manga title (for reference) */
    sourceTitle: string;
    /** AniList manga ID */
    anilistId: number;
    /** AniList manga title */
    anilistTitle: string;
    /** Cover image URL from AniList */
    coverImage?: string;
    /** Total chapters from AniList (if known) */
    totalChapters?: number;
    /** Total volumes from AniList (if known) */
    totalVolumes?: number;
    /** When the mapping was created */
    createdAt: number;
}

function loadMappings(): MangaAniListMapping[] {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error('[MangaMappings] Failed to load:', e);
        return [];
    }
}

function saveMappings(mappings: MangaAniListMapping[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mappings));
}

export function useMangaMappings() {
    const [mappings, setMappings] = useState<MangaAniListMapping[]>(() => loadMappings());

    // Reload from storage on mount
    useEffect(() => {
        setMappings(loadMappings());
    }, []);

    /**
     * Add or update a mapping
     */
    const addMapping = useCallback((mapping: Omit<MangaAniListMapping, 'createdAt'>) => {
        setMappings(prev => {
            // Remove existing mapping for this source manga
            const filtered = prev.filter(
                m => !(m.sourceId === mapping.sourceId && m.sourceMangaId === mapping.sourceMangaId)
            );

            const newMapping: MangaAniListMapping = {
                ...mapping,
                createdAt: Date.now(),
            };

            const updated = [...filtered, newMapping];
            saveMappings(updated);
            console.log('[MangaMappings] Added mapping:', mapping.sourceTitle, '->', mapping.anilistTitle);
            return updated;
        });
    }, []);

    /**
     * Remove a mapping
     */
    const removeMapping = useCallback((sourceId: string, sourceMangaId: string) => {
        setMappings(prev => {
            const updated = prev.filter(
                m => !(m.sourceId === sourceId && m.sourceMangaId === sourceMangaId)
            );
            saveMappings(updated);
            console.log('[MangaMappings] Removed mapping for:', sourceId, sourceMangaId);
            return updated;
        });
    }, []);

    /**
     * Get mapping by source manga
     */
    const getMapping = useCallback((sourceId: string, sourceMangaId: string): MangaAniListMapping | undefined => {
        return mappings.find(
            m => m.sourceId === sourceId && m.sourceMangaId === sourceMangaId
        );
    }, [mappings]);

    /**
     * Get mapping by AniList ID
     */
    const getMappingByAnilistId = useCallback((anilistId: number): MangaAniListMapping | undefined => {
        return mappings.find(m => m.anilistId === anilistId);
    }, [mappings]);

    /**
     * Check if a source manga is mapped
     */
    const isMapped = useCallback((sourceId: string, sourceMangaId: string): boolean => {
        return mappings.some(
            m => m.sourceId === sourceId && m.sourceMangaId === sourceMangaId
        );
    }, [mappings]);

    /**
     * Get all mappings for a source
     */
    const getMappingsForSource = useCallback((sourceId: string): MangaAniListMapping[] => {
        return mappings.filter(m => m.sourceId === sourceId);
    }, [mappings]);

    return {
        mappings,
        addMapping,
        removeMapping,
        getMapping,
        getMappingByAnilistId,
        isMapped,
        getMappingsForSource,
    };
}
