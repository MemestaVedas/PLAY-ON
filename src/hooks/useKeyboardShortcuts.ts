/**
 * useKeyboardShortcuts Hook
 * 
 * Global keyboard shortcut handler that:
 * - Listens for keydown events
 * - Matches against user-configured shortcuts
 * - Executes registered callbacks
 * - Works regardless of focus state (state-agnostic)
 */

import { useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSettings, ShortcutAction } from '../context/SettingsContext';
import { useAuthContext } from '../context/AuthContext';

// Parse a shortcut string like "Ctrl+Shift+A" into components
function parseShortcut(shortcut: string): { key: string; ctrl: boolean; shift: boolean; alt: boolean; meta: boolean } {
    const parts = shortcut.split('+').map(p => p.trim().toLowerCase());
    const key = parts[parts.length - 1];
    return {
        key,
        ctrl: parts.includes('ctrl'),
        shift: parts.includes('shift'),
        alt: parts.includes('alt'),
        meta: parts.includes('meta') || parts.includes('cmd'),
    };
}

// Check if a keyboard event matches a shortcut
function matchesShortcut(event: KeyboardEvent, shortcut: string): boolean {
    const parsed = parseShortcut(shortcut);
    const eventKey = event.key.toLowerCase();

    // Handle special keys
    const keyMatches =
        eventKey === parsed.key ||
        (parsed.key === ',' && eventKey === ',') ||
        (parsed.key === 'escape' && eventKey === 'escape');

    return (
        keyMatches &&
        event.ctrlKey === parsed.ctrl &&
        event.shiftKey === parsed.shift &&
        event.altKey === parsed.alt &&
        event.metaKey === parsed.meta
    );
}

export interface ShortcutCallbacks {
    onSearchAnime?: () => void;
    onSearchManga?: () => void;
    onEscape?: () => void;
}

export function useKeyboardShortcuts(callbacks: ShortcutCallbacks = {}) {
    const navigate = useNavigate();
    const { settings } = useSettings();
    const { user, isAuthenticated } = useAuthContext();
    const callbacksRef = useRef(callbacks);

    // Keep callbacks ref updated
    useEffect(() => {
        callbacksRef.current = callbacks;
    }, [callbacks]);

    const handleKeyDown = useCallback((event: KeyboardEvent) => {
        const shortcuts = settings.keyboardShortcuts;

        // Check each shortcut - ALL shortcuts work regardless of input focus (state-agnostic)
        for (const [action, binding] of Object.entries(shortcuts) as [ShortcutAction, string][]) {
            if (matchesShortcut(event, binding)) {
                event.preventDefault();

                switch (action) {
                    case 'searchAnime':
                        callbacksRef.current.onSearchAnime?.();
                        break;
                    case 'searchManga':
                        callbacksRef.current.onSearchManga?.();
                        break;
                    case 'goHome':
                        // Blur any focused input first
                        (document.activeElement as HTMLElement)?.blur?.();
                        navigate('/');
                        break;
                    case 'goAnimeList':
                        (document.activeElement as HTMLElement)?.blur?.();
                        navigate('/anime-list');
                        break;
                    case 'goMangaList':
                        (document.activeElement as HTMLElement)?.blur?.();
                        navigate('/manga-list');
                        break;
                    case 'goSettings':
                        (document.activeElement as HTMLElement)?.blur?.();
                        navigate('/settings');
                        break;
                    case 'goProfile':
                        (document.activeElement as HTMLElement)?.blur?.();
                        // Navigate to user's AniList profile page if authenticated
                        if (isAuthenticated && user?.name) {
                            navigate(`/user/${user.name}`);
                        } else {
                            navigate('/settings');
                        }
                        break;
                    case 'goBack':
                        (document.activeElement as HTMLElement)?.blur?.();
                        navigate(-1);
                        break;
                    case 'escape':
                        // Blur any focused element (exit from input)
                        (document.activeElement as HTMLElement)?.blur?.();
                        callbacksRef.current.onEscape?.();
                        break;
                }
                break;
            }
        }
    }, [settings.keyboardShortcuts, navigate]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);
}

// Utility to format a keyboard event as a shortcut string
export function formatShortcutFromEvent(event: KeyboardEvent): string {
    const parts: string[] = [];
    if (event.ctrlKey) parts.push('Ctrl');
    if (event.shiftKey) parts.push('Shift');
    if (event.altKey) parts.push('Alt');
    if (event.metaKey) parts.push('Meta');

    // Get the key (capitalize first letter for display)
    let key = event.key;
    if (key === ' ') key = 'Space';
    else if (key.length === 1) key = key.toUpperCase();
    else key = key.charAt(0).toUpperCase() + key.slice(1);

    // Don't add modifier keys as the main key
    if (!['Control', 'Shift', 'Alt', 'Meta'].includes(key)) {
        parts.push(key);
    }

    return parts.join('+');
}
