import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import PillNav from './PillNav';
import Squares from './Squares';
import Titlebar from './Titlebar';
import logo from '/logo.svg';

/**
 * MainLayout Component
 * 
 * Provides the persistent shell for the application.
 * - Sidebar stays mounted.
 * - Titlebar stays mounted.
 * - Background stays mounted.
 * - Main content changes via <Outlet />.
 */
function MainLayout() {
    const location = useLocation();

    return (
        <div style={{
            display: 'flex',
            minHeight: '100vh',
            background: '#0a0a0f',
            position: 'relative',
            overflow: 'hidden',
        }}>
            {/* Custom Titlebar */}
            <Titlebar />

            {/* Animated Background */}
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 0,
            }}>
                <Squares
                    speed={0.5}
                    squareSize={40}
                    direction='diagonal'
                    borderColor='rgba(255, 181, 197, 0.15)'
                    hoverFillColor='rgba(255, 181, 197, 0.05)'
                />
            </div>

            {/* Sidebar */}
            {/* Added 32px top margin for titlebar */}
            <div style={{ position: 'relative', zIndex: 10, marginTop: '32px' }}>
                <Sidebar />
            </div>

            {/* Main Content Area */}
            <div style={{
                marginLeft: '240px',
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                height: '100vh', // Fixed height for scrolling content
                position: 'relative',
                zIndex: 1,
                background: 'rgba(10, 10, 15, 0.5)', // Subtle overlay
                borderTopLeftRadius: '20px', // Soft rounded corner
                borderLeft: '1px solid rgba(255, 255, 255, 0.05)', // Soft divider
                marginTop: '32px', // Align with sidebar below titlebar
                overflow: 'hidden', // Contain scrolling
            }}>
                {/* PillNav */}
                <div style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 50,
                    padding: '1rem 2rem 0', // Spacing around nav
                }}>
                    <PillNav
                        logo={logo}
                        logoAlt="PLAY-ON! Logo"
                        items={[
                            { label: 'Home', href: '/home' },
                            { label: 'Seasons', href: '/seasons' },
                            { label: 'Now Playing', href: '/now-playing' },
                        ]}
                        activeHref={location.pathname}
                        ease="power3.easeOut"
                        baseColor="#1a1a24"
                        pillColor="#FFB5C5"
                        hoveredPillTextColor="#0a0a0f"
                        pillTextColor="#0a0a0f"
                        initialLoadAnimation={false}
                    />
                </div>

                {/* Page Content Outlet */}
                <div style={{
                    flex: 1,
                    padding: '2rem',
                    overflowY: 'auto', // Scrollable content area
                }}>
                    <Outlet />
                </div>
            </div>
        </div>
    );
}

export default MainLayout;
