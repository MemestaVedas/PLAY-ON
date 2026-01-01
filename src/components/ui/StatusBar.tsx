import React from 'react';

const StatusBar: React.FC = () => {
    return (
        <div className="absolute bottom-0 right-8 z-20">
            {/* The Tab itself */}
            <div
                className="relative h-8 rounded-t-[16px] flex items-center justify-center px-6 bg-tab"
            >
                {/* Inverted Corner Join - Left */}
                <div className="absolute -left-4 bottom-0 w-4 h-4 bg-curve">
                    <div className="w-full h-full rounded-br-full bg-content"></div>
                </div>

                {/* Inverted Corner Join - Right */}
                <div className="absolute -right-4 bottom-0 w-4 h-4 bg-curve">
                    <div className="w-full h-full rounded-bl-full bg-content"></div>
                </div>

                {/* Status Content */}
                <div className="flex items-center gap-3 text-xs mb-1">
                    <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        <span className="text-text-secondary">Online</span>
                    </div>
                    <span className="text-text-secondary opacity-30">|</span>
                    <span className="text-text-secondary">v0.1.1</span>
                </div>
            </div>
        </div>
    );
};

export default StatusBar;
