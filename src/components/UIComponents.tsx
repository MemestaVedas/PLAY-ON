/**
 * Shared UI Components
 * 
 * Flat 2D design system with cards and grids
 * Pastel color palette with clean, modern aesthetics
 */

import React from 'react';

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
                background: gradient || 'rgba(255, 255, 255, 0.95)',
                borderRadius: '16px',
                padding: '1.5rem',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
                border: '1px solid rgba(200, 200, 220, 0.2)',
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
    value: string | number;
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
                    fontSize: '2rem',
                    fontWeight: '700',
                    color: color,
                    marginBottom: '0.25rem',
                }}>
                    {value}
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
            {/* Image placeholder */}
            <div style={{
                width: '100%',
                height: '200px',
                background: image || 'linear-gradient(135deg, #E0BBE4 0%, #C7B8EA 100%)',
                borderRadius: '12px',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '3rem',
            }}>
                🎬
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
                <span style={{ fontSize: '0.9rem', color: '#6B7280' }}>
                    {episodes} episodes
                </span>
                <span style={{
                    fontSize: '0.8rem',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '12px',
                    background: status === 'Watching' ? 'rgba(134, 239, 172, 0.3)' : 'rgba(199, 184, 234, 0.3)',
                    color: status === 'Watching' ? '#15803D' : '#6B21A8',
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
                        background: 'linear-gradient(90deg, #C7B8EA 0%, #B8A4E8 100%)',
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
