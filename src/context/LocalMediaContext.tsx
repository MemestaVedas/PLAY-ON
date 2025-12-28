import React, { createContext, useContext, useState, useEffect } from 'react';
import { open } from '@tauri-apps/plugin-dialog';

export interface LocalFolder {
    path: string;
    label: string;
}

interface LocalMediaContextType {
    folders: LocalFolder[];
    addFolder: () => Promise<void>;
    removeFolder: (path: string) => void;
}

const LocalMediaContext = createContext<LocalMediaContextType | undefined>(undefined);

export function LocalMediaProvider({ children }: { children: React.ReactNode }) {
    const [folders, setFolders] = useState<LocalFolder[]>([]);

    // Load from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem('local-folders');
        console.log("LocalMediaContext: Loading from localStorage:", saved);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                console.log("LocalMediaContext: Parsed folders:", parsed);
                setFolders(parsed);
            } catch (e) {
                console.error("Failed to parse local folders", e);
            }
        }
    }, []);

    // Save to localStorage whenever folders change
    useEffect(() => {
        console.log("LocalMediaContext: Saving to localStorage:", folders);
        localStorage.setItem('local-folders', JSON.stringify(folders));
    }, [folders]);

    const addFolder = async () => {
        try {
            const selected = await open({
                directory: true,
                multiple: false,
                recursive: true,
                title: 'Select a folder to add'
            });

            if (selected) {
                // If user selected a directory, it comes as a string (or array if multiple, but we set multiple:false)
                const path = selected as string;
                // Extract last part of path as label (simple heuristic)
                // Handle both windows and unix separators
                const name = path.split(/[\\/]/).pop() || path;

                // Check if already exists
                if (!folders.some(f => f.path === path)) {
                    setFolders(prev => [...prev, { path, label: name }]);
                }
            }
        } catch (err) {
            console.error("Failed to open dialog", err);
        }
    };

    const removeFolder = (path: string) => {
        setFolders(prev => prev.filter(f => f.path !== path));
    };

    return (
        <LocalMediaContext.Provider value={{ folders, addFolder, removeFolder }}>
            {children}
        </LocalMediaContext.Provider>
    );
}

export function useLocalMedia() {
    const context = useContext(LocalMediaContext);
    if (context === undefined) {
        throw new Error('useLocalMedia must be used within a LocalMediaProvider');
    }
    return context;
}
