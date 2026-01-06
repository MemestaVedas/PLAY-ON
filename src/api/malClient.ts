/**
 * MyAnimeList API Client
 * 
 * Provides functions to interact with MAL via Tauri backend commands.
 * Handles OAuth, search, and list updates for both anime and manga.
 */

import { invoke } from '@tauri-apps/api/core';

// ============================================================================
// TYPES
// ============================================================================

export interface MalTokenResponse {
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: number;
}

export interface MalUser {
    id: number;
    name: string;
    picture?: string;
}

export interface MalMediaNode {
    id: number;
    title: string;
    main_picture?: {
        medium?: string;
        large?: string;
    };
    num_episodes?: number;
    num_chapters?: number;
    status?: string;
}

export interface MalAnimeListEntry {
    anime: MalMediaNode;
    status: string;
    score: number;
    num_episodes_watched: number;
}

export interface MalMangaListEntry {
    manga: MalMediaNode;
    status: string;
    score: number;
    num_chapters_read: number;
}

export interface MalListUpdateResponse {
    status: string;
    score: number;
    num_episodes_watched?: number;
    num_chapters_read?: number;
}

// MAL status values
export type MalAnimeStatus = 'watching' | 'completed' | 'on_hold' | 'dropped' | 'plan_to_watch';
export type MalMangaStatus = 'reading' | 'completed' | 'on_hold' | 'dropped' | 'plan_to_read';

// ============================================================================
// OAUTH FUNCTIONS
// ============================================================================

/**
 * Generate PKCE code verifier and challenge for OAuth flow
 */
export async function generatePKCE(): Promise<{ verifier: string; challenge: string }> {
    const [verifier, challenge] = await invoke<[string, string]>('mal_generate_pkce');
    return { verifier, challenge };
}

/**
 * Build the MAL authorization URL
 */
export function buildAuthUrl(clientId: string, codeChallenge: string, redirectUri: string): string {
    const params = new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        code_challenge: codeChallenge,
        code_challenge_method: 'plain',
        redirect_uri: redirectUri,
    });
    return `https://myanimelist.net/v1/oauth2/authorize?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForToken(
    code: string,
    clientId: string,
    codeVerifier: string,
    redirectUri: string
): Promise<MalTokenResponse> {
    const resultStr = await invoke<string>('mal_exchange_code', {
        code,
        clientId,
        codeVerifier,
        redirectUri,
    });
    return JSON.parse(resultStr);
}

/**
 * Refresh expired access token
 */
export async function refreshToken(
    refreshToken: string,
    clientId: string
): Promise<MalTokenResponse> {
    const resultStr = await invoke<string>('mal_refresh_token', {
        refreshToken,
        clientId,
    });
    return JSON.parse(resultStr);
}

// ============================================================================
// USER FUNCTIONS
// ============================================================================

/**
 * Get authenticated user's profile
 */
export async function fetchUserProfile(accessToken: string): Promise<MalUser> {
    const resultStr = await invoke<string>('mal_get_user', { accessToken });
    return JSON.parse(resultStr);
}

// ============================================================================
// SEARCH FUNCTIONS
// ============================================================================

/**
 * Search for anime by title
 */
export async function searchAnime(
    accessToken: string,
    query: string,
    limit: number = 10
): Promise<MalMediaNode[]> {
    const resultStr = await invoke<string>('mal_search_anime', {
        accessToken,
        query,
        limit,
    });
    return JSON.parse(resultStr);
}

/**
 * Search for manga by title
 */
export async function searchManga(
    accessToken: string,
    query: string,
    limit: number = 10
): Promise<MalMediaNode[]> {
    const resultStr = await invoke<string>('mal_search_manga', {
        accessToken,
        query,
        limit,
    });
    return JSON.parse(resultStr);
}

// ============================================================================
// LIST UPDATE FUNCTIONS
// ============================================================================

/**
 * Update anime progress on MAL
 */
export async function updateAnimeProgress(
    accessToken: string,
    animeId: number,
    episodesWatched: number,
    status?: MalAnimeStatus
): Promise<MalListUpdateResponse> {
    const resultStr = await invoke<string>('mal_update_anime_progress', {
        accessToken,
        animeId,
        episodesWatched,
        status,
    });
    return JSON.parse(resultStr);
}

/**
 * Update manga progress on MAL
 */
export async function updateMangaProgress(
    accessToken: string,
    mangaId: number,
    chaptersRead: number,
    status?: MalMangaStatus
): Promise<MalListUpdateResponse> {
    const resultStr = await invoke<string>('mal_update_manga_progress', {
        accessToken,
        mangaId,
        chaptersRead,
        status,
    });
    return JSON.parse(resultStr);
}

// ============================================================================
// LIST FETCH FUNCTIONS
// ============================================================================

/**
 * Get user's anime list
 */
export async function fetchAnimeList(
    accessToken: string,
    status?: MalAnimeStatus,
    limit: number = 100
): Promise<MalAnimeListEntry[]> {
    const resultStr = await invoke<string>('mal_get_anime_list', {
        accessToken,
        status,
        limit,
    });
    return JSON.parse(resultStr);
}

/**
 * Get user's manga list
 */
export async function fetchMangaList(
    accessToken: string,
    status?: MalMangaStatus,
    limit: number = 100
): Promise<MalMangaListEntry[]> {
    const resultStr = await invoke<string>('mal_get_manga_list', {
        accessToken,
        status,
        limit,
    });
    return JSON.parse(resultStr);
}

// ============================================================================
// HELPER: Convert AniList status to MAL status
// ============================================================================

export function anilistToMalAnimeStatus(anilistStatus: string): MalAnimeStatus | undefined {
    const map: Record<string, MalAnimeStatus> = {
        'CURRENT': 'watching',
        'COMPLETED': 'completed',
        'PAUSED': 'on_hold',
        'DROPPED': 'dropped',
        'PLANNING': 'plan_to_watch',
        'REPEATING': 'watching',
    };
    return map[anilistStatus];
}

export function anilistToMalMangaStatus(anilistStatus: string): MalMangaStatus | undefined {
    const map: Record<string, MalMangaStatus> = {
        'CURRENT': 'reading',
        'COMPLETED': 'completed',
        'PAUSED': 'on_hold',
        'DROPPED': 'dropped',
        'PLANNING': 'plan_to_read',
        'REPEATING': 'reading',
    };
    return map[anilistStatus];
}
