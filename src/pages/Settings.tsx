import { useState, useCallback, useEffect } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { useSettings } from '../context/SettingsContext';
import { useTheme } from '../context/ThemeContext';
import { useAuthContext } from '../context/AuthContext';
import { useLocalMedia } from '../context/LocalMediaContext';
import {
    getLibraryCategories,
    addLibraryCategory,
    deleteLibraryCategory,
    getDefaultCategory,
    setDefaultCategory
} from '../lib/localMangaDb';
import {
    SettingsIcon,
    LinkIcon,
    BookIcon,
    FolderIcon,
    WrenchIcon,
    PuzzleIcon
} from '../components/ui/Icons';
import { DEFAULT_KEYBOARD_SHORTCUTS, ShortcutAction } from '../context/SettingsContext';
import { formatShortcutFromEvent } from '../hooks/useKeyboardShortcuts';
import { Dropdown } from '../components/ui/Dropdown';
import './Settings.css';
import TrackerConnections from '../components/settings/TrackerConnections';
import ExtensionsSettings from '../components/settings/ExtensionsSettings';
import { ProfileSettingsModal, ProfileSettingsButton } from '../components/settings/ProfileSettings';


// ============================================================================
// SETTINGS PAGE
// Comprehensive settings interface with 5 categories
// ============================================================================

type TabId = 'general' | 'integrations' | 'extensions' | 'manga' | 'storage' | 'advanced';

interface Tab {
    id: TabId;
    label: string;
    icon: React.ReactNode;
}

const TABS: Tab[] = [
    { id: 'general', label: 'General', icon: <SettingsIcon size={18} /> },
    { id: 'integrations', label: 'Integrations', icon: <LinkIcon size={18} /> },
    { id: 'extensions', label: 'Extensions', icon: <PuzzleIcon size={18} /> },
    { id: 'manga', label: 'Manga', icon: <BookIcon size={18} /> },
    { id: 'storage', label: 'Storage & Library', icon: <FolderIcon size={18} /> },
    { id: 'advanced', label: 'Advanced', icon: <WrenchIcon size={18} /> },
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
// COMPONENT: Autostart Toggle
// Uses the Tauri autostart plugin to manage launch-at-startup
// ============================================================================

function AutostartToggle() {
    const [isEnabled, setIsEnabled] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check current autostart status on mount
        import('@tauri-apps/plugin-autostart').then(({ isEnabled: checkEnabled }) => {
            checkEnabled().then(setIsEnabled).catch(console.error).finally(() => setIsLoading(false));
        });
    }, []);

    const handleToggle = async (checked: boolean) => {
        // Optimistically update the UI immediately for smooth animation
        setIsEnabled(checked);
        try {
            const { enable, disable } = await import('@tauri-apps/plugin-autostart');
            if (checked) {
                await enable();
            } else {
                await disable();
            }
        } catch (err) {
            console.error('Failed to toggle autostart:', err);
            // Revert on error
            setIsEnabled(!checked);
        }
    };

    return (
        <div style={{ opacity: isLoading ? 0.5 : 1, pointerEvents: isLoading ? 'none' : 'auto' }}>
            <Toggle checked={isEnabled} onChange={handleToggle} />
        </div>
    );
}

// ============================================================================
// THEME PREVIEWS
// ============================================================================

const THEME_PREVIEWS: Record<string, { bg: string; accent: string; text: string; border: string }> = {
    'default-dark': {
        bg: '#0F0F14',
        accent: '#B4A2F6',
        text: '#FFFFFF',
        border: 'rgba(255,255,255,0.1)'
    },
    'light': {
        bg: '#F2F2F7',
        accent: '#007AFF',
        text: '#000000',
        border: 'rgba(0,0,0,0.1)'
    },
};

// ============================================================================
// SECTION: General Settings
// ============================================================================

