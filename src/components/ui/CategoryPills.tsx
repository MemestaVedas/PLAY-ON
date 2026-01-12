/**
 * CategoryPills Component
 * 
 * Animated category selector with:
 * - Center-aligned pill layout
 * - Spring bounce animation on hover/expand
 * - Auto-collapse to active category after 3s of no interaction
 */


import { LibraryCategory } from '../../lib/localMangaDb';

import { motion, AnimatePresence } from 'framer-motion';

interface CategoryPillsProps {
    categories: LibraryCategory[];
    activeCategory: string;
    onCategoryChange: (categoryId: string) => void;
    onCategoryDelete?: (categoryId: string) => void;
}

export function CategoryPills({
    categories,
    activeCategory,
    onCategoryChange,
    onCategoryDelete
}: CategoryPillsProps) {
    return (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2 px-1 mask-linear-fade">
            <AnimatePresence mode="popLayout">
                {categories.map((cat) => {
                    const isActive = cat.id === activeCategory;
                    return (
                        <motion.button
                            key={cat.id}
                            layout
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            transition={{
                                type: "spring",
                                stiffness: 500,
                                damping: 30,
                                mass: 1
                            }}
                            onClick={() => onCategoryChange(cat.id)}
                            onContextMenu={(e) => {
                                if (cat.id !== 'default' && onCategoryDelete) {
                                    e.preventDefault();
                                    onCategoryDelete(cat.id);
                                }
                            }}
                            className="whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium relative z-10"
                            style={{
                                fontFamily: 'var(--font-rounded)',
                                backgroundColor: isActive
                                    ? 'var(--theme-accent-primary)'
                                    : 'transparent',
                                color: isActive
                                    ? 'var(--theme-btn-primary-text)'
                                    : 'var(--theme-text-muted)',
                                border: isActive
                                    ? 'none'
                                    : '1px solid var(--theme-border-subtle)',
                                boxShadow: isActive ? '0 4px 14px 0 rgba(0,0,0,0.3)' : undefined
                            }}
                        >
                            {cat.name}
                        </motion.button>
                    );
                })}
            </AnimatePresence>
        </div>
    );
}

export default CategoryPills;

