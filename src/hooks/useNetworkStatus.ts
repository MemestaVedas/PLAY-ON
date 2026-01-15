/**
 * Network Status Hook
 * 
 * Detects online/offline status and provides network state
 * for UI feedback and action queueing.
 */

import { useState, useEffect, useCallback } from 'react';

interface NetworkStatus {
    isOnline: boolean;
    wasOffline: boolean; // True if recently came back online
}

export function useNetworkStatus(): NetworkStatus {
    const [status, setStatus] = useState<NetworkStatus>({
        isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
        wasOffline: false
    });

    const handleOnline = useCallback(() => {
        setStatus(prev => ({
            isOnline: true,
            wasOffline: !prev.isOnline // Was offline if previous state was offline
        }));

        // Clear wasOffline after 3 seconds
        setTimeout(() => {
            setStatus(prev => ({ ...prev, wasOffline: false }));
        }, 3000);
    }, []);

    const handleOffline = useCallback(() => {
        setStatus({ isOnline: false, wasOffline: false });
    }, []);

    useEffect(() => {
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [handleOnline, handleOffline]);

    return status;
}

export default useNetworkStatus;
