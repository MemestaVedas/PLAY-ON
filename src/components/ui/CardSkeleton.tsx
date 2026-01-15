/**
 * Card Skeleton Component
 * 
 * Animated skeleton placeholder for media cards (anime/manga).
 * Matches the aspect ratio and layout of AnimeCard.
 */

interface CardSkeletonProps {
    count?: number;
}

export function CardSkeleton({ count = 1 }: CardSkeletonProps) {
    return (
        <>
            {Array.from({ length: count }).map((_, index) => (
                <div
                    key={index}
                    style={{
                        position: 'relative',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        aspectRatio: '2/3',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.05)'
                    }}
                >
                    {/* Shimmer Animation */}
                    <div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'linear-gradient(90deg, rgba(255, 255, 255, 0.02) 25%, rgba(255, 255, 255, 0.06) 50%, rgba(255, 255, 255, 0.02) 75%)',
                            backgroundSize: '200% 100%',
                            animation: 'shimmer 1.5s infinite'
                        }}
                    />

                    {/* Bottom Info Skeleton */}
                    <div
                        style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            padding: '12px',
                            background: 'linear-gradient(transparent, rgba(0, 0, 0, 0.8))'
                        }}
                    >
                        {/* Title Skeleton */}
                        <div
                            style={{
                                height: '14px',
                                width: '80%',
                                borderRadius: '4px',
                                background: 'rgba(255, 255, 255, 0.1)',
                                marginBottom: '8px'
                            }}
                        />
                        {/* Subtitle Skeleton */}
                        <div
                            style={{
                                height: '10px',
                                width: '50%',
                                borderRadius: '4px',
                                background: 'rgba(255, 255, 255, 0.06)'
                            }}
                        />
                    </div>
                </div>
            ))}
        </>
    );
}

/**
 * List Skeleton Component
 * 
 * Skeleton placeholder for list items.
 */
interface ListSkeletonProps {
    count?: number;
    height?: number;
}

export function ListSkeleton({ count = 5, height = 72 }: ListSkeletonProps) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {Array.from({ length: count }).map((_, index) => (
                <div
                    key={index}
                    style={{
                        height: `${height}px`,
                        borderRadius: '12px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        position: 'relative',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '12px'
                    }}
                >
                    {/* Shimmer */}
                    <div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'linear-gradient(90deg, rgba(255, 255, 255, 0.02) 25%, rgba(255, 255, 255, 0.06) 50%, rgba(255, 255, 255, 0.02) 75%)',
                            backgroundSize: '200% 100%',
                            animation: 'shimmer 1.5s infinite'
                        }}
                    />

                    {/* Image Placeholder */}
                    <div
                        style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '8px',
                            background: 'rgba(255, 255, 255, 0.08)',
                            flexShrink: 0
                        }}
                    />

                    {/* Text Placeholders */}
                    <div style={{ marginLeft: '16px', flex: 1 }}>
                        <div
                            style={{
                                height: '14px',
                                width: '60%',
                                borderRadius: '4px',
                                background: 'rgba(255, 255, 255, 0.1)',
                                marginBottom: '8px'
                            }}
                        />
                        <div
                            style={{
                                height: '10px',
                                width: '40%',
                                borderRadius: '4px',
                                background: 'rgba(255, 255, 255, 0.06)'
                            }}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}

export default CardSkeleton;
