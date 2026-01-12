/**
 * HiAnime Extension using Tauri HTTP plugin
 * 
 * Uses @tauri-apps/plugin-http to bypass CORS restrictions.
 * Scrapes hianime.to directly with fallback server support.
 */

import { AnimeSource, Anime, Episode, EpisodeSources, AnimeSearchResult, AnimeSearchFilter } from '../services/anime-sources/AnimeSource';
import { fetch } from '@tauri-apps/plugin-http';

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://hianime.to/'
};

export const HiAnimeExtension: AnimeSource = {
    id: 'hianime',
    name: 'HiAnime',
    baseUrl: 'https://hianime.to',
    lang: 'en',
    iconUrl: 'https://hianime.to/favicon.ico',

    async search(filter: AnimeSearchFilter): Promise<AnimeSearchResult> {
        try {
            const query = filter.query || '';
            const page = filter.page || 1;
            const url = `${this.baseUrl}/search?keyword=${encodeURIComponent(query)}&page=${page}`;

            console.log(`[HiAnime] Searching: ${url}`);
            const response = await fetch(url, { method: 'GET', headers: HEADERS });
            const html = await response.text();

            const doc = new DOMParser().parseFromString(html, 'text/html');
            const animeList: Anime[] = [];

            const items = doc.querySelectorAll('.film_list-wrap > .flw-item');
            items.forEach(item => {
                const link = item.querySelector('.film-detail .film-name a');
                const img = item.querySelector('.film-poster > img');

                if (link) {
                    const href = link.getAttribute('href') || '';
                    const id = href.split('/').pop()?.split('?')[0] || '';
                    const title = link.textContent?.trim() || 'Unknown';
                    const coverUrl = img?.getAttribute('data-src') || img?.getAttribute('src') || '';

                    if (id && title) {
                        animeList.push({ id, title, coverUrl, status: 'unknown' });
                    }
                }
            });

            const hasNextPage = !!doc.querySelector('.pagination .page-link[rel="next"]');
            return { anime: animeList, hasNextPage };
        } catch (error) {
            console.error('[HiAnime] Search failed:', error);
            return { anime: [], hasNextPage: false };
        }
    },

    async getAnimeInfo(animeId: string): Promise<Anime> {
        try {
            const url = `${this.baseUrl}/${animeId}`;
            console.log(`[HiAnime] Fetching details: ${url}`);

            const response = await fetch(url, { method: 'GET', headers: HEADERS });
            const html = await response.text();
            const doc = new DOMParser().parseFromString(html, 'text/html');

            const title = doc.querySelector('.anisc-detail .film-name')?.textContent?.trim() || 'Unknown';
            const coverUrl = doc.querySelector('.film-poster img')?.getAttribute('src') || '';
            const description = doc.querySelector('.film-description .text')?.textContent?.trim() || '';

            return {
                id: animeId,
                title,
                coverUrl,
                description,
                status: 'unknown'
            };
        } catch (error) {
            console.error('[HiAnime] Failed to get info:', error);
            throw error;
        }
    },

    async getEpisodes(animeId: string): Promise<Episode[]> {
        try {
            const idParts = animeId.split('-');
            const numericId = idParts[idParts.length - 1];

            if (!numericId) throw new Error('Could not extract numeric ID');

            const ajaxUrl = `${this.baseUrl}/ajax/v2/episode/list/${numericId}`;
            console.log(`[HiAnime] Fetching episodes: ${ajaxUrl}`);

            const response = await fetch(ajaxUrl, {
                method: 'GET',
                headers: { ...HEADERS, 'X-Requested-With': 'XMLHttpRequest' }
            });
            const data: any = await response.json();
            const doc = new DOMParser().parseFromString(data.html, 'text/html');
            const episodes: Episode[] = [];

            doc.querySelectorAll('.ss-list a').forEach(item => {
                const id = item.getAttribute('data-id') || '';
                const number = parseFloat(item.getAttribute('data-number') || '0');
                const title = item.getAttribute('title') || `Episode ${number}`;
                const isFiller = item.classList.contains('ssl-item-filler');

                if (id) {
                    episodes.push({ id, number, title, isFiller });
                }
            });

            return episodes;
        } catch (error) {
            console.error('[HiAnime] Failed to get episodes:', error);
            return [];
        }
    },

    async getEpisodeSources(episodeId: string, _server: string = 'vidcloud'): Promise<EpisodeSources> {
        try {
            // Get servers list
            const serversUrl = `${this.baseUrl}/ajax/v2/episode/servers?episodeId=${episodeId}`;
            const serversResp = await fetch(serversUrl, { headers: HEADERS });
            const serversData: any = await serversResp.json();
            const serversDoc = new DOMParser().parseFromString(serversData.html, 'text/html');

            const serverItems = Array.from(serversDoc.querySelectorAll('.server-item[data-type="sub"]'));
            if (serverItems.length === 0) throw new Error('No servers found');

            console.log(`[HiAnime] Found ${serverItems.length} servers`);

            // Try each server until one works
            for (const serverEl of serverItems) {
                const serverId = serverEl.getAttribute('data-id');
                const serverName = serverEl.textContent?.trim() || 'Unknown';
                if (!serverId) continue;

                try {
                    console.log(`[HiAnime] Trying server: ${serverName}`);
                    const sourcesUrl = `${this.baseUrl}/ajax/v2/episode/sources?id=${serverId}`;
                    const srcRes = await fetch(sourcesUrl, { headers: HEADERS });
                    const srcJson: any = await srcRes.json();

                    if (!srcJson.link) continue;

                    // For iframe sources, extract the actual video URL
                    if (srcJson.type === 'iframe') {
                        console.log(`[HiAnime] Got iframe source: ${srcJson.link}`);
                        const extracted = await extractFromEmbed(srcJson.link);
                        if (extracted) {
                            return extracted;
                        }
                        // Extraction failed, try next server
                        console.warn(`[HiAnime] Extraction failed for ${serverName}, trying next server...`);
                        continue;
                    }

                    // Direct link (rare but possible)
                    if (srcJson.link.includes('.m3u8') || srcJson.link.includes('.mp4')) {
                        return {
                            sources: [{
                                url: srcJson.link,
                                quality: 'auto',
                                isM3U8: srcJson.link.includes('.m3u8'),
                                isBackup: false
                            }],
                            headers: {
                                'Referer': this.baseUrl,
                                'User-Agent': HEADERS['User-Agent']
                            }
                        };
                    }

                    // Unknown link type, skip
                    console.warn(`[HiAnime] Unknown source type: ${srcJson.link}`);
                    continue;
                } catch (e) {
                    console.warn(`[HiAnime] Server ${serverName} failed:`, e);
                }
            }

            throw new Error('All servers failed');
        } catch (error) {
            console.error('[HiAnime] Failed to get sources:', error);
            throw error;
        }
    }
};

