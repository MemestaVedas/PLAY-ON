import { forwardRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, SectionHeader, EmptyState } from '../components/ui/UIComponents';
import RefreshButton from '../components/ui/RefreshButton';
import { useAniListNotifications } from '../hooks/useAniListNotifications';
import { useAuth } from '../hooks/useAuth';
import { Virtuoso } from 'react-virtuoso';
import { getNotificationBadgeStyle } from '../lib/theme';

/**
 * Format a Unix timestamp to a human-readable relative time
 */
function formatRelativeTime(timestamp: number): string {
    const now = Date.now() / 1000; // Convert to seconds
    const diff = now - timestamp;

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;

    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString();
}

/**
 * Get the notification title based on its type
 */
function getNotificationTitle(notification: any): string {
    const mediaTitle = notification.media?.title?.english || notification.media?.title?.romaji;
    const userName = notification.user?.name;

    switch (notification.type) {
        case 'AIRING':
            return `${mediaTitle}`;
        case 'ACTIVITY_MESSAGE':
            return `${userName}`;
        case 'ACTIVITY_MENTION':
            return `${userName}`;
        case 'FOLLOWING':
            return `${userName}`;
        case 'ACTIVITY_LIKE':
            return `${userName}`;
        case 'ACTIVITY_REPLY':
            return `${userName}`;
        case 'THREAD_COMMENT_MENTION':
            return `${userName}`;
        case 'RELATED_MEDIA_ADDITION':
            return `${mediaTitle}`;
        case 'MEDIA_DATA_CHANGE':
            return `${mediaTitle}`;
        default:
            return 'Notification';
    }
}

/**
 * Get the notification description based on its type
 */
function getNotificationDescription(notification: any): string {
    switch (notification.type) {
        case 'AIRING':
            return notification.contexts?.join(' ') || `Episode ${notification.episode} aired`;
        case 'ACTIVITY_MESSAGE':
            return notification.context || 'Sent you a message';
        case 'ACTIVITY_MENTION':
            return notification.context || 'Mentioned you in an activity';
        case 'FOLLOWING':
            return notification.context || 'Started following you';
        case 'ACTIVITY_LIKE':
            return notification.context || 'Liked your activity';
        case 'ACTIVITY_REPLY':
            return notification.context || 'Replied to your activity';
        case 'THREAD_COMMENT_MENTION':
            return notification.context || 'Mentioned you in a comment';
        case 'RELATED_MEDIA_ADDITION':
            return notification.context || 'New related media added';
        case 'MEDIA_DATA_CHANGE':
            return notification.context || 'Media information was updated';
        default:
            return 'You have a new notification';
    }
}

/**
 * Get icon/avatar for a notification
 */
function getNotificationImage(notification: any): string | null {
    return notification.media?.coverImage?.medium || notification.user?.avatar?.medium || null;
}

// getNotificationTypeColor removed - using theme utility

/**
 * Format the notification type for display
 */
