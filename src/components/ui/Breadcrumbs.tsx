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
                // "D:\Anime\Naruto" or "/home/user/anime"

                // Split logic that handles multiple separators
                const parts = decodedPath.split(/[\\/]/).filter(Boolean);

                // Detect system style for reconstruction
                const isWindows = decodedPath.includes(':') || decodedPath.includes('\\');
                const separator = isWindows ? '\\' : '/';

                let currentBuildPath = '';

                // Handle Unix Root if needed
                if (!isWindows && decodedPath.startsWith('/')) {
                    currentBuildPath = '/';
                }

                parts.forEach((part, index) => {
                    // Rebuild path for this segment
                    if (index === 0) {
                        if (isWindows) {
                            currentBuildPath = part;
                            // If "D:", ensure we treat it consistently? 
                            // Usually "D:" alone isn't enough, but "D:\" is. 
                            // Let's assume the split stripped the trailing slash of the root drive if it existed.
                            if (part.endsWith(':')) currentBuildPath += '\\';
                        } else {
                            if (currentBuildPath === '/') currentBuildPath += part;
                            else currentBuildPath = part;
                        }
                    } else {
                        // Add separator
                        if (!currentBuildPath.endsWith(separator)) {
                            currentBuildPath += separator;
                        }
                        currentBuildPath += part;
                    }

                    crumbs.push({
                        label: part,
                        path: `/local/${encodeURIComponent(currentBuildPath)}`
                    });
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
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 z-20 mt-6">
            {/* Simple Text Breadcrumbs */}
            <div className="flex items-center gap-2 text-sm font-medium px-4 py-2">
                {crumbs.map((crumb, index) => {
                    const isLast = index === crumbs.length - 1;
                    const isClickable = !isLast && crumb.path;

                    return (
                        <React.Fragment key={index}>
                            <span
                                className={`transition-colors ${isClickable ? 'text-gray-400 hover:text-white cursor-pointer' : 'text-gray-500 cursor-default'} ${isLast ? 'text-white font-semibold' : ''}`}
                                onClick={() => isClickable && crumb.path && navigate(crumb.path)}
                            >
                                {crumb.label}
                            </span>
                            {!isLast && (
                                <span className="text-gray-600">/</span>
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
};

export default Breadcrumbs;
