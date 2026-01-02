import {
    isPermissionGranted,
    requestPermission,
    sendNotification,
} from '@tauri-apps/plugin-notification';
import { invoke } from '@tauri-apps/api/core';

/**
 * Send a desktop notification
 * Automatically handles permission requests and icon downloading
 */
export async function sendDesktopNotification(title: string, body: string, iconUrl?: string): Promise<void> {
    try {
        let permissionGranted = await isPermissionGranted();

        if (!permissionGranted) {
            const permission = await requestPermission();
            permissionGranted = permission === 'granted';
        }

        if (permissionGranted) {
            let iconPath: string | undefined;

            if (iconUrl) {
                try {
                    // Download image to temp for notification icon
                    iconPath = await invoke<string>('download_image_for_notification', { url: iconUrl });
                } catch (e) {
                    console.warn('[Notification] Failed to download icon:', e);
                }
            }

            sendNotification({
                title,
                body,
                icon: iconPath,
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
