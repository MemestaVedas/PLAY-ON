/**
 * Download Service
 * 
 * Handles downloading manga chapters to local storage.
 * Uses Tauri's HTTP plugin to fetch images and stores them in the configured download folder.
 */

import { invoke } from '@tauri-apps/api/core';
import { markChapterDownloaded } from '../lib/localMangaDb';
import { ExtensionManager, Page } from './ExtensionManager';

// Download progress callback type
type ProgressCallback = (chapterId: string | null, current: number, total: number, status: string) => void;

// Download state
interface DownloadState {
    isDownloading: boolean;
    queue: DownloadTask[];
    currentTask: DownloadTask | null;
}

interface DownloadTask {
    sourceId: string;
    mangaId: string;
    mangaTitle: string;
    chapterId: string;
    chapterNumber: number;
    entryId: string;
}

// Singleton state
const downloadState: DownloadState = {
    isDownloading: false,
    queue: [],
    currentTask: null,
};

// Progress listeners
const progressListeners: ProgressCallback[] = [];

/**
 * Subscribe to download progress updates
 */
export function onDownloadProgress(callback: ProgressCallback): () => void {
    progressListeners.push(callback);
    return () => {
        const index = progressListeners.indexOf(callback);
        if (index > -1) progressListeners.splice(index, 1);
    };
}

/**
 * Notify all listeners of progress
 */
function notifyProgress(chapterId: string | null, current: number, total: number, status: string): void {
    progressListeners.forEach(cb => cb(chapterId, current, total, status));
}

/**
 * Get chapter pages from source
 */
async function getChapterPages(sourceId: string, chapterId: string): Promise<Page[]> {
    const source = ExtensionManager.getSource(sourceId);
    if (!source) {
        throw new Error(`Source not found: ${sourceId}`);
    }
    return source.getPages(chapterId);
}

/**
 * Download a single chapter
 */
export async function downloadChapter(
    sourceId: string,
    _mangaId: string,
    mangaTitle: string,
    chapterId: string,
    chapterNumber: number,
    entryId: string,
    onProgress?: (current: number, total: number) => void
): Promise<boolean> {
    try {
        console.log('[DownloadService] Starting download for chapter:', chapterNumber);

        // Get download path from settings
        const settingsJson = localStorage.getItem('app-settings');
        let downloadDir = '';
        if (settingsJson) {
            try {
                const settings = JSON.parse(settingsJson);
                downloadDir = settings.mangaDownloadPath;
            } catch (e) {
                console.error('Failed to parse settings for download path');
            }
        }

        if (!downloadDir) {
            console.error('[DownloadService] No download directory configured');
            notifyProgress(chapterId, 0, 0, 'Error: No download folder set');
            return false;
        }

        // Get pages
        const pages = await getChapterPages(sourceId, chapterId);

        if (pages.length === 0) {
            console.warn('[DownloadService] No pages found for chapter:', chapterId);
            return false;
        }

        // Extract URLs
        const urls = pages.map(p => p.imageUrl);

        // Notify start
        if (onProgress) onProgress(0, pages.length);
        notifyProgress(chapterId, 0, pages.length, `Downloading ${pages.length} pages...`);

        // Invoke Rust Backend
        const chapterTitle = `Chapter ${chapterNumber}`; // Simple title for file name

        await invoke('download_chapter_command', {
            chapterTitle,
            mangaTitle,
            urls,
            downloadDir
        });

        // Mark chapter as downloaded in local DB
        // We also store the path potentially? 
        // For now, markChapterDownloaded just adds ID to list
        markChapterDownloaded(entryId, chapterId);

        console.log('[DownloadService] Chapter download complete:', chapterNumber);

        if (onProgress) onProgress(pages.length, pages.length);
        notifyProgress(chapterId, pages.length, pages.length, 'Complete');

        return true;
    } catch (error) {
        console.error('[DownloadService] Error downloading chapter:', error);
        notifyProgress(chapterId, 0, 0, `Error: ${error}`);
        return false;
    }
}

/**
 * Add chapter to download queue
 */
export function queueChapterDownload(task: DownloadTask): void {
    downloadState.queue.push(task);
    console.log('[DownloadService] Added to queue:', task.chapterNumber, 'Queue size:', downloadState.queue.length);

    // Start processing if not already running
    if (!downloadState.isDownloading) {
        processQueue();
    }
}

/**
 * Add multiple chapters to download queue
 */
export function queueMultipleChapters(tasks: DownloadTask[]): void {
    downloadState.queue.push(...tasks);
    console.log('[DownloadService] Added', tasks.length, 'chapters to queue. Total:', downloadState.queue.length);

    if (!downloadState.isDownloading) {
        processQueue();
    }
}

/**
 * Process the download queue
 */
async function processQueue(): Promise<void> {
    if (downloadState.isDownloading || downloadState.queue.length === 0) {
        return;
    }

    downloadState.isDownloading = true;

    while (downloadState.queue.length > 0) {
        const task = downloadState.queue.shift()!;
        downloadState.currentTask = task;

        notifyProgress(task.chapterId, 0, 1, `Starting Chapter ${task.chapterNumber}`);

        await downloadChapter(
            task.sourceId,
            task.mangaId,
            task.mangaTitle,
            task.chapterId,
            task.chapterNumber,
            task.entryId
        );
    }

    downloadState.isDownloading = false;
    downloadState.isDownloading = false;
    downloadState.currentTask = null;
    notifyProgress(null, 0, 0, 'Download complete');
    console.log('[DownloadService] Queue processing complete');
}

/**
 * Check if currently downloading
 */
export function isDownloading(): boolean {
    return downloadState.isDownloading;
}

/**
 * Get queue length
 */
export function getQueueLength(): number {
    return downloadState.queue.length;
}

/**
 * Clear download queue
 */
export function clearQueue(): void {
    downloadState.queue = [];
    console.log('[DownloadService] Queue cleared');
}

/**
 * Get current download task
 */
export function getCurrentTask(): DownloadTask | null {
    return downloadState.currentTask;
}
