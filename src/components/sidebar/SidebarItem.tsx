import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface SidebarItemProps {
    label: string;
    icon: React.ReactNode;
    isActive: boolean;
    onClick: () => void;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ label, icon, isActive, onClick }) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <motion.button
            onClick={onClick}
            onHoverStart={() => setIsHovered(true)}
            onHoverEnd={() => setIsHovered(false)}
            whileHover={{ scale: 1.02, backgroundColor: 'rgba(255, 255, 255, 0.03)' }}
            whileTap={{ scale: 0.96 }}
            initial={false}
            animate={{
                backgroundColor: isActive ? 'rgba(180, 162, 246, 0.12)' : 'rgba(255, 255, 255, 0)',
                color: isActive ? 'var(--color-zen-accent)' : (isHovered ? 'var(--color-text-main)' : 'var(--color-text-muted)'),
                borderColor: isActive ? 'rgba(180, 162, 246, 0.15)' : 'rgba(180, 162, 246, 0)',
            }}
            style={{
                width: '100%',
                padding: '0.45rem 0.85rem',
                marginBottom: '0.15rem',
                borderRadius: '12px',
                border: '1px solid transparent', // explicit border width for animation (base style can stay transparent as animate overrides it, but framed prefers matchingtypes. 'rgba(0,0,0,0)' is safer)
                borderColor: 'rgba(0,0,0,0)',
                fontFamily: 'var(--font-rounded)',
                fontSize: '0.9rem',
                fontWeight: isActive ? '700' : '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                textAlign: 'left',
                position: 'relative',
                overflow: 'hidden',
                letterSpacing: '0.01em',
            }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
        >
            {/* Active Indicator - Soft Pill */}
            {isActive && (
                <motion.div
                    layoutId="activeSidebarIndicator"
                    style={{
                        position: 'absolute',
                        left: '0',
                        top: '0',
                        bottom: '0',
                        width: '3px',
                        backgroundColor: 'var(--color-zen-accent)',
                        boxShadow: '0 0 15px var(--color-zen-accent)',
                        opacity: 0.8
                    }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                />
            )}

            <motion.div
                animate={{
                    color: isActive ? 'var(--color-zen-accent)' : (isHovered ? 'var(--color-text-main)' : 'var(--color-text-muted)'),
                    rotate: isHovered ? [0, -10, 10, -5, 5, 0] : 0,
                    scale: isHovered ? 1.1 : 1,
                }}
                transition={{
                    rotate: { duration: 0.5, ease: "easeInOut" },
                    default: { type: "spring", stiffness: 300, damping: 20 }
                }}
                style={{
                    fontSize: '1.1rem',
                    display: 'flex',
                    alignItems: 'center',
                    // Removed x shift for a cleaner look
                }}
            >
                {icon}
            </motion.div>

            <motion.span
                animate={{
                    opacity: (isActive || isHovered) ? 1 : 0.85,
                    color: isActive ? 'var(--color-text-main)' : 'var(--color-text-muted)',
                }}
            >
                {label}
            </motion.span>

            {/* Subtle Glow Background for Active State */}
            {isActive && (
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(90deg, rgba(180, 162, 246, 0.1) 0%, transparent 100%)',
                    pointerEvents: 'none',
                    zIndex: -1
                }} />
            )}
        </motion.button>
    );
};

export default SidebarItem;
