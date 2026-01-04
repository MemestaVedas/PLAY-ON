import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { openPath } from '@tauri-apps/plugin-opener';
import { motion } from 'framer-motion';
import Folder from '../components/ui/Folder';
import AniListSearchDialog from '../components/ui/AniListSearchDialog';
import { useFolderMappings } from '../hooks/useFolderMappings';
import { useAnimeData } from '../hooks/useAnimeData';
import { addMangaToLibrary } from '../lib/localMangaDb';
import {
    FilmIcon,
    MusicIcon,
    ImageIcon,
    FileTextIcon,
    BookOpenIcon,
    FileIcon,
    FolderIcon
} from '../components/ui/Icons';

interface FileItem {
    name: string;
    path: string;
    is_dir: boolean;
    size?: number;
    last_modified?: number;
}

const formatSize = (bytes?: number): string => {
    if (bytes === undefined || bytes === null) return '';
    if (bytes === 0) return '0 KB';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const formatDate = (timestamp?: number): string => {
    if (!timestamp) return '';
    return new Date(timestamp * 1000).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

// Get file icon based on extension
const getFileIcon = (filename: string, size: number = 24) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    const videoExts = ['mp4', 'mkv', 'avi', 'mov', 'wmv', 'flv', 'webm'];
    const audioExts = ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'];
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];
    const subExts = ['srt', 'ass', 'ssa', 'sub', 'vtt'];
    const mangaExts = ['pdf', 'cbz', 'cbr'];

    if (videoExts.includes(ext || '')) return <FilmIcon size={size} />;
    if (audioExts.includes(ext || '')) return <MusicIcon size={size} />;
    if (imageExts.includes(ext || '')) return <ImageIcon size={size} />;
    if (subExts.includes(ext || '')) return <FileTextIcon size={size} />;
    if (mangaExts.includes(ext || '')) return <BookOpenIcon size={size} />;
    return <FileIcon size={size} />;
};

// Manga file extensions (PDF, CBZ, CBR)
const MANGA_EXTS = ['pdf', 'cbz', 'cbr'];

// Check if a file is a manga file (PDF, CBZ, CBR)
const isMangaFile = (filename: string): boolean => {
    const ext = filename.split('.').pop()?.toLowerCase();
    return MANGA_EXTS.includes(ext || '');
};

// Video file extensions
const VIDEO_EXTS = ['mp4', 'mkv', 'avi', 'mov', 'wmv', 'flv', 'webm'];

// Parse episode number from filename using multi-pass strategy
const parseEpisode = (filename: string): number | null => {
    const patterns = [
        /[sS]\d+[eE](\d+)/,                 // S01E01
        /\d+x(\d+)/,                        // 1x01
        /(?:^|[_\W])(?:E|EP|Episode)\.?\s*(\d+)/i,  // E01, EP01, Episode 1
        /(?:^|[\s_\-\(\[])(\d{1,3})(?:v\d)?(?:[\s_\-\)\]\.]|$)/ // - 01 -, [01], _01_, 01.mkv
    ];

    for (const pattern of patterns) {
        const match = filename.match(pattern);
        if (match && match[1]) {
            return parseInt(match[1], 10);
        }
    }
    return null;
};

// Check if a file is a video file
const isVideoFile = (filename: string): boolean => {
    const ext = filename.split('.').pop()?.toLowerCase();
    return VIDEO_EXTS.includes(ext || '');
};

