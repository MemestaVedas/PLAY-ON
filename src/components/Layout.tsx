import { ReactNode } from 'react';
import PillNav from './PillNav';

/**
 * Layout Component
 * 
 * PURPOSE: Wraps page content with consistent navigation
 * 
 * HOW IT WORKS:
 * - Renders PillNav at the top
 * - Renders children (page content) below
 * - Provides consistent spacing and background
 * 
 * USAGE:
 * <Layout>
 *   <YourPageContent />
 * </Layout>
 */

interface LayoutProps {
    children: ReactNode;
}

function Layout({ children }: LayoutProps) {
    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #FFF5F7 0%, #F0F4FF 50%, #FFF9E6 100%)', // Pastel gradient
            padding: '1rem',
        }}>
            <PillNav />
            <main style={{
                maxWidth: '1400px',
                margin: '0 auto',
                padding: '0 1rem',
            }}>
                {children}
            </main>
        </div>
    );
}

export default Layout;
