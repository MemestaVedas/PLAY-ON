import React, { useState } from 'react';

const SearchBar: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
        console.log('Searching for:', e.target.value);
    };

    return (
        <div className="absolute top-0 right-0 z-20">
            {/* The Tab itself (cutout color) */}
            <div
                className="relative h-12 rounded-bl-[32px] flex items-center justify-center pl-6 pr-4 bg-tab"
            >
                {/* Inverted Corner Join - Left */}
                <div className="absolute -left-6 top-0 w-6 h-6 bg-curve">
                    <div className="w-full h-full rounded-tr-full bg-content"></div>
                </div>

                {/* Inverted Corner Join - Bottom */}
                <div className="absolute right-0 -bottom-6 w-6 h-6 bg-curve">
                    <div className="w-full h-full rounded-tr-full bg-content"></div>
                </div>

                {/* Search Input */}
                <div className="flex items-center gap-2 mb-2 ml-2">
                    <input
                        type="text"
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={handleSearch}
                        className="bg-transparent border-none outline-none text-text-primary text-sm w-48 placeholder-text-secondary placeholder-opacity-50"
                    />
                </div>
            </div>
        </div>
    );
};

export default SearchBar;
