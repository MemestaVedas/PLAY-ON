import { useState, useEffect, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/sidebar/Sidebar';
import Titlebar from '../components/titlebar/Titlebar';
import TabNavigation from '../components/ui/TabNavigation';
import SearchBar from '../components/ui/SearchBar';
import Breadcrumbs from '../components/ui/Breadcrumbs';
import StatusBar from '../components/ui/StatusBar';

/**
 * MainLayout Component
 * 
 * Provides the persistent shell for the application.
 */
function MainLayout() {
    const [sidebarWidth, setSidebarWidth] = useState(200);
    const [isResizing, setIsResizing] = useState(false);

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
            minHeight: '100vh',
            background: '#1E1F22', // Shell Background
            position: 'relative',
            overflow: 'hidden',
            userSelect: isResizing ? 'none' : 'auto',
        }}>
            {/* Custom Titlebar */}
            <Titlebar />


            {/* Sidebar */}
            <div style={{ position: 'relative', zIndex: 10 }}>
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
                        zIndex: 100,
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
            {/* Main Content Area - Styled as a contained "Canvas" */}
            <div style={{
                marginLeft: `${sidebarWidth + 8}px`, // Dynamic margin
                marginTop: '40px',   // Gap from Titlebar
                marginRight: '8px',
                marginBottom: '8px',
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                height: 'calc(100vh - 48px)', // Remaining height
                position: 'relative',
                zIndex: 1,
                borderRadius: '16px', // Rounded separation
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                overflow: 'hidden', // Contain scrolling
            }} className="bg-content">
                {/* Page Content Outlet */}
                <div className="relative flex-1 flex flex-col overflow-hidden bg-content">
                    {/* Custom Corner Tab Navigation */}
                    <TabNavigation onBack={handleBack} onForward={handleForward} />

                    {/* Center Breadcrumbs */}
                    <Breadcrumbs />

                    {/* Top Right Controls */}
                    <div className="absolute top-0 right-0 z-20 flex">
                        <SearchBar />
                    </div>


                    {/* Search Bar - Component handles its own positioning, but wrapping it to coexist */}
                    {/* (Search Bar is absolute top-right, handled by its component CSS) */}

                    {/* Status Bar */}
                    <StatusBar />

                    {/* Scrollable Content Container */}
                    <div className="flex-1 overflow-y-auto px-8 py-8 pt-24">
                        <Outlet />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default MainLayout;
