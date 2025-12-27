import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { openPath } from '@tauri-apps/plugin-opener';
import Folder from '../components/ui/Folder';

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
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
};

function LocalFolder() {
    const { folderPath } = useParams();
    const navigate = useNavigate();
    const [files, setFiles] = useState<FileItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Decode the path from URL
    const currentPath = folderPath ? decodeURIComponent(folderPath) : '';

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

    const handleItemClick = async (item: FileItem) => {
        if (item.is_dir) {
            // Navigate into subdirectory
            navigate(`/local/${encodeURIComponent(item.path)}`);
        } else {
            // Open file in default application
            try {
                await openPath(item.path);
            } catch (err) {
                console.error("Failed to open file:", err);
            }
        }
    };

    if (!currentPath) {
        return <div className="text-white p-8">No folder specified.</div>;
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full text-[#B5BAC1]">
                Loading...
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-red-400 p-8">
                Error loading folder: {error}
            </div>
        );
    }

    const directories = files.filter(f => f.is_dir);
    const regularFiles = files.filter(f => !f.is_dir);

    // Mock items to put "inside" the folders
    const mockFolderItems = [
        <div key="1" className="w-full h-full bg-gray-200 flex items-center justify-center text-xs text-gray-500">🎬</div>,
        <div key="2" className="w-full h-full bg-gray-300 flex items-center justify-center text-xs text-gray-600">📁</div>,
        <div key="3" className="w-full h-full bg-gray-200 flex items-center justify-center text-xs text-gray-500">📄</div>
    ];

    return (
        <div className="flex flex-col h-full bg-[#313338]">
            <div className="px-6 py-4 border-b border-[#1E1F22]">
                <h2 className="text-xl font-bold text-white break-all">
                    {currentPath.split(/[\\/]/).pop()}
                </h2>
                <div className="text-xs text-[#949BA4] mt-1 font-mono break-all opacity-80">
                    {currentPath}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8">

                {/* Folders Grid */}
                {directories.length > 0 && (
                    <div className="mb-8">
                        <h3 className="text-[#949BA4] text-sm font-bold uppercase tracking-wider mb-6">Folders</h3>
                        <div className="grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-12">
                            {directories.map((dir) => (
                                <div
                                    key={dir.path}
                                    className="flex flex-col items-center gap-2 group cursor-pointer"
                                    onDoubleClick={() => handleItemClick(dir)}
                                >
                                    <Folder
                                        size={0.9}
                                        color="#5227FF"
                                        items={mockFolderItems}
                                        className="transition-transform group-hover:scale-105"
                                    />
                                    <span className="text-sm text-gray-300 font-medium truncate max-w-full text-center group-hover:text-white mt-6">
                                        {dir.name}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Files List */}
                {regularFiles.length > 0 && (
                    <div>
                        <h3 className="text-[#949BA4] text-sm font-bold uppercase tracking-wider mb-2">Files</h3>
                        <table className="w-full text-left text-xs border-collapse">
                            <thead className="text-[#949BA4] font-medium border-b border-[#2B2D31]">
                                <tr>
                                    <th className="py-2 pl-4 pr-2 font-normal w-12 text-center">#</th>
                                    <th className="py-2 px-2 font-normal">Name</th>
                                    <th className="py-2 px-2 font-normal w-40">Date modified</th>
                                    <th className="py-2 px-2 font-normal w-24">Type</th>
                                    <th className="py-2 pl-2 pr-6 font-normal w-24 text-right">Size</th>
                                </tr>
                            </thead>
                            <tbody>
                                {regularFiles.map((file, index) => (
                                    <tr
                                        key={file.path}
                                        onClick={() => handleItemClick(file)}
                                        className="group hover:bg-[#3F4147] cursor-pointer transition-colors text-[#DBDEE1]"
                                    >
                                        <td className="py-2 pl-4 pr-2 text-center text-[#949BA4] group-hover:text-white font-mono opacity-60">
                                            {index + 1}
                                        </td>
                                        <td className="py-2 px-2 font-medium group-hover:text-white">
                                            <div className="flex items-center gap-2">
                                                <span className="opacity-80 text-base">
                                                    🎬
                                                </span>
                                                <span className="truncate max-w-[300px] xl:max-w-[500px]">
                                                    {file.name}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-2 px-2 text-[#949BA4] group-hover:text-[#DBDEE1]">
                                            {formatDate(file.last_modified)}
                                        </td>
                                        <td className="py-2 px-2 text-[#949BA4] group-hover:text-[#DBDEE1]">
                                            {file.name.split('.').pop()?.toUpperCase() + ' File'}
                                        </td>
                                        <td className="py-2 pl-2 pr-6 text-right font-mono text-[#949BA4] group-hover:text-[#DBDEE1]">
                                            {formatSize(file.size)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {files.length === 0 && (
                    <div className="w-full text-center text-[#949BA4] py-12">
                        No items to show.
                    </div>
                )}
            </div>
        </div>
    );
}

export default LocalFolder;
