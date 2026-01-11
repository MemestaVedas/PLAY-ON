import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import './WebBrowser.css';

// Preset anime streaming sites with official icons
const PRESET_SITES = [
    { name: 'HiAnime', url: 'https://hianimes.cz', icon: 'https://hianimes.cz/favicon.ico' },
    { name: 'AnimePahe', url: 'https://animepahe.si', icon: 'https://animepahe.si/favicon.ico' },
    { name: '9Anime', url: 'https://9anime.org.lv', icon: 'https://9anime.org.lv/favicon.ico' },
    { name: 'AnimeParadise', url: 'https://animeparadise.moe', icon: 'https://animeparadise.moe/favicon.ico' },
];

function WebBrowser() {
    const navigate = useNavigate();

    const [inputUrl, setInputUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Open URL in native Tauri WebView window
    const openInNativeWindow = async (targetUrl: string, siteName?: string) => {
        setIsLoading(true);
        setError(null);

        let formattedUrl = targetUrl.trim();
        if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
            formattedUrl = 'https://' + formattedUrl;
        }

        try {
            const result = await invoke('open_browser_window', {
                url: formattedUrl,
                title: siteName || 'Anime Browser'
            });
            console.log('[WebBrowser] Opened native window:', result);
        } catch (err) {
            console.error('[WebBrowser] Failed to open native window:', err);
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setIsLoading(false);
        }
    };

    // Handle form submit
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (inputUrl.trim()) {
            openInNativeWindow(inputUrl);
        }
    };

    return (
        <div className="web-browser">
            {/* Browser Header */}
            <div className="browser-header">
                {/* Navigation Controls */}
                <div className="browser-controls">
                    <button
                        className="browser-btn"
                        onClick={() => navigate('/home')}
                        title="Back to Home"
                    >
                        ✕
                    </button>
                </div>

                {/* URL Bar */}
                <form className="url-bar" onSubmit={handleSubmit}>
                    <input
                        type="text"
                        value={inputUrl}
                        onChange={(e) => setInputUrl(e.target.value)}
                        placeholder="Enter URL and press Enter to open in native browser..."
                        className="url-input"
                    />
                    <button type="submit" className="go-btn" disabled={isLoading}>
                        {isLoading ? '...' : 'Open'}
                    </button>
                </form>
            </div>

            {/* Error Display */}
            {error && (
                <div className="browser-error">
                    ⚠️ {error}
                </div>
            )}

            {/* Browser Content */}
            <div className="browser-content">
                <div className="presets-container">
                    <h2 className="presets-title">Anime Streaming Sites</h2>
                    <p className="presets-subtitle">
                        Click any site to open in a <strong>native browser window</strong>
                    </p>
                    <p className="presets-info">
                        Native windows work like a real browser - no iframe restrictions!
                    </p>
                    <div className="presets-grid">
                        {PRESET_SITES.map((site) => (
                            <button
                                key={site.name}
                                className="preset-card"
                                onClick={() => openInNativeWindow(site.url, site.name)}
                                disabled={isLoading}
                            >
                                <img
                                    src={site.icon}
                                    alt={site.name}
                                    className="preset-icon-img"
                                    onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                    }}
                                />
                                <span className="preset-name">{site.name}</span>
                                <span className="preset-url">{site.url.replace('https://', '')}</span>
                            </button>
                        ))}
                    </div>
                    <p className="presets-note">
                        💡 Each site opens in its own window. Close window when done.
                    </p>
                </div>
            </div>
        </div>
    );
}

export default WebBrowser;
