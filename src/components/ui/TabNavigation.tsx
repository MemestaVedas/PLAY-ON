import React from 'react';

interface TabNavigationProps {
    onBack: () => void;
    onForward: () => void;
}

const TabNavigation: React.FC<TabNavigationProps> = ({ onBack, onForward }) => {
    return (

        <div
            className="glass-panel px-2 py-1 flex items-center rounded-full border border-white/5 backdrop-blur-md"
            style={{
                background: 'var(--color-bg-glass)',
                borderColor: 'var(--color-border-subtle)',
            }}
        >
            <button
                onClick={onBack}
                className="p-2 w-10 h-10 flex items-center justify-center rounded-full transition-all active:scale-95"
                title="Back"
                style={{
                    fontFamily: 'var(--font-rounded)',
                    color: 'var(--color-text-muted)',
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--color-bg-glass-hover)';
                    e.currentTarget.style.color = 'var(--color-text-main)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = 'var(--color-text-muted)';
                }}
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            <div className="w-px h-4 mx-1" style={{ backgroundColor: 'var(--color-border-subtle)' }}></div>
            <button
                onClick={onForward}
                className="p-2 w-10 h-10 flex items-center justify-center rounded-full transition-all active:scale-95"
                title="Forward"
                style={{
                    color: 'var(--color-text-muted)',
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--color-bg-glass-hover)';
                    e.currentTarget.style.color = 'var(--color-text-main)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = 'var(--color-text-muted)';
                }}
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
            </button>
        </div>
    );

};

export default TabNavigation;
