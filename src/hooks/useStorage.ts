import {useEffect, useRef, useState} from 'preact/hooks';
import {WxtStorageItem} from 'wxt/storage';

export function useStorage<T>(storageItem: WxtStorageItem<T, any> | null) {
    const [value, setValue] = useState<T | null>(null);
    const lastUpdateTime = useRef<number>(0);
    const updateTimer = useRef<number | null>(null);

    useEffect(() => {
        if (!storageItem) return;

        // Initial load
        storageItem.getValue().then(setValue);

        // Throttle watch updates to prevent excessive re-renders during streaming
        const throttledSetValue = (newValue: T) => {
            const now = Date.now();
            const timeSinceLastUpdate = now - lastUpdateTime.current;

            // If it's been less than 200ms since last update, debounce
            if (timeSinceLastUpdate < 200) {
                if (updateTimer.current) {
                    clearTimeout(updateTimer.current);
                }
                updateTimer.current = window.setTimeout(() => {
                    lastUpdateTime.current = Date.now();
                    setValue(newValue);
                }, 200);
            } else {
                // Update immediately if enough time has passed
                lastUpdateTime.current = now;
                setValue(newValue);
            }
        };

        // Listen for changes
        const unwatch = storageItem.watch(throttledSetValue);
        return () => {
            unwatch();
            if (updateTimer.current) {
                clearTimeout(updateTimer.current);
            }
        };
    }, [storageItem]);

    const updateValue = async (newValue: T) => {
        if (storageItem) {
            await storageItem.setValue(newValue);
            setValue(newValue);
        }
    };

    return [value, updateValue] as const;
}
