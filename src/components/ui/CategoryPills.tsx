/**
 * CategoryPills Component
 * 
 * Animated category selector with:
 * - Center-aligned pill layout
 * - Spring bounce animation on hover/expand
 * - Auto-collapse to active category after 3s of no interaction
 */


import { LibraryCategory } from '../../lib/localMangaDb';

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
            {categories.map((cat) => {
                const isActive = cat.id === activeCategory;
                return (
                    <button
                        key={cat.id}
                        onClick={() => onCategoryChange(cat.id)}
                        onContextMenu={(e) => {
                            if (cat.id !== 'default' && onCategoryDelete) {
                                e.preventDefault();
                                onCategoryDelete(cat.id);
                            }
                        }}
                        className="whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200"
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
                    </button>
                );
            })}
        </div>
    );
}

export default CategoryPills;

