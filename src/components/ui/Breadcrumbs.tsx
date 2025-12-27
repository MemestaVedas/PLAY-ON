import React from 'react';
import { useLocation } from 'react-router-dom';

const Breadcrumbs: React.FC = () => {
    const location = useLocation();

    // Convert path to breadcrumbs (e.g., "/anime/123" -> ["Home", "Anime", "Details"])
    // This is a simple implementation; mapping routes to names would be more robust in a real app
    const getBreadcrumbs = () => {
        const path = location.pathname;
        if (path === '/home' || path === '/') return ['Home'];

        const parts = path.split('/').filter(Boolean);
        return ['Home', ...parts.map(p => p.charAt(0).toUpperCase() + p.slice(1))];
    };

    const crumbs = getBreadcrumbs();

    return (
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 z-20">
            {/* The Tab itself */}
            <div
                className="relative h-12 rounded-b-[32px] flex items-center justify-center px-8 bg-tab"
            >
                {/* Inverted Corner Join - Left */}
                <div className="absolute -left-6 top-0 w-6 h-6 bg-curve">
                    <div className="w-full h-full rounded-tr-full bg-content"></div>
                </div>

                {/* Inverted Corner Join - Right */}
                <div className="absolute -right-6 top-0 w-6 h-6 bg-curve">
                    <div className="w-full h-full rounded-tl-full bg-content"></div>
                </div>

                {/* Breadcrumb Text */}
                <div className="flex items-center gap-2 text-sm font-medium mb-1">
                    {crumbs.map((crumb, index) => (
                        <React.Fragment key={index}>
                            <span className={index === crumbs.length - 1 ? "text-white" : "text-text-secondary"}>
                                {crumb}
                            </span>
                            {index < crumbs.length - 1 && (
                                <span className="text-text-secondary opacity-50">/</span>
                            )}
                        </React.Fragment>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Breadcrumbs;
