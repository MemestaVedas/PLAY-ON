import React from 'react';
import './SkeletonLoader.css';

interface SkeletonProps {
    className?: string;
}

export const SkeletonCard: React.FC<SkeletonProps> = ({ className = '' }) => {
    return (
        <div className={`skeleton-card skeleton-shimmer ${className}`} />
    );
};

interface SkeletonGridProps {
    count?: number;
    className?: string;
}

export const SkeletonGrid: React.FC<SkeletonGridProps> = ({
    count = 4,
    className = "grid grid-cols-2 2xl:grid-cols-4 gap-4 2xl:gap-3"
}) => {
    return (
        <div className={className}>
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className={i >= 4 ? 'hidden 2xl:block' : ''}>
                    <SkeletonCard />
                </div>
            ))}
        </div>
    );
};

export const FadeIn: React.FC<{ children: React.ReactNode, delay?: number, className?: string }> = ({
    children,
    delay = 0,
    className = ""
}) => {
    const [isVisible, setIsVisible] = React.useState(false);

    React.useEffect(() => {
        const timer = setTimeout(() => setIsVisible(true), delay);
        return () => clearTimeout(timer);
    }, [delay]);

    return (
        <div
            className={`transition-all duration-500 ease-out ${className}`}
            style={{
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? 'scale(1)' : 'scale(0.98)',
            }}
        >
            {children}
        </div>
    );
};

export const DetailsSkeleton: React.FC = () => {
    return (
        <div className="relative min-h-full font-rounded pb-20 animate-pulse" style={{ margin: '-96px -32px 0 -32px' }}>
            {/* Banner Skeleton */}
            <div className="relative w-full h-[250px] md:h-[350px] bg-white/5" />

            {/* Main Content Grid */}
            <div className="relative z-10 max-w-[1400px] mx-auto px-6 md:px-10 -mt-32 md:-mt-48 flex flex-col gap-8">
                <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr] gap-8 md:gap-12 items-start">

                    {/* Left Column: Poster */}
                    <div className="relative shrink-0 mx-auto md:mx-0 w-[180px] md:w-full aspect-[2/3] bg-white/10 rounded-xl" />

                    {/* Right Column: Info */}
                    <div className="flex flex-col gap-6 pt-12 md:pt-32">
                        {/* Title lines */}
                        <div className="space-y-3">
                            <div className="h-10 w-3/4 bg-white/10 rounded-lg" />
                            <div className="h-4 w-1/3 bg-white/5 rounded-lg" />
                        </div>

                        {/* Stats Row */}
                        <div className="flex gap-4">
                            <div className="h-24 w-full bg-white/5 rounded-2xl" />
                        </div>

                        {/* Genres */}
                        <div className="flex gap-2">
                            {[1, 2, 3].map(i => <div key={i} className="h-8 w-20 bg-white/10 rounded-full" />)}
                        </div>
                    </div>
                </div>

                {/* Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    {/* Description */}
                    <div className="lg:col-span-3 h-64 bg-white/5 rounded-xl border border-white/5" />

                    {/* Actions */}
                    <div className="lg:col-span-2 flex flex-col gap-4">
                        <div className="h-20 bg-white/10 rounded-2xl" />
                        <div className="h-40 bg-white/5 rounded-2xl" />
                    </div>
                </div>
            </div>
        </div>
    );
};
