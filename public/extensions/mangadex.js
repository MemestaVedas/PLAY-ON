/**
 * MangaDex Extension Bundle
 * API v5
 */

return {
    id: 'mangadex',
    name: 'MangaDex',
    version: '1.0.0',
    baseUrl: 'https://mangadex.org',
    apiUrl: 'https://api.mangadex.org',
    lang: 'en',

    async search(filter) {
        try {
            const query = filter.query || '';
            const limit = 20;
            const offset = ((filter.page || 1) - 1) * limit;

            // Build URL with includes for cover art and author to minimize requests
            let url = `${this.apiUrl}/manga?limit=${limit}&offset=${offset}&includes[]=cover_art&includes[]=author&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica`;

            if (query) {
                url += `&title=${encodeURIComponent(query)}`;
            } else {
                // Popular items if no query
                url += `&order[followedCount]=desc`;
            }

            const response = await fetch(url);
            const data = await response.json();

            if (data.result !== 'ok') {
                throw new Error('MangaDex API error');
            }

            const mangaList = data.data.map(manga => {
                const id = manga.id;
                const attr = manga.attributes;
                const title = attr.title.en || Object.values(attr.title)[0] || 'Unknown Title';

                // Find cover art relationship
                const coverRel = manga.relationships.find(r => r.type === 'cover_art');
                const fileName = coverRel?.attributes?.fileName;
                const coverUrl = fileName
                    ? `https://uploads.mangadex.org/covers/${id}/${fileName}.256.jpg`
                    : '';

                return {
                    id,
                    title,
                    coverUrl,
                    status: attr.status
                };
            });

            return {
                manga: mangaList,
                hasNextPage: (offset + limit) < data.total
            };
        } catch (e) {
            console.error('[MangaDex] Search failed:', e);
            return { manga: [], hasNextPage: false };
        }
    },

    async getMangaDetails(id) {
        try {
            const url = `${this.apiUrl}/manga/${id}?includes[]=cover_art&includes[]=author&includes[]=artist`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.result !== 'ok') throw new Error('Failed to fetch details');

            const attr = data.data.attributes;
            const title = attr.title.en || Object.values(attr.title)[0];

            const coverRel = data.data.relationships.find(r => r.type === 'cover_art');
            const fileName = coverRel?.attributes?.fileName;
            const coverUrl = fileName
                ? `https://uploads.mangadex.org/covers/${id}/${fileName}`
                : '';

            const authorRel = data.data.relationships.find(r => r.type === 'author');
            const author = authorRel?.attributes?.name || '';

            return {
                id,
                title,
                coverUrl,
                description: attr.description?.en || Object.values(attr.description)[0] || '',
                author,
                status: attr.status
            };
        } catch (e) {
            console.error('[MangaDex] Details failed:', e);
            throw e;
        }
    },

    async getChapters(mangaId) {
        try {
            // Fetch chapters in English, sorted by chapter number desc
            let url = `${this.apiUrl}/manga/${mangaId}/feed?translatedLanguage[]=en&order[chapter]=desc&limit=500&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica`;

            // Note: For very long manga, 500 limit might need pagination, but it's okay for v1
            const response = await fetch(url);
            const data = await response.json();

            if (data.result !== 'ok') return [];

            return data.data
                .filter(ch => ch.attributes.pages > 0) // Skip empty chapters
                .map(ch => ({
                    id: ch.id,
                    number: parseFloat(ch.attributes.chapter) || 0,
                    title: ch.attributes.title || `Chapter ${ch.attributes.chapter}`
                }));
        } catch (e) {
            console.error('[MangaDex] Chapters failed:', e);
            return [];
        }
    },

    async getPages(chapterId) {
        try {
            // Step 1: Get metadata from At-Home server
            const url = `${this.apiUrl}/at-home/server/${chapterId}`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.result !== 'ok') throw new Error('Failed to get chapter metadata');

            const baseUrl = data.baseUrl;
            const hash = data.chapter.hash;
            // Use 'data' for high quality, 'dataSaver' for low quality
            // Defauting to data (high quality)
            const files = data.chapter.data;

            return files.map((file, index) => ({
                index,
                imageUrl: `${baseUrl}/data/${hash}/${file}`
            }));
        } catch (e) {
            console.error('[MangaDex] Pages failed:', e);
            return [];
        }
    }
};
