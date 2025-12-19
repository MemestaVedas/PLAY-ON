import { useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';

/**
 * PillNav Component - Persistent Navigation Bar
 * 
 * PURPOSE: Provides consistent navigation across all pages (except onboarding)
 * 
 * FEATURES:
 * - Pill-shaped design with pastel colors
 * - Navigation items for all main pages
 * - Search bar in top right
 * - Active page highlighting
 * - Smooth hover effects
 * 
 * HOW IT WORKS:
 * - useNavigate() for programmatic navigation
 * - useLocation() to detect current page and highlight active nav item
 */

interface NavItem {
    label: string;
    path: string;
}

const navItems: NavItem[] = [
    { label: 'Home', path: '/home' },
    { label: 'Anime List', path: '/anime-list' },
    { label: 'Now Playing', path: '/now-playing' },
    { label: 'Seasons', path: '/seasons' },
    { label: 'History', path: '/history' },
    { label: 'Statistics', path: '/statistics' },
];

function PillNav() {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchQuery, setSearchQuery] = useState('');

    const handleNavClick = (path: string) => {
        navigate(path);
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        console.log('Search query:', searchQuery);
        // TODO: Implement search functionality
    };

    return (
        <nav style={{
            position: 'sticky',
            top: '1rem',
            zIndex: 1000,
            padding: '0 2rem',
            marginBottom: '2rem',
        }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(10px)',
                borderRadius: '50px',
                padding: '0.75rem 1.5rem',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                border: '1px solid rgba(200, 200, 220, 0.3)',
            }}>
                {/* Navigation Items */}
                <div style={{
                    display: 'flex',
                    gap: '0.5rem',
                    alignItems: 'center',
                }}>
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path ||
                            (item.path === '/anime-list' && location.pathname.startsWith('/anime/'));

                        return (
                            <button
                                key={item.path}
                                onClick={() => handleNavClick(item.path)}
                                style={{
                                    padding: '0.5rem 1.25rem',
                                    borderRadius: '25px',
                                    border: 'none',
                                    background: isActive
                                        ? 'linear-gradient(135deg, #C7B8EA 0%, #B8A4E8 100%)' // Pastel purple
                                        : 'transparent',
                                    color: isActive ? 'white' : '#6B7280',
                                    fontSize: '0.9rem',
                                    fontWeight: isActive ? '600' : '500',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    whiteSpace: 'nowrap',
                                }}
                                onMouseEnter={(e) => {
                                    if (!isActive) {
                                        e.currentTarget.style.background = 'rgba(199, 184, 234, 0.2)';
                                        e.currentTarget.style.color = '#4B5563';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isActive) {
                                        e.currentTarget.style.background = 'transparent';
                                        e.currentTarget.style.color = '#6B7280';
                                    }
                                }}
                            >
                                {item.label}
                            </button>
                        );
                    })}
                </div>

                {/* Search Bar */}
                <form onSubmit={handleSearch} style={{ display: 'flex', alignItems: 'center' }}>
                    <input
                        type="text"
                        placeholder="Search anime..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '25px',
                            border: '1px solid rgba(200, 200, 220, 0.4)',
                            background: 'rgba(248, 250, 252, 0.8)',
                            fontSize: '0.9rem',
                            outline: 'none',
                            width: '200px',
                            transition: 'all 0.3s ease',
                        }}
                        onFocus={(e) => {
                            e.currentTarget.style.borderColor = '#C7B8EA';
                            e.currentTarget.style.background = 'white';
                            e.currentTarget.style.width = '250px';
                        }}
                        onBlur={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(200, 200, 220, 0.4)';
                            e.currentTarget.style.background = 'rgba(248, 250, 252, 0.8)';
                            e.currentTarget.style.width = '200px';
                        }}
                    />
                </form>
            </div>
        </nav>
    );
}

export default PillNav;
