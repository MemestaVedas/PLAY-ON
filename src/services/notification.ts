import {
    isPermissionGranted,
    requestPermission,
    sendNotification,
} from '@tauri-apps/plugin-notification';

/**
 * Send a desktop notification
 * Automatically handles permission requests
 */
export async function sendDesktopNotification(title: string, body: string): Promise<void> {
    try {
        let permissionGranted = await isPermissionGranted();

        if (!permissionGranted) {
            const permission = await requestPermission();
            permissionGranted = permission === 'granted';
        }

        if (permissionGranted) {
            sendNotification({
                title,
                body,
                sound: 'default'
            });
            console.log(`[Notification] Sent: ${title} - ${body}`);
        } else {
            console.warn('[Notification] Permission denied');
        }
    } catch (err) {
        console.error('[Notification] Failed to send notification:', err);
    }
}