function LocalFolder() {
    const { folderPath } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [files, setFiles] = useState<FileItem[]>([]);

    // Get media type from navigation state (passed from Sidebar)
    const mediaType = location.state?.type as 'ANIME' | 'MANGA' | undefined;

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSearchDialogOpen, setIsSearchDialogOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [watchedProgress, setWatchedProgress] = useState<number>(0);
    const [watchedVolumes, setWatchedVolumes] = useState<number>(0);

    // Folder-to-AniList mapping hook
    const { getMappingByPath, addMapping, removeMapping } = useFolderMappings();

    // Anime Data hook
    const { getAnimeDetails, getMangaDetails } = useAnimeData();

    // Decode the path from URL
    const currentPath = folderPath ? decodeURIComponent(folderPath) : '';
    const folderName = currentPath.split(/[\\/]/).pop() || '';

    // Check if this folder is already linked to an anime
    const currentMapping = getMappingByPath(currentPath);

    useEffect(() => {
        async function loadFiles() {
            if (!currentPath) return;

            setLoading(true);
            setError(null);
            try {
                const result = await invoke<FileItem[]>('get_folder_contents', { path: currentPath });
                setFiles(result);
            } catch (err) {
                console.error("Failed to load folder contents:", err);
                setError(String(err));
            } finally {
                setLoading(false);
            }
        }

        loadFiles();
    }, [currentPath]);

    // Fetch watched progress if mapped
    useEffect(() => {
        async function fetchProgress() {
            if (currentMapping?.anilistId) {
                try {
                    let details;
                    if (mediaType === 'MANGA') {
                        details = await getMangaDetails(currentMapping.anilistId);
                    } else {
                        // Default to Anime if not specified or specified as ANIME
                        details = await getAnimeDetails(currentMapping.anilistId);
                    }

                    if (details?.mediaListEntry) {
                        setWatchedProgress(details.mediaListEntry.progress || 0);
                        setWatchedVolumes(details.mediaListEntry.progressVolumes || 0);
                    } else {
                        setWatchedProgress(0);
                        setWatchedVolumes(0);
                    }
                } catch (err) {
                    console.error("Failed to fetch media progress:", err);
                }
            } else {
                setWatchedProgress(0);
                setWatchedVolumes(0);
            }
        }
        fetchProgress();
    }, [currentMapping, getAnimeDetails, getMangaDetails, mediaType]);


    const handleItemClick = async (item: FileItem) => {
        if (item.is_dir) {
            // Navigate into subdirectory, preserving the media type state
            navigate(`/local/${encodeURIComponent(item.path)}`, { state: location.state });
        } else if (isMangaFile(item.name)) {
            // Navigate to LocalFileReader for PDF/CBZ files
            navigate(`/read-local?path=${encodeURIComponent(item.path)}`);
        } else {
            // Open file in default application
            try {
                await openPath(item.path);
            } catch (err) {
                console.error("Failed to open file:", err);
            }
        }
    };

    // Find the video file for the next episode to watch
    const getNextEpisodeFile = (): FileItem | null => {
        if (!currentMapping) return null;
        if (mediaType === 'MANGA') return null; // No "next episode" prediction for manga yet

        const nextEpisode = watchedProgress + 1;
        const videoFiles = files.filter(f => !f.is_dir && isVideoFile(f.name));

        // Find file matching the next episode
        for (const file of videoFiles) {
            const ep = parseEpisode(file.name);
            if (ep === nextEpisode) {
                return file;
            }
        }

        // If no exact match, return the first unwatched video
        for (const file of videoFiles) {
            const ep = parseEpisode(file.name);
            if (ep !== null && ep > watchedProgress) {
                return file;
            }
        }

        return null;
    };

    const nextEpisodeFile = getNextEpisodeFile();
    const nextEpisodeNumber = nextEpisodeFile ? (parseEpisode(nextEpisodeFile.name) || watchedProgress + 1) : watchedProgress + 1;

    // Handle resume button click
    const handleResumeClick = async () => {
        if (!nextEpisodeFile || !currentMapping) return;

        try {
            await openPath(nextEpisodeFile.path);
        } catch (err) {
            console.error("Failed to open file:", err);
        }
    };

    if (!currentPath) {
        return <div className="p-8" style={{ color: 'var(--color-text-main)' }}>No folder specified.</div>;
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-zen-accent)]"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center py-10 px-8 bg-white/5 rounded-2xl border border-dashed border-red-500/30">
                    <p className="text-red-400">Error loading folder: {error}</p>
                </div>
            </div>
        );
    }

    const filteredFiles = files.filter(file =>
        file.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const directories = filteredFiles.filter(f => f.is_dir);
    const regularFiles = filteredFiles.filter(f => !f.is_dir);

    // Group files
    const VOL_REGEX = /(?:^|[_\W])(?:Vol|Volume)(?:\.|)\s*(\d+)/i;
    const CH_REGEX = /(?:^|[_\W])(?:Ch|Chapter)(?:\.|)\s*(\d+)/i;

    const mangaFiles = regularFiles.filter(f => isMangaFile(f.name));
    const otherFiles = regularFiles.filter(f => !isMangaFile(f.name));

    const volumeFiles = mangaFiles.filter(f => VOL_REGEX.test(f.name) && !CH_REGEX.test(f.name));
    const chapterFiles = mangaFiles.filter(f => !volumeFiles.includes(f));

    // Sort logic handled by backend (natord), but groups maintain relative order

    // Mock items to put "inside" the folders
    const mockFolderItems = [
        <div key="1" className="w-full h-full bg-gray-200 flex items-center justify-center text-xs text-gray-500"><FilmIcon size={12} /></div>,
        <div key="2" className="w-full h-full bg-gray-300 flex items-center justify-center text-xs text-gray-600"><FolderIcon size={12} /></div>,
        <div key="3" className="w-full h-full bg-gray-200 flex items-center justify-center text-xs text-gray-500"><FileIcon size={12} /></div>
    ];

    // Helper to check if file is watched
    const isFileWatched = (filename: string): boolean => {
        if (!currentMapping) return false;

        const ext = filename.split('.').pop()?.toLowerCase();

        // Check for video (Anime)
        if (VIDEO_EXTS.includes(ext || '')) {
            if (watchedProgress === 0) return false;
            const localParseEpisode = (fname: string): number | null => {
                const patterns = [
                    /[sS]\d+[eE](\d+)/,
                    /\d+x(\d+)/,
                    /(?:^|[_\W])(?:E|EP|Episode)\.?\s*(\d+)/i,
                    /(?:^|[\s_\-\(\[])(\d{1,3})(?:v\d)?(?:[\s_\-\)\]\.]|$)/
                ];

                for (const pattern of patterns) {
                    const match = fname.match(pattern);
                    if (match && match[1]) {
                        return parseInt(match[1], 10);
                    }
                }
                return null;
            };

            const episode = localParseEpisode(filename);
            if (episode !== null) {
                return episode <= watchedProgress;
            }
        }

        // Check for manga
        if (MANGA_EXTS.includes(ext || '')) {
            // Determine if it's a volume or chapter
            const isVolume = VOL_REGEX.test(filename) && !CH_REGEX.test(filename);

            if (isVolume) {
                // Check against volume progress
                if (watchedVolumes === 0) return false;
                const match = filename.match(VOL_REGEX);
                if (match && match[1]) {
                    const volume = parseInt(match[1], 10);
                    return volume <= watchedVolumes;
                }
            } else {
                // Check against chapter progress
                if (watchedProgress === 0) return false;
                const localParseChapter = (fname: string): number | null => {
                    const patterns = [
                        /(?:^|[_\W])(?:C|Ch|Chapter)\.?\s*(\d+)/i,  // Ch. 1, Chapter 1
                        /(?:^|[_\W])(?:Vol|Volume)\.?\s*\d+\s*(?:C|Ch|Chapter)\.?\s*(\d+)/i, // Vol. 1 Ch. 1
                        /(?:^|[\s_\-\(\[])(\d{1,4})(?:v\d)?(?:[\s_\-\)\]\.]|$)/, // 001, [001]
                    ];

                    for (const pattern of patterns) {
                        const match = fname.match(pattern);
                        if (match && match[1]) {
                            return parseInt(match[1], 10);
                        }
                    }
                    return null;
                };

                const chapter = localParseChapter(filename);
                if (chapter !== null) {
                    return chapter <= watchedProgress;
                }
            }
        }

        return false;
    };

    // Animation variants
    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.05
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 10 },
        show: { opacity: 1, y: 0 }
    };

    const renderFileGrid = (fileList: FileItem[], title: string, color: string) => (
        <div className="mb-10">
            <h3
                className="text-lg font-bold text-white mb-6 px-2 flex items-center gap-3"
                style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}
            >
                <div className={`w-1.5 h-1.5 rounded-full shadow-[0_0_8px_${color}]`} style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }}></div>
                {title}
            </h3>
            <motion.div
                className="flex flex-col gap-2"
                variants={containerVariants}
                initial="hidden"
                animate="show"
            >
                {fileList.map((file, index) => {
                    const isWatched = isFileWatched(file.name);
                    const isMedia = isMangaFile(file.name) || isVideoFile(file.name);

                    return (
                        <motion.div
                            key={file.path}
                            variants={itemVariants}
                            onClick={() => handleItemClick(file)}
                            className={`group grid grid-cols-[40px_1fr_120px_100px] gap-4 items-center p-4 rounded-xl cursor-pointer transition-all duration-300 border border-transparent hover:border-white/10 hover:bg-white/5 
                                ${isWatched ? 'opacity-50 grayscale hover:opacity-100 hover:grayscale-0' : ''}`}
                            style={{
                                background: index % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)'
                            }}
                        >
                            {/* Icon */}
                            <div
                                className={`flex items-center justify-center transition-all duration-300 ${!isWatched && isMedia ? 'text-[var(--color-zen-accent)]' : 'opacity-70 group-hover:opacity-100'}`}
                                style={!isWatched && isMedia ? { filter: 'drop-shadow(0 0 8px var(--color-zen-accent))' } : {}}
                            >
                                {getFileIcon(file.name)}
                            </div>

                            {/* Name */}
                            <div className="flex items-center min-w-0 pr-4">
                                <span
                                    className="font-medium text-white/80 group-hover:text-white truncate transition-colors"
                                    style={{ fontFamily: 'var(--font-rounded)' }}
                                    title={file.name}
                                >
                                    {file.name}
                                </span>
                                {isWatched && (
                                    <span
                                        className="ml-3 shrink-0 text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full border border-[var(--color-mint-tonic)] text-[var(--color-mint-tonic)] relative z-10"
                                        style={{
                                            boxShadow: '0 0 10px var(--color-mint-tonic), inset 0 0 5px rgba(0,0,0,0.2)',
                                            textShadow: '0 0 5px var(--color-mint-tonic)',
                                            backgroundColor: 'rgba(0,0,0,0.4)'
                                        }}
                                    >
                                        {isMangaFile(file.name) ? 'READ' : 'WATCHED'}
                                    </span>
                                )}
                            </div>

                            {/* Date */}
                            <div
                                className="text-sm text-white/30 group-hover:text-white/50 transition-colors"
                                style={{ fontFamily: 'var(--font-mono)' }}
                            >
                                {formatDate(file.last_modified)}
                            </div>

                            {/* Size */}
                            <div
                                className="text-sm text-white/30 group-hover:text-white/50 text-right transition-colors"
                                style={{ fontFamily: 'var(--font-mono)' }}
                            >
                                {formatSize(file.size)}
                            </div>
                        </motion.div>
                    );
                })}
            </motion.div>
        </div>
    );

    return (
        <div className="max-w-[1400px] mx-auto pb-10 px-6 min-h-screen">
            {/* Header */}
            <div className="mb-10 mt-6 px-2 flex items-end justify-between">
                <div>
                    <h1
                        className="text-4xl font-bold text-white mb-2"
                        style={{
                            fontFamily: 'var(--font-rounded)',
                            letterSpacing: '-0.02em',
                            textShadow: '0 4px 12px rgba(0,0,0,0.3)'
                        }}
                    >
                        {currentPath.split(/[\\/]/).pop()}
                    </h1>
                    <p
                        className="text-white/40 text-sm font-mono break-all mb-4"
                        style={{ fontFamily: 'var(--font-mono)' }}
                    >
                        {currentPath}
                    </p>

                    {/* AniList Tracking Section */}
                    {currentMapping ? (
                        <div
                            className="inline-flex items-center gap-3 px-4 py-3 rounded-xl border border-white/10"
                            style={{ background: 'rgba(180, 162, 246, 0.1)' }}
                        >
                            {currentMapping.coverImage && (
                                <img
                                    src={currentMapping.coverImage}
                                    alt={currentMapping.animeName}
                                    className="w-10 h-14 object-cover rounded-lg"
                                />
                            )}
                            <div className="flex flex-col">
                                <span
                                    className="text-xs text-white/40 uppercase tracking-wider"
                                    style={{ fontFamily: 'var(--font-mono)' }}
                                >
                                    Linked to AniList
                                </span>
                                <span
                                    className="text-sm font-semibold text-white"
                                    style={{ fontFamily: 'var(--font-rounded)' }}
                                >
                                    {currentMapping.animeName}
                                </span>
                            </div>
                            {nextEpisodeFile && (
                                <button
                                    onClick={handleResumeClick}
                                    className="ml-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 hover:scale-105 flex items-center gap-2"
                                    style={{
                                        fontFamily: 'var(--font-rounded)',
                                        background: 'linear-gradient(135deg, var(--color-mint-tonic), #6ed1a8)',
                                        color: '#0a0a0f',
                                        boxShadow: '0 4px 15px rgba(124, 245, 189, 0.3)'
                                    }}
                                >
                                    <span>▶</span>
                                    Resume EP {nextEpisodeNumber}
                                </button>
                            )}
                            <button
                                onClick={() => removeMapping(currentPath)}
                                className="ml-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 hover:bg-red-500/20 text-red-400 border border-red-500/30"
                                style={{ fontFamily: 'var(--font-rounded)' }}
                            >
                                Unlink
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setIsSearchDialogOpen(true)}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 hover:scale-105"
                            style={{
                                background: 'linear-gradient(135deg, var(--color-zen-accent), #9c7cf0)',
                                color: 'white',
                                boxShadow: '0 4px 15px rgba(180, 162, 246, 0.3)'
                            }}
                        >
                            <span>🔗</span>
                            Track on AniList
                        </button>
                    )}
                </div>

                {/* Search Bar */}
                <div className="relative group mb-1">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Filter files..."
                        className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm font-medium w-64 focus:bg-white/10 focus:border-white/20 outline-none transition-all duration-300 placeholder-white/30"
                        style={{ fontFamily: 'var(--font-rounded)' }}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/40">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    </div>
                </div>
            </div>

            {/* Folders Section */}
            {directories.length > 0 && (
                <div className="mb-10">
                    <h3
                        className="text-lg font-bold text-white mb-6 px-2 flex items-center gap-3"
                        style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}
                    >
                        <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-zen-accent)] shadow-[0_0_8px_var(--color-zen-accent)]"></div>
                        FOLDERS
                    </h3>
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="show"
                        className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-8"
                    >
                        {directories.map((dir) => (
                            <motion.div
                                key={dir.path}
                                variants={itemVariants}
                                className="flex flex-col items-center gap-3 group cursor-pointer"
                                onClick={() => handleItemClick(dir)}
                            >
                                <Folder
                                    size={0.85}
                                    color="#B4A2F6"
                                    items={mockFolderItems}
                                    className="transition-transform duration-300 group-hover:scale-105"
                                />
                                <span
                                    className="text-sm text-white/60 font-medium truncate max-w-full text-center group-hover:text-white transition-colors"
                                    style={{ fontFamily: 'var(--font-rounded)' }}
                                >
                                    {dir.name}
                                </span>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            )}

            {/* VOLUMES Section */}
            {volumeFiles.length > 0 && renderFileGrid(volumeFiles, "VOLUMES", "var(--color-zen-accent)")}

            {/* CHAPTERS Section */}
            {chapterFiles.length > 0 && renderFileGrid(chapterFiles, "CHAPTERS", "var(--color-mint-tonic)")}

            {/* OTHER FILES Section (Videos, etc) */}
            {otherFiles.length > 0 && renderFileGrid(otherFiles, "FILES", "#fbbf24")}

            {/* Empty State */}
            {files.length === 0 && (
                <div className="text-center py-20 bg-white/5 rounded-2xl border border-dashed border-white/10">
                    <p className="text-white/40" style={{ fontFamily: 'var(--font-rounded)' }}>
                        This folder is empty
                    </p>
                </div>
            )}

            {/* AniList Search Dialog */}
            <AniListSearchDialog
                isOpen={isSearchDialogOpen}
                onClose={() => setIsSearchDialogOpen(false)}
                onSelect={(anime) => {
                    addMapping(currentPath, anime.id, anime.title, anime.coverImage);

                    // For MANGA folders, also add to local manga library
                    if (mediaType === 'MANGA') {
                        const entryId = `local:${currentPath}`;
                        addMangaToLibrary(entryId, {
                            title: anime.title,
                            coverImage: anime.coverImage,
                            sourceId: 'local',
                            sourceMangaId: currentPath,
                            anilistId: anime.id,
                        });
                    }

                    setIsSearchDialogOpen(false);
                }}
                initialSearchTerm={folderName}
                mediaType={mediaType}
            />
        </div>
    );
}

export default LocalFolder;
