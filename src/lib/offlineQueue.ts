// Apollo Client types removed - not currently used but structure kept for future use

/**
 * Interface for a queued mutation
 */
interface QueuedMutation {
    id: string;
    mutationName: string;
    variables: any;
    timestamp: number;
}

const STORAGE_KEY = 'offline_mutation_queue';

/**
 * Adds a failed mutation to the offline queue
 */
export const addToOfflineQueue = (mutationName: string, variables: any) => {
    const queue = getQueue();
    const newMutation: QueuedMutation = {
        id: crypto.randomUUID(),
        mutationName,
        variables,
        timestamp: Date.now()
    };

    queue.push(newMutation);
    saveQueue(queue);
    console.log(`[OfflineQueue] Added ${mutationName} to queue`, newMutation);
};

/**
 * Gets the current queue from local storage
 */
export const getQueue = (): QueuedMutation[] => {
    try {
        const item = localStorage.getItem(STORAGE_KEY);
        return item ? JSON.parse(item) : [];
    } catch (e) {
        console.error('Failed to parse offline queue', e);
        return [];
    }
};

/**
 * Saves the queue to local storage
 */
const saveQueue = (queue: QueuedMutation[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
};

/**
 * Removes a mutation from the queue by ID
 */
export const removeFromQueue = (id: string) => {
    const queue = getQueue();
    const filtered = queue.filter(item => item.id !== id);
    saveQueue(filtered);
};

/**
 * Mapping of mutation names to actual mutation functions (or callbacks to execute them)
 * This needs to be populated with the actual API calls we want to retry.
 * 
 * Ideally, we'd store the actual GraphQL query string, but `anilistClient.ts` uses wrapped functions.
 * For this MVP, we will only support specific mutations we expect (like 'UpdateMediaListEntry').
 */
type MutationProcessor = (variables: any) => Promise<any>;

const mutationProcessors: Record<string, MutationProcessor> = {};

export const registerMutationProcessor = (name: string, processor: MutationProcessor) => {
    mutationProcessors[name] = processor;
};

/**
 * Process the offline queue
 */
export const processOfflineQueue = async () => {
    if (!navigator.onLine) return; // Still offline

    const queue = getQueue();
    if (queue.length === 0) return;

    console.log(`[OfflineQueue] Processing ${queue.length} items...`);

    // Process sequentially
    for (const item of queue) {
        const processor = mutationProcessors[item.mutationName];
        if (processor) {
            try {
                console.log(`[OfflineQueue] Retrying ${item.mutationName}...`);
                await processor(item.variables);
                removeFromQueue(item.id);
                console.log(`[OfflineQueue] Success: ${item.mutationName} (${item.id})`);
            } catch (err: any) {
                console.error(`[OfflineQueue] Failed processing ${item.mutationName}`, err);

                // If it's a permanent error (e.g. 400 Bad Request), maybe remove it?
                // For now, we leave it to retry later or manually clear.
                // However, we should probably remove it if we want to proceed with others to avoid blocking.
                // Let's implement a simple retry count or just keep it for now.

                // If network error, stop processing
                if (!navigator.onLine) break;
            }
        } else {
            console.warn(`[OfflineQueue] No processor found for ${item.mutationName}`);
            // Remove it so it doesn't clog the queue?
            // removeFromQueue(item.id);
        }
    }
};

/**
 * Hook to automatically process queue when online
 */
import { useEffect } from 'react';

export const useOfflineSync = () => {
    useEffect(() => {
        const handleOnline = () => {
            console.log("App is back online. Processing queue...");
            processOfflineQueue();
        };

        // Process on mount if online
        if (navigator.onLine) {
            processOfflineQueue();
        }

        window.addEventListener('online', handleOnline);
        return () => window.removeEventListener('online', handleOnline);
    }, []);
};
