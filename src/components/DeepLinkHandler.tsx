
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { onOpenUrl, getCurrent } from '@tauri-apps/plugin-deep-link';
import { listen } from '@tauri-apps/api/event';

// Track if we've already processed the startup URL to prevent loops on remount
let initialDeepLinkProcessed = false;

export function DeepLinkHandler() {
    const navigate = useNavigate();

    useEffect(() => {
        let unlisten: (() => void) | undefined;

        const handleUrl = (url: string) => {
            try {
                // Ignore auth urls as they are handled by AuthContext
                if (url.startsWith('playon://auth')) return;

                console.log('[DeepLinkHandler] Processing:', url);
                const urlObj = new URL(url);

                // host maps to the first segment
                // playon://library -> host: library
                // playon://read/123 -> host: read, pathname: /123
                const action = urlObj.hostname;

                switch (action) {
                    case 'home':
                        navigate('/home');
                        break;
                    case 'mylist':
                        navigate('/my-list');
                        break;
                    case 'calendar':
                        navigate('/calendar');
                        break;
                    case 'stats':
                        navigate('/statistics');
                        break;

                    // Anime
                    case 'watchanime':
                        navigate('/anime-list');
                        break;
                    case 'browseanime':
                        navigate('/anime-browse');
                        break;

                    // Manga
                    case 'readmanga':
                        navigate('/manga-list');
                        break;
                    case 'browsemanga':
                        navigate('/manga-browse');
                        break;

                    // User / System
                    case 'profile':
                        // If username provided in path? For now just go to home or maybe we can't deep link to specific user easily without arg
                        // But user route is /user/:username. 
                        // Let's assume playon://profile maps to current user or redirect to home if not easy
                        // Or maybe settings has a profile section?
                        // Let's map to settings for now or maybe just ignore if no username
                        navigate('/settings');
                        break;
                    case 'settings':
                        navigate('/settings');
                        break;
                    case 'notifs':
                        navigate('/notifications');
                        break;
                    case 'history':
                        navigate('/history');
                        break;

                    // Keep existing read handler for direct chapter links if needed, 
                    // or user didn't specify to keep it? The user provided a list "playon://... only from here".
                    // But the READ logic handles parameters. I'll keep it as a fallback or if user explicitly uses it.
                    // Actually, "readmanga" is likely the list. 
                    // The "read" case handles specific chapters. I should probably keep it for the "Opening ... in PLAY-ON!" script from before.
                    case 'read': {
                        const path = urlObj.pathname;
                        if (path) {
                            navigate(`/read${path}`);
                        }
                        break;
                    }
                    default:
                        console.log('[DeepLinkHandler] Unknown action:', action);
                }
            } catch (e) {
                console.error('[DeepLinkHandler] Failed to process url:', url, e);
            }
        };

        const init = async () => {
            // Check for launch URL - ONLY ONCE
            if (!initialDeepLinkProcessed) {
                const initialUrls = await getCurrent();
                if (initialUrls) {
                    initialUrls.forEach(handleUrl);
                }
                initialDeepLinkProcessed = true;
            }

            // Listen for new URLs (runtime events should always be processed)
            unlisten = await onOpenUrl((urls) => {
                urls.forEach(handleUrl);
            });

            // Listen for single-instance arguments (Windows warm start)
            const unlistenSingle = await listen<string[]>('single-instance', (event) => {
                console.log('[DeepLinkHandler] Single instance args:', event.payload);
                event.payload.forEach((arg) => {
                    if (arg.startsWith('playon://')) {
                        handleUrl(arg);
                    }
                });
            });

            // Combine unlisteners
            const prevUnlisten = unlisten;
            unlisten = () => {
                prevUnlisten();
                unlistenSingle();
            };
        };

        init();

        return () => {
            if (unlisten) unlisten();
        };
    }, [navigate]);

    return null;
}