// Decryption helper functions for megacloud sources

function keygen2(megacloudKey: string, clientKey: string): string {
    const keygenHashMultVal = 31n;
    const keygenXORVal = 247;
    const keygenShiftVal = 5;

    let tempKey = megacloudKey + clientKey;

    // numeric hash
    let hashVal = 0n;
    for (let i = 0; i < tempKey.length; i++) {
        hashVal =
            BigInt(tempKey.charCodeAt(i)) +
            hashVal * keygenHashMultVal +
            (hashVal << 7n) -
            hashVal;
    }
    // get the absolute value of the hash
    hashVal = hashVal < 0n ? -hashVal : hashVal;
    const lHash = Number(hashVal % 0x7fffffffffffffffn);

    // apply XOR
    tempKey = tempKey
        .split('')
        .map((c) => String.fromCharCode(c.charCodeAt(0) ^ keygenXORVal))
        .join('');

    // circular shift
    const pivot = (lHash % tempKey.length) + keygenShiftVal;
    tempKey = tempKey.slice(pivot) + tempKey.slice(0, pivot);

    // leaf in values
    const leafStr = clientKey.split('').reverse().join('');
    let returnKey = '';
    for (let i = 0; i < Math.max(tempKey.length, leafStr.length); i++) {
        returnKey += (tempKey[i] || '') + (leafStr[i] || '');
    }

    // limit the length of the key based on the hash
    returnKey = returnKey.substring(0, 96 + (lHash % 33));

    // normalise to ASCII values
    returnKey = [...returnKey]
        .map((c) => String.fromCharCode((c.charCodeAt(0) % 95) + 32))
        .join('');

    return returnKey;
}

