/**
 * Virtual Grid Component
 * 
 * Uses react-window for virtualized rendering of large grids.
 * Only renders items visible in the viewport for better performance.
 */

// @ts-ignore - react-window types may not match version
import ReactWindow from 'react-window';
import { useRef, useEffect, useState, useCallback, ReactNode, CSSProperties } from 'react';

const { FixedSizeGrid, FixedSizeList } = ReactWindow as any;

interface VirtualGridProps<T> {
    items: T[];
    columnCount: number;
    rowHeight: number;
    columnWidth: number;
    height: number;
    gap?: number;
    renderItem: (item: T, index: number) => ReactNode;
    className?: string;
}

interface CellProps {
    columnIndex: number;
    rowIndex: number;
    style: CSSProperties;
}

export function VirtualGrid<T>({
    items,
    columnCount,
    rowHeight,
    columnWidth,
    height,
    gap = 16,
    renderItem,
    className = ''
}: VirtualGridProps<T>) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerWidth, setContainerWidth] = useState(0);

    useEffect(() => {
        const updateWidth = () => {
            if (containerRef.current) {
                setContainerWidth(containerRef.current.offsetWidth);
            }
        };

        updateWidth();
        window.addEventListener('resize', updateWidth);
        return () => window.removeEventListener('resize', updateWidth);
    }, []);

    const actualColumnCount = containerWidth > 0
        ? Math.max(1, Math.floor(containerWidth / (columnWidth + gap)))
        : columnCount;

    const actualColumnWidth = containerWidth > 0
        ? (containerWidth - (gap * (actualColumnCount - 1))) / actualColumnCount
        : columnWidth;

    const rowCount = Math.ceil(items.length / actualColumnCount);

    const Cell = useCallback(({ columnIndex, rowIndex, style }: CellProps) => {
        const index = rowIndex * actualColumnCount + columnIndex;
        const item = items[index];

        if (!item) {
            return null;
        }

        return (
            <div
                style={{
                    ...style,
                    left: Number(style.left) + gap / 2,
                    top: Number(style.top) + gap / 2,
                    width: Number(style.width) - gap,
                    height: Number(style.height) - gap
                }}
            >
                {renderItem(item, index)}
            </div>
        );
    }, [items, actualColumnCount, gap, renderItem]);

    if (containerWidth === 0) {
        return <div ref={containerRef} className={className} style={{ width: '100%', height }} />;
    }

    return (
        <div ref={containerRef} className={className}>
            <FixedSizeGrid
                columnCount={actualColumnCount}
                columnWidth={actualColumnWidth + gap}
                height={height}
                rowCount={rowCount}
                rowHeight={rowHeight + gap}
                width={containerWidth}
                style={{ overflow: 'auto' }}
            >
                {Cell}
            </FixedSizeGrid>
        </div>
    );
}

/**
 * Simple Virtual List for linear content
 */
interface VirtualListProps<T> {
    items: T[];
    itemHeight: number;
    height: number;
    renderItem: (item: T, index: number) => ReactNode;
    className?: string;
}

interface RowProps {
    index: number;
    style: CSSProperties;
}

export function VirtualList<T>({
    items,
    itemHeight,
    height,
    renderItem,
    className = ''
}: VirtualListProps<T>) {
    const Row = useCallback(({ index, style }: RowProps) => {
        const item = items[index];
        return (
            <div style={style}>
                {renderItem(item, index)}
            </div>
        );
    }, [items, renderItem]);

    return (
        <FixedSizeList
            className={className}
            height={height}
            itemCount={items.length}
            itemSize={itemHeight}
            width="100%"
        >
            {Row}
        </FixedSizeList>
    );
}

export default VirtualGrid;
