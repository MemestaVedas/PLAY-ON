import React from 'react';

interface TabNavigationProps {
    onBack: () => void;
    onForward: () => void;
}

const TabNavigation: React.FC<TabNavigationProps> = ({ onBack, onForward }) => {
    return (
        <div className="glass-panel px-2 py-1 flex items-center bg-black/20 rounded-full border border-white/5 backdrop-blur-md">
            <button
                onClick={onBack}
                className="p-2 w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-all active:scale-95"
                title="Back"
                style={{ fontFamily: 'var(--font-rounded)' }}
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            <div className="w-px h-4 bg-white/10 mx-1"></div>
            <button
                onClick={onForward}
                className="p-2 w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-all active:scale-95"
                title="Forward"
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
            </button>
        </div>
    );
};

export default TabNavigation;
