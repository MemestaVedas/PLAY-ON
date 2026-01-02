import { useState, useCallback, KeyboardEvent } from 'react';
import { useSettings } from '../context/SettingsContext';
import { useAuthContext } from '../context/AuthContext';
import { useLocalMedia } from '../context/LocalMediaContext';
import './Settings.css';

// ============================================================================
// SETTINGS PAGE
// Comprehensive settings interface with 5 categories
// ============================================================================

type TabId = 'general' | 'player' | 'integrations' | 'storage' | 'advanced';

interface Tab {
    id: TabId;
    label: string;
    icon: string;
}

const TABS: Tab[] = [
    { id: 'general', label: 'General', icon: '⚙️' },
    { id: 'player', label: 'Player', icon: '▶️' },
    { id: 'integrations', label: 'Integrations', icon: '🔗' },
    { id: 'storage', label: 'Storage & Library', icon: '📁' },
    { id: 'advanced', label: 'Advanced', icon: '🔧' },
];

const SUBTITLE_LANGUAGES = [
    'English',
    'Japanese',
    'Spanish',
    'French',
    'German',
    'Portuguese',
    'Italian',
    'Russian',
    'Korean',
    'Chinese',
];

const DEFAULT_PAGES = [
    { value: 'home', label: 'Home' },
    { value: 'anime-list', label: 'Anime List' },
    { value: 'manga-list', label: 'Manga List' },
];

// ============================================================================
// COMPONENT: Toggle Switch
// ============================================================================

interface ToggleProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
}

function Toggle({ checked, onChange }: ToggleProps) {
    return (
        <button
            className={`toggle-switch ${checked ? 'active' : ''}`}
            onClick={() => onChange(!checked)}
            role="switch"
            aria-checked={checked}
        />
    );
}

// ============================================================================
// COMPONENT: Dropdown Select
// ============================================================================

interface DropdownProps {
    value: string;
    options: { value: string; label: string }[];
    onChange: (value: string) => void;
}

function Dropdown({ value, options, onChange }: DropdownProps) {
    return (
        <select
            className="dropdown-select"
            value={value}
            onChange={(e) => onChange(e.target.value)}
        >
            {options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                    {opt.label}
                </option>
            ))}
        </select>
    );
}

// ============================================================================
// COMPONENT: Setting Row
// ============================================================================

interface SettingRowProps {
    label: string;
    description?: string;
    children: React.ReactNode;
}

function SettingRow({ label, description, children }: SettingRowProps) {
    return (
        <div className="setting-row">
            <div className="setting-info">
                <span className="setting-label">{label}</span>
                {description && <span className="setting-description">{description}</span>}
            </div>
            {children}
        </div>
    );
}

// ============================================================================
// COMPONENT: Tags Input
// ============================================================================

interface TagsInputProps {
    tags: string[];
    onChange: (tags: string[]) => void;
    placeholder?: string;
}

function TagsInput({ tags, onChange, placeholder = 'Add term...' }: TagsInputProps) {
    const [inputValue, setInputValue] = useState('');

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && inputValue.trim()) {
            e.preventDefault();
            if (!tags.includes(inputValue.trim())) {
                onChange([...tags, inputValue.trim()]);
            }
            setInputValue('');
        } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
            onChange(tags.slice(0, -1));
        }
    };

    const removeTag = (tagToRemove: string) => {
        onChange(tags.filter((tag) => tag !== tagToRemove));
    };

    return (
        <div className="tags-container">
            {tags.map((tag) => (
                <span key={tag} className="tag">
                    {tag}
                    <button className="tag-remove" onClick={() => removeTag(tag)}>
                        ×
                    </button>
                </span>
            ))}
            <input
                type="text"
                className="tag-input"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={tags.length === 0 ? placeholder : ''}
            />
        </div>
    );
}

// ============================================================================
// SECTION: General Settings
// ============================================================================

