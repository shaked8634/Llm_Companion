import {getItem, StorageKeys} from "@/common/storage";

// Populate previous outbox and clean button (in case popup is closed)
export const populateOutputBox = async () => {
    const lastOutput = await getItem(StorageKeys.LastOutput)
    const outputContainer = document.querySelector<HTMLDivElement>('.output-container')!;

    if (lastOutput) {
        outputContainer.textContent = lastOutput
    } else {
        outputContainer.textContent = '';
    }
}