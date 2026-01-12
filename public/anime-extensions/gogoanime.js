/**
 * ====================================================================
 * GOGOANIME EXTENSION
 * ====================================================================
 * 
 * Gogoanime anime source extension for PLAY-ON!
 * Uses the anitaku.so API endpoints directly.
 * ====================================================================
 */
return {
    id: 'gogoanime',
    name: 'Gogoanime',
    baseUrl: 'https://anitaku.so',
    apiUrl: 'https://ajax.gogocdn.net',
    lang: 'en',
    version: '1.0.0',
    iconUrl: 'https://anitaku.so/img/icon/logo.png',

    /**
     * Search for anime
     */
    async search(filter) {
        const query = filter.query || '';
        const page = filter.page || 1;

        console.log('[Gogoanime] Searching:', query);

        try {
            const response = await fetch(
                `${this.baseUrl}/search.html?keyword=${encodeURIComponent(query)}&page=${page}`,
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
            const items = doc.querySelectorAll('.items li');

            items.forEach(item => {
                const linkEl = item.querySelector('.name a');
                const imgEl = item.querySelector('.img img');
                const releasedEl = item.querySelector('.released');

                if (linkEl) {
                    const href = linkEl.getAttribute('href') || '';
                    const id = href.replace('/category/', '');

                    anime.push({
                        id: id,
                        title: linkEl.textContent?.trim() || 'Unknown',
                        coverUrl: imgEl?.getAttribute('src') || '',
                        releaseDate: releasedEl?.textContent?.replace('Released:', '').trim() || undefined,
                        url: `${this.baseUrl}${href}`
                    });
                }
            });

            // Check pagination
            const nextPage = doc.querySelector('.pagination-list li.selected + li a');
            const hasNextPage = !!nextPage;

            return {
                anime,
                hasNextPage
            };
        } catch (error) {
            console.error('[Gogoanime] Search error:', error);
            throw error;
        }
    },

    /**
     * Get anime details
     */
    async getAnimeInfo(animeId) {
        console.log('[Gogoanime] Getting info for:', animeId);

        try {
            const response = await fetch(
                `${this.baseUrl}/category/${animeId}`,
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
            const titleEl = doc.querySelector('.anime_info_body_bg h1');
            const title = titleEl ? titleEl.textContent.trim() : 'Unknown';

            // Parse cover
            const coverEl = doc.querySelector('.anime_info_body_bg img');
            const coverUrl = coverEl ? coverEl.getAttribute('src') : '';

            // Parse description
            const descEl = doc.querySelector('.description');
            const description = descEl ? descEl.textContent.trim() : '';

            // Parse genres
            const genreEls = doc.querySelectorAll('p.type:nth-child(6) a');
            const genres = Array.from(genreEls).map(el => el.textContent.trim());

            // Parse status
            const statusEl = doc.querySelector('p.type:nth-child(8) a');
            const statusText = statusEl ? statusEl.textContent.toLowerCase() : '';
            const status = statusText.includes('ongoing') ? 'ongoing' : 'completed';

            // Get movie_id for episode fetching
            const movieIdEl = doc.querySelector('#movie_id');
            const movieId = movieIdEl ? movieIdEl.getAttribute('value') : '';

            return {
                id: animeId,
                movieId: movieId,
                title,
                coverUrl,
                description,
                genres,
                status,
                url: `${this.baseUrl}/category/${animeId}`
            };
        } catch (error) {
            console.error('[Gogoanime] GetAnimeInfo error:', error);
            throw error;
        }
    },

    /**
     * Get episode list
     */
    async getEpisodes(animeId) {
        console.log('[Gogoanime] Getting episodes for:', animeId);

        try {
            // First get the anime info to find episode range
            const infoRes = await fetch(
                `${this.baseUrl}/category/${animeId}`,
                {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Accept': 'text/html',
                        'Referer': this.baseUrl
                    }
                }
            );

            if (!infoRes.ok) {
                throw new Error(`Failed to get anime page: ${infoRes.status}`);
            }

            const html = await infoRes.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            // Get episode range
            const epStartEl = doc.querySelector('#episode_page a');
            const epEndEl = doc.querySelector('#episode_page a:last-child');

            let epStart = 0;
            let epEnd = 0;

            if (epStartEl) {
                epStart = parseInt(epStartEl.getAttribute('ep_start') || '0');
            }
            if (epEndEl) {
                epEnd = parseInt(epEndEl.getAttribute('ep_end') || '0');
            }

            // Get movie ID and default_ep
            const movieIdEl = doc.querySelector('#movie_id');
            const aliasEl = doc.querySelector('#alias_anime');

            const movieId = movieIdEl ? movieIdEl.getAttribute('value') : '';
            const alias = aliasEl ? aliasEl.getAttribute('value') : animeId;

            if (!movieId) {
                // Fallback: scrape episode list from page
                const epListEls = doc.querySelectorAll('#episode_page a');
                const episodes = [];

                epListEls.forEach(el => {
                    const start = parseInt(el.getAttribute('ep_start') || '0');
                    const end = parseInt(el.getAttribute('ep_end') || '0');

                    for (let i = start; i <= end; i++) {
                        if (i === 0) continue;
                        episodes.push({
                            id: `${animeId}-episode-${i}`,
                            number: i,
                            title: `Episode ${i}`
                        });
                    }
                });

                return episodes.sort((a, b) => a.number - b.number);
            }

            // Fetch episode list via AJAX
            const ajaxRes = await fetch(
                `${this.apiUrl}/ajax/load-list-episode?ep_start=${epStart}&ep_end=${epEnd}&id=${movieId}&default_ep=0&alias=${alias}`,
                {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Accept': 'text/html',
                        'Referer': `${this.baseUrl}/category/${animeId}`,
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                }
            );

            if (!ajaxRes.ok) {
                throw new Error(`Failed to get episodes: ${ajaxRes.status}`);
            }

            const ajaxHtml = await ajaxRes.text();
            const ajaxDoc = parser.parseFromString(ajaxHtml, 'text/html');

            const episodes = [];
            const epEls = ajaxDoc.querySelectorAll('li a');

            epEls.forEach(el => {
                const href = el.getAttribute('href')?.trim() || '';
                const epNumEl = el.querySelector('.name');
                const epNumText = epNumEl?.textContent?.replace('EP', '').trim() || '0';
                const epNum = parseInt(epNumText);

                const episodeId = href.replace('/', '').trim();

                episodes.push({
                    id: episodeId,
                    number: epNum || episodes.length + 1,
                    title: `Episode ${epNum || episodes.length + 1}`
                });
            });

            return episodes.sort((a, b) => a.number - b.number);
        } catch (error) {
            console.error('[Gogoanime] GetEpisodes error:', error);
            throw error;
        }
    },

    /**
     * Get streaming sources for an episode
     */
    async getEpisodeSources(episodeId, server) {
        console.log('[Gogoanime] Getting sources for:', episodeId);

        try {
            const response = await fetch(
                `${this.baseUrl}/${episodeId}`,
                {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Accept': 'text/html',
                        'Referer': this.baseUrl
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`Failed to get episode page: ${response.status}`);
            }

            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            const sources = [];

            // Find video sources in the page
            const downloadLinks = doc.querySelectorAll('.dowloads a, .download-links a, .mirror_link a');
            downloadLinks.forEach(el => {
                const href = el.getAttribute('href');
                const quality = el.textContent?.match(/(\d+P)/i)?.[1] || 'default';

                if (href && href.includes('.mp4')) {
                    sources.push({
                        url: href,
                        quality: quality,
                        isM3U8: false
                    });
                }
            });

            // Check for embedded player iframe
            const iframeEl = doc.querySelector('.play-video iframe, #load_anime iframe');
            if (iframeEl) {
                const iframeSrc = iframeEl.getAttribute('src');
                if (iframeSrc) {
                    sources.push({
                        url: iframeSrc.startsWith('//') ? `https:${iframeSrc}` : iframeSrc,
                        quality: 'default',
                        isM3U8: false,
                        server: 'embed'
                    });
                }
            }

            // Look for m3u8 sources in scripts
            const scripts = doc.querySelectorAll('script');
            scripts.forEach(script => {
                const content = script.textContent || '';
                const m3u8Match = content.match(/["'](https?:\/\/[^"'\s]+\.m3u8[^"'\s]*)["']/);
                if (m3u8Match) {
                    sources.push({
                        url: m3u8Match[1],
                        quality: 'auto',
                        isM3U8: true
                    });
                }
            });

            return {
                sources,
                headers: {
                    'Referer': this.baseUrl
                }
            };
        } catch (error) {
            console.error('[Gogoanime] GetEpisodeSources error:', error);
            throw error;
        }
    }
};
