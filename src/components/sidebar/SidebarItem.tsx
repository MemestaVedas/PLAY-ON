import React, { useState } from 'react';
import colors from '../../styles/colors';

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
                marginBottom: '0.25rem',
                borderRadius: '8px',
                border: 'none',
                background: isActive ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                color: isActive ? '#FFFFFF' : (isHovered ? '#DBDEE1' : '#B5BAC1'),
                fontSize: '0.95rem',
                fontWeight: isActive ? '600' : '500',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                textAlign: 'left',
                position: 'relative',
                overflow: 'hidden',
                backgroundColor: isActive ? '#404249' : (isHovered ? '#35373C' : 'transparent'),
            }}
        >
            {/* Active Indicator Line */}
            {isActive && (
                <div style={{
                    position: 'absolute',
                    left: 0,
                    top: '20%',
                    bottom: '20%',
                    width: '4px',
                    backgroundColor: colors.pastelPink,
                    borderRadius: '0 4px 4px 0',
                }} />
            )}

            <div style={{
                fontSize: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                color: isActive ? colors.pastelPink : (isHovered ? '#FFFFFF' : '#B5BAC1'),
                transition: 'color 0.2s ease',
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
