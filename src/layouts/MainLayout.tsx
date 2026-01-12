import { useState, useEffect, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/sidebar/Sidebar';
import Titlebar from '../components/titlebar/Titlebar';
import TabNavigation from '../components/ui/TabNavigation';
import SearchBar from '../components/ui/SearchBar';
import Breadcrumbs from '../components/ui/Breadcrumbs';

import FloatingNowPlaying from '../components/ui/FloatingNowPlaying';
import { useDiscordRPC } from '../hooks/useDiscordRPC';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useSearchBar } from '../context/SearchBarContext';
import { useSettings } from '../context/SettingsContext';

/**
 * MainLayout Component
 * 
 * Provides the persistent shell for the application.
 */
function MainLayout() {
    const [sidebarWidth, setSidebarWidth] = useState(200);
    const [isResizing, setIsResizing] = useState(false);

    // Get Discord settings
    const { settings } = useSettings();

    // Discord Rich Presence - now respects user settings
    useDiscordRPC(settings.discordRpcEnabled, settings.discordPrivacyLevel);

    // Keyboard Shortcuts
    const { focusSearch } = useSearchBar();
    useKeyboardShortcuts({
        onSearchAnime: () => focusSearch('anime'),
        onSearchManga: () => focusSearch('manga'),
    });

    const handleBack = () => {
        window.history.back();
    };

    const handleForward = () => {
        window.history.forward();
    };

    const startResizing = useCallback(() => {
        setIsResizing(true);
    }, []);

    const stopResizing = useCallback(() => {
        setIsResizing(false);
    }, []);

    const resize = useCallback((mouseMoveEvent: MouseEvent) => {
        if (isResizing) {
            const newWidth = mouseMoveEvent.clientX;
            if (newWidth >= 180 && newWidth <= 450) {
                setSidebarWidth(newWidth);
            }
        }
    }, [isResizing]);

    useEffect(() => {
        window.addEventListener("mousemove", resize);
        window.addEventListener("mouseup", stopResizing);
        return () => {
            window.removeEventListener("mousemove", resize);
            window.removeEventListener("mouseup", stopResizing);
        };
    }, [resize, stopResizing]);

    return (
        <div style={{
            display: 'flex',
            height: '100vh',
            /* background removed for transparency */
            position: 'relative',
            overflow: 'hidden',
            userSelect: isResizing ? 'none' : 'auto',
        }}>
            {/* Custom Titlebar */}
            <Titlebar />


            {/* Sidebar */}
            <div style={{
                position: 'relative',
                zIndex: 10,
                width: `${sidebarWidth}px`,
                flexShrink: 0,
                height: '100%', // Ensure it takes full height
                display: 'flex', // Flex context for child
                flexDirection: 'column',
            }}>
                <Sidebar width={sidebarWidth} />

                {/* Resize Handle */}
                <div
                    onMouseDown={startResizing}
                    style={{
                        position: 'absolute',
                        right: 0,
                        top: 0,
                        width: '4px',
                        height: '100%',
                        cursor: 'col-resize',
                        zIndex: 101,
                        transition: 'background 0.2s',
                        background: isResizing ? 'rgba(244, 0, 53, 0.3)' : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                        if (!isResizing) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                    }}
                    onMouseLeave={(e) => {
                        if (!isResizing) e.currentTarget.style.background = 'transparent';
                    }}
                />
            </div>

            {/* Main Content Area - Styled as a contained "Canvas" */}
            <div style={{
                marginTop: '42px',   // Clears Titlebar
                marginRight: '8px',
                marginBottom: '8px',
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                height: 'calc(100vh - 50px)', // precise fit (42 + 8 = 50)
                position: 'relative',
                zIndex: 1,
                borderRadius: '24px',
                boxShadow: 'var(--shadow-glass)',
                overflow: 'hidden',
                border: '1px solid var(--color-border-subtle)',
                background: 'var(--color-bg-content)',
            }}>
                {/* Page Content Outlet */}
                <div className="relative flex-1 flex flex-col overflow-hidden">
                    {/* Header Controls Row - Floating Overlay */}
                    <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 pointer-events-none from-[var(--color-bg-main)]/10 to-transparent bg-gradient-to-b">
                        <div className="pointer-events-auto"><TabNavigation onBack={handleBack} onForward={handleForward} /></div>
                        <div className="pointer-events-auto"><Breadcrumbs /></div>
                        <div className="pointer-events-auto"><SearchBar /></div>
                    </div>

                    {/* Status Bar */}


                    {/* Scrollable Content Container - Starts at top, padding pushes content down */}
                    <div id="main-scroll-container" className="flex-1 overflow-y-auto px-8 py-4 pt-24 no-scrollbar">
                        <Outlet />
                    </div>
                </div>
            </div>

            {/* Floating Now Playing Pill - Global overlay */}
            <FloatingNowPlaying />
        </div>
    );
}

export default MainLayout;
