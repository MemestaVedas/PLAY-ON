import { getCurrentWindow } from '@tauri-apps/api/window';

/**
 * Custom Titlebar Component
 * 
 * Replaces the default OS titlebar with a custom one.
 * Includes project title and window controls with premium hover effects.
 */
function Titlebar() {
    const appWindow = getCurrentWindow();

    const handleMinimize = async () => { await appWindow.minimize(); };
    const handleMaximize = async () => { await appWindow.toggleMaximize(); };
    const handleClose = async () => { await appWindow.close(); };

    return (
        <div
            data-tauri-drag-region
            style={{
                height: '32px',
                background: 'transparent',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0 1rem',
                userSelect: 'none',
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 9999,
                WebkitAppRegion: 'drag',
            } as React.CSSProperties}
        >
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                WebkitAppRegion: 'no-drag',
            } as React.CSSProperties}>
                <span style={{
                    fontSize: '0.85rem',
                    fontWeight: '800',
                    color: 'var(--color-text-main)',
                    letterSpacing: '1px',
                    textTransform: 'uppercase'
                }}>
                    PLAY-ON!
                </span>
            </div>

            {/* Right Section: Window Controls */}
            <div style={{
                display: 'flex',
                gap: '8px',
                WebkitAppRegion: 'no-drag',
            } as React.CSSProperties}>
                {/* Minimize */}
                <button
                    onClick={handleMinimize}
                    title="Minimize"
                    style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        border: 'none',
                        background: '#fbb9dc',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0px',
                        padding: 0,
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.fontSize = '10px';
                        e.currentTarget.textContent = '−';
                        e.currentTarget.style.color = 'rgba(0,0,0,0.5)';
                        e.currentTarget.style.boxShadow = '0 0 12px 2px rgba(219, 197, 243, 0.4)';
                        e.currentTarget.style.transform = 'scale(1.1)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.fontSize = '0px';
                        e.currentTarget.textContent = '';
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.transform = 'scale(1)';
                    }}
                />

                {/* Maximize */}
                <button
                    onClick={handleMaximize}
                    title="Maximize"
                    style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        border: 'none',
                        background: '#6a6a9e',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0px',
                        padding: 0,
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.fontSize = '8px';
                        e.currentTarget.textContent = '◻';
                        e.currentTarget.style.color = 'rgba(0,0,0,0.5)';
                        e.currentTarget.style.boxShadow = '0 0 12px 2px rgba(133, 255, 161, 0.4)';
                        e.currentTarget.style.transform = 'scale(1.1)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.fontSize = '0px';
                        e.currentTarget.textContent = '';
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.transform = 'scale(1)';
                    }}
                />

                {/* Close */}
                <button
                    onClick={handleClose}
                    title="Close"
                    style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        border: 'none',
                        background: '#ff6991ff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0px',
                        padding: 0,
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.fontSize = '10px';
                        e.currentTarget.textContent = '×';
                        e.currentTarget.style.color = 'rgba(0,0,0,0.5)';
                        e.currentTarget.style.boxShadow = '0 0 12px 2px rgba(255, 105, 105, 0.4)';
                        e.currentTarget.style.transform = 'scale(1.1)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.fontSize = '0px';
                        e.currentTarget.textContent = '';
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.transform = 'scale(1)';
                    }}
                />
            </div>
        </div>
    );
}

export default Titlebar;
