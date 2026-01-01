import React, { useState } from 'react';


interface SidebarItemProps {
    label: string;
    icon: React.ReactNode;
    isActive: boolean;
    onClick: () => void;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ label, icon, isActive, onClick }) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <button
            onClick={onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
                width: '100%',
                padding: '0.75rem 1rem',
                marginBottom: '0.5rem',
                borderRadius: '16px', // Rounded softness
                border: 'none',
                background: isActive ? 'var(--color-zen-surfacehigh)' : 'transparent',
                color: isActive ? '#FFFFFF' : (isHovered ? '#DBDEE1' : '#A1A1AA'),
                fontFamily: 'var(--font-rounded)', // Switch to rounded font if available, or inherit
                fontSize: '0.95rem',
                fontWeight: isActive ? '700' : '500',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)', // Soft springy transition
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                textAlign: 'left',
                position: 'relative',
                overflow: 'hidden',
                letterSpacing: '0.02em', // More breathing room
            }}
        >
            {/* Active Indicator - Soft Pill */}
            {isActive && (
                <div style={{
                    position: 'absolute',
                    left: '6px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    height: '60%',
                    width: '4px',
                    backgroundColor: 'var(--color-zen-accent)',
                    borderRadius: '4px',
                    boxShadow: '0 0 12px var(--color-zen-accent)',
                }} />
            )}

            <div style={{
                fontSize: '1.2rem',
                display: 'flex',
                alignItems: 'center',
                color: isActive ? 'var(--color-zen-accent)' : (isHovered ? '#FFFFFF' : '#71717A'),
                transition: 'color 0.3s ease',
                marginLeft: isActive ? '8px' : '0', // Slight slide effect
            }}>
                {icon}
            </div>

            <span style={{
                opacity: (isActive || isHovered) ? 1 : 0.85,
                transition: 'opacity 0.2s ease'
            }}>
                {label}
            </span>
        </button>
    );
};

export default SidebarItem;