function seedShuffle2(CharacterArray: string[], iKey: string): string[] {
    // hash the iterations key
    let hashVal = 0n;
    for (let i = 0; i < iKey.length; i++) {
        hashVal = (hashVal * 31n + BigInt(iKey.charCodeAt(i))) & 0xffffffffn;
    }

    // set the seed to the current hash val
    let shuffleNum = hashVal;
    const psudoRand = (arg: number) => {
        shuffleNum = (shuffleNum * 1103515245n + 12345n) & 0x7fffffffn;
        return Number(shuffleNum % BigInt(arg));
    };

    // shuffle the character array based on the seed
    const retStr = [...CharacterArray];
    for (let i = retStr.length - 1; i > 0; i--) {
        const swapIndex = psudoRand(i + 1);
        [retStr[i], retStr[swapIndex]] = [retStr[swapIndex], retStr[i]];
    }
    return retStr;
}

function columnarCipher2(src: string, ikey: string): string {
    const columnCount = ikey.length;
    const rowCount = Math.ceil(src.length / columnCount);

    const cipherArry: string[][] = Array(rowCount)
        .fill(null)
        .map(() => Array(columnCount).fill(' '));

    const keyMap = ikey.split('').map((char, index) => ({ char, idx: index }));
    const sortedMap = [...keyMap].sort((a, b) => a.char.charCodeAt(0) - b.char.charCodeAt(0));

    let srcIndex = 0;
    sortedMap.forEach(({ idx: index }) => {
        for (let i = 0; i < rowCount; i++) {
            cipherArry[i][index] = src[srcIndex++];
        }
    });

    let returnStr = '';
    for (let x = 0; x < rowCount; x++) {
        for (let y = 0; y < columnCount; y++) {
            returnStr += cipherArry[x][y];
        }
    }
    return returnStr;
}

function decryptSrc2(src: string, clientKey: string, megacloudKey: string): string {
    const layers = 3;
    const genKey = keygen2(megacloudKey, clientKey);
    let decSrc = atob(src);
    const charArray = [...Array(95)].map((_val, index) => String.fromCharCode(32 + index));

    const reverseLayer = (iteration: number) => {
        const layerKey = genKey + iteration;
        let hashVal = 0n;
        for (let i = 0; i < layerKey.length; i++) {
            hashVal = (hashVal * 31n + BigInt(layerKey.charCodeAt(i))) & 0xffffffffn;
        }
        let seed = hashVal;

        const seedRand = (arg: number) => {
            seed = (seed * 1103515245n + 12345n) & 0x7fffffffn;
            return Number(seed % BigInt(arg));
        };

        // seed shift
        decSrc = decSrc
            .split('')
            .map((char) => {
                const cArryIndex = charArray.indexOf(char);
                if (cArryIndex === -1) return char;
                const randNum = seedRand(95);
                const newCharIndex = (cArryIndex - randNum + 95) % 95;
                return charArray[newCharIndex];
            })
            .join('');

        // perform the transposition cipher
        decSrc = columnarCipher2(decSrc, layerKey);

        // generate the substitution array
        const subValues = seedShuffle2(charArray, layerKey);

        // character map building
        const charMap: { [key: string]: string } = {};
        subValues.forEach((char: string, index: number) => {
            charMap[char] = charArray[index];
        });

        // sub any character in the charmap with its charArry character
        decSrc = decSrc
            .split('')
            .map((char) => charMap[char] || char)
            .join('');
    };

    for (let i = layers; i > 0; i--) {
        reverseLayer(i);
    }

    const dataLen = parseInt(decSrc.substring(0, 4), 10);
    return decSrc.substring(4, 4 + dataLen);
}

