import {getAllModels} from "@/components/models";
import {getItem} from "@/common/storage";

export const populateModelsDropdown = async () => {
    try {
        const dropdown = document.querySelector<HTMLSelectElement>('#models-dropdown');

        if (dropdown) {
            dropdown.innerHTML = '';       // Clear existing options
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
                    dropdown.appendChild(option);
                }
            });
        }
    } catch (error) {
        console.error('Error fetching model options:', error);
        const dropdown = document.querySelector<HTMLSelectElement>('#models-dropdown');

        if (dropdown) {
            dropdown.innerHTML = '<option value="" disabled selected>Failed to load models</option>';
        }
    }
};