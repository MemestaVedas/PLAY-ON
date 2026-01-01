/**
 * Shared UI Components
 * 
 * Glassmorphic design system
 */

import React from 'react';
import Counter from './Counter';

// ============================================================================
// SKELETON LOADER
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
                background: 'linear-gradient(90deg, rgba(255, 255, 255, 0.05) 25%, rgba(255, 255, 255, 0.1) 50%, rgba(255, 255, 255, 0.05) 75%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.5s infinite',
                ...style,
            }}
        />
    );
};

// ============================================================================
// PAGE TRANSITION
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
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes shimmer {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }
            `}</style>
        </div>
    );
};

// ============================================================================
// Card Component - Glassmorphic Base
// ============================================================================
interface CardProps {
    children: React.ReactNode;
    onClick?: () => void;
    hover?: boolean;
    style?: React.CSSProperties;
    className?: string;
}

export const Card: React.FC<CardProps> = ({ children, onClick, hover = false, style, className = '' }) => {
    return (
        <div
            onClick={onClick}
            className={`glass-panel ${className}`}
            style={{
                background: 'rgba(20, 20, 25, 0.6)',
                backdropFilter: 'blur(12px) saturate(180%)',
                borderRadius: '16px',
                padding: '1.5rem',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                cursor: onClick ? 'pointer' : 'default',
                transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
                ...style
            }}
            onMouseEnter={(e) => {
                if (hover) {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 12px 30px rgba(0, 0, 0, 0.3)';
                    e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.1)';
                    e.currentTarget.style.background = 'rgba(30, 30, 35, 0.7)';
                }
            }}
            onMouseLeave={(e) => {
                if (hover) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.2)',
                        e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.05)';
                    e.currentTarget.style.background = 'rgba(20, 20, 25, 0.6)';
                }
            }}
        >
            {children}
        </div>
    );
};

// ============================================================================
// Stat Card
// ============================================================================
interface StatCardProps {
    icon: string;
    label: string;
    value: number;
    color: string;
    onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({ icon, label, value, color, onClick }) => {
    return (
        <Card hover onClick={onClick}>
            <div style={{ textAlign: 'center' }}>
                <div style={{
                    fontSize: '2rem',
                    marginBottom: '0.5rem',
                    textShadow: `0 0 20px ${color}40`,
                    filter: 'grayscale(0.2)',
                }}>
                    {icon}
                </div>
                <div style={{ marginBottom: '0.25rem', display: 'flex', justifyContent: 'center' }}>
                    <Counter
                        value={value}
                        places={value >= 100 ? [100, 10, 1] : [10, 1]}
                        fontSize={36}
                        padding={4}
                        gap={4}
                        textColor={color}
                        fontWeight={800}
                        gradientHeight={0}
                    />
                </div>
                <div style={{
                    fontSize: '0.75rem',
                    color: 'rgba(255, 255, 255, 0.5)',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    fontWeight: 600,
                    fontFamily: 'var(--font-mono)',
                }}>
                    {label}
                </div>
            </div>
        </Card>
    );
};

// ============================================================================
// Section Header
// ============================================================================
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
                color: '#fff',
                marginBottom: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                fontFamily: 'var(--font-rounded)',
                letterSpacing: '-0.02em',
                textShadow: '0 2px 10px rgba(0,0,0,0.3)',
            }}>
                {icon && <span style={{ fontSize: '2rem', filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.2))' }}>{icon}</span>}
                {title}
            </h2>
            {subtitle && (
                <p style={{
                    fontSize: '1rem',
                    color: 'rgba(255, 255, 255, 0.5)',
                    fontWeight: 500,
                }}>
                    {subtitle}
                </p>
            )}
        </div>
    );
};

// ============================================================================
// Empty State
// ============================================================================
interface EmptyStateProps {
    icon: string;
    title: string;
    description: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description }) => {
    return (
        <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1.5rem', opacity: 0.3, filter: 'grayscale(1)' }}>
                {icon}
            </div>
            <h3 style={{
                fontSize: '1.25rem',
                fontWeight: '600',
                color: '#fff',
                marginBottom: '0.5rem',
            }}>
                {title}
            </h3>
            <p style={{
                fontSize: '0.9rem',
                color: 'rgba(255, 255, 255, 0.4)',
                maxWidth: '400px',
                margin: '0 auto',
            }}>
                {description}
            </p>
        </div>
    );
};
