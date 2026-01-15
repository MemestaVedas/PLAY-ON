import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const Breadcrumbs: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();

    // Route-to-parent mapping for proper breadcrumb navigation
    // This ensures we only link to VALID routes that exist in the app
    const routeConfig: Record<string, { parent: { label: string; path: string } | null; labelOverride?: string }> = {
        // Anime routes
        '/anime-list': { parent: null, labelOverride: 'Anime List' },
        '/anime-browse': { parent: null, labelOverride: 'Browse Anime' },
        '/local-anime': { parent: null, labelOverride: 'Watch Anime' },

        // Manga routes
        '/manga-list': { parent: null, labelOverride: 'Manga List' },
        '/manga-browse': { parent: null, labelOverride: 'Browse Manga' },
        '/local-manga': { parent: null, labelOverride: 'Read Manga' },

        // Other top-level pages
        '/my-list': { parent: null, labelOverride: 'My List' },
        '/calendar': { parent: null, labelOverride: 'Calendar' },
        '/statistics': { parent: null, labelOverride: 'Statistics' },
        '/settings': { parent: null, labelOverride: 'Settings' },
        '/notifications': { parent: null, labelOverride: 'Notifications' },
        '/history': { parent: null, labelOverride: 'History' },
    };

    // Generate crumbs based on current path
    const getCrumbs = () => {
        const path = location.pathname;
        const crumbs: { label: string; path?: string }[] = [];

        // Always start with Home
        crumbs.push({ label: 'Home', path: '/home' });

        if (path === '/home' || path === '/') {
            return crumbs;
        }

        // Check if this is a configured route
        const configuredRoute = routeConfig[path];
        if (configuredRoute) {
            if (configuredRoute.parent) {
                crumbs.push(configuredRoute.parent);
            }
            crumbs.push({
                label: configuredRoute.labelOverride || path.split('/').pop() || '',
                path
            });
            return crumbs;
        }

        // Handle dynamic routes with proper parents

        // /anime/:id -> Parent: Anime List
        if (path.match(/^\/anime\/\d+$/)) {
            crumbs.push({ label: 'Anime List', path: '/anime-list' });
            // The current page title will be added by the page itself or we show the ID
            const animeId = path.split('/').pop();
            crumbs.push({ label: `#${animeId}`, path: undefined });
            return crumbs;
        }

        // /manga-details/:id -> Parent: Manga List
        if (path.match(/^\/manga-details\/\d+$/)) {
            crumbs.push({ label: 'Manga List', path: '/manga-list' });
            const mangaId = path.split('/').pop();
            crumbs.push({ label: `#${mangaId}`, path: undefined });
            return crumbs;
        }

        // /user/:username -> Parent: Home (no intermediate)
        if (path.startsWith('/user/')) {
            const username = path.split('/').pop();
            crumbs.push({ label: username || 'Profile', path: undefined });
            return crumbs;
        }

        // /anime-source/:sourceId/:animeId -> Parent: Browse Anime
        if (path.startsWith('/anime-source/')) {
            crumbs.push({ label: 'Browse Anime', path: '/anime-browse' });
            const parts = path.split('/').filter(Boolean);
            if (parts.length >= 2) {
                const sourceName = parts[1].charAt(0).toUpperCase() + parts[1].slice(1);
                crumbs.push({ label: sourceName, path: undefined });
            }
            return crumbs;
        }

        // /watch/:sourceId/:episodeId -> Parent: Browse Anime
        if (path.startsWith('/watch/')) {
            crumbs.push({ label: 'Browse Anime', path: '/anime-browse' });
            crumbs.push({ label: 'Now Playing', path: undefined });
            return crumbs;
        }

        // /manga/:sourceId/:mangaId -> Parent: Browse Manga
        if (path.match(/^\/manga\/[^/]+\/[^/]+$/)) {
            crumbs.push({ label: 'Browse Manga', path: '/manga-browse' });
            const parts = path.split('/').filter(Boolean);
            if (parts.length >= 2) {
                const sourceName = parts[1].charAt(0).toUpperCase() + parts[1].slice(1);
                crumbs.push({ label: sourceName, path: undefined });
            }
            return crumbs;
        }

        // /read/:sourceId/:chapterId -> Parent: Browse Manga
        if (path.startsWith('/read/')) {
            crumbs.push({ label: 'Browse Manga', path: '/manga-browse' });
            crumbs.push({ label: 'Reading', path: undefined });
            return crumbs;
        }

        // /local/:folderPath -> Special handling for local folders
        if (path.startsWith('/local/')) {
            crumbs.push({ label: 'Local', path: undefined });

            const encodedPath = path.replace('/local/', '');
            if (encodedPath) {
                try {
                    const decodedPath = decodeURIComponent(encodedPath);
                    const parts = decodedPath.split(/[\\/]/).filter(Boolean);
                    const folderName = parts[parts.length - 1] || '';

                    // Clean up folder name
                    const parsedName = folderName
                        .replace(/^\[.*?\]\s*/g, '')
                        .replace(/\[.*?\]/g, '')
                        .replace(/\(.*?\)/g, '')
                        .replace(/\d{3,4}p/gi, '')
                        .replace(/HEVC|x265|x264|AVC|AAC|FLAC|OPUS|Dual-Audio|10-bit|BD|BluRay|WEB|DL|Rip/gi, '')
                        .replace(/[_\.]/g, ' ')
                        .replace(/\s+/g, ' ')
                        .trim();

                    crumbs.push({
                        label: parsedName || folderName,
                        path: undefined
                    });
                } catch (e) {
                    crumbs.push({ label: 'Folder', path: undefined });
                }
            }
            return crumbs;
        }

        // Fallback: Just show the path segment as-is (but don't make intermediate paths clickable)
        const parts = path.split('/').filter(Boolean);
        if (parts.length > 0) {
            const lastPart = parts[parts.length - 1];
            const label = lastPart
                .replace(/-/g, ' ')
                .replace(/^\w/, c => c.toUpperCase());
            crumbs.push({ label, path: undefined });
        }

        return crumbs;
    };

    const crumbs = getCrumbs();

    return (
        <div
            className="glass-panel px-4 py-2 flex items-center gap-2 rounded-full backdrop-blur-md"
            style={{
                backgroundColor: 'var(--theme-bg-glass)',
                border: '1px solid var(--theme-border-subtle)'
            }}
        >
            {crumbs.map((crumb, index) => {
                const isLast = index === crumbs.length - 1;
                const isClickable = !isLast && crumb.path;

                return (
                    <React.Fragment key={index}>
                        <span
                            className="transition-colors text-sm font-medium"
                            onClick={() => isClickable && crumb.path && navigate(crumb.path)}
                            style={{
                                fontFamily: 'var(--font-rounded)',
                                color: isLast
                                    ? 'var(--theme-text-main)'
                                    : isClickable
                                        ? 'var(--theme-text-muted)'
                                        : 'var(--theme-text-muted)',
                                cursor: isClickable ? 'pointer' : 'default',
                                fontWeight: isLast ? 'bold' : 'normal',
                                opacity: isClickable ? 0.7 : (isLast ? 1 : 0.5)
                            }}
                        >
                            {crumb.label}
                        </span>
                        {!isLast && (
                            <span style={{ color: 'var(--theme-text-muted)', opacity: 0.4 }} className="text-xs">/</span>
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
};

export default Breadcrumbs;
