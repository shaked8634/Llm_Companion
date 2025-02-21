import {getAllModels} from "@/components/models";
import {getItem} from "@/common/storage";

export const populateModelsDropdown = async () => {
    const modelsDropdown = document.querySelector<HTMLSelectElement>('#models-dropdown')!;
    const executeButton = document.querySelector<HTMLButtonElement>('#execute-prompt')!;

    try {
        modelsDropdown.innerHTML = '';       // Clear existing options
        const modelMappings = await getAllModels();
        const currModel = await getItem('currModel');
        console.debug(`Found ${Object.keys(modelMappings).length} models (default: ${currModel})`)

        Object.keys(modelMappings).forEach(modelName => {
            const model = modelMappings[modelName];

            if (model && model.enabled) {
                const option = document.createElement('option');
                option.value = option.textContent = model.key();
                // Set saved model as selected
                if (currModel == modelName) {
                    console.debug(`set chosen model: ${modelName}`)
                    option.selected = true;
                }
                modelsDropdown.appendChild(option);
            }
        });
        // Disable execute if no models available
        if (modelsDropdown.childElementCount === 0) {
            console.debug("No models found. Disabling execute button")
            executeButton.disabled = true;
        }
    } catch (error) {
        console.error('Error fetching model options:', error);
        modelsDropdown.innerHTML = '<option value="" disabled selected>Failed to load models</option>';
        executeButton.disabled = true;

    }
};