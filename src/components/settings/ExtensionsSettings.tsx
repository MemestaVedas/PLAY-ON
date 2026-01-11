import { useState, useEffect, useCallback } from 'react';
import { ExtensionRepository } from '../../services/extensions/ExtensionRepository';
import { ExtensionStorage } from '../../services/extensions/ExtensionStorage';
import { ExtensionManager } from '../../services/ExtensionManager';
import { ExtensionLoader } from '../../services/extensions/loader';
import { AnimeExtensionManager } from '../../services/AnimeExtensionManager';
import { AnimeExtensionStorage } from '../../services/anime-extensions/AnimeExtensionStorage';
import { AnimeLoader } from '../../services/anime-extensions/AnimeLoader';
import { AnimeExtensionMeta } from '../../services/anime-extensions/types';
import {
    ExtensionMeta,
    ExtensionRepo,
    InstalledExtension
} from '../../services/extensions/types';
import {
    DownloadIcon,
    TrashIcon,
    RefreshIcon,
    PlusIcon,
    LinkIcon
} from '../ui/Icons';

/**
 * ====================================================================
 * EXTENSIONS SETTINGS
 * ====================================================================
 * 
 * Manages extension repositories and installed extensions.
 * - Add/remove repository URLs
 * - Browse available extensions from repos
 * - Install/uninstall extensions
 * - Enable/disable installed extensions
 * ====================================================================
 */

// Sub-tabs for this section
type ExtensionTab = 'installed' | 'browse' | 'repos';
type ExtensionTypeFilter = 'all' | 'manga' | 'anime';