function formatNotificationType(type: string): string {
    return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Get the in-app route for a notification based on its type
 * Returns the route path or null if no in-app route is available
 */
function getNotificationRoute(notification: any): string | null {
    switch (notification.type) {
        case 'AIRING':
            // Navigate to anime details page
            return notification.animeId ? `/anime/${notification.animeId}` : null;

        case 'RELATED_MEDIA_ADDITION':
        case 'MEDIA_DATA_CHANGE':
            // Navigate to anime or manga details page
            if (notification.media?.id) {
                const isManga = notification.media.type === 'MANGA';
                return isManga ? `/manga-details/${notification.media.id}` : `/anime/${notification.media.id}`;
            }
            return null;

        case 'ACTIVITY_MESSAGE':
        case 'ACTIVITY_MENTION':
        case 'ACTIVITY_LIKE':
        case 'ACTIVITY_REPLY':
            // For activity notifications, check if there's related media we can navigate to
            if (notification.media?.id) {
                const isManga = notification.media.type === 'MANGA';
                return isManga ? `/manga-details/${notification.media.id}` : `/anime/${notification.media.id}`;
            }
            return null;

        case 'FOLLOWING':
        case 'THREAD_COMMENT_MENTION':
            // Link to the user's profile
            return notification.user?.name ? `/user/${notification.user.name}` : null;

        default:
            return null;
    }
}

/**
 * Get hint text for the notification action
 */
function getNotificationHint(notification: any): string {
    const route = getNotificationRoute(notification);
    if (route) {
        if (route.includes('/anime/')) return 'Click to view anime';
        if (route.includes('/manga-details/')) return 'Click to view manga';
        if (route.includes('/user/')) return 'Click to view profile';
    }
    return '';
}

function Notifications() {
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();
    const { notifications, unreadCount, loading, error, refetch, markAsRead } = useAniListNotifications();

    // Mark notifications as read when page opens
    useEffect(() => {
        if (unreadCount > 0) {
            markAsRead();
        }
    }, [unreadCount, markAsRead]);

    const handleNotificationClick = (notification: any) => {
        const route = getNotificationRoute(notification);
        if (route) {
            navigate(route);
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="max-w-[1000px] mx-auto p-8">
                <SectionHeader title="Notifications" subtitle="Your AniList activity" />
                <EmptyState
                    icon="🔔"
                    title="Not logged in"
                    description="Log in with your AniList account to view your notifications."
                />
            </div>
        );
    }

    if (loading && notifications.length === 0) {
        return (
            <div className="max-w-[1000px] mx-auto p-8 text-center text-text-secondary">
                <div className="animate-pulse">Loading notifications...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-[1000px] mx-auto p-8">
                <SectionHeader title="Notifications" subtitle="Failed to load" />
                <EmptyState icon="⚠️" title="Oops!" description={error} />
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col max-w-[1000px] mx-auto px-6">
            <div className="pt-4 pb-2 flex justify-between items-center">
                <SectionHeader
                    title="Notifications"
                    subtitle={unreadCount > 0 ? `${unreadCount} unread` : 'Your AniList activity'}
                />
                <RefreshButton
                    onClick={() => refetch()}
                    loading={loading}
                    title="Refresh Notifications"
                    iconSize={18}
                />
            </div>

            <div className="flex-1 min-h-0">
                {notifications.length > 0 ? (
                    <Virtuoso
                        style={{ height: '100%' }}
                        customScrollParent={document.getElementById('main-scroll-container') as HTMLElement}
                        data={notifications}
                        overscan={200}
                        components={{
                            List: forwardRef(({ style, children, ...props }: any, ref) => (
                                <div ref={ref} {...props} style={style} className="flex flex-col gap-3 pb-20">
                                    {children}
                                </div>
                            ))
                        }}
                        itemContent={(_index, notification) => {
                            const typeColor = getNotificationBadgeStyle(notification.type, notification.media?.type || notification.media?.type);
                            const image = getNotificationImage(notification);
                            const hasRoute = getNotificationRoute(notification) !== null;
                            const hint = getNotificationHint(notification);

                            return (
                                <div
                                    onClick={() => handleNotificationClick(notification)}
                                    className={hasRoute ? "cursor-pointer group" : "group"}
                                >
                                    <Card
                                        hover={hasRoute}
                                        className={`bg-black/20 transition-colors duration-200 ${hasRoute ? 'hover:bg-white/5 active:scale-[0.99] hover:border-white/10 group-hover:border-[var(--color-zen-accent)]/30' : 'opacity-80'}`}
                                    >
                                        <div className="grid grid-cols-[50px_1fr_auto] gap-4 items-center">
                                            {/* Icon/Avatar - Clickable for User Profile */}
                                            <div
                                                className={`w-[50px] h-[50px] rounded-xl overflow-hidden bg-white/5 flex items-center justify-center border border-white/10 shadow-inner relative transition-colors ${notification.user ? 'cursor-pointer hover:border-white/40 z-10' : ''} ${hasRoute ? 'group-hover:border-white/20' : ''}`}
                                                onClick={(e) => {
                                                    if (notification.user?.name) {
                                                        e.stopPropagation();
                                                        navigate(`/user/${notification.user.name}`);
                                                    }
                                                }}
                                                title={notification.user?.name ? `View ${notification.user.name}'s profile` : ''}
                                            >
                                                {image ? (
                                                    <>
                                                        <img
                                                            src={image}
                                                            alt=""
                                                            className={`w-full h-full object-cover ${hasRoute ? 'transition-transform duration-300 group-hover:scale-110' : ''}`}
                                                            onError={(e) => {
                                                                (e.target as HTMLImageElement).style.display = 'none';
                                                            }}
                                                        />
                                                        <div className={`absolute inset-0 bg-black/20 ${hasRoute ? 'group-hover:bg-transparent' : ''} transition-colors`}></div>
                                                    </>
                                                ) : (
                                                    <span className="text-2xl">🔔</span>
                                                )}
                                            </div>

                                            {/* Info */}
                                            <div className="min-w-0">
                                                <div className={`font-bold text-white truncate mb-1 text-base ${hasRoute ? 'group-hover:text-[var(--color-zen-accent)]' : ''} transition-colors`}>
                                                    {notification.user?.name ? (
                                                        <span
                                                            className="hover:underline cursor-pointer relative z-10"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                navigate(`/user/${notification.user?.name}`);
                                                            }}
                                                        >
                                                            {getNotificationTitle(notification)}
                                                        </span>
                                                    ) : (
                                                        getNotificationTitle(notification)
                                                    )}
                                                </div>
                                                <div className="text-sm text-white/60 truncate mb-2">
                                                    {getNotificationDescription(notification)}
                                                </div>
                                                <div className="flex gap-2 items-center">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${typeColor.bg} ${typeColor.text} border ${typeColor.border}`}>
                                                        {formatNotificationType(notification.type)}
                                                    </span>
                                                    {hint && (
                                                        <span className="text-[10px] text-white/40 font-medium">
                                                            {hint}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Time */}
                                            <div className={`text-xs text-white/30 font-bold tabular-nums px-3 py-1 bg-white/5 rounded-full border border-white/5 font-mono whitespace-nowrap ${hasRoute ? 'group-hover:bg-white/10' : ''} transition-colors`}>
                                                {formatRelativeTime(notification.createdAt)}
                                            </div>
                                        </div>
                                    </Card>
                                </div>
                            );
                        }}
                    />
                ) : (
                    <EmptyState
                        icon="🔔"
                        title="No notifications"
                        description="You don't have any notifications yet"
                    />
                )}
            </div>
        </div>
    );
}

export default Notifications;

