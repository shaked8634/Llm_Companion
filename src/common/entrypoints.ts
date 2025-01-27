// Enable/disable field and gray in/out if disabled
export const toggleFieldAtt = (field: HTMLInputElement, enabled: boolean) => {
    field.disabled = !enabled;
    field.style.opacity = enabled ? '1' : '0.5';
};