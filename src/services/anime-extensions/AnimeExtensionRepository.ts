/**
 * ====================================================================
 * ANIME EXTENSION REPOSITORY SERVICE
 * ====================================================================
 * 
 * Manages external anime extension repositories.
 * Allows users to add repo URLs and fetch available anime extensions.
 * ====================================================================
 */

import { fetch } from '@tauri-apps/plugin-http';
import { AnimeExtensionMeta } from './types';
import { ExtensionRepo } from '../extensions/types';

const REPOS_STORAGE_KEY = 'anime-extension-repos';

// Default repository - using the local public folder for now or a placeholder
// Default repository - automatically added on first launch
const DEFAULT_REPO_URL = 'http://localhost:1420/anime-extensions';
// Note: localhost URL is for dev mode. In prod, this should be a remote URL.

interface AnimeRepositoryIndex {
    name: string;
    description?: string;
    extensions: AnimeExtensionMeta[];
}

class AnimeExtensionRepositoryService {
    private repos: ExtensionRepo[] = [];

    constructor() {
        this.loadRepos();
    }

    /**
     * Load repos from localStorage
     */
    private loadRepos(): void {
        try {
            const saved = localStorage.getItem(REPOS_STORAGE_KEY);
            if (saved) {
                this.repos = JSON.parse(saved);
            }

            // Auto-add default repo if no repos exist (for testing)
            if (this.repos.length === 0) {
                console.log('[AnimeExtensionRepository] No repos found, adding default repository');
                this.repos.push({
                    url: DEFAULT_REPO_URL,
                    name: 'PLAY-ON! Official Anime',
                    addedAt: Date.now()
                });
                this.saveRepos();
            }
        } catch (e) {
            console.error('[AnimeExtensionRepository] Failed to load repos:', e);
            this.repos = [];
        }
    }

    /**
     * Save repos to localStorage
     */
    private saveRepos(): void {
        localStorage.setItem(REPOS_STORAGE_KEY, JSON.stringify(this.repos));
    }

    /**
     * Add a new repository URL
     */
    async addRepo(url: string): Promise<AnimeRepositoryIndex> {
        // Normalize URL
        let normalizedUrl = url.trim().replace(/\/$/, '');

        if (normalizedUrl.endsWith('/index.json')) {
            normalizedUrl = normalizedUrl.replace(/\/index\.json$/, '');
        }

        if (this.repos.some(r => r.url === normalizedUrl)) {
            throw new Error('Repository already added');
        }

        // Fetch index to validate
        const index = await this.fetchRepoIndex(normalizedUrl);

        this.repos.push({
            url: normalizedUrl,
            name: index.name,
            addedAt: Date.now()
        });
        this.saveRepos();

        console.log(`[AnimeExtensionRepository] Added repo: ${index.name} (${normalizedUrl})`);
        return index;
    }

    /**
     * Remove a repository
     */
    removeRepo(url: string): void {
        const normalizedUrl = url.replace(/\/$/, '');
        this.repos = this.repos.filter(r => r.url !== normalizedUrl);
        this.saveRepos();
        console.log(`[AnimeExtensionRepository] Removed repo: ${normalizedUrl}`);
    }

    /**
     * Get all added repositories
     */
    getRepos(): ExtensionRepo[] {
        return [...this.repos];
    }

    /**
     * Fetch the index.json from a repository URL
     */
    async fetchRepoIndex(repoUrl: string): Promise<AnimeRepositoryIndex> {
        const indexUrl = `${repoUrl}/index.json`;
        console.log(`[AnimeExtensionRepository] Fetching index from: ${indexUrl}`);

        try {
            const response = await fetch(indexUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'PLAY-ON!/1.0'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            let index: AnimeRepositoryIndex;
            try {
                index = await response.json();
            } catch {
                throw new Error('Invalid JSON response');
            }

            if (!index.name || !Array.isArray(index.extensions)) {
                throw new Error('Invalid repository format');
            }

            // Filter for anime type just in case, or assume valid
            const animeExtensions = index.extensions.filter(ext => ext.type === 'anime');

            console.log(`[AnimeExtensionRepository] Found ${animeExtensions.length} anime extensions in ${index.name}`);

            return {
                ...index,
                extensions: animeExtensions
            };
        } catch (error) {
            console.error(`[AnimeExtensionRepository] Failed to fetch index:`, error);
            throw error;
        }
    }

    /**
     * Fetch extension bundle code from URL
     */
    async fetchExtensionBundle(bundleUrl: string): Promise<string> {
        console.log(`[AnimeExtensionRepository] Fetching bundle from: ${bundleUrl}`);

        try {
            const response = await fetch(bundleUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/javascript, text/javascript',
                    'User-Agent': 'PLAY-ON!/1.0'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const code = await response.text();
            return code;
        } catch (error) {
            console.error(`[AnimeExtensionRepository] Failed to fetch bundle:`, error);
            throw new Error(`Failed to download extension: ${error}`);
        }
    }

    /**
     * Fetch all extensions from all repositories
     */
    async fetchAllExtensions(): Promise<{ repoUrl: string; repoName: string; extensions: AnimeExtensionMeta[] }[]> {
        const results: { repoUrl: string; repoName: string; extensions: AnimeExtensionMeta[] }[] = [];

        for (const repo of this.repos) {
            try {
                const index = await this.fetchRepoIndex(repo.url);
                results.push({
                    repoUrl: repo.url,
                    repoName: index.name,
                    extensions: index.extensions
                });
            } catch (error) {
                console.error(`[AnimeExtensionRepository] Failed to fetch from ${repo.url}:`, error);
            }
        }

        return results;
    }
}

export const AnimeExtensionRepository = new AnimeExtensionRepositoryService();
