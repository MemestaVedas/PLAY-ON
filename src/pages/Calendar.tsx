import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { SEASONAL_ANIME_QUERY } from '../api/anilistClient';
import AnimeCard from '../components/ui/AnimeCard';
import Loading from '../components/ui/Loading';
import SeasonPill from '../components/ui/SeasonPill';

import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronDown,
    AlertTriangleIcon,
    CloudIcon
} from '../components/ui/Icons';

// Season types matching AniList API
type Season = 'WINTER' | 'SPRING' | 'SUMMER' | 'FALL';
type SortOption = 'POPULARITY_DESC' | 'SCORE_DESC' | 'TITLE_ROMAJI';

const SEASONS: { label: string; value: Season }[] = [
    { label: 'Winter', value: 'WINTER' },
    { label: 'Spring', value: 'SPRING' },
    { label: 'Summer', value: 'SUMMER' },
    { label: 'Fall', value: 'FALL' },
];

const SORT_OPTIONS: { label: string; value: SortOption }[] = [
    { label: 'Most Popular', value: 'POPULARITY_DESC' },
    { label: 'Highest Rated', value: 'SCORE_DESC' },
    { label: 'Title (A-Z)', value: 'TITLE_ROMAJI' },
];

// Get current season based on month
function getCurrentSeason(): Season {
    const month = new Date().getMonth() + 1;
    if (month >= 1 && month <= 3) return 'WINTER';
    if (month >= 4 && month <= 6) return 'SPRING';
    if (month >= 7 && month <= 9) return 'SUMMER';
    return 'FALL';
}

// Custom Dropdown Component
function CustomDropdown<T extends string | number>({
    options,
    value,
    onChange,
    label
}: {
    options: { label: string; value: T }[];
    value: T;
    onChange: (val: T) => void;
    label?: string
}) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedOption = options.find(o => o.value === value);

    return (
        <div className="relative z-50" ref={containerRef}>
            <motion.button
                whileHover={{ scale: 1.02, backgroundColor: "rgba(255,255,255,0.1)" }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors backdrop-blur-md"
                style={{ fontFamily: 'var(--font-rounded)', minWidth: '140px', justifyContent: 'space-between' }}
            >
                <div className="flex flex-col items-start gap-0.5">
                    {label && <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider leading-none">{label}</span>}
                    <span className="text-sm font-bold text-white truncate">{selectedOption?.label}</span>
                </div>
                <ChevronDown size={16} className={`text-white/50 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </motion.button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 5, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 5, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full left-0 mt-2 w-full min-w-[160px] max-h-[300px] overflow-y-auto bg-[#1a1a2e]/95 backdrop-blur-2xl border border-white/10 rounded-xl shadow-2xl p-1.5 z-50 no-scrollbar"
                    >
                        {options.map((opt) => (
                            <motion.button
                                key={opt.value}
                                onClick={() => {
                                    onChange(opt.value);
                                    setIsOpen(false);
                                }}
                                className="w-full text-left px-3 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-between group"
                                style={{
                                    color: opt.value === value ? 'var(--theme-accent-primary)' : 'var(--theme-text-muted)',
                                    background: opt.value === value ? 'rgba(255,255,255,0.05)' : 'transparent',
                                }}
                                whileHover={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'white' }}
                            >
                                {opt.label}
                                {opt.value === value && <motion.div layoutId="check" className="w-1.5 h-1.5 rounded-full bg-[var(--theme-accent-primary)]" />}
                            </motion.button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function Calendar() {
    const navigate = useNavigate();
    const currentYear = new Date().getFullYear();

    // State
    const [selectedSeason, setSelectedSeason] = useState<Season>(getCurrentSeason());
    const [selectedYear, setSelectedYear] = useState<number>(currentYear);
    const [sortBy, setSortBy] = useState<SortOption>('POPULARITY_DESC');

    // Generate year options (current year - 10 to current year + 1)
    const yearOptions = useMemo(() => {
        const years: { label: string; value: number }[] = [];
        for (let year = currentYear + 1; year >= 1990; year--) {
            years.push({ label: year.toString(), value: year });
        }
        return years;
    }, [currentYear]);

    // Fetch seasonal anime
    const { data, loading, error } = useQuery(SEASONAL_ANIME_QUERY, {
        variables: {
            season: selectedSeason,
            seasonYear: selectedYear,
            page: 1,
            perPage: 50,
            sort: [sortBy],
        },
        fetchPolicy: 'cache-first',
    });

    const animeList = data?.Page?.media || [];

    return (
        <div className="min-h-full pb-8" style={{ maxWidth: '1400px', margin: '0 auto' }}>
            {/* Header */}
            <div className="mb-4 flex items-end justify-between">
                <div>
                    <h1 className="text-4xl font-black text-white flex items-center gap-3 drop-shadow-lg tracking-tight mb-0">
                        Seasonal Calendar
                    </h1>
                </div>
            </div>

            {/* Controls Row */}
            <div className="flex flex-wrap items-center gap-4 mb-8">

                {/* Season Pills with Animations */}
                <div className="flex items-center gap-3">
                    {SEASONS.map((season) => (
                        <SeasonPill
                            key={season.value}
                            season={season.value}
                            label={season.label}
                            isActive={season.value === selectedSeason}
                            onClick={() => setSelectedSeason(season.value)}
                        />
                    ))}
                </div>

                <div className="h-8 w-px bg-white/10 mx-2 hidden md:block" />

                {/* Dropdowns */}
                <CustomDropdown
                    options={yearOptions}
                    value={selectedYear}
                    onChange={setSelectedYear}
                    label="Year"
                />

                <CustomDropdown
                    options={SORT_OPTIONS}
                    value={sortBy}
                    onChange={setSortBy}
                    label="Sort By"
                />


            </div>

            {/* Content */}
            {loading ? (
                <div className="pt-12">
                    <Loading />
                </div>
            ) : error ? (
                <div className="text-center py-20 text-red-400 bg-white/5 rounded-3xl border border-white/5 mx-4 flex flex-col items-center">
                    <div className="mb-4 opacity-80"><AlertTriangleIcon size={48} /></div>
                    <h3 className="text-xl font-bold text-white mb-2">Error loading data</h3>
                    <p className="text-white/50">{error.message}</p>
                </div>
            ) : animeList.length === 0 ? (
                <div className="text-center py-32 opacity-60 flex flex-col items-center">
                    <div className="mb-6 opacity-30"><CloudIcon size={64} /></div>
                    <p className="text-xl font-bold">No anime found</p>
                    <p className="text-sm">for {selectedSeason} {selectedYear}</p>
                </div>
            ) : (
                <AnimatePresence mode="wait">
                    <motion.div
                        key={`${selectedSeason}-${selectedYear}-${sortBy}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6"
                    >
                        {animeList.map((anime: any, index: number) => (
                            <motion.div
                                key={anime.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.03 }}
                            >
                                <AnimeCard
                                    anime={anime}
                                    onClick={() => navigate(`/anime/${anime.id}`)}
                                />
                            </motion.div>
                        ))}
                    </motion.div>
                </AnimatePresence>
            )}
        </div>
    );
}

export default Calendar;
