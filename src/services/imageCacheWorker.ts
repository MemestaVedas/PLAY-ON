/**
 * Image Cache Service Worker
 * 
 * Caches images for offline viewing and faster subsequent loads.
 * 
 * NOTE: This file needs to be compiled separately and registered
 * as a service worker. For Tauri apps, consider using the 
 * tauri-plugin-upload or similar for offline caching instead.
 */

const CACHE_NAME = 'playon-image-cache-v1';
const MAX_CACHE_SIZE = 200;

// Image URL patterns to cache
const IMAGE_PATTERNS = [
    /\.anilist\.co/,
    /\.myanimelist\.net/,
    /\.media-imdb\.com/,
    /cover\//,
    /banner\//,
    /avatar\//
];

/**
 * Determines if a URL should be cached
 */
export function shouldCache(url: string): boolean {
    return IMAGE_PATTERNS.some(pattern => pattern.test(url));
}

/**
 * Cache an image manually (for use in React components)
 */
export async function cacheImage(url: string): Promise<void> {
    if (!shouldCache(url)) return;

    try {
        const cache = await caches.open(CACHE_NAME);
        const response = await fetch(url);
        if (response.ok) {
            await cache.put(url, response);
        }
    } catch (e) {
        console.warn('Failed to cache image:', e);
    }
}

/**
 * Get image from cache, falling back to network
 */
export async function getCachedImage(url: string): Promise<Response | null> {
    try {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(url);
        if (cached) return cached;

        // Fetch and cache
        const response = await fetch(url);
        if (response.ok && shouldCache(url)) {
            cache.put(url, response.clone());
        }
        return response;
    } catch (e) {
        console.warn('Failed to get cached image:', e);
        return null;
    }
}

/**
 * Clear the image cache
 */
export async function clearImageCache(): Promise<void> {
    try {
        await caches.delete(CACHE_NAME);
        console.log('Image cache cleared');
    } catch (e) {
        console.error('Failed to clear image cache:', e);
    }
}

/**
 * Get cache size (number of items)
 */
export async function getCacheSize(): Promise<number> {
    try {
        const cache = await caches.open(CACHE_NAME);
        const keys = await cache.keys();
        return keys.length;
    } catch (e) {
        return 0;
    }
}

export default {
    cacheImage,
    getCachedImage,
    clearImageCache,
    getCacheSize,
    shouldCache,
    CACHE_NAME,
    MAX_CACHE_SIZE
};
