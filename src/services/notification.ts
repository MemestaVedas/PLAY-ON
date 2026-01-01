import {
    isPermissionGranted,
    requestPermission,
    sendNotification,
} from '@tauri-apps/plugin-notification';

/**
 * Send a desktop notification
 * Automatically handles permission requests
 */
export async function sendDesktopNotification(title: string, body: string, imageUrl?: string): Promise<void> {
    try {
        let permissionGranted = await isPermissionGranted();

        if (!permissionGranted) {
            const permission = await requestPermission();
            permissionGranted = permission === 'granted';
        }

        if (permissionGranted) {
            const options: any = {
                title,
                body,
                sound: 'default'
            };

            // Add attachment if image URL is provided
            if (imageUrl) {
                options.attachments = [{
                    id: 'image-1',
                    url: imageUrl
                }];
            }

            sendNotification(options);
            console.log(`[Notification] Sent: ${title} - ${body}${imageUrl ? ' (with image)' : ''}`);
        } else {
            console.warn('[Notification] Permission denied');
        }
    } catch (err) {
        console.error('[Notification] Failed to send notification:', err);
    }
}
