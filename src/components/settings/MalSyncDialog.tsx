/**
 * MAL Sync Dialog Component
 * 
 * Modal dialog for syncing MAL entries from AniList.
 * Shows a detailed diff report and allows individual or bulk updates.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAuthContext } from '../../context/AuthContext';
import { useMalAuth } from '../../context/MalAuthContext';
import {
    generateSyncReport,
    syncEntryToMal,
    SyncDiffReport,
    SyncDiffEntry,
    SyncUpdateResult,
} from '../../services/malSyncService';
import { XIcon, CheckIcon, AlertTriangleIcon, RefreshIcon } from '../ui/Icons';
import './MalSyncDialog.css';

interface MalSyncDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

type SyncState = 'idle' | 'loading' | 'report' | 'syncing' | 'complete';

export const MalSyncDialog: React.FC<MalSyncDialogProps> = ({ isOpen, onClose }) => {
    const { user: anilistUser } = useAuthContext();
    const { accessToken: malAccessToken } = useMalAuth();

    const [state, setState] = useState<SyncState>('idle');
    const [report, setReport] = useState<SyncDiffReport | null>(null);
    const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
    const [syncResults, setSyncResults] = useState<SyncUpdateResult[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'anime' | 'manga'>('anime');
    const [syncLogs, setSyncLogs] = useState<Array<{ message: string; type: 'info' | 'success' | 'error' }>>([]);
    const [currentProgress, setCurrentProgress] = useState<{ current: number; total: number } | null>(null);

    // Reset state when dialog opens
    useEffect(() => {
        if (isOpen) {
            setState('idle');
            setReport(null);
            setSelectedEntries(new Set());
            setSyncResults([]);
            setError(null);
            setSyncLogs([]);
            setCurrentProgress(null);
        }
    }, [isOpen]);

    // Add a log entry
    const addLog = useCallback((message: string, type: 'info' | 'success' | 'error' = 'info') => {
        setSyncLogs(prev => [...prev, { message, type }]);
    }, []);

    // Generate the sync report
    const handleGenerateReport = useCallback(async () => {
        if (!anilistUser?.id || !malAccessToken) {
            setError('Both AniList and MAL must be connected');
            return;
        }

        setState('loading');
        setError(null);
        setSyncLogs([]);

        addLog('Starting sync report generation...');
        addLog('Fetching AniList collection...');

        try {
            const result = await generateSyncReport(anilistUser.id, malAccessToken);

            addLog(`Found ${result.summary.totalAnime} anime, ${result.summary.totalManga} manga on AniList`, 'success');
            addLog(`Found ${result.summary.animeDiffs} anime and ${result.summary.mangaDiffs} manga with differences`, 'info');
            if (result.summary.missingOnMal > 0) {
                addLog(`${result.summary.missingOnMal} entries not found on MAL`, 'info');
            }

            setReport(result);

            // Pre-select all entries with differences (except missing ones)
            const allKeys = new Set<string>();
            result.anime
                .filter(e => !e.differences.includes('missing'))
                .forEach(e => allKeys.add(`anime-${e.anilistId}`));
            result.manga
                .filter(e => !e.differences.includes('missing'))
                .forEach(e => allKeys.add(`manga-${e.anilistId}`));
            setSelectedEntries(allKeys);

            addLog('Report generation complete!', 'success');
            setState('report');
        } catch (e) {
            addLog(`Error: ${String(e)}`, 'error');
            setError(String(e));
            setState('idle');
        }
    }, [anilistUser, malAccessToken, addLog]);

    // Toggle entry selection
    const toggleEntry = (type: 'anime' | 'manga', anilistId: number) => {
        const key = `${type}-${anilistId}`;
        const newSelected = new Set(selectedEntries);
        if (newSelected.has(key)) {
            newSelected.delete(key);
        } else {
            newSelected.add(key);
        }
        setSelectedEntries(newSelected);
    };

    // Select/deselect all
    const toggleSelectAll = (type: 'anime' | 'manga') => {
        if (!report) return;

        const entries = type === 'anime' ? report.anime : report.manga;
        const allSelected = entries.every(e => selectedEntries.has(`${type}-${e.anilistId}`));

        const newSelected = new Set(selectedEntries);
        entries.forEach(e => {
            const key = `${type}-${e.anilistId}`;
            if (allSelected) {
                newSelected.delete(key);
            } else {
                newSelected.add(key);
            }
        });
        setSelectedEntries(newSelected);
    };

    // Sync selected entries
    const handleSyncSelected = async () => {
        if (!report || !malAccessToken) return;

        const entriesToSync: SyncDiffEntry[] = [];

        report.anime.forEach(e => {
            if (selectedEntries.has(`anime-${e.anilistId}`)) {
                entriesToSync.push(e);
            }
        });

        report.manga.forEach(e => {
            if (selectedEntries.has(`manga-${e.anilistId}`)) {
                entriesToSync.push(e);
            }
        });

        if (entriesToSync.length === 0) {
            setError('No entries selected');
            return;
        }

        setState('syncing');
        setError(null);
        setSyncLogs([]);
        setCurrentProgress({ current: 0, total: entriesToSync.length });

        addLog(`Starting sync of ${entriesToSync.length} entries...`);

        try {
            // Sync entries one by one to show progress
            const results: SyncUpdateResult[] = [];
            for (let i = 0; i < entriesToSync.length; i++) {
                const entry = entriesToSync[i];
                setCurrentProgress({ current: i + 1, total: entriesToSync.length });
                addLog(`Syncing: ${entry.title}`);

                const result = await syncEntryToMal(malAccessToken, entry);
                results.push(result);

                if (result.success) {
                    addLog(`✓ ${entry.title}`, 'success');
                } else {
                    addLog(`✗ ${entry.title}: ${result.error}`, 'error');
                }

                // Small delay to be nice to MAL API
                if (i < entriesToSync.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
            }

            setSyncResults(results);
            const successCount = results.filter(r => r.success).length;
            const failCount = results.filter(r => !r.success).length;

            addLog(`Sync complete! ${successCount} succeeded, ${failCount} failed`,
                failCount > 0 ? 'error' : 'success');

            setCurrentProgress(null);
            setState('complete');
        } catch (e) {
            addLog(`Error: ${String(e)}`, 'error');
            setError(String(e));
            setCurrentProgress(null);
            setState('report');
        }
    };

    // Sync a single entry
    const handleSyncSingle = async (entry: SyncDiffEntry) => {
        if (!malAccessToken) return;

        addLog(`Syncing: ${entry.title}`);

        try {
            const result = await syncEntryToMal(malAccessToken, entry);
            if (result.success) {
                addLog(`✓ ${entry.title} synced successfully`, 'success');
                // Remove from report
                if (report) {
                    const newReport = { ...report };
                    if (entry.type === 'anime') {
                        newReport.anime = newReport.anime.filter(e => e.anilistId !== entry.anilistId);
                        newReport.summary.animeDiffs--;
                    } else {
                        newReport.manga = newReport.manga.filter(e => e.anilistId !== entry.anilistId);
                        newReport.summary.mangaDiffs--;
                    }
                    setReport(newReport);
                }
            } else {
                addLog(`✗ ${entry.title}: ${result.error}`, 'error');
                setError(result.error || 'Sync failed');
            }
        } catch (e) {
            addLog(`✗ ${entry.title}: ${String(e)}`, 'error');
            setError(String(e));
        }
    };

    if (!isOpen) return null;

    const renderDiffBadge = (differences: SyncDiffEntry['differences']) => {
        return (
            <div className="diff-badges">
                {differences.map(diff => (
                    <span key={diff} className={`diff-badge ${diff}`}>
                        {diff === 'missing' ? 'Not on MAL' : diff}
                    </span>
                ))}
            </div>
        );
    };

    const renderEntry = (entry: SyncDiffEntry) => {
        const key = `${entry.type}-${entry.anilistId}`;
        const isSelected = selectedEntries.has(key);
        const isMissing = entry.differences.includes('missing');

        return (
            <div key={key} className={`sync-entry ${isMissing ? 'missing' : ''}`}>
                <div className="sync-entry-checkbox">
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleEntry(entry.type, entry.anilistId)}
                        disabled={isMissing}
                    />
                </div>
                <div className="sync-entry-info">
                    <div className="sync-entry-title">{entry.title}</div>
                    {renderDiffBadge(entry.differences)}
                </div>
                <div className="sync-entry-comparison">
                    <div className="sync-value anilist">
                        <span className="label">AniList</span>
                        <span className="value">
                            {entry.anilist.progress} ep • {entry.anilist.status}
                            {entry.anilist.score > 0 && ` • ${entry.anilist.score / 10}/10`}
                        </span>
                    </div>
                    {entry.mal && (
                        <div className="sync-value mal">
                            <span className="label">MAL</span>
                            <span className="value">
                                {entry.mal.progress} ep • {entry.mal.status}
                                {entry.mal.score > 0 && ` • ${entry.mal.score}/10`}
                            </span>
                        </div>
                    )}
                </div>
                {!isMissing && (
                    <button
                        className="sync-entry-action"
                        onClick={() => handleSyncSingle(entry)}
                        title="Sync this entry"
                    >
                        <RefreshIcon size={16} />
                    </button>
                )}
            </div>
        );
    };

    return (
        <div className="mal-sync-overlay" onClick={onClose}>
            <div className="mal-sync-dialog" onClick={e => e.stopPropagation()}>
                <div className="mal-sync-header">
                    <h2>Sync MAL from AniList</h2>
                    <button className="close-btn" onClick={onClose}>
                        <XIcon size={20} />
                    </button>
                </div>

                <div className="mal-sync-content">
                    {state === 'idle' && (
                        <div className="sync-idle">
                            <p>
                                Compare your AniList and MyAnimeList libraries to find differences.
                                You can then choose which entries to sync from AniList to MAL.
                            </p>
                            <button className="sync-start-btn" onClick={handleGenerateReport}>
                                Generate Diff Report
                            </button>
                        </div>
                    )}

                    {state === 'loading' && (
                        <div className="sync-loading">
                            <div className="loading-spinner" />
                            <p>Fetching lists from AniList and MAL...</p>
                            <p className="loading-hint">This may take a moment for large libraries</p>
                            {syncLogs.length > 0 && (
                                <div className="sync-logs">
                                    {syncLogs.map((log, i) => (
                                        <div key={i} className={`sync-log ${log.type}`}>{log.message}</div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {state === 'report' && report && (
                        <>
                            <div className="sync-summary">
                                <div className="summary-stat">
                                    <span className="stat-value">{report.summary.animeDiffs}</span>
                                    <span className="stat-label">Anime Diffs</span>
                                </div>
                                <div className="summary-stat">
                                    <span className="stat-value">{report.summary.mangaDiffs}</span>
                                    <span className="stat-label">Manga Diffs</span>
                                </div>
                                <div className="summary-stat">
                                    <span className="stat-value">{report.summary.missingOnMal}</span>
                                    <span className="stat-label">Missing on MAL</span>
                                </div>
                            </div>

                            {(report.anime.length === 0 && report.manga.length === 0) ? (
                                <div className="sync-all-matched">
                                    <CheckIcon size={48} />
                                    <p>Your libraries are in sync!</p>
                                </div>
                            ) : (
                                <>
                                    <div className="sync-tabs">
                                        <button
                                            className={`sync-tab ${activeTab === 'anime' ? 'active' : ''}`}
                                            onClick={() => setActiveTab('anime')}
                                        >
                                            Anime ({report.anime.length})
                                        </button>
                                        <button
                                            className={`sync-tab ${activeTab === 'manga' ? 'active' : ''}`}
                                            onClick={() => setActiveTab('manga')}
                                        >
                                            Manga ({report.manga.length})
                                        </button>
                                    </div>

                                    <div className="sync-list-header">
                                        <label className="select-all">
                                            <input
                                                type="checkbox"
                                                checked={
                                                    (activeTab === 'anime' ? report.anime : report.manga)
                                                        .filter(e => !e.differences.includes('missing'))
                                                        .every(e => selectedEntries.has(`${activeTab}-${e.anilistId}`))
                                                }
                                                onChange={() => toggleSelectAll(activeTab)}
                                            />
                                            Select All
                                        </label>
                                    </div>

                                    <div className="sync-entries">
                                        {(activeTab === 'anime' ? report.anime : report.manga).map(renderEntry)}
                                    </div>
                                </>
                            )}
                        </>
                    )}

                    {state === 'syncing' && (
                        <div className="sync-loading">
                            <div className="loading-spinner" />
                            <p>Syncing entries to MAL...</p>
                            {currentProgress && (
                                <div className="sync-progress">
                                    <div className="progress-bar">
                                        <div
                                            className="progress-fill"
                                            style={{ width: `${(currentProgress.current / currentProgress.total) * 100}%` }}
                                        />
                                    </div>
                                    <span className="progress-text">
                                        {currentProgress.total - currentProgress.current} left • {Math.round((currentProgress.current / currentProgress.total) * 100)}% complete
                                    </span>
                                </div>
                            )}
                            {syncLogs.length > 0 && (
                                <div className="sync-logs">
                                    {syncLogs.slice(-10).map((log, i) => (
                                        <div key={i} className={`sync-log ${log.type}`}>{log.message}</div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {state === 'complete' && (
                        <div className="sync-complete">
                            <CheckIcon size={48} />
                            <h3>Sync Complete!</h3>
                            <div className="sync-results-summary">
                                <span className="result-success">
                                    {syncResults.filter(r => r.success).length} succeeded
                                </span>
                                {syncResults.some(r => !r.success) && (
                                    <span className="result-failed">
                                        {syncResults.filter(r => !r.success).length} failed
                                    </span>
                                )}
                            </div>
                            {syncResults.some(r => !r.success) && (
                                <div className="sync-failures">
                                    {syncResults.filter(r => !r.success).map((r, i) => (
                                        <div key={i} className="failure-item">
                                            <AlertTriangleIcon size={14} />
                                            <span>{r.entry.title}: {r.error}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <button className="sync-done-btn" onClick={onClose}>
                                Done
                            </button>
                        </div>
                    )}

                    {error && (
                        <div className="sync-error">
                            <AlertTriangleIcon size={16} />
                            <span>{error}</span>
                        </div>
                    )}
                </div>

                {state === 'report' && report && (report.anime.length > 0 || report.manga.length > 0) && (
                    <div className="mal-sync-footer">
                        <button className="sync-btn secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button
                            className="sync-btn primary"
                            onClick={handleSyncSelected}
                            disabled={selectedEntries.size === 0}
                        >
                            Update Selected ({selectedEntries.size})
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MalSyncDialog;
