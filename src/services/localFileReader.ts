/**
 * Local File Reader Service
 * 
 * Handles reading local manga files (CBZ, PDF) via Tauri commands.
 */

import { invoke } from '@tauri-apps/api/core';

// CBZ file info returned from Rust
export interface CbzInfo {
    page_count: number;
    pages: string[];
}

/**
 * Get information about a CBZ file (page count and page names)
 */
export async function getCbzInfo(path: string): Promise<CbzInfo> {
    return invoke<CbzInfo>('get_cbz_info', { path });
}

/**
 * Get a specific page from a CBZ file as a data URL (base64)
 */
export async function getCbzPage(path: string, pageName: string): Promise<string> {
    return invoke<string>('get_cbz_page', { path, pageName });
}

/**
 * Check if a file is a valid CBZ (ZIP archive)
 */
export async function isValidCbz(path: string): Promise<boolean> {
    return invoke<boolean>('is_valid_cbz', { path });
}

/**
 * Determine file type from extension
 */
export function getFileType(path: string): 'cbz' | 'pdf' | 'unknown' {
    const lower = path.toLowerCase();
    if (lower.endsWith('.cbz') || lower.endsWith('.cbr')) {
        return 'cbz';
    }
    if (lower.endsWith('.pdf')) {
        return 'pdf';
    }
    return 'unknown';
}

/**
 * Get pages from a local manga file
 * Returns array of image data URLs
 */
export async function getLocalMangaPages(path: string): Promise<string[]> {
    const fileType = getFileType(path);

    if (fileType === 'cbz') {
        const info = await getCbzInfo(path);
        const pages: string[] = [];

        // Load all pages
        for (const pageName of info.pages) {
            const pageData = await getCbzPage(path, pageName);
            pages.push(pageData);
        }

        return pages;
    }

    if (fileType === 'pdf') {
        // PDF will be handled by pdfjs in the component
        throw new Error('PDF files should be handled by the PDF reader component');
    }

    throw new Error(`Unsupported file type: ${path}`);
}