function GeneralSettings() {
    const { settings, updateSetting } = useSettings();

    return (
        <div className="settings-section">
            <h2 className="settings-section-title">General</h2>
            <p className="settings-section-description">
                Customize your app experience
            </p>

            <div className="setting-group">
                <h3 className="setting-group-title">Navigation</h3>

                <SettingRow label="Default Page" description="Page shown when app launches">
                    <Dropdown
                        value={settings.defaultPage}
                        options={DEFAULT_PAGES}
                        onChange={(value) => updateSetting('defaultPage', value as 'home' | 'anime-list' | 'manga-list')}
                    />
                </SettingRow>
            </div>
        </div>
    );
}

// ============================================================================
// SECTION: Player Settings
// ============================================================================

function PlayerSettings() {
    const { settings, updateSetting } = useSettings();

    return (
        <div className="settings-section">
            <h2 className="settings-section-title">Player</h2>
            <p className="settings-section-description">
                Configure playback preferences
            </p>

            <div className="setting-group">
                <h3 className="setting-group-title">Playback</h3>

                <SettingRow label="Auto-Play" description="Automatically start next episode">
                    <Toggle
                        checked={settings.autoPlay}
                        onChange={(checked) => updateSetting('autoPlay', checked)}
                    />
                </SettingRow>
            </div>

            <div className="setting-group">
                <h3 className="setting-group-title">Subtitles</h3>

                <SettingRow label="Subtitle Language" description="Default language for subtitles">
                    <Dropdown
                        value={settings.subtitleLanguage}
                        options={SUBTITLE_LANGUAGES.map((lang) => ({ value: lang, label: lang }))}
                        onChange={(value) => updateSetting('subtitleLanguage', value)}
                    />
                </SettingRow>
            </div>
        </div>
    );
}

// ============================================================================
// SECTION: Integrations Settings
// ============================================================================

function IntegrationsSettings() {
    const { settings, updateSetting } = useSettings();
    const { isAuthenticated, user, logout } = useAuthContext();

    return (
        <div className="settings-section">
            <h2 className="settings-section-title">Integrations</h2>
            <p className="settings-section-description">
                Connect with external services
            </p>

            <div className="setting-group">
                <h3 className="setting-group-title">AniList</h3>

                <SettingRow
                    label="Connection Status"
                    description={isAuthenticated ? `Logged in as ${user?.name}` : 'Not connected'}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span className={`status-badge ${isAuthenticated ? 'connected' : 'disconnected'}`}>
                            <span className="status-dot" />
                            {isAuthenticated ? 'Connected' : 'Disconnected'}
                        </span>
                        {isAuthenticated && (
                            <button className="setting-button danger" onClick={logout}>
                                Disconnect
                            </button>
                        )}
                    </div>
                </SettingRow>

                {isAuthenticated && (
                    <SettingRow label="Auto Sync" description="Automatically sync progress with AniList">
                        <Toggle
                            checked={settings.anilistAutoSync}
                            onChange={(checked) => updateSetting('anilistAutoSync', checked)}
                        />
                    </SettingRow>
                )}
            </div>

            <div className="setting-group">
                <h3 className="setting-group-title">Discord</h3>

                <SettingRow label="Rich Presence" description="Show currently watching on Discord">
                    <Toggle
                        checked={settings.discordRpcEnabled}
                        onChange={(checked) => updateSetting('discordRpcEnabled', checked)}
                    />
                </SettingRow>


            </div>
        </div>
    );
}

// ============================================================================
// SECTION: Storage Settings
// ============================================================================

