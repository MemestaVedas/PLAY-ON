import { defineExtension } from '../services/extensions/types';
import { Manga, Chapter, Page, SearchFilter, SearchResult } from '../services/sources/Source';
import { fetch } from '@tauri-apps/plugin-http';

export const WeebCentralExtension = defineExtension({
    id: 'weebcentral',
    name: 'WeebCentral',
    version: '1.0.0',
    baseUrl: 'https://weebcentral.com',
    lang: 'en',

    async search(filter: SearchFilter): Promise<SearchResult> {
        try {
            const query = filter.query || '';
            // CRITICAL FIX: Use /search/data endpoint which returns actual HTML fragments with results
            // The /search page only returns the shell - results are loaded dynamically via HTMX
            const url = `${this.baseUrl}/search/data?text=${encodeURIComponent(query)}&sort=Best+Match&order=Descending&official=Any&display_mode=Full+Display`;

            console.log('[WeebCentral] Fetching search data:', url);

            // Use Tauri's fetch to bypass CORS
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Referer': 'https://weebcentral.com/search',
                    'HX-Request': 'true' // HTMX header
                }
            });

            console.log('[WeebCentral] Response status:', response.status);

            if (!response.ok) {
                console.error(`[WeebCentral] Search fetch failed: ${response.status} ${response.statusText}`);
                return { manga: [], hasNextPage: false };
            }

            const html = await response.text();
            console.log('[WeebCentral] HTML fragment length:', html.length);
            console.log('[WeebCentral] HTML preview:', html.slice(0, 300));

            // Check for Cloudflare challenge
            if (html.includes('Just a moment') || html.includes('Checking your browser')) {
                console.error('[WeebCentral] Cloudflare block detected!');
                return { manga: [], hasNextPage: false };
            }

            const doc = new DOMParser().parseFromString(html, 'text/html');

            const results: Manga[] = [];

            // The /search/data endpoint returns <a> tags containing <article> elements
            // Each <a> wraps the entire manga card and links to the series page
            const mangaCards = Array.from(doc.querySelectorAll('a[href*="/series/"]'));
            console.log('[WeebCentral] Found manga cards:', mangaCards.length);

            for (const card of mangaCards) {
                const href = card.getAttribute('href');
                if (!href) continue;

                // URL format: https://weebcentral.com/series/ID/slug or /series/ID/slug
                const match = href.match(/\/series\/([^\/]+)/);
                const id = match ? match[1] : null;

                if (!id) continue;

                // Title is in a nested link with class "link link-hover" or just get text from the card
                const titleElement = card.querySelector('a.link.link-hover') ||
                    card.querySelector('.line-clamp-1') ||
                    card.querySelector('h3, h4, strong');
                const title = titleElement?.textContent?.trim() || 'Unknown Title';

                // Cover image is in a <picture> or <img> inside the card
                const img = card.querySelector('picture img') || card.querySelector('img');
                let coverUrl = img?.getAttribute('src') || '';

                // Ensure absolute URL
                if (coverUrl && !coverUrl.startsWith('http')) {
                    coverUrl = new URL(coverUrl, this.baseUrl).href;
                }

                // Skip if we already have this manga (dedup)
                if (results.some(r => r.id === id)) continue;

                results.push({
                    id,
                    title,
                    coverUrl,
                    status: 'unknown'
                });

                console.log(`[WeebCentral] Found: ${title} (${id})`);
            }

            console.log('[WeebCentral] Total results:', results.length);

            return {
                manga: results,
                hasNextPage: false // TODO: Check pagination
            };
        } catch (error) {
            console.error('[WeebCentral] Search failed:', error);
            return { manga: [], hasNextPage: false };
        }
    },

    async getMangaDetails(id: string): Promise<Manga> {
        try {
            // WeebCentral URLs need the ID. The slug is optional/changeable, we can just append a placeholder.
            const url = `${this.baseUrl}/series/${id}/placeholder`;
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Referer': 'https://weebcentral.com/'
                }
            });
            const html = await response.text();
            const doc = new DOMParser().parseFromString(html, 'text/html');

            const title = doc.querySelector('h1')?.textContent?.trim() || 'Unknown Title';
            const coverUrl = doc.querySelector('img[alt="' + title + '"]')?.getAttribute('src') ||
                doc.querySelector('picture > img')?.getAttribute('src') || '';

            const description = doc.querySelector('.description, .prose')?.textContent?.trim() || '';

            // Author
            const authorLink = doc.querySelector('a[href*="author="]');
            const author = authorLink?.textContent?.trim() || '';

            // Status normalization
            let status: Manga['status'] = 'unknown';
            let statusText = '';

            const statusLabel = Array.from(doc.querySelectorAll('span, div, strong')).find(el => el.textContent?.includes('Status:'));
            if (statusLabel && statusLabel.nextSibling) {
                statusText = statusLabel.nextSibling.textContent?.trim() || '';
            } else if (statusLabel && statusLabel.nextElementSibling) {
                statusText = statusLabel.nextElementSibling.textContent?.trim() || '';
            }

            if (statusText.toLowerCase().includes('ongoing')) status = 'ongoing';
            else if (statusText.toLowerCase().includes('complete')) status = 'completed';
            else if (statusText.toLowerCase().includes('hiatus')) status = 'hiatus';
            else if (statusText.toLowerCase().includes('cancel')) status = 'cancelled';

            return {
                id,
                title,
                coverUrl,
                description,
                author,
                status
            };
        } catch (error) {
            console.error('[WeebCentral] Failed to get details:', error);
            throw error;
        }
    },

    async getChapters(mangaId: string): Promise<Chapter[]> {
        try {
            // WeebCentral uses HTMX for full chapter list - fetch from /full-chapter-list endpoint
            const url = `${this.baseUrl}/series/${mangaId}/full-chapter-list`;
            console.log('[WeebCentral] Fetching chapters from:', url);

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Referer': `https://weebcentral.com/series/${mangaId}`,
                    'HX-Request': 'true'
                }
            });

            console.log('[WeebCentral] Chapters response status:', response.status);
            const html = await response.text();
            console.log('[WeebCentral] Chapters HTML length:', html.length);
            console.log('[WeebCentral] Chapters HTML preview:', html.slice(0, 300));

            const doc = new DOMParser().parseFromString(html, 'text/html');

            const chapters: Chapter[] = [];
            const chapterLinks = Array.from(doc.querySelectorAll('a[href*="/chapters/"]'));
            console.log('[WeebCentral] Found chapter links:', chapterLinks.length);

            for (const link of chapterLinks) {
                const href = link.getAttribute('href');
                if (!href) continue;

                // /chapters/ID
                const match = href.match(/\/chapters\/([^\/]+)/);
                const id = match ? match[1] : null;
                if (!id) continue;

                // Skip if already added (dedup)
                if (chapters.some(c => c.id === id)) continue;

                // Get chapter text - look for spans with chapter info, but EXCLUDE SVG and style content
                let name = '';

                // Try to find the chapter number span specifically
                const spans = link.querySelectorAll('span');
                for (const span of spans) {
                    // Skip if it contains SVG or style elements
                    if (span.querySelector('svg, style')) continue;
                    // Skip if text looks like CSS
                    const text = span.textContent?.trim() || '';
                    if (text.includes('{') || text.includes('fill:') || text.includes('.st')) continue;
                    if (text.toLowerCase().includes('chapter')) {
                        name = text;
                        break;
                    }
                }

                // Fallback: get direct text content, filtering out CSS-like content
                if (!name) {
                    // Clone the link and remove SVG/style elements
                    const clone = link.cloneNode(true) as Element;
                    clone.querySelectorAll('svg, style').forEach(el => el.remove());
                    name = clone.textContent?.trim() || '';

                    // If still contains CSS-like content, extract just the chapter part
                    if (name.includes('{') || name.includes('.st')) {
                        const chapterMatch = name.match(/Chapter\s*\d+(\.\d+)?/i);
                        name = chapterMatch ? chapterMatch[0] : `Chapter`;
                    }
                }

                if (!name) name = `Chapter`;

                // Extract number from name
                const numMatch = name.match(/Chapter\s*(\d+(\.\d+)?)/i);
                const number = numMatch ? parseFloat(numMatch[1]) : chapters.length + 1;

                chapters.push({
                    id,
                    number,
                    title: `Chapter ${number}`
                });
            }

            console.log('[WeebCentral] Parsed chapters:', chapters.length);
            return chapters;
        } catch (error) {
            console.error('[WeebCentral] Failed to get chapters:', error);
            return [];
        }
    },

    async getPages(chapterId: string): Promise<Page[]> {
        try {
            // Try the images endpoint first (HTMX pattern)
            const url = `${this.baseUrl}/chapters/${chapterId}/images?is_prev=False&current_page=1&reading_style=long_strip`;
            console.log('[WeebCentral] Fetching pages from:', url);

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Referer': `https://weebcentral.com/chapters/${chapterId}`,
                    'HX-Request': 'true'
                }
            });

            console.log('[WeebCentral] Pages response status:', response.status);
            const html = await response.text();
            console.log('[WeebCentral] Pages HTML length:', html.length);
            console.log('[WeebCentral] Pages HTML preview:', html.slice(0, 500));

            const doc = new DOMParser().parseFromString(html, 'text/html');
            const pages: Page[] = [];

            // Look for images - WeebCentral uses CDN domains
            let images = Array.from(doc.querySelectorAll('img'));
            console.log('[WeebCentral] Found all images:', images.length);

            // Log first few image sources for debugging
            images.slice(0, 3).forEach((img, i) => {
                console.log(`[WeebCentral] Image ${i}:`, img.getAttribute('src')?.slice(0, 100));
            });

            // Filter to only manga page images (on CDN domains)
            const targetImages = images.filter(img => {
                const src = img.getAttribute('src') || '';
                // Include images from known CDNs or with manga-page-like patterns
                return (src.includes('compsci88.com') ||
                    src.includes('planeptune.us') ||
                    src.includes('/manga/') ||
                    src.includes('/chapter/')) &&
                    !src.includes('avatar') &&
                    !src.includes('icon') &&
                    !src.includes('logo');
            });

            console.log('[WeebCentral] Filtered manga images:', targetImages.length);

            targetImages.forEach((img, index) => {
                let src = img.getAttribute('src') || '';

                // Ensure absolute URL
                if (src && !src.startsWith('http')) {
                    src = new URL(src, this.baseUrl).href;
                }

                if (src) {
                    pages.push({
                        index,
                        imageUrl: src
                    });
                }
            });

            console.log('[WeebCentral] Final pages count:', pages.length);
            return pages;
        } catch (error) {
            console.error('[WeebCentral] Failed to get pages:', error);
            return [];
        }
    }
});
