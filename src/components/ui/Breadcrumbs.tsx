import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const Breadcrumbs: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();

    // Generate crumbs based on current path
    const getCrumbs = () => {
        const path = location.pathname;
        const crumbs: { label: string; path?: string }[] = [];

        // Always start with Home
        crumbs.push({ label: 'Home', path: '/home' });

        if (path === '/home' || path === '/') {
            return crumbs;
        }

        // Special handling for Local Folder routes
        if (path.startsWith('/local/')) {
            // Add "Local" as static text (no path)
            crumbs.push({ label: 'Local', path: undefined });

            // Extract the encoded folder path
            const encodedPath = path.replace('/local/', '');
            if (!encodedPath) return crumbs;

            try {
                const decodedPath = decodeURIComponent(encodedPath);

                // Get just the last folder name
                const parts = decodedPath.split(/[\\/]/).filter(Boolean);
                const folderName = parts[parts.length - 1] || '';

                // Parse and clean the folder name (remove noise like [SubGroup], quality tags, etc.)
                const parsedName = folderName
                    .replace(/^\[.*?\]\s*/g, '')          // Remove leading [SubGroup]
                    .replace(/\[.*?\]/g, '')               // Remove other [tags]
                    .replace(/\(.*?\)/g, '')               // Remove (stuff in parens)
                    .replace(/\d{3,4}p/gi, '')             // Remove 1080p, 720p, etc.
                    .replace(/HEVC|x265|x264|AVC|AAC|FLAC|OPUS|Dual-Audio|10-bit|BD|BluRay|WEB|DL|Rip/gi, '')
                    .replace(/[_\.]/g, ' ')                // Replace underscores/dots with spaces
                    .replace(/\s+/g, ' ')                  // Collapse multiple spaces
                    .trim();

                crumbs.push({
                    label: parsedName || folderName,  // Fallback to original if parsing removes everything
                    path: `/local/${encodedPath}`
                });

            } catch (e) {
                // Fallback
            }
        }
        else {
            // Generic Route Handling
            const parts = path.split('/').filter(Boolean);
            let accumulatedPath = '';

            parts.forEach(part => {
                accumulatedPath += `/${part}`;
                // Skip if it is just 'local' (shouldn't happen due to if block, but safety check)
                if (part === 'local') return;

                const label = part.charAt(0).toUpperCase() + part.slice(1);
                crumbs.push({ label, path: accumulatedPath });
            });
        }

        return crumbs;
    };

    const crumbs = getCrumbs();

    return (
        <div className="glass-panel px-4 py-2 flex items-center gap-2 bg-black/20 rounded-full border border-white/5 backdrop-blur-md">
            {crumbs.map((crumb, index) => {
                const isLast = index === crumbs.length - 1;
                const isClickable = !isLast && crumb.path;

                return (
                    <React.Fragment key={index}>
                        <span
                            className={`transition-colors text-sm font-medium ${isClickable ? 'text-white/50 hover:text-white cursor-pointer' : 'text-white/30 cursor-default'} ${isLast ? 'text-white font-bold shadow-glow-sm' : ''}`}
                            onClick={() => isClickable && crumb.path && navigate(crumb.path)}
                            style={{ fontFamily: 'var(--font-rounded)' }}
                        >
                            {crumb.label}
                        </span>
                        {!isLast && (
                            <span className="text-white/20 text-xs">/</span>
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
};

export default Breadcrumbs;
