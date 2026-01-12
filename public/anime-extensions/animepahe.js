/**
 * ====================================================================
 * ANIMEPAHE EXTENSION
 * ====================================================================
 * 
 * AnimePahe anime source extension for PLAY-ON!
 * Provides search, anime info, episodes, and streaming sources.
 * 
 * Note: AnimePahe uses Cloudflare protection. If requests fail,
 * it may be due to Cloudflare blocking. Try again or use VPN.
 * ====================================================================
 */
return {
    id: 'animepahe',
    name: 'AnimePahe',
    baseUrl: 'https://animepahe.si',
    lang: 'en',
    version: '1.0.0',
    iconUrl: 'https://animepahe.si/favicon.ico',

    /**
     * Search for anime
     */
    async search(filter) {
        const query = filter.query || '';
        const page = filter.page || 1;

        console.log('[AnimePahe] Searching:', query);

        try {
            const response = await fetch(
                `${this.baseUrl}/api?m=search&q=${encodeURIComponent(query)}`,
                {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Accept': 'application/json',
                        'Referer': this.baseUrl
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`Search failed: ${response.status}`);
            }

            const data = await response.json();

            if (!data || !data.data) {
                return { anime: [], hasNextPage: false };
            }

            const anime = data.data.map(item => ({
                id: item.session,
                title: item.title,
                coverUrl: item.poster || '',
                releaseDate: item.year ? String(item.year) : undefined,
                type: item.type || 'TV',
                status: item.status === 'Airing' ? 'ongoing' : 'completed',
                totalEpisodes: item.episodes || undefined
            }));

            return {
                anime,
                hasNextPage: false
            };
        } catch (error) {
            console.error('[AnimePahe] Search error:', error);
            throw error;
        }
    },

    /**
     * Get anime details
     */
    async getAnimeInfo(animeId) {
        console.log('[AnimePahe] Getting info for:', animeId);

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
            const titleEl = doc.querySelector('.anime-title');
            const title = titleEl ? titleEl.textContent.trim() : 'Unknown';

            // Parse cover
            const coverEl = doc.querySelector('.anime-poster img');
            const coverUrl = coverEl ? coverEl.getAttribute('src') : '';

            // Parse synopsis
            const synopsisEl = doc.querySelector('.anime-synopsis');
            const description = synopsisEl ? synopsisEl.textContent.trim() : '';

            // Parse genres
            const genreEls = doc.querySelectorAll('.anime-genre a');
            const genres = Array.from(genreEls).map(el => el.textContent.trim());

            // Parse status
            const statusEl = doc.querySelector('.anime-status');
            const statusText = statusEl ? statusEl.textContent.toLowerCase() : '';
            const status = statusText.includes('airing') ? 'ongoing' : 'completed';

            return {
                id: animeId,
                title,
                coverUrl,
                description,
                genres,
                status,
                url: `${this.baseUrl}/anime/${animeId}`
            };
        } catch (error) {
            console.error('[AnimePahe] GetAnimeInfo error:', error);
            throw error;
        }
    },

    /**
     * Get episode list
     */
    async getEpisodes(animeId) {
        console.log('[AnimePahe] Getting episodes for:', animeId);

        try {
            // AnimePahe uses paginated API for episodes
            const response = await fetch(
                `${this.baseUrl}/api?m=release&id=${animeId}&sort=episode_asc&page=1`,
                {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Accept': 'application/json',
                        'Referer': this.baseUrl
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`Failed to get episodes: ${response.status}`);
            }

            const data = await response.json();

            if (!data || !data.data) {
                return [];
            }

            // Fetch all pages if there are more
            let allEpisodes = [...data.data];
            let currentPage = 1;
            const totalPages = data.last_page || 1;

            while (currentPage < totalPages) {
                currentPage++;
                const pageResponse = await fetch(
                    `${this.baseUrl}/api?m=release&id=${animeId}&sort=episode_asc&page=${currentPage}`,
                    {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                            'Accept': 'application/json',
                            'Referer': this.baseUrl
                        }
                    }
                );

                if (pageResponse.ok) {
                    const pageData = await pageResponse.json();
                    if (pageData && pageData.data) {
                        allEpisodes = [...allEpisodes, ...pageData.data];
                    }
                }
            }

            return allEpisodes.map(ep => ({
                id: `${animeId}/${ep.session}`,
                number: ep.episode || 0,
                title: ep.title || `Episode ${ep.episode}`,
                image: ep.snapshot || undefined,
                isFiller: ep.filler === 1
            }));
        } catch (error) {
            console.error('[AnimePahe] GetEpisodes error:', error);
            throw error;
        }
    },

    /**
     * Get streaming sources for an episode
     */
    async getEpisodeSources(episodeId, server) {
        console.log('[AnimePahe] Getting sources for:', episodeId);

        try {
            const [animeId, session] = episodeId.split('/');

            // Get the play page
            const response = await fetch(
                `${this.baseUrl}/play/${animeId}/${session}`,
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

            // Find the download/streaming links
            const sources = [];
            const linkEls = doc.querySelectorAll('#pickDownload a, .dropdown-menu a[href*="kwik"]');

            for (const el of linkEls) {
                const href = el.getAttribute('href');
                const quality = el.textContent.trim().match(/(\d+p)/)?.[1] || 'default';

                if (href) {
                    // Note: AnimePahe uses kwik.cx for streaming which requires additional extraction
                    // For now, return the kwik URL - player may need to handle extraction
                    sources.push({
                        url: href,
                        quality: quality,
                        isM3U8: false
                    });
                }
            }

            // If no sources found, try to find embedded player
            if (sources.length === 0) {
                const iframeEl = doc.querySelector('iframe[src*="kwik"]');
                if (iframeEl) {
                    const iframeSrc = iframeEl.getAttribute('src');
                    sources.push({
                        url: iframeSrc,
                        quality: 'default',
                        isM3U8: false
                    });
                }
            }

            return {
                sources,
                headers: {
                    'Referer': this.baseUrl,
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            };
        } catch (error) {
            console.error('[AnimePahe] GetEpisodeSources error:', error);
            throw error;
        }
    }
};
