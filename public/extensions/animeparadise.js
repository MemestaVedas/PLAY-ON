/**
 * ====================================================================
 * ANIMEPARADISE EXTENSION
 * ====================================================================
 * 
 * AnimeParadise anime source extension for PLAY-ON!
 * Provides search, anime info, episodes, and streaming sources.
 * ====================================================================
 */
return {
    id: 'animeparadise',
    name: 'AnimeParadise',
    baseUrl: 'https://animeparadise.org',
    lang: 'en',
    version: '1.0.0',
    iconUrl: 'https://animeparadise.org/favicon.ico',

    /**
     * Search for anime
     */
    async search(filter) {
        const query = filter.query || '';
        const page = filter.page || 1;

        console.log('[AnimeParadise] Searching:', query);

        try {
            const response = await fetch(
                `${this.baseUrl}/search?q=${encodeURIComponent(query)}&page=${page}`,
                {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Accept': 'text/html',
                        'Referer': this.baseUrl
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`Search failed: ${response.status}`);
            }

            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            const anime = [];
            const cards = doc.querySelectorAll('.anime-card, .search-result-item, .anime-item');

            cards.forEach(card => {
                const linkEl = card.querySelector('a[href*="/anime/"]');
                const titleEl = card.querySelector('.title, .anime-title, h3, h4');
                const imgEl = card.querySelector('img');

                if (linkEl) {
                    const href = linkEl.getAttribute('href') || '';
                    const id = href.split('/anime/')[1]?.split('/')[0] || href;

                    anime.push({
                        id: id,
                        title: titleEl ? titleEl.textContent.trim() : 'Unknown',
                        coverUrl: imgEl ? (imgEl.getAttribute('src') || imgEl.getAttribute('data-src') || '') : '',
                        url: href.startsWith('http') ? href : `${this.baseUrl}${href}`
                    });
                }
            });

            // Check for next page
            const nextPageEl = doc.querySelector('.pagination .next, a[rel="next"]');
            const hasNextPage = !!nextPageEl;

            return {
                anime,
                hasNextPage
            };
        } catch (error) {
            console.error('[AnimeParadise] Search error:', error);
            throw error;
        }
    },

    /**
     * Get anime details
     */
    async getAnimeInfo(animeId) {
        console.log('[AnimeParadise] Getting info for:', animeId);

        try {
            const response = await fetch(
                `${this.baseUrl}/anime/${animeId}`,
                {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Accept': 'text/html',
                        'Referer': this.baseUrl
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`Failed to get anime info: ${response.status}`);
            }

            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            // Parse title
            const titleEl = doc.querySelector('h1, .anime-title, .title');
            const title = titleEl ? titleEl.textContent.trim() : 'Unknown';

            // Parse cover
            const coverEl = doc.querySelector('.anime-poster img, .cover img, .thumbnail img');
            const coverUrl = coverEl ? (coverEl.getAttribute('src') || coverEl.getAttribute('data-src') || '') : '';

            // Parse synopsis
            const synopsisEl = doc.querySelector('.synopsis, .description, .anime-description, [class*="synopsis"]');
            const description = synopsisEl ? synopsisEl.textContent.trim() : '';

            // Parse genres
            const genreEls = doc.querySelectorAll('.genres a, .genre a, .tags a');
            const genres = Array.from(genreEls).map(el => el.textContent.trim());

            // Parse status
            const statusEl = doc.querySelector('.status, [class*="status"]');
            const statusText = statusEl ? statusEl.textContent.toLowerCase() : '';
            const status = statusText.includes('airing') || statusText.includes('ongoing') ? 'ongoing' : 'completed';

            // Parse type
            const typeEl = doc.querySelector('.type, [class*="type"]');
            const type = typeEl ? typeEl.textContent.trim() : 'TV';

            return {
                id: animeId,
                title,
                coverUrl,
                description,
                genres,
                status,
                type,
                url: `${this.baseUrl}/anime/${animeId}`
            };
        } catch (error) {
            console.error('[AnimeParadise] GetAnimeInfo error:', error);
            throw error;
        }
    },

    /**
     * Get episode list
     */
    async getEpisodes(animeId) {
        console.log('[AnimeParadise] Getting episodes for:', animeId);

        try {
            const response = await fetch(
                `${this.baseUrl}/anime/${animeId}`,
                {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Accept': 'text/html',
                        'Referer': this.baseUrl
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`Failed to get episodes: ${response.status}`);
            }

            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            const episodes = [];
            const episodeEls = doc.querySelectorAll('.episode-list a, .episodes a, [class*="episode"] a');

            episodeEls.forEach((el, index) => {
                const href = el.getAttribute('href') || '';
                const text = el.textContent.trim();

                // Extract episode number from text or href
                const numMatch = text.match(/(\d+)/) || href.match(/episode-?(\d+)/i);
                const epNum = numMatch ? parseInt(numMatch[1]) : index + 1;

                // Extract episode ID from href
                const episodeId = href.includes('/episode/')
                    ? href.split('/episode/')[1]
                    : href.includes('/watch/')
                        ? href.split('/watch/')[1]
                        : `${animeId}/ep-${epNum}`;

                episodes.push({
                    id: episodeId,
                    number: epNum,
                    title: text || `Episode ${epNum}`,
                    url: href.startsWith('http') ? href : `${this.baseUrl}${href}`
                });
            });

            // Sort by episode number
            episodes.sort((a, b) => a.number - b.number);

            return episodes;
        } catch (error) {
            console.error('[AnimeParadise] GetEpisodes error:', error);
            throw error;
        }
    },

    /**
     * Get streaming sources for an episode
     */
    async getEpisodeSources(episodeId, server) {
        console.log('[AnimeParadise] Getting sources for:', episodeId);

        try {
            // Construct episode URL
            const episodeUrl = episodeId.startsWith('http')
                ? episodeId
                : `${this.baseUrl}/watch/${episodeId}`;

            const response = await fetch(
                episodeUrl,
                {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Accept': 'text/html',
                        'Referer': this.baseUrl
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`Failed to get sources: ${response.status}`);
            }

            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            const sources = [];

            // Look for video source in various places
            const videoEl = doc.querySelector('video source, video');
            if (videoEl) {
                const src = videoEl.getAttribute('src') || videoEl.querySelector('source')?.getAttribute('src');
                if (src) {
                    sources.push({
                        url: src,
                        quality: 'default',
                        isM3U8: src.includes('.m3u8')
                    });
                }
            }

            // Look for iframe sources
            const iframes = doc.querySelectorAll('iframe[src]');
            iframes.forEach(iframe => {
                const src = iframe.getAttribute('src');
                if (src && !src.includes('google') && !src.includes('facebook')) {
                    sources.push({
                        url: src,
                        quality: 'default',
                        isM3U8: src.includes('.m3u8')
                    });
                }
            });

            // Look for direct links in scripts (common pattern)
            const scripts = doc.querySelectorAll('script');
            scripts.forEach(script => {
                const content = script.textContent || '';

                // Look for m3u8 URLs
                const m3u8Match = content.match(/["'](https?:\/\/[^"'\s]+\.m3u8[^"'\s]*)["']/);
                if (m3u8Match) {
                    sources.push({
                        url: m3u8Match[1],
                        quality: 'auto',
                        isM3U8: true
                    });
                }

                // Look for mp4 URLs
                const mp4Match = content.match(/["'](https?:\/\/[^"'\s]+\.mp4[^"'\s]*)["']/);
                if (mp4Match) {
                    sources.push({
                        url: mp4Match[1],
                        quality: 'default',
                        isM3U8: false
                    });
                }
            });

            // Deduplicate sources
            const uniqueSources = [];
            const seenUrls = new Set();
            sources.forEach(s => {
                if (!seenUrls.has(s.url)) {
                    seenUrls.add(s.url);
                    uniqueSources.push(s);
                }
            });

            return {
                sources: uniqueSources,
                headers: {
                    'Referer': this.baseUrl,
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            };
        } catch (error) {
            console.error('[AnimeParadise] GetEpisodeSources error:', error);
            throw error;
        }
    }
};