export default function ExtensionsSettings() {
    const [activeTab, setActiveTab] = useState<ExtensionTab>('installed');
    const [typeFilter, setTypeFilter] = useState<ExtensionTypeFilter>('all');
    const [repos, setRepos] = useState<ExtensionRepo[]>([]);
    const [installedExtensions, setInstalledExtensions] = useState<InstalledExtension[]>([]);
    const [installedAnimeExtensions, setInstalledAnimeExtensions] = useState<ReturnType<typeof AnimeExtensionStorage.getAllExtensions>>([]);
    const [availableExtensions, setAvailableExtensions] = useState<{ repoUrl: string; repoName: string; extensions: ExtensionMeta[] }[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Add repo dialog state
    const [isAddRepoOpen, setIsAddRepoOpen] = useState(false);
    const [newRepoUrl, setNewRepoUrl] = useState('');
    const [addRepoLoading, setAddRepoLoading] = useState(false);

    // Load data on mount
    useEffect(() => {
        loadData();
    }, []);

    const loadData = useCallback(() => {
        setRepos(ExtensionRepository.getRepos());
        setInstalledExtensions(ExtensionStorage.getAllExtensions());
        setInstalledAnimeExtensions(AnimeExtensionStorage.getAllExtensions());
    }, []);

    // Fetch available extensions from all repos
    const fetchAvailableExtensions = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const results = await ExtensionRepository.fetchAllExtensions();
            setAvailableExtensions(results);
        } catch (e) {
            setError(`Failed to fetch extensions: ${e}`);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Auto-fetch when switching to browse tab
    useEffect(() => {
        if (activeTab === 'browse' && repos.length > 0) {
            fetchAvailableExtensions();
        }
    }, [activeTab, repos.length, fetchAvailableExtensions]);

    // Add repository
    const handleAddRepo = async () => {
        if (!newRepoUrl.trim()) return;

        setAddRepoLoading(true);
        setError(null);
        try {
            await ExtensionRepository.addRepo(newRepoUrl.trim());
            setNewRepoUrl('');
            setIsAddRepoOpen(false);
            loadData();
        } catch (e) {
            setError(`${e}`);
        } finally {
            setAddRepoLoading(false);
        }
    };

    // Remove repository
    const handleRemoveRepo = (url: string) => {
        if (confirm('Remove this repository? Installed extensions will not be affected.')) {
            ExtensionRepository.removeRepo(url);
            loadData();
        }
    };

    // Install extension (handles both manga and anime)
    const handleInstallExtension = async (meta: ExtensionMeta, repoUrl: string) => {
        setIsLoading(true);
        setError(null);
        try {
            // Construct the full bundle URL
            const bundleUrl = meta.bundleUrl.startsWith('http')
                ? meta.bundleUrl
                : `${repoUrl}/${meta.bundleUrl}`;

            const bundleCode = await ExtensionRepository.fetchExtensionBundle(bundleUrl);

            // Install based on type
            if (meta.type === 'anime') {
                AnimeExtensionStorage.installExtension(meta as unknown as AnimeExtensionMeta, repoUrl, bundleCode);
                await AnimeExtensionManager.reload();
            } else {
                ExtensionStorage.installExtension(meta, repoUrl, bundleCode);
                await ExtensionManager.reload();
            }

            loadData();
        } catch (e) {
            setError(`Failed to install: ${e}`);
        } finally {
            setIsLoading(false);
        }
    };

    // Uninstall extension (handles both manga and anime)
    const handleUninstallExtension = async (id: string, type?: 'manga' | 'anime') => {
        if (confirm('Uninstall this extension?')) {
            if (type === 'anime') {
                AnimeExtensionStorage.uninstallExtension(id);
                await AnimeExtensionManager.reload();
            } else {
                ExtensionStorage.uninstallExtension(id);
                await ExtensionManager.reload();
            }
            loadData();
        }
    };

    // Toggle extension enabled state (handles both manga and anime)
    const handleToggleExtension = async (id: string, type?: 'manga' | 'anime') => {
        if (type === 'anime') {
            AnimeExtensionStorage.toggleExtension(id);
            await AnimeExtensionManager.reload();
        } else {
            ExtensionStorage.toggleExtension(id);
            await ExtensionManager.reload();
        }
        loadData();
    };

    // Check if extension is installed (handles both manga and anime)
    const isInstalled = (id: string, type?: 'manga' | 'anime'): boolean => {
        if (type === 'anime') {
            return installedAnimeExtensions.some(ext => ext.id === id);
        }
        return installedExtensions.some(ext => ext.id === id);
    };

    // Get combined installed extensions for display
    const allInstalledExtensions = [
        ...installedExtensions.map(e => ({ ...e, type: (e.type || 'manga') as 'manga' | 'anime' })),
        ...installedAnimeExtensions.map(e => ({ ...e, type: 'anime' as const }))
    ];

    // Filter installed extensions by type
    const filteredInstalledExtensions = typeFilter === 'all'
        ? allInstalledExtensions
        : allInstalledExtensions.filter(e => e.type === typeFilter);

    return (
        <div className="settings-section">
            <h2 className="settings-section-title">Extensions</h2>
            <p className="settings-section-description">
                Manage manga and anime source extensions
            </p>

            {/* Sub-tabs */}
            <div style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '24px',
                borderBottom: '1px solid var(--color-border-subtle)',
                paddingBottom: '12px'
            }}>
                {(['installed', 'browse', 'repos'] as ExtensionTab[]).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '8px',
                            border: 'none',
                            background: activeTab === tab ? 'rgba(180, 162, 246, 0.2)' : 'transparent',
                            color: activeTab === tab ? 'var(--color-lavender-mist)' : 'var(--color-text-muted)',
                            cursor: 'pointer',
                            fontWeight: activeTab === tab ? '600' : '400',
                            textTransform: 'capitalize',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Error display */}
            {error && (
                <div style={{
                    padding: '12px 16px',
                    background: 'rgba(255, 100, 100, 0.1)',
                    border: '1px solid rgba(255, 100, 100, 0.3)',
                    borderRadius: '8px',
                    color: '#ff6464',
                    marginBottom: '16px',
                    fontSize: '13px'
                }}>
                    {error}
                </div>
            )}

            {/* INSTALLED TAB */}
            {activeTab === 'installed' && (
                <div className="setting-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 className="setting-group-title" style={{ margin: 0 }}>Installed Extensions ({filteredInstalledExtensions.length})</h3>
                        {/* Type Filter */}
                        <div style={{ display: 'flex', gap: '4px' }}>
                            {(['all', 'manga', 'anime'] as ExtensionTypeFilter[]).map(filter => (
                                <button
                                    key={filter}
                                    onClick={() => setTypeFilter(filter)}
                                    style={{
                                        padding: '4px 10px',
                                        borderRadius: '6px',
                                        border: 'none',
                                        background: typeFilter === filter ? 'rgba(180, 162, 246, 0.3)' : 'rgba(255,255,255,0.05)',
                                        color: typeFilter === filter ? 'var(--color-lavender-mist)' : 'var(--color-text-muted)',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                        fontWeight: typeFilter === filter ? '600' : '400',
                                        textTransform: 'capitalize',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    {filter}
                                </button>
                            ))}
                        </div>
                    </div>

                    {filteredInstalledExtensions.length === 0 ? (
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>
                            No extensions installed. Go to the "Browse" tab to install some!
                        </p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {filteredInstalledExtensions.map(ext => (
                                <div
                                    key={`${ext.type}-${ext.id}`}
                                    className="setting-row"
                                    style={{
                                        padding: '12px 16px',
                                        background: 'rgba(255,255,255,0.03)',
                                        borderRadius: '12px',
                                        border: '1px solid var(--color-border-subtle)'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                                        {ext.iconUrl && (
                                            <img
                                                src={ext.iconUrl}
                                                alt={ext.name}
                                                style={{ width: 32, height: 32, borderRadius: 6 }}
                                            />
                                        )}
                                        <div>
                                            <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                {ext.name}
                                                <span style={{
                                                    padding: '2px 6px',
                                                    borderRadius: '4px',
                                                    fontSize: '10px',
                                                    fontWeight: 500,
                                                    background: ext.type === 'anime' ? 'rgba(100, 180, 255, 0.2)' : 'rgba(180, 162, 246, 0.2)',
                                                    color: ext.type === 'anime' ? '#64b4ff' : 'var(--color-lavender-mist)',
                                                    textTransform: 'uppercase'
                                                }}>
                                                    {ext.type}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                                                v{ext.version} • {ext.lang.toUpperCase()}
                                                {ext.nsfw && <span style={{ color: '#ff6464', marginLeft: 8 }}>NSFW</span>}
                                            </div>
                                            {ext.enabled && ext.type === 'manga' && !ExtensionLoader.isLoaded(ext.id) && (
                                                <div style={{
                                                    color: '#ff6464',
                                                    marginTop: 4,
                                                    fontSize: '11px',
                                                    background: 'rgba(255, 100, 100, 0.1)',
                                                    padding: '2px 6px',
                                                    borderRadius: '4px',
                                                    display: 'inline-block'
                                                }}>
                                                    ⚠ Failed to load: {ExtensionLoader.getLoadError(ext.id) || 'Unknown error'}
                                                </div>
                                            )}
                                            {ext.enabled && ext.type === 'anime' && !AnimeLoader.isLoaded(ext.id) && (
                                                <div style={{
                                                    color: '#ff6464',
                                                    marginTop: 4,
                                                    fontSize: '11px',
                                                    background: 'rgba(255, 100, 100, 0.1)',
                                                    padding: '2px 6px',
                                                    borderRadius: '4px',
                                                    display: 'inline-block'
                                                }}>
                                                    ⚠ Failed to load: {AnimeLoader.getLoadError(ext.id) || 'Unknown error'}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {/* Enable/Disable Toggle */}
                                        <button
                                            onClick={() => handleToggleExtension(ext.id, ext.type)}
                                            className={`toggle-switch ${ext.enabled ? 'active' : ''}`}
                                            style={{ marginRight: '8px' }}
                                        />
                                        {/* Uninstall */}
                                        <button
                                            onClick={() => handleUninstallExtension(ext.id, ext.type)}
                                            className="setting-button danger"
                                            style={{ padding: '6px 12px' }}
                                        >
                                            <TrashIcon size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* BROWSE TAB */}
            {activeTab === 'browse' && (
                <div className="setting-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 className="setting-group-title" style={{ margin: 0 }}>Available Extensions</h3>
                        <button
                            className="setting-button"
                            onClick={fetchAvailableExtensions}
                            disabled={isLoading}
                        >
                            <RefreshIcon size={14} />
                            {isLoading ? 'Loading...' : 'Refresh'}
                        </button>
                    </div>

                    {repos.length === 0 ? (
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>
                            No repositories added. Go to the "Repos" tab to add one!
                        </p>
                    ) : availableExtensions.length === 0 && !isLoading ? (
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>
                            No extensions found. Try refreshing or check your repositories.
                        </p>
                    ) : (
                        availableExtensions.map(repo => (
                            <div key={repo.repoUrl} style={{ marginBottom: '24px' }}>
                                <h4 style={{
                                    fontSize: '14px',
                                    color: 'var(--color-lavender-mist)',
                                    marginBottom: '12px',
                                    fontWeight: 600
                                }}>
                                    {repo.repoName}
                                </h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {repo.extensions.map(ext => (
                                        <div
                                            key={ext.id}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '12px 16px',
                                                background: 'rgba(255,255,255,0.03)',
                                                borderRadius: '12px',
                                                border: '1px solid var(--color-border-subtle)'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                {ext.iconUrl && (
                                                    <img
                                                        src={ext.iconUrl}
                                                        alt={ext.name}
                                                        style={{ width: 32, height: 32, borderRadius: 6 }}
                                                    />
                                                )}
                                                <div>
                                                    <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        {ext.name}
                                                        <span style={{
                                                            padding: '2px 6px',
                                                            borderRadius: '4px',
                                                            fontSize: '10px',
                                                            fontWeight: 500,
                                                            background: ext.type === 'anime' ? 'rgba(100, 180, 255, 0.2)' : 'rgba(180, 162, 246, 0.2)',
                                                            color: ext.type === 'anime' ? '#64b4ff' : 'var(--color-lavender-mist)',
                                                            textTransform: 'uppercase'
                                                        }}>
                                                            {ext.type || 'manga'}
                                                        </span>
                                                    </div>
                                                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                                                        v{ext.version} • {ext.lang.toUpperCase()}
                                                        {ext.nsfw && <span style={{ color: '#ff6464', marginLeft: 8 }}>NSFW</span>}
                                                    </div>
                                                </div>
                                            </div>
                                            {isInstalled(ext.id, ext.type) ? (
                                                <span style={{
                                                    padding: '6px 12px',
                                                    fontSize: '12px',
                                                    color: 'var(--color-mint-tonic)',
                                                    background: 'rgba(157, 240, 179, 0.1)',
                                                    borderRadius: '6px'
                                                }}>
                                                    Installed
                                                </span>
                                            ) : (
                                                <button
                                                    onClick={() => handleInstallExtension(ext, repo.repoUrl)}
                                                    className="setting-button primary"
                                                    disabled={isLoading}
                                                    style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                                                >
                                                    <DownloadIcon size={14} />
                                                    Install
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* REPOS TAB */}
            {activeTab === 'repos' && (
                <div className="setting-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 className="setting-group-title" style={{ margin: 0 }}>Repositories ({repos.length})</h3>
                        <button
                            className="setting-button primary"
                            onClick={() => setIsAddRepoOpen(true)}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                            <PlusIcon size={14} />
                            Add Repository
                        </button>
                    </div>

                    {repos.length === 0 ? (
                        <div style={{
                            padding: '24px',
                            textAlign: 'center',
                            color: 'var(--color-text-muted)',
                            background: 'rgba(255,255,255,0.02)',
                            borderRadius: '12px',
                            border: '1px dashed var(--color-border-subtle)'
                        }}>
                            <LinkIcon size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
                            <p style={{ margin: 0 }}>No repositories added yet.</p>
                            <p style={{ margin: '8px 0 0 0', fontSize: '13px' }}>
                                Add a repository URL to browse and install extensions.
                            </p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {repos.map(repo => (
                                <div
                                    key={repo.url}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '12px 16px',
                                        background: 'rgba(255,255,255,0.03)',
                                        borderRadius: '12px',
                                        border: '1px solid var(--color-border-subtle)'
                                    }}
                                >
                                    <div>
                                        <div style={{ fontWeight: 600 }}>{repo.name}</div>
                                        <div style={{
                                            fontSize: 12,
                                            color: 'var(--color-text-muted)',
                                            fontFamily: 'var(--font-mono)'
                                        }}>
                                            {repo.url}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleRemoveRepo(repo.url)}
                                        className="setting-button danger"
                                        style={{ padding: '6px 12px' }}
                                    >
                                        <TrashIcon size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Add Repo Dialog */}
            {isAddRepoOpen && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        background: '#1a1a1a',
                        padding: '24px',
                        borderRadius: '16px',
                        border: '1px solid var(--color-border-subtle)',
                        width: '400px',
                        maxWidth: '90vw'
                    }}>
                        <h3 style={{ margin: '0 0 16px', fontSize: '18px' }}>Add Extension Repository</h3>
                        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
                            Enter the URL of an extension repository. The URL should point to a directory containing an index.json file.
                        </p>
                        <input
                            type="text"
                            value={newRepoUrl}
                            onChange={(e) => setNewRepoUrl(e.target.value)}
                            placeholder="https://example.com/extensions"
                            style={{
                                width: '100%',
                                padding: '12px 16px',
                                borderRadius: '8px',
                                border: '1px solid var(--color-border-subtle)',
                                background: 'rgba(255,255,255,0.05)',
                                color: 'var(--color-text-main)',
                                fontSize: '14px',
                                fontFamily: 'var(--font-mono)',
                                marginBottom: '16px'
                            }}
                            autoFocus
                            onKeyDown={(e) => e.key === 'Enter' && handleAddRepo()}
                        />
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => { setIsAddRepoOpen(false); setNewRepoUrl(''); }}
                                className="setting-button"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddRepo}
                                className="setting-button primary"
                                disabled={addRepoLoading || !newRepoUrl.trim()}
                            >
                                {addRepoLoading ? 'Adding...' : 'Add Repository'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
