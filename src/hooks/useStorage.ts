import {useEffect, useState} from 'preact/hooks';
import {WxtStorageItem} from 'wxt/storage';

export function useStorage<T>(storageItem: WxtStorageItem<T, any> | null) {
    const [value, setValue] = useState<T | null>(null);

    useEffect(() => {
        if (!storageItem) return;

        // Initial load
        storageItem.getValue().then(setValue);

        // Listen for changes
        const unwatch = storageItem.watch(setValue);
        return () => unwatch();
    }, [storageItem]);

    const updateValue = async (newValue: T) => {
        if (storageItem) {
        await storageItem.setValue(newValue);
        setValue(newValue);
}
    };

    return [value, updateValue] as const;
}
