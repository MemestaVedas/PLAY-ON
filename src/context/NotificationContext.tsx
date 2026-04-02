import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { fetchNotifications, AniListNotification } from '../api/anilistClient';
import { sendDesktopNotification } from '../services/notification';

const POLLING_INTERVAL = 10 * 60 * 1000; // 10 minutes
const LAST_SEEN_KEY = 'anilist_last_notification_id';

interface NotificationContextType {
    notifications: AniListNotification[];
    unreadCount: number;
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
    markAsRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Helper functions (copied from original hook)
function getNotificationTitle(notification: AniListNotification): string {
    const mediaTitle = notification.media?.title?.english || notification.media?.title?.romaji;
    const userName = notification.user?.name;

    switch (notification.type) {
        case 'AIRING': return `${mediaTitle} - Episode ${notification.episode}`;
        case 'ACTIVITY_MESSAGE': return `Message from ${userName}`;
        case 'ACTIVITY_MENTION': return `${userName} mentioned you`;
        case 'FOLLOWING': return `${userName} followed you`;
        case 'ACTIVITY_LIKE': return `${userName} liked your activity`;
        case 'ACTIVITY_REPLY': return `${userName} replied to your activity`;
        case 'THREAD_COMMENT_MENTION': return `${userName} mentioned you in a comment`;
        case 'RELATED_MEDIA_ADDITION': return `New related media: ${mediaTitle}`;
        case 'MEDIA_DATA_CHANGE': return `${mediaTitle} was updated`;
        default: return 'New AniList Notification';
    }
}

function getNotificationBody(notification: AniListNotification): string {
    if (notification.context) return notification.context;
    if (notification.contexts && notification.contexts.length > 0) return notification.contexts.join(' ');
    return 'You have a new notification on AniList';
}

function getNotificationIcon(notification: AniListNotification): string | undefined {
    return notification.media?.coverImage?.medium || notification.user?.avatar?.medium;
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const { isAuthenticated } = useAuth();
    const [notifications, setNotifications] = useState<AniListNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const lastSeenIdRef = useRef<number>(0);
    const isInitialFetchRef = useRef(true);

    // Load last seen ID
    useEffect(() => {
        const stored = localStorage.getItem(LAST_SEEN_KEY);
        if (stored) {
            lastSeenIdRef.current = parseInt(stored, 10);
        }
    }, []);

    const fetchAndNotify = useCallback(async () => {
        if (!isAuthenticated) return;

        setLoading(true);
        setError(null);

        try {
            const response = await fetchNotifications(1, 20);
            setNotifications(response.notifications);
            setUnreadCount(response.unreadCount);

            // Desktop notifications logic
            if (!isInitialFetchRef.current && response.notifications.length > 0) {
                const newNotifications = response.notifications.filter(
                    (n) => n.id > lastSeenIdRef.current
                );

                const notificationsToShow = newNotifications.slice(0, 3);
                for (const notification of notificationsToShow) {
                    sendDesktopNotification(
                        getNotificationTitle(notification),
                        getNotificationBody(notification),
                        getNotificationIcon(notification)
                    );
                }

                if (newNotifications.length > 3) {
                    sendDesktopNotification(
                        'AniList Notifications',
                        `You have ${newNotifications.length} new notifications`,
                        undefined
                    );
                }
            }

            // Update last seen
            if (response.notifications.length > 0) {
                const maxId = Math.max(...response.notifications.map((n) => n.id));
                if (maxId > lastSeenIdRef.current) {
                    lastSeenIdRef.current = maxId;
                    localStorage.setItem(LAST_SEEN_KEY, String(maxId));
                }
            }

            isInitialFetchRef.current = false;
        } catch (err) {
            console.error('[NotificationProvider] Failed to fetch:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch notifications');
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated]);

    // Initial fetch and polling
    useEffect(() => {
        if (!isAuthenticated) {
            setNotifications([]);
            setUnreadCount(0);
            return;
        }

        fetchAndNotify();
        const intervalId = setInterval(fetchAndNotify, POLLING_INTERVAL);
        return () => clearInterval(intervalId);
    }, [isAuthenticated, fetchAndNotify]);

    const markAsRead = useCallback(async () => {
        if (!isAuthenticated) return;
        try {
            // Optimistically update UI
            setUnreadCount(0);
            await import('../api/anilistClient').then(m => m.markNotificationsAsRead());
        } catch (error) {
            console.error('[NotificationProvider] Failed to mark as read:', error);
            // Revert on failure? (Optional, skipping for now to keep UI snappy)
        }
    }, [isAuthenticated]);

    const value = useMemo(() => ({
        notifications,
        unreadCount,
        loading,
        error,
        refetch: fetchAndNotify,
        markAsRead,
    }), [notifications, unreadCount, loading, error, fetchAndNotify, markAsRead]);

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotification() {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
}