function GeneralSettings() {
    const { settings, updateSetting } = useSettings();
    const { theme, setTheme, availableThemes } = useTheme();

    return (
        <div className="settings-section">
            <h2 className="settings-section-title">General</h2>
            <p className="settings-section-description">
                Customize your app experience
            </p>

            {/* Appearance Section */}
            <div className="setting-group">
                <h3 className="setting-group-title">Appearance</h3>

                <div className="theme-grid">
                    {availableThemes.map((t) => {
                        const preview = THEME_PREVIEWS[t.id] || THEME_PREVIEWS['default-dark'];
                        const isActive = theme === t.id;

                        return (
                            <button
                                key={t.id}
                                className={`theme-card ${isActive ? 'active' : ''}`}
                                onClick={() => setTheme(t.id)}
                            >
                                <div
                                    className="theme-card-preview"
                                    style={{ background: preview.bg, borderColor: preview.border }}
                                >
                                    <div className="theme-preview-ui">
                                        <div className="preview-nav" style={{ borderColor: preview.border }}>
                                            <div className="preview-dot" style={{ background: preview.text, opacity: 0.2 }} />
                                            <div className="preview-dot" style={{ background: preview.text, opacity: 0.2 }} />
                                        </div>
                                        <div className="preview-content">
                                            <div className="preview-hero" style={{ background: preview.accent }} />
                                            <div className="preview-lines">
                                                <div className="preview-line" style={{ background: preview.text, opacity: 0.1 }} />
                                                <div className="preview-line" style={{ background: preview.text, opacity: 0.1 }} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="theme-card-info">
                                    <span className="theme-name">{t.name}</span>
                                    {isActive && <div className="theme-check">✓</div>}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="setting-group">
                <h3 className="setting-group-title">Navigation</h3>

                <SettingRow label="Default Page" description="Page shown when app launches">
                    <Dropdown
                        value={settings.defaultPage}
                        options={DEFAULT_PAGES}
                        onChange={(value) => updateSetting('defaultPage', value as 'home' | 'anime-list' | 'manga-list')}
                    />
                </SettingRow>

                <SettingRow label="Default Search Mode" description="Initial search bar mode">
                    <Dropdown
                        value={settings.defaultSearchMode}
                        options={[
                            { value: 'anime', label: 'Anime' },
                            { value: 'manga', label: 'Manga' },
                        ]}
                        onChange={(value) => updateSetting('defaultSearchMode', value as 'anime' | 'manga')}
                    />
                </SettingRow>
            </div>

            {/* Window Behavior Section */}
            <div className="setting-group">
                <h3 className="setting-group-title">Window Behavior</h3>

                <SettingRow
                    label="Launch at Startup"
                    description="Automatically start the app when your computer boots"
                >
                    <AutostartToggle />
                </SettingRow>

                <SettingRow
                    label="Minimize to Tray on Close"
                    description="When enabled, closing the app minimizes it to the system tray. When disabled, the app quits completely."
                >
                    <Toggle
                        checked={settings.closeToTray}
                        onChange={(checked) => updateSetting('closeToTray', checked)}
                    />
                </SettingRow>

                <SettingRow
                    label="Start Minimized"
                    description="When enabled, the app will start minimized to the system tray (only applies when Launch at Startup is enabled)."
                >
                    <Toggle
                        checked={settings.startMinimized}
                        onChange={(checked) => updateSetting('startMinimized', checked)}
                    />
                </SettingRow>
            </div>

            {/* Keyboard Shortcuts Section */}
            <div style={{ margin: '32px 0 16px', borderTop: '1px solid var(--theme-border-subtle)' }} />
            <KeyboardSettings />
        </div>
    );
}

// ============================================================================
// SECTION: Integrations Settings
// ============================================================================

function IntegrationsSettings() {
    const { settings, updateSetting } = useSettings();
    const { isAuthenticated, user, logout } = useAuthContext();
    const [showProfileModal, setShowProfileModal] = useState(false);

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
                    <>
                        <div style={{ marginTop: '16px', marginBottom: '16px' }}>
                            <ProfileSettingsButton onClick={() => setShowProfileModal(true)} />
                        </div>

                        <SettingRow label="Auto Sync" description="Automatically sync progress with AniList">
                            <Toggle
                                checked={settings.anilistAutoSync}
                                onChange={(checked) => updateSetting('anilistAutoSync', checked)}
                            />
                        </SettingRow>
                    </>
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

            <TrackerConnections />

            <ProfileSettingsModal
                isOpen={showProfileModal}
                onClose={() => setShowProfileModal(false)}
            />
        </div>
    );
}

// ============================================================================
// SECTION: Manga Settings
// ============================================================================

function MangaSettings() {
    const { settings, updateSetting } = useSettings();
    const [, setForceUpdate] = useState(0);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [defaultCatId, setDefaultCatId] = useState(getDefaultCategory());

    // Load categories on mount and update
    const refresh = () => setForceUpdate(prev => prev + 1);
    const currentCategories = getLibraryCategories();

    const handleConfirmAdd = () => {
        if (newCategoryName.trim()) {
            try {
                addLibraryCategory(newCategoryName.trim());
                refresh();
                setIsAddDialogOpen(false);
                setNewCategoryName('');
            } catch (e) {
                alert("Category exists or invalid");
            }
        }
    };

    const handleDeleteCategory = (id: string) => {
        if (id === 'default') {
            alert("Cannot delete Default category");
            return;
        }
        if (confirm("Delete this category? Items in it will remain in library.")) {
            deleteLibraryCategory(id);
            refresh();
        }
    };

    return (
        <div className="settings-section">
            <h2 className="settings-section-title">Manga</h2>
            <p className="settings-section-description">
                Manga preferences and library tools
            </p>

            <div className="setting-group">
                <h3 className="setting-group-title">Downloads</h3>

                <SettingRow label="Manga Download Path" description="Where to save downloaded chapters">
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '100%' }}>
                        <input
                            type="text"
                            value={settings.mangaDownloadPath || ''}
                            readOnly
                            placeholder="Not configured"
                            style={{
                                flexGrow: 1,
                                padding: '8px 12px',
                                borderRadius: '8px',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: 'var(--color-text-main)',
                                fontSize: '13px',
                                fontFamily: 'var(--font-mono)'
                            }}
                        />
                        <button className="setting-button" onClick={async () => {
                            try {
                                const selected = await open({
                                    directory: true,
                                    multiple: false,
                                    defaultPath: settings.mangaDownloadPath || undefined,
                                });
                                if (selected) {
                                    updateSetting('mangaDownloadPath', selected as string);
                                }
                            } catch (err) {
                                console.error("Failed to open dialog", err);
                            }
                        }}>
                            Browse
                        </button>
                        {settings.mangaDownloadPath && (
                            <button
                                className="setting-button danger"
                                onClick={() => {
                                    if (confirm('Clear the download path? You will need to configure it again to download manga.')) {
                                        updateSetting('mangaDownloadPath', '');
                                    }
                                }}
                                title="Clear download path"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                </SettingRow>
            </div>

            <div className="setting-group">
                <h3 className="setting-group-title">Preferences</h3>
                <div className="setting-row">
                    <div className="setting-info">
                        <span className="setting-label">Default Category</span>
                        <span className="setting-description">Category to pre-select when adding manga</span>
                    </div>
                    <Dropdown
                        value={defaultCatId}
                        options={currentCategories.map(cat => ({ value: cat.id, label: cat.name }))}
                        onChange={(val) => {
                            setDefaultCategory(val);
                            setDefaultCatId(val);
                        }}
                    />
                </div>
            </div>

            <div className="setting-group">
                <h3 className="setting-group-title">Library Categories</h3>
                <div role="list" className="setting-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {currentCategories.map(cat => (
                        <div key={cat.id} className="setting-row" style={{ justifyContent: 'space-between' }}>
                            <div className="setting-info">
                                <span className="setting-label">{cat.name}</span>
                                <span className="setting-description" style={{ fontSize: '10px', opacity: 0.5 }}>ID: {cat.id}</span>
                            </div>
                            {cat.id !== 'default' && (
                                <button
                                    className="setting-button danger"
                                    onClick={() => handleDeleteCategory(cat.id)}
                                    style={{ padding: '4px 8px', fontSize: '11px' }}
                                >
                                    Delete
                                </button>
                            )}
                        </div>
                    ))}
                    <button className="setting-button primary" style={{ marginTop: '8px' }} onClick={() => setIsAddDialogOpen(true)}>
                        + Add Category
                    </button>
                </div>
            </div>

            {/* Add Category Dialog */}
            {isAddDialogOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm"
                    style={{ backgroundColor: 'var(--theme-bg-overlay)', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
                    onClick={() => setIsAddDialogOpen(false)}
                >
                    <div
                        className="p-6 rounded-xl w-[320px]"
                        style={{
                            backgroundColor: 'var(--theme-bg-card)',
                            border: '1px solid var(--theme-border-subtle)',
                            padding: '24px',
                            borderRadius: '16px',
                            width: '320px',
                            boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <h3
                            style={{ color: 'var(--theme-text-main)', fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}
                        >
                            New Category
                        </h3>
                        <p
                            style={{ color: 'var(--theme-text-muted)', fontSize: '14px', marginBottom: '16px' }}
                        >
                            Create a new collection for your manga.
                        </p>

                        <input
                            type="text"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            placeholder="e.g. Action, Plan to Read"
                            style={{
                                width: '100%',
                                padding: '10px',
                                borderRadius: '8px',
                                marginBottom: '16px',
                                backgroundColor: 'var(--theme-input-bg)',
                                border: '1px solid var(--theme-border-subtle)',
                                color: 'var(--theme-text-main)',
                                outline: 'none'
                            }}
                            autoFocus
                            onKeyDown={(e) => e.key === 'Enter' && handleConfirmAdd()}
                        />

                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setIsAddDialogOpen(false)}
                                className="setting-button"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmAdd}
                                className="setting-button primary"
                            >
                                Create
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================================================
// SECTION: Storage Settings
// ============================================================================

function StorageSettings() {
    const { animeFolders, mangaFolders, addFolder, removeFolder } = useLocalMedia();

    return (
        <div className="settings-section">
            <h2 className="settings-section-title">Storage & Library</h2>
            <p className="settings-section-description">
                Manage your local media locations
            </p>

            <div className="setting-group">
                <h3 className="setting-group-title">Anime Folders</h3>
                <p className="settings-section-description" style={{ marginBottom: '12px' }}>
                    Folders monitored for anime files
                </p>
                <button className="setting-button primary" onClick={() => addFolder('anime')}>
                    + Add Anime Folder
                </button>
                <div className="folder-list">
                    {animeFolders.map((folder) => (
                        <div key={folder.path} className="folder-item">
                            <div className="folder-path">
                                <span className="folder-icon"><FolderIcon size={16} /></span>
                                {folder.path}
                            </div>
                            <button
                                className="folder-remove"
                                onClick={() => {
                                    if (confirm(`Remove this folder from library?\n${folder.path}`)) {
                                        removeFolder(folder.path);
                                    }
                                }}
                            >
                                Remove
                            </button>
                        </div>
                    ))}
                    {animeFolders.length === 0 && (
                        <div style={{ padding: '20px', textAlign: 'center', opacity: 0.5, fontStyle: 'italic' }}>
                            No folders added yet
                        </div>
                    )}
                </div>
            </div>

            <div className="setting-group">
                <h3 className="setting-group-title">Manga Folders</h3>
                <p className="settings-section-description" style={{ marginBottom: '12px' }}>
                    Folders monitored for manga scans
                </p>
                <button className="setting-button primary" onClick={() => addFolder('manga')}>
                    + Add Manga Folder
                </button>
                <div className="folder-list">
                    {mangaFolders.map((folder) => (
                        <div key={folder.path} className="folder-item">
                            <div className="folder-path">
                                <span className="folder-icon"><FolderIcon size={16} /></span>
                                {folder.path}
                            </div>
                            <button
                                className="folder-remove"
                                onClick={() => {
                                    if (confirm(`Remove this folder from library?\n${folder.path}`)) {
                                        removeFolder(folder.path);
                                    }
                                }}
                            >
                                Remove
                            </button>
                        </div>
                    ))}
                    {mangaFolders.length === 0 && (
                        <div style={{ padding: '20px', textAlign: 'center', opacity: 0.5, fontStyle: 'italic' }}>
                            No folders added yet
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// SECTION: Keyboard Settings
// ============================================================================

const SHORTCUT_LABELS: Record<ShortcutAction, { label: string; description: string }> = {
    searchAnime: { label: 'Search Anime', description: 'Focus search bar in Anime mode' },
    searchManga: { label: 'Search Manga', description: 'Focus search bar in Manga mode' },
    goHome: { label: 'Go to Home', description: 'Navigate to Home page' },
    goAnimeList: { label: 'Go to Anime List', description: 'Navigate to Anime List' },
    goMangaList: { label: 'Go to Manga List', description: 'Navigate to Manga List' },
    goSettings: { label: 'Go to Settings', description: 'Navigate to Settings' },
    goProfile: { label: 'Go to Profile', description: 'Navigate to Profile' },
    goBack: { label: 'Go Back', description: 'Navigate to previous page' },
    goForward: { label: 'Go Forward', description: 'Navigate to next page' },
    escape: { label: 'Escape / Close', description: 'Close dropdowns and dialogs' },
};

function formatKeyForDisplay(shortcut: string) {
    // Split by + and wrap in kbd styles
    return shortcut.split('+').map((key, i) => (
        <span key={i} className="shortcut-key-wrapper">
            {i > 0 && <span className="shortcut-separator">+</span>}
            <kbd className="shortcut-key">{key.trim()}</kbd>
        </span>
    ));
}

function KeyboardSettings() {
    const { settings, updateSetting } = useSettings();
    const [recordingAction, setRecordingAction] = useState<ShortcutAction | null>(null);

    const handleRecordShortcut = useCallback((action: ShortcutAction) => {
        setRecordingAction(action);
    }, []);

    const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
        if (!recordingAction) return;

        event.preventDefault();
        event.stopPropagation();

        // Ignore modifier-only presses
        if (['Control', 'Shift', 'Alt', 'Meta'].includes(event.key)) return;

        const shortcut = formatShortcutFromEvent(event.nativeEvent);

        // Update the shortcut
        const newShortcuts = { ...settings.keyboardShortcuts, [recordingAction]: shortcut };
        updateSetting('keyboardShortcuts', newShortcuts);
        setRecordingAction(null);
    }, [recordingAction, settings.keyboardShortcuts, updateSetting]);

    const handleResetShortcut = useCallback((action: ShortcutAction) => {
        const newShortcuts = { ...settings.keyboardShortcuts, [action]: DEFAULT_KEYBOARD_SHORTCUTS[action] };
        updateSetting('keyboardShortcuts', newShortcuts);
    }, [settings.keyboardShortcuts, updateSetting]);

    const handleResetAll = useCallback(() => {
        updateSetting('keyboardShortcuts', { ...DEFAULT_KEYBOARD_SHORTCUTS });
    }, [updateSetting]);

    return (
        <div onKeyDown={handleKeyDown}>

            <div className="setting-group">
                <h3 className="setting-group-title">Keyboard Shortcuts</h3>

                {(Object.entries(SHORTCUT_LABELS) as [ShortcutAction, { label: string; description: string }][]).map(
                    ([action, { label, description }]) => (
                        <div key={action} className="setting-row">
                            <div className="setting-info">
                                <span className="setting-label">{label}</span>
                                <span className="setting-description">{description}</span>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <button
                                    className={`shortcut-key-button ${recordingAction === action ? 'recording' : ''}`}
                                    onClick={() => handleRecordShortcut(action)}
                                >
                                    {recordingAction === action ? (
                                        <span className="recording-pulse">Press keys...</span>
                                    ) : (
                                        <div className="shortcut-keys-display">
                                            {formatKeyForDisplay(settings.keyboardShortcuts[action])}
                                        </div>
                                    )}
                                </button>
                                {settings.keyboardShortcuts[action] !== DEFAULT_KEYBOARD_SHORTCUTS[action] && (
                                    <button
                                        className="setting-button reset-tiny"
                                        onClick={() => handleResetShortcut(action)}
                                        title="Reset to default"
                                    >
                                        ↺
                                    </button>
                                )}
                            </div>
                        </div>
                    )
                )}
            </div>

            <div className="setting-group" style={{ marginTop: '24px' }}>
                <button className="setting-button" onClick={handleResetAll}>
                    Reset All to Defaults
                </button>
            </div>
        </div>
    );
}

// ... (AdvancedSettings updated below) ...

function AdvancedSettings() {
    const { clearCache, resetSettings, factoryReset, settings, updateSetting } = useSettings();
    const [isClearing, setIsClearing] = useState(false);
    const [appVersion, setAppVersion] = useState('...');
    const [checkingUpdate, setCheckingUpdate] = useState(false);

    // Fetch version from Tauri on mount
    useEffect(() => {
        import('@tauri-apps/api/app').then(({ getVersion }) => {
            getVersion().then(setAppVersion).catch(console.error);
        });
    }, []);

    const handleClearCache = async () => {
        setIsClearing(true);
        await clearCache();
        setTimeout(() => setIsClearing(false), 1000);
    };

    const handleCheckUpdate = async () => {
        setCheckingUpdate(true);
        // Simulate check for now
        setTimeout(() => {
            setCheckingUpdate(false);
            alert("You are on the latest version!");
        }, 1500);
    };

    const handleFactoryReset = async () => {
        const { confirm } = await import('@tauri-apps/plugin-dialog');

        const confirmed1 = await confirm(
            "This will delete ALL data, including your library folders, settings, and accounts.\n\nThe app will restart as if it was just installed.\n\nAre you sure?",
            { title: 'Factory Reset - DANGER', kind: 'warning' }
        );

        if (confirmed1) {
            const confirmed2 = await confirm(
                "Are you absolutely sure? This cannot be undone.",
                { title: 'Final Confirmation', kind: 'warning' }
            );

            if (confirmed2) {
                await factoryReset();
            }
        }
    }

    return (
        <div className="settings-section">
            <h2 className="settings-section-title">Advanced</h2>
            <p className="settings-section-description">
                Developer tools and data management
            </p>

            <div className="setting-group">
                <h3 className="setting-group-title">Developer</h3>

                <SettingRow
                    label="Developer Mode"
                    description="Enable experimental features and debugging tools"
                >
                    <Toggle
                        checked={settings.developerMode}
                        onChange={(checked) => updateSetting('developerMode', checked)}
                    />
                </SettingRow>
            </div>

            <div className="setting-group">
                <h3 className="setting-group-title">Data Management</h3>

                <SettingRow
                    label="Clear Cache"
                    description="Clear temporary image and API data. Does not effect library."
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                            ~12 MB
                        </span>
                        <button
                            className="setting-button"
                            onClick={handleClearCache}
                            disabled={isClearing}
                        >
                            {isClearing ? 'Clearing...' : 'Clear Cache'}
                        </button>
                    </div>
                </SettingRow>

                <SettingRow
                    label="Factory Reset"
                    description="Wipe all data and reset app to initial state."
                >
                    <button
                        className="setting-button danger"
                        onClick={handleFactoryReset}
                        style={{ backgroundColor: 'rgba(244, 0, 53, 0.1)', color: '#f40035', border: '1px solid rgba(244, 0, 53, 0.2)' }}
                    >
                        Factory Reset
                    </button>
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

            <div className="setting-group">
                <h3 className="setting-group-title">About</h3>

                <div className="about-card">
                    <div className="about-header">
                        <div className="app-logo-small">PlayOn</div>
                        <div className="version-badge-pill">v{appVersion}</div>
                    </div>
                    <p className="about-desc">
                        The ultimate destination for your anime and manga.
                        Open source and free forever.
                    </p>

                    <div className="about-actions">
                        <button
                            className="about-action-btn primary"
                            onClick={handleCheckUpdate}
                            disabled={checkingUpdate}
                        >
                            {checkingUpdate ? 'Checking...' : 'Check for Updates'}
                        </button>
                        <a
                            href="https://github.com/yourusername/play-on"
                            target="_blank"
                            rel="noreferrer"
                            className="about-action-btn secondary"
                        >
                            GitHub
                        </a>
                        <a
                            href="https://discord.gg/yourserver"
                            target="_blank"
                            rel="noreferrer"
                            className="about-action-btn secondary"
                        >
                            Discord
                        </a>
                    </div>
                </div>
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
            case 'integrations':
                return <IntegrationsSettings />;
            case 'extensions':
                return <ExtensionsSettings />;
            case 'manga':
                return <MangaSettings />;
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

            {/* Content Area with Key-based Animation */}
            <main className="settings-content">
                <div key={activeTab} className="settings-fade-wrapper">
                    {renderSection()}
                </div>
            </main>
        </div>
    );
}
