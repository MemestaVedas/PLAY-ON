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