async function getMegaCloudClientKey(xrax: string): Promise<string | null> {
    try {
        const req = await fetch(`https://megacloud.blog/embed-2/v3/e-1/${xrax}`, {
            headers: { ...HEADERS, 'Referer': 'https://hianime.to/' }
        });
        const text = await req.text();

        // Regex patterns for various obfuscation methods
        const regexPatterns = [
            /<meta name="_gg_fb" content="[a-zA-Z0-9]+">/,
            /<!--\s+_is_th:[0-9a-zA-Z]+\s+-->/,
            /<script>window._lk_db\s+=\s+\{[xyz]:\s+["'][a-zA-Z0-9]+["'],\s+[xyz]:\s+["'][a-zA-Z0-9]+["'],\s+[xyz]:\s+["'][a-zA-Z0-9]+["']\};<\/script>/,
            /<div\s+data-dpi="[0-9a-zA-Z]+"\s+.*><\/div>/,
            /<script nonce="[0-9a-zA-Z]+">/,
            /<script>window._xy_ws = ['"`][0-9a-zA-Z]+['"`];<\/script>/,
        ];

        const keyRegex = /"[a-zA-Z0-9]+"/;

        let match: RegExpMatchArray | null = null;
        let patternIndex = 0;

        for (let i = 0; i < regexPatterns.length; i++) {
            match = text.match(regexPatterns[i]);
            if (match !== null) {
                patternIndex = i;
                break;
            }
        }

        if (match === null) {
            console.warn('[HiAnime] Failed extracting client key segment');
            return null;
        }

        let clientKey = '';

        if (patternIndex === 2) {
            // 3-part key in script
            const lk_db_regex = [
                /x:\s+"[a-zA-Z0-9]+"/,
                /y:\s+"[a-zA-Z0-9]+"/,
                /z:\s+"[a-zA-Z0-9]+"/,
            ];
            const x = match[0].match(lk_db_regex[0]);
            const y = match[0].match(lk_db_regex[1]);
            const z = match[0].match(lk_db_regex[2]);
            if (x && y && z) {
                const p1 = x[0].match(keyRegex);
                const p2 = y[0].match(keyRegex);
                const p3 = z[0].match(keyRegex);
                if (p1 && p2 && p3) {
                    clientKey = `${p1[0].replace(/"/g, '')}${p2[0].replace(/"/g, '')}${p3[0].replace(/"/g, '')}`;
                }
            }
        } else if (patternIndex === 1) {
            // Comment pattern
            const keyTest = match[0].match(/:[a-zA-Z0-9]+ /);
            if (keyTest) {
                clientKey = keyTest[0].replace(':', '').replace(' ', '');
            }
        } else {
            // All other patterns
            const keyTest = match[0].match(keyRegex);
            if (keyTest) {
                clientKey = keyTest[0].replace(/"/g, '');
            }
        }

        console.log(`[HiAnime] Client key extracted: ${clientKey.substring(0, 8)}...`);
        return clientKey;
    } catch (err) {
        console.error('[HiAnime] Failed to get client key:', err);
        return null;
    }
}

async function getMegaCloudKey(): Promise<string | null> {
    try {
        const res = await fetch(
            'https://raw.githubusercontent.com/yogesh-hacker/MegacloudKeys/refs/heads/main/keys.json',
            { headers: HEADERS }
        );
        console.log(`[HiAnime] Megacloud keys fetch status: ${res.status}`);
        const data = await res.json();
        const key = data.mega || null;
        console.log(`[HiAnime] Megacloud key fetched: ${key ? key.substring(0, 10) + '...' : 'null'}`);
        return key;
    } catch (err) {
        console.error('[HiAnime] Failed to fetch megacloud key:', err);
        return null;
    }
}

// Helper function to extract video URL from embed page
async function extractFromEmbed(embedUrl: string): Promise<EpisodeSources | null> {
    try {
        console.log(`[HiAnime] Extracting from embed: ${embedUrl}`);

        // Parse the embed URL to get the video ID
        const urlObj = new URL(embedUrl);
        const pathParts = urlObj.pathname.split('/');

        // Find the ID (usually after 'e-1' or similar)
        let videoId = '';
        for (let i = 0; i < pathParts.length; i++) {
            if (pathParts[i].startsWith('e-') && pathParts[i + 1]) {
                videoId = pathParts[i + 1].split('?')[0];
                break;
            }
        }

        if (!videoId) {
            // Try last segment
            videoId = pathParts[pathParts.length - 1].split('?')[0];
        }

        console.log(`[HiAnime] Video ID: ${videoId}`);

        // Try v3 API with decryption first (most reliable)
        try {
            const clientKey = await getMegaCloudClientKey(videoId);
            const megacloudKey = await getMegaCloudKey();

            if (clientKey && megacloudKey) {
                const v3Url = `https://megacloud.blog/embed-2/v3/e-1/getSources?id=${videoId}&_k=${clientKey}`;

                const res = await fetch(v3Url, {
                    headers: {
                        ...HEADERS,
                        'X-Requested-With': 'XMLHttpRequest',
                        'Referer': embedUrl
                    }
                });

                if (res.status === 200) {
                    const data = await res.json();

                    let sources: any[];

                    if (data.encrypted && typeof data.sources === 'string') {
                        try {
                            const decrypted = decryptSrc2(data.sources, clientKey, megacloudKey);
                            sources = JSON.parse(decrypted);
                        } catch (decryptError) {
                            console.error('[HiAnime] Decryption failed:', decryptError);
                            throw decryptError;
                        }
                    } else if (Array.isArray(data.sources)) {
                        sources = data.sources;
                    } else {
                        throw new Error('No valid sources in response');
                    }

                    const result = {
                        sources: sources.map((s: any) => ({
                            url: s.file || s.url,
                            quality: s.quality || 'auto',
                            isM3U8: (s.file || s.url || '').includes('.m3u8') || s.type === 'hls',
                            isBackup: false
                        })),
                        subtitles: data.tracks?.filter((t: any) => t.kind === 'captions')?.map((t: any) => ({
                            url: t.file,
                            lang: t.label
                        })),
                        headers: {
                            'Referer': 'https://megacloud.blog/',
                            'Origin': 'https://megacloud.blog',
                            'User-Agent': HEADERS['User-Agent'],
                            'Accept': '*/*',
                            'Accept-Language': 'en-US,en;q=0.9',
                        }
                    };
                    console.log(`[HiAnime] Found ${result.sources.length} sources`);
                    return result;
                }
            }
        } catch (e) {
            console.error('[HiAnime] v3 API extraction failed:', e);
        }

        // Fallback to legacy endpoints
        const endpoints = [
            `${urlObj.origin}/embed-2/ajax/e-1/getSources?id=${videoId}`,
            `${urlObj.origin}/ajax/embed-6/getSources?id=${videoId}`,
            `${urlObj.origin}/ajax/embed-6-v2/getSources?id=${videoId}`,
        ];

        for (const endpoint of endpoints) {
            try {
                const res = await fetch(endpoint, {
                    headers: {
                        ...HEADERS,
                        'X-Requested-With': 'XMLHttpRequest',
                        'Referer': embedUrl
                    }
                });

                if (res.status !== 200) continue;

                const text = await res.text();
                let data: any;
                try {
                    data = JSON.parse(text);
                } catch {
                    continue;
                }

                // Check if sources are encrypted (can't handle without keys)
                if (data.encrypted === true && typeof data.sources === 'string') {
                    continue; // Skip encrypted responses from legacy endpoints
                }

                // Check for valid sources array
                if (data.sources && Array.isArray(data.sources) && data.sources.length > 0) {
                    console.log(`[HiAnime] Got ${data.sources.length} sources from legacy endpoint`);
                    return {
                        sources: data.sources.map((s: any) => ({
                            url: s.file || s.url,
                            quality: s.quality || 'auto',
                            isM3U8: (s.file || s.url || '').includes('.m3u8'),
                            isBackup: false
                        })),
                        subtitles: data.tracks?.filter((t: any) => t.kind === 'captions')?.map((t: any) => ({
                            url: t.file,
                            lang: t.label
                        })),
                        headers: {
                            'Referer': urlObj.origin,
                            'User-Agent': HEADERS['User-Agent']
                        }
                    };
                }
            } catch (e) {
                // Ignore silent failures for fallbacks
            }
        }

        return null;
    } catch (e) {
        console.error('[HiAnime] Extraction failed:', e);
        return null;
    }
}
