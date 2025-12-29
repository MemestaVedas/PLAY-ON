/**
 * Shared UI Components
 * 
 * Flat 2D design system with cards and grids
 * Pastel color palette with clean, modern aesthetics
 */

import React from 'react';
import colors from '../../styles/colors';
import Counter from './Counter';

// ============================================================================
// SKELETON LOADER - Animated loading placeholder
// ============================================================================
interface SkeletonProps {
    width?: string | number;
    height?: string | number;
    borderRadius?: string;
    style?: React.CSSProperties;
}

export const Skeleton: React.FC<SkeletonProps> = ({
    width = '100%',
    height = '1rem',
    borderRadius = '8px',
    style
}) => {
    return (
        <div
            style={{
                width,
                height,
                borderRadius,
                background: 'linear-gradient(90deg, rgba(75, 75, 110, 0.2) 25%, rgba(100, 100, 140, 0.3) 50%, rgba(75, 75, 110, 0.2) 75%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.5s infinite',
                ...style,
            }}
        />
    );
};

// ============================================================================
// PAGE TRANSITION - Wrapper for smooth page animations
// ============================================================================
interface PageTransitionProps {
    children: React.ReactNode;
}

export const PageTransition: React.FC<PageTransitionProps> = ({ children }) => {
    return (
        <div
            style={{
                animation: 'fadeSlideIn 0.3s ease-out',
            }}
        >
            {children}
            <style>{`
                @keyframes fadeSlideIn {
                    from {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                @keyframes shimmer {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }
            `}</style>
        </div>
    );
};



// Card Component - Base building block
interface CardProps {
    children: React.ReactNode;
    onClick?: () => void;
    hover?: boolean;
    gradient?: string;
}

export const Card: React.FC<CardProps> = ({ children, onClick, hover = false, gradient }) => {
    return (
        <div
            onClick={onClick}
            style={{
                background: gradient || colors.backgroundCard,
                borderRadius: '16px',
                padding: '1.5rem',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
                border: '1px solid rgba(255, 181, 197, 0.1)',
                cursor: onClick ? 'pointer' : 'default',
                transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => {
                if (hover) {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 8px 20px rgba(0, 0, 0, 0.1)';
                }
            }}
            onMouseLeave={(e) => {
                if (hover) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.06)';
                }
            }}
        >
            {children}
        </div>
    );
};

// Stat Card - For displaying statistics
interface StatCardProps {
    icon: string;
    label: string;
    value: number;
    color: string;
}

export const StatCard: React.FC<StatCardProps> = ({ icon, label, value, color }) => {
    return (
        <Card hover>
            <div style={{ textAlign: 'center' }}>
                <div style={{
                    fontSize: '2.5rem',
                    marginBottom: '0.5rem',
                }}>
                    {icon}
                </div>
                <div style={{
                    marginBottom: '0.5rem',
                    display: 'flex',
                    justifyContent: 'center',
                }}>
                    <Counter
                        value={value}
                        places={value >= 100 ? [100, 10, 1] : [10, 1]}
                        fontSize={48}
                        padding={5}
                        gap={4}
                        textColor={color}
                        fontWeight={700}
                        gradientHeight={0}
                    />
                </div>
                <div style={{
                    fontSize: '0.9rem',
                    color: '#6B7280',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                }}>
                    {label}
                </div>
            </div>
        </Card>
    );
};

// Anime Card - For anime list items
interface AnimeCardProps {
    title: string;
    episodes: number;
    status: string;
    progress?: number;
    image?: string;
    onClick?: () => void;
}

export const AnimeCard: React.FC<AnimeCardProps> = ({
    title,
    episodes,
    status,
    progress = 0,
    image,
    onClick
}) => {
    return (
        <Card onClick={onClick} hover>
            {/* Image container */}
            <div style={{
                width: '100%',
                height: '240px',
                background: image ? `url(${image})` : colors.pastelLavender,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                borderRadius: '12px',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '3rem',
                position: 'relative',
                boxShadow: 'inset 0 0 40px rgba(0,0,0,0.2)',
            }}>
                {!image && '🎬'}

                {/* Subtle glass overlay at bottom */}
                <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '40%',
                    background: 'linear-gradient(transparent, rgba(0,0,0,0.6))',
                    borderRadius: '0 0 12px 12px',
                }} />
            </div>

            {/* Title */}
            <h3 style={{
                fontSize: '1.1rem',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '0.5rem',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
            }}>
                {title}
            </h3>

            {/* Info */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.75rem',
            }}>
                <span style={{ fontSize: '0.9rem', color: colors.mediumGray }}>
                    {episodes} episodes
                </span>
                <span style={{
                    fontSize: '0.8rem',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '12px',
                    background: status === 'Watching' ? colors.pastelGreen : colors.pastelPurple,
                    color: status === 'Watching' ? colors.greenDark : colors.purpleDark,
                    fontWeight: '600',
                }}>
                    {status}
                </span>
            </div>

            {/* Progress bar */}
            {progress > 0 && (
                <div style={{
                    width: '100%',
                    height: '6px',
                    background: 'rgba(200, 200, 220, 0.3)',
                    borderRadius: '3px',
                    overflow: 'hidden',
                }}>
                    <div style={{
                        width: `${progress}%`,
                        height: '100%',
                        background: colors.pastelPurple,
                        transition: 'width 0.3s ease',
                    }} />
                </div>
            )}
        </Card>
    );
};

// Section Header
interface SectionHeaderProps {
    title: string;
    subtitle?: string;
    icon?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, subtitle, icon }) => {
    return (
        <div style={{ marginBottom: '2rem' }}>
            <h2 style={{
                fontSize: '2rem',
                fontWeight: '700',
                color: '#374151',
                marginBottom: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
            }}>
                {icon && <span style={{ fontSize: '2.5rem' }}>{icon}</span>}
                {title}
            </h2>
            {subtitle && (
                <p style={{
                    fontSize: '1rem',
                    color: '#6B7280',
                }}>
                    {subtitle}
                </p>
            )}
        </div>
    );
};

// Empty State
interface EmptyStateProps {
    icon: string;
    title: string;
    description: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description }) => {
    return (
        <div style={{
            textAlign: 'center',
            padding: '4rem 2rem',
        }}>
            <div style={{ fontSize: '5rem', marginBottom: '1rem', opacity: 0.5 }}>
                {icon}
            </div>
            <h3 style={{
                fontSize: '1.5rem',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '0.5rem',
            }}>
                {title}
            </h3>
            <p style={{
                fontSize: '1rem',
                color: '#6B7280',
            }}>
                {description}
            </p>
        </div>
    );
};
