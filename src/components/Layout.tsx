import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import PillNav from './PillNav';
import Squares from './Squares';
import logo from '/logo.svg';

/**
 * Layout Component - Discord-style layout with animated background
 * 
 * Structure:
 * - Animated Squares background
 * - Left sidebar (240px) with navigation and profile
 * - Main content area with PillNav at top
 * - Dark mode theme
 */

interface LayoutProps {
    children: ReactNode;
}

function Layout({ children }: LayoutProps) {
    return (
        <div style={{
            display: 'flex',
            minHeight: '100vh',
            background: '#0a0a0f',
            position: 'relative',
            overflow: 'hidden',
        }}>
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
            <div style={{ position: 'relative', zIndex: 10 }}>
                <Sidebar />
            </div>

            {/* Main Content Area */}
            <div style={{
                marginLeft: '240px',
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                minHeight: '100vh',
                position: 'relative',
                zIndex: 1,
            }}>
                {/* PillNav */}
                <div style={{
                    position: 'relative',
                    zIndex: 50,
                }}>
                    <PillNav
                        logo={logo}
                        logoAlt="PLAY-ON! Logo"
                        items={[
                            { label: 'Home', href: '/home' },
                            { label: 'Seasons', href: '/seasons' },
                            { label: 'Now Playing', href: '/now-playing' },
                        ]}
                        activeHref={window.location.pathname}
                        ease="power3.easeOut"
                        baseColor="#1a1a24"
                        pillColor="#FFB5C5"
                        hoveredPillTextColor="#0a0a0f"
                        pillTextColor="#0a0a0f"
                        initialLoadAnimation={false}
                    />
                </div>

                {/* Page Content */}
                <div style={{
                    flex: 1,
                    padding: '2rem',
                    paddingTop: '5rem',
                }}>
                    {children}
                </div>
            </div>
        </div>
    );
}

export default Layout;
