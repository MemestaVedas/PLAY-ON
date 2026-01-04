import React, { createContext, useContext, useState, useEffect } from 'react';
import { open } from '@tauri-apps/plugin-dialog';

export interface LocalFolder {
    path: string;
    label: string;
    type: 'anime' | 'manga';
}

interface LocalMediaContextType {
    folders: LocalFolder[];
    addFolder: (type: 'anime' | 'manga') => Promise<void>;
    removeFolder: (path: string) => void;
    animeFolders: LocalFolder[];
    mangaFolders: LocalFolder[];
}

const LocalMediaContext = createContext<LocalMediaContextType | undefined>(undefined);

export function LocalMediaProvider({ children }: { children: React.ReactNode }) {
    const [folders, setFolders] = useState<LocalFolder[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    // Load from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem('local-folders');
        console.log("LocalMediaContext: Loading from localStorage:", saved);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                console.log("LocalMediaContext: Parsed folders:", parsed);

                // Migration: valid existing folders that barely have path/label to type='anime'
                const migrated = parsed.map((f: any) => ({
                    ...f,
                    type: f.type || 'anime'
                }));

                setFolders(migrated);
            } catch (e) {
                console.error("Failed to parse local folders", e);
            }
        }
        setIsLoaded(true);
    }, []);

    // Save to localStorage whenever folders change (but only after initial load)
    useEffect(() => {
        if (!isLoaded) return; // Don't save until we've loaded
        console.log("LocalMediaContext: Saving to localStorage:", folders);
        localStorage.setItem('local-folders', JSON.stringify(folders));
    }, [folders, isLoaded]);

    const addFolder = async (type: 'anime' | 'manga') => {
        try {
            const selected = await open({
                directory: true,
                multiple: false,
                recursive: true,
                title: `Select a ${type} folder to add`
            });

            if (selected) {
                // If user selected a directory, it comes as a string (or array if multiple, but we set multiple:false)
                const path = selected as string;
                // Extract last part of path as label (simple heuristic)
                // Handle both windows and unix separators
                const name = path.split(/[\\/]/).pop() || path;
                console.log(`LocalMediaContext: Adding folder: ${path}, label: ${name}, type: ${type}`);

                // Check if already exists
                if (!folders.some(f => f.path === path)) {
                    setFolders(prev => {
                        const newState = [...prev, { path, label: name, type }];
                        console.log("LocalMediaContext: New folders state:", newState);
                        return newState;
                    });
                } else {
                    console.log("LocalMediaContext: Folder already exists");
                }
            }
        } catch (err) {
            console.error("Failed to open dialog", err);
        }
    };

    const removeFolder = (path: string) => {
        setFolders(prev => prev.filter(f => f.path !== path));
    };

    const animeFolders = folders.filter(f => f.type === 'anime' || !f.type);
    const mangaFolders = folders.filter(f => f.type === 'manga');

    return (
        <LocalMediaContext.Provider value={{ folders, addFolder, removeFolder, animeFolders, mangaFolders }}>
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