function StorageSettings() {
    const { settings, updateSetting } = useSettings();
    const { folders, addFolder, removeFolder } = useLocalMedia();

    return (
        <div className="settings-section">
            <h2 className="settings-section-title">Storage & Library</h2>
            <p className="settings-section-description">
                Manage your local media folders
            </p>

            <div className="setting-group">
                <h3 className="setting-group-title">Local Folders</h3>

                <div className="setting-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div className="setting-info">
                            <span className="setting-label">Watched Folders</span>
                            <span className="setting-description">Folders to scan for anime files</span>
                        </div>
                        <button className="setting-button primary" onClick={addFolder}>
                            + Add Folder
                        </button>
                    </div>

                    {folders.length > 0 && (
                        <div className="folder-list">
                            {folders.map((folder) => (
                                <div key={folder.path} className="folder-item">
                                    <span className="folder-path">
                                        <span className="folder-icon">📂</span>
                                        {folder.path}
                                    </span>
                                    <button
                                        className="folder-remove"
                                        onClick={() => removeFolder(folder.path)}
                                    >
                                        Remove
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="setting-group">
                <h3 className="setting-group-title">Scanning</h3>

                <SettingRow label="Scan Depth" description="How deep to look for files in folders">
                    <div className="setting-slider-container">
                        <input
                            type="range"
                            className="setting-slider"
                            min="1"
                            max="10"
                            value={settings.scanDepth}
                            onChange={(e) => updateSetting('scanDepth', parseInt(e.target.value))}
                        />
                        <span className="slider-value">{settings.scanDepth}</span>
                    </div>
                </SettingRow>
            </div>

            <div className="setting-group">
                <h3 className="setting-group-title">Filters</h3>

                <div className="setting-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '12px' }}>
                    <div className="setting-info">
                        <span className="setting-label">Ignored Terms</span>
                        <span className="setting-description">
                            Keywords to ignore in filenames (press Enter to add)
                        </span>
                    </div>
                    <TagsInput
                        tags={settings.ignoredTerms}
                        onChange={(tags) => updateSetting('ignoredTerms', tags)}
                        placeholder="Add term to ignore..."
                    />
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// SECTION: Advanced Settings
// ============================================================================

function AdvancedSettings() {
    const { settings, updateSetting, clearCache, resetSettings } = useSettings();
    const [isClearing, setIsClearing] = useState(false);

    const handleClearCache = useCallback(async () => {
        setIsClearing(true);
        try {
            await clearCache();
            // Show some feedback
            setTimeout(() => setIsClearing(false), 1000);
        } catch {
            setIsClearing(false);
        }
    }, [clearCache]);

    return (
        <div className="settings-section">
            <h2 className="settings-section-title">Advanced</h2>
            <p className="settings-section-description">
                Developer options and system info
            </p>

            <div className="setting-group">
                <h3 className="setting-group-title">Developer</h3>

                <SettingRow label="Developer Mode" description="Show debug information and logs">
                    <Toggle
                        checked={settings.developerMode}
                        onChange={(checked) => updateSetting('developerMode', checked)}
                    />
                </SettingRow>
            </div>

            <div className="setting-group">
                <h3 className="setting-group-title">Cache</h3>

                <SettingRow label="Clear Cache" description="Clear cached images and metadata">
                    <button
                        className="setting-button"
                        onClick={handleClearCache}
                        disabled={isClearing}
                    >
                        {isClearing ? 'Clearing...' : 'Clear Cache'}
                    </button>
                </SettingRow>
            </div>

            <div className="setting-group">
                <h3 className="setting-group-title">About</h3>

                <SettingRow label="Version" description="Current application version">
                    <div className="version-info">
                        <div className="version-badge">
                            <span className="version-number">v0.2.0</span>
                        </div>
                    </div>
                </SettingRow>
            </div>

            <div className="setting-group">
                <h3 className="setting-group-title">Danger Zone</h3>

                <SettingRow label="Reset Settings" description="Restore all settings to defaults">
                    <button className="setting-button danger" onClick={resetSettings}>
                        Reset All Settings
                    </button>
                </SettingRow>
            </div>
        </div>
    );
}

// ============================================================================
// MAIN: Settings Page
// ============================================================================

export default function Settings() {
    const [activeTab, setActiveTab] = useState<TabId>('general');

    const renderSection = () => {
        switch (activeTab) {
            case 'general':
                return <GeneralSettings />;
            case 'player':
                return <PlayerSettings />;
            case 'integrations':
                return <IntegrationsSettings />;
            case 'storage':
                return <StorageSettings />;
            case 'advanced':
                return <AdvancedSettings />;
            default:
                return <GeneralSettings />;
        }
    };

    return (
        <div className="settings-container">
            {/* Tab Navigation */}
            <nav className="settings-tabs">
                {TABS.map((tab) => (
                    <button
                        key={tab.id}
                        className={`settings-tab ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        <span className="settings-tab-icon">{tab.icon}</span>
                        {tab.label}
                    </button>
                ))}
            </nav>

            {/* Content Area */}
            <main className="settings-content">
                {renderSection()}
            </main>
        </div>
    );
}
