/**
 * Empty State Illustration Component
 * 
 * Animated SVG illustrations for empty lists with contextual messaging.
 */

import React from 'react';
import { motion } from 'motion/react';

type EmptyStateType = 'anime' | 'manga' | 'search' | 'history' | 'folder' | 'library' | 'default';

interface EmptyStateIllustrationProps {
    type?: EmptyStateType;
    title?: string;
    message?: string;
    action?: {
        label: string;
        onClick: () => void;
    };
}

const illustrations: Record<EmptyStateType, { icon: React.ReactNode; defaultTitle: string; defaultMessage: string }> = {
    anime: {
        icon: (
            <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="40" cy="40" r="36" stroke="url(#grad)" strokeWidth="2" strokeDasharray="4 4" opacity="0.5" />
                <path d="M32 28L56 40L32 52V28Z" fill="url(#grad)" opacity="0.8" />
                <defs>
                    <linearGradient id="grad" x1="0" y1="0" x2="80" y2="80">
                        <stop stopColor="#b4a2f6" />
                        <stop offset="1" stopColor="#7dd3fc" />
                    </linearGradient>
                </defs>
            </svg>
        ),
        defaultTitle: 'No anime yet',
        defaultMessage: 'Start watching something to see it here'
    },
    manga: {
        icon: (
            <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="20" y="16" width="20" height="48" rx="2" stroke="url(#grad2)" strokeWidth="2" opacity="0.6" />
                <rect x="44" y="20" width="16" height="44" rx="2" stroke="url(#grad2)" strokeWidth="2" opacity="0.4" />
                <path d="M26 28H34M26 34H32M26 40H34" stroke="url(#grad2)" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
                <defs>
                    <linearGradient id="grad2" x1="20" y1="16" x2="60" y2="64">
                        <stop stopColor="#38bdf8" />
                        <stop offset="1" stopColor="#b4a2f6" />
                    </linearGradient>
                </defs>
            </svg>
        ),
        defaultTitle: 'No manga yet',
        defaultMessage: 'Add manga to your library to see it here'
    },
    search: {
        icon: (
            <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="36" cy="36" r="16" stroke="url(#grad3)" strokeWidth="2" strokeDasharray="2 2" opacity="0.5" />
                <line x1="48" y1="48" x2="60" y2="60" stroke="url(#grad3)" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
                <defs>
                    <linearGradient id="grad3" x1="20" y1="20" x2="60" y2="60">
                        <stop stopColor="#b4a2f6" />
                        <stop offset="1" stopColor="#f472b6" />
                    </linearGradient>
                </defs>
            </svg>
        ),
        defaultTitle: 'No results found',
        defaultMessage: 'Try a different search term'
    },
    history: {
        icon: (
            <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="40" cy="40" r="24" stroke="url(#grad4)" strokeWidth="2" opacity="0.5" />
                <path d="M40 28V40L48 48" stroke="url(#grad4)" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
                <defs>
                    <linearGradient id="grad4" x1="16" y1="16" x2="64" y2="64">
                        <stop stopColor="#10b981" />
                        <stop offset="1" stopColor="#38bdf8" />
                    </linearGradient>
                </defs>
            </svg>
        ),
        defaultTitle: 'No watch history',
        defaultMessage: 'Episodes you watch will appear here'
    },
    folder: {
        icon: (
            <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 24H32L36 28H64V56H16V24Z" stroke="url(#grad5)" strokeWidth="2" opacity="0.5" />
                <path d="M32 42L40 50L56 34" stroke="url(#grad5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.3" strokeDasharray="4 4" />
                <defs>
                    <linearGradient id="grad5" x1="16" y1="24" x2="64" y2="56">
                        <stop stopColor="#fbbf24" />
                        <stop offset="1" stopColor="#f97316" />
                    </linearGradient>
                </defs>
            </svg>
        ),
        defaultTitle: 'Folder is empty',
        defaultMessage: 'No media files found in this folder'
    },
    library: {
        icon: (
            <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="24" y="20" width="32" height="44" rx="2" stroke="url(#grad6)" strokeWidth="2" opacity="0.5" />
                <path d="M30 28H50M30 34H50M30 40H42" stroke="url(#grad6)" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
                <circle cx="56" cy="52" r="10" fill="url(#grad6)" opacity="0.3" />
                <path d="M56 48V56M52 52H60" stroke="white" strokeWidth="2" strokeLinecap="round" />
                <defs>
                    <linearGradient id="grad6" x1="24" y1="20" x2="56" y2="64">
                        <stop stopColor="#b4a2f6" />
                        <stop offset="1" stopColor="#38bdf8" />
                    </linearGradient>
                </defs>
            </svg>
        ),
        defaultTitle: 'Library is empty',
        defaultMessage: 'Add items to your library to see them here'
    },
    default: {
        icon: (
            <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="40" cy="40" r="24" stroke="url(#grad7)" strokeWidth="2" strokeDasharray="4 4" opacity="0.4" />
                <path d="M40 32V44M40 48V48.01" stroke="url(#grad7)" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
                <defs>
                    <linearGradient id="grad7" x1="16" y1="16" x2="64" y2="64">
                        <stop stopColor="white" stopOpacity="0.5" />
                        <stop offset="1" stopColor="white" stopOpacity="0.2" />
                    </linearGradient>
                </defs>
            </svg>
        ),
        defaultTitle: 'Nothing here',
        defaultMessage: 'This section is empty'
    }
};

export function EmptyStateIllustration({
    type = 'default',
    title,
    message,
    action
}: EmptyStateIllustrationProps) {
    const config = illustrations[type];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '48px 24px',
                textAlign: 'center',
                minHeight: '280px'
            }}
        >
            {/* Animated Icon */}
            <motion.div
                animate={{
                    y: [0, -8, 0]
                }}
                transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: 'easeInOut'
                }}
                style={{ marginBottom: '24px', opacity: 0.9 }}
            >
                {config.icon}
            </motion.div>

            {/* Title */}
            <h3
                style={{
                    fontSize: '18px',
                    fontWeight: 600,
                    color: 'var(--theme-text-main)',
                    marginBottom: '8px',
                    letterSpacing: '-0.02em'
                }}
            >
                {title || config.defaultTitle}
            </h3>

            {/* Message */}
            <p
                style={{
                    fontSize: '14px',
                    color: 'var(--theme-text-muted)',
                    maxWidth: '300px',
                    lineHeight: 1.5,
                    opacity: 0.7
                }}
            >
                {message || config.defaultMessage}
            </p>

            {/* Action Button */}
            {action && (
                <motion.button
                    onClick={action.onClick}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    style={{
                        marginTop: '24px',
                        padding: '10px 24px',
                        borderRadius: '10px',
                        background: 'var(--theme-gradient-primary)',
                        border: 'none',
                        color: 'white',
                        fontSize: '14px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'box-shadow 0.2s ease'
                    }}
                >
                    {action.label}
                </motion.button>
            )}
        </motion.div>
    );
}

export default EmptyStateIllustration;
