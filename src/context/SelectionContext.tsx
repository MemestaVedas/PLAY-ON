/**
 * Selection Context
 * 
 * Provides state management for multi-select/batch operations.
 * Can be used across list pages for bulk actions.
 */

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface SelectionState {
    selectedIds: Set<number | string>;
    isSelectionMode: boolean;
}

interface SelectionContextType {
    // State
    selectedIds: Set<number | string>;
    isSelectionMode: boolean;
    selectedCount: number;

    // Actions
    enterSelectionMode: () => void;
    exitSelectionMode: () => void;
    toggleSelection: (id: number | string) => void;
    selectAll: (ids: (number | string)[]) => void;
    deselectAll: () => void;
    isSelected: (id: number | string) => boolean;
}

const SelectionContext = createContext<SelectionContextType | null>(null);

interface SelectionProviderProps {
    children: ReactNode;
}

export function SelectionProvider({ children }: SelectionProviderProps) {
    const [state, setState] = useState<SelectionState>({
        selectedIds: new Set(),
        isSelectionMode: false
    });

    const enterSelectionMode = useCallback(() => {
        setState(prev => ({ ...prev, isSelectionMode: true }));
    }, []);

    const exitSelectionMode = useCallback(() => {
        setState({ selectedIds: new Set(), isSelectionMode: false });
    }, []);

    const toggleSelection = useCallback((id: number | string) => {
        setState(prev => {
            const newSet = new Set(prev.selectedIds);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return { ...prev, selectedIds: newSet };
        });
    }, []);

    const selectAll = useCallback((ids: (number | string)[]) => {
        setState(prev => ({
            ...prev,
            selectedIds: new Set(ids)
        }));
    }, []);

    const deselectAll = useCallback(() => {
        setState(prev => ({ ...prev, selectedIds: new Set() }));
    }, []);

    const isSelected = useCallback((id: number | string) => {
        return state.selectedIds.has(id);
    }, [state.selectedIds]);

    const value: SelectionContextType = {
        selectedIds: state.selectedIds,
        isSelectionMode: state.isSelectionMode,
        selectedCount: state.selectedIds.size,
        enterSelectionMode,
        exitSelectionMode,
        toggleSelection,
        selectAll,
        deselectAll,
        isSelected
    };

    return (
        <SelectionContext.Provider value={value}>
            {children}
        </SelectionContext.Provider>
    );
}

export function useSelection() {
    const context = useContext(SelectionContext);
    if (!context) {
        throw new Error('useSelection must be used within a SelectionProvider');
    }
    return context;
}

/**
 * Selection Toolbar Component
 * 
 * Floating toolbar that appears when items are selected.
 */
import { motion, AnimatePresence } from 'motion/react';

interface SelectionToolbarProps {
    onAction: (action: 'delete' | 'status' | 'export') => void;
    actions?: { id: string; label: string; icon?: ReactNode; danger?: boolean }[];
}

export function SelectionToolbar({ onAction, actions }: SelectionToolbarProps) {
    const { selectedCount, isSelectionMode, exitSelectionMode } = useSelection();

    const defaultActions = [
        { id: 'status', label: 'Change Status' },
        { id: 'export', label: 'Export' },
        { id: 'delete', label: 'Delete', danger: true }
    ];

    const displayActions = actions || defaultActions;

    return (
        <AnimatePresence>
            {isSelectionMode && selectedCount > 0 && (
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    style={{
                        position: 'fixed',
                        bottom: '24px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 1000,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px 20px',
                        background: 'rgba(20, 20, 25, 0.95)',
                        backdropFilter: 'blur(16px)',
                        borderRadius: '16px',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
                    }}
                >
                    {/* Selection Count */}
                    <span style={{
                        fontSize: '14px',
                        fontWeight: 600,
                        color: 'var(--theme-accent-primary)',
                        marginRight: '8px'
                    }}>
                        {selectedCount} selected
                    </span>

                    {/* Divider */}
                    <div style={{
                        width: '1px',
                        height: '24px',
                        background: 'rgba(255, 255, 255, 0.1)'
                    }} />

                    {/* Action Buttons */}
                    {displayActions.map(action => (
                        <button
                            key={action.id}
                            onClick={() => onAction(action.id as any)}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '8px',
                                border: 'none',
                                background: action.danger
                                    ? 'rgba(244, 0, 53, 0.1)'
                                    : 'rgba(255, 255, 255, 0.05)',
                                color: action.danger
                                    ? '#f40035'
                                    : 'var(--theme-text-main)',
                                fontSize: '13px',
                                fontWeight: 500,
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            {action.label}
                        </button>
                    ))}

                    {/* Cancel Button */}
                    <button
                        onClick={exitSelectionMode}
                        style={{
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            background: 'transparent',
                            color: 'var(--theme-text-muted)',
                            fontSize: '13px',
                            cursor: 'pointer'
                        }}
                    >
                        Cancel
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export default SelectionContext;
