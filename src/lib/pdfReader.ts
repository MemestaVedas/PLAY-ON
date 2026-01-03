/**
 * PDF Reader Utility
 * 
 * Uses pdfjs-dist to render PDF pages to images.
 * This allows reading manga/comic PDFs in the app.
 */

import * as pdfjsLib from 'pdfjs-dist';

// Set worker source - required for pdfjs to work
// Set worker source - using local file in public directory
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

/**
 * Information about a PDF file
 */
export interface PdfInfo {
    pageCount: number;
}

/**
 * Loaded PDF document for rendering
 */
export interface PdfDocument {
    doc: pdfjsLib.PDFDocumentProxy;
    pageCount: number;
}

/**
 * Load a PDF from a file path or URL
 */
export async function loadPdf(source: string | ArrayBuffer): Promise<PdfDocument> {
    const loadingTask = pdfjsLib.getDocument(source);
    const doc = await loadingTask.promise;

    return {
        doc,
        pageCount: doc.numPages,
    };
}

/**
 * Render a specific page of a PDF to a data URL
 * @param pdfDoc - The loaded PDF document
 * @param pageNumber - 1-indexed page number
 * @param scale - Render scale (default 2.0 for high quality)
 */
export async function renderPdfPage(
    pdfDoc: PdfDocument,
    pageNumber: number,
    scale: number = 2.0
): Promise<string> {
    const page = await pdfDoc.doc.getPage(pageNumber);
    const viewport = page.getViewport({ scale });

    // Create canvas
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    // Render page to canvas
    await page.render({
        canvasContext: context,
        viewport,
        canvas,
    }).promise;

    // Convert to data URL
    return canvas.toDataURL('image/png');
}

/**
 * Render all pages of a PDF to data URLs
 * Useful for preloading entire manga volumes
 */
export async function renderAllPdfPages(
    pdfDoc: PdfDocument,
    scale: number = 2.0,
    onProgress?: (current: number, total: number) => void
): Promise<string[]> {
    const pages: string[] = [];

    for (let i = 1; i <= pdfDoc.pageCount; i++) {
        const pageUrl = await renderPdfPage(pdfDoc, i, scale);
        pages.push(pageUrl);

        if (onProgress) {
            onProgress(i, pdfDoc.pageCount);
        }
    }

    return pages;
}

/**
 * Load a PDF from a local file using File API
 */
export async function loadPdfFromFile(file: File): Promise<PdfDocument> {
    const arrayBuffer = await file.arrayBuffer();
    return loadPdf(arrayBuffer);
}

/**
 * Get PDF info without loading all pages
 */
export async function getPdfInfo(source: string | ArrayBuffer): Promise<PdfInfo> {
    const pdfDoc = await loadPdf(source);
    const info = { pageCount: pdfDoc.pageCount };
    await pdfDoc.doc.destroy(); // Clean up
    return info;
}
