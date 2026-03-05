import { useState, useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { Window } from '@tauri-apps/api/window';

export function useWindowVisibility() {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        let unlisten: () => void;

        const setupListener = async () => {
            // Listen for our custom Rust event
            unlisten = await listen<string>('window-visibility', (event) => {
                setIsVisible(event.payload === 'visible');
            });

            // Also do an initial check
            try {
                const appWindow = new Window("main");
                const minimized = await appWindow.isMinimized();
                const visible = await appWindow.isVisible();
                setIsVisible(!minimized && visible);
            } catch (e) {
                console.error("Failed to check window state", e);
            }
        };

        setupListener();

        return () => {
            if (unlisten) {
                unlisten();
            }
        };
    }, []);

    return isVisible;
}
