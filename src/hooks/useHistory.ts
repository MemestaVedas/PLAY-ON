import { useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { USER_ACTIVITY_QUERY } from '../api/anilistClient';
import { useAuth } from './useAuth';

export interface HistoryItem {
    id: number;
    status: string;
    progress: string;
    time: string;
    anime: string;
    image: string;
    timestamp: number;
}

export interface HistoryGroup {
    date: string;
    items: HistoryItem[];
}

export type HistoryFlatItem =
    | { type: 'header'; date: string; id: string }
    | { type: 'item'; data: HistoryItem; id: number };

export function useHistory() {
    const { user } = useAuth();

    const { data, loading, error } = useQuery(USER_ACTIVITY_QUERY, {
        variables: { userId: user?.id, perPage: 50 },
        skip: !user?.id,
        fetchPolicy: 'cache-first',
    });

    const getDateKey = (date: Date): string => {
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;

        return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const historyGroups = useMemo(() => {
        if (!data?.Page?.activities) return [];

        const groups: { [key: string]: HistoryItem[] } = {};

        data.Page.activities.forEach((activity: any) => {
            const date = new Date(activity.createdAt * 1000);
            const dateKey = getDateKey(date);

            if (!groups[dateKey]) {
                groups[dateKey] = [];
            }

            groups[dateKey].push({
                id: activity.id,
                status: activity.status,
                progress: `Episode ${activity.progress || '?'}`,
                time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                anime: activity.media.title.english || activity.media.title.romaji,
                image: activity.media.coverImage.medium,
                timestamp: activity.createdAt
            });
        });

        return Object.keys(groups).map(date => ({
            date,
            items: groups[date]
        })).sort((a, b) => b.items[0].timestamp - a.items[0].timestamp);
    }, [data]);

    const flatHistory = useMemo(() => {
        const result: HistoryFlatItem[] = [];
        historyGroups.forEach(group => {
            result.push({ type: 'header', date: group.date, id: `header-${group.date}` });
            group.items.forEach(item => {
                result.push({ type: 'item', data: item, id: item.id });
            });
        });
        return result;
    }, [historyGroups]);

    return {
        historyGroups,
        flatHistory,
        loading,
        error: error ? error.message : null
    };
}
