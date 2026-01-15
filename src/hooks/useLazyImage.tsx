/**
 * Lazy Image Hook
 * 
 * Uses Intersection Observer for lazy loading images
 * only when they enter the viewport.
 */

import { useState, useEffect, useRef } from 'react';

interface UseLazyImageOptions {
    threshold?: number;
    rootMargin?: string;
}

interface UseLazyImageResult {
    ref: React.RefObject<HTMLElement>;
    isLoaded: boolean;
    isInView: boolean;
    src: string | undefined;
}

export function useLazyImage(
    imageSrc: string,
    options: UseLazyImageOptions = {}
): UseLazyImageResult {
    const { threshold = 0.1, rootMargin = '100px' } = options;

    const ref = useRef<HTMLElement>(null);
    const [isInView, setIsInView] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        // Check if IntersectionObserver is supported
        if (!('IntersectionObserver' in window)) {
            setIsInView(true);
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setIsInView(true);
                        observer.unobserve(entry.target);
                    }
                });
            },
            { threshold, rootMargin }
        );

        observer.observe(element);

        return () => {
            observer.disconnect();
        };
    }, [threshold, rootMargin]);

    // Preload image when in view
    useEffect(() => {
        if (!isInView || !imageSrc) return;

        const img = new Image();
        img.onload = () => setIsLoaded(true);
        img.onerror = () => setIsLoaded(true); // Still mark as loaded on error
        img.src = imageSrc;
    }, [isInView, imageSrc]);

    return {
        ref: ref as React.RefObject<HTMLElement>,
        isLoaded,
        isInView,
        src: isInView ? imageSrc : undefined
    };
}

/**
 * LazyImage Component
 * 
 * A ready-to-use component that lazy loads images with
 * skeleton placeholder and fade-in effect.
 */
interface LazyImageProps {
    src: string;
    alt: string;
    className?: string;
    style?: React.CSSProperties;
    placeholderColor?: string;
}

export function LazyImage({
    src,
    alt,
    className = '',
    style = {},
    placeholderColor = 'rgba(255, 255, 255, 0.05)'
}: LazyImageProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isInView, setIsInView] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        const element = containerRef.current;
        if (!element) return;

        if (!('IntersectionObserver' in window)) {
            setIsInView(true);
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setIsInView(true);
                        observer.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.1, rootMargin: '100px' }
        );

        observer.observe(element);

        return () => observer.disconnect();
    }, []);

    return (
        <div
            ref={containerRef}
            className={className}
            style={{
                ...style,
                position: 'relative',
                overflow: 'hidden',
                background: placeholderColor
            }}
        >
            {/* Skeleton Placeholder */}
            {!isLoaded && (
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        background: `linear-gradient(90deg, ${placeholderColor} 25%, rgba(255, 255, 255, 0.08) 50%, ${placeholderColor} 75%)`,
                        backgroundSize: '200% 100%',
                        animation: 'shimmer 1.5s infinite'
                    }}
                />
            )}

            {/* Error State */}
            {hasError && (
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(0, 0, 0, 0.3)',
                        color: 'rgba(255, 255, 255, 0.5)',
                        fontSize: '12px'
                    }}
                >
                    ⚠️
                </div>
            )}

            {/* Actual Image */}
            {isInView && (
                <img
                    src={src}
                    alt={alt}
                    onLoad={() => setIsLoaded(true)}
                    onError={() => {
                        setHasError(true);
                        setIsLoaded(true);
                    }}
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        opacity: isLoaded && !hasError ? 1 : 0,
                        transition: 'opacity 0.3s ease'
                    }}
                />
            )}
        </div>
    );
}

export default useLazyImage;
