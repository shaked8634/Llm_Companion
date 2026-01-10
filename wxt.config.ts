import {defineConfig} from 'wxt';
import preact from '@preact/preset-vite';

export default defineConfig({
    extensionApi: 'chrome', // Disable polyfill
    srcDir: 'src',
    vite: () => ({
        plugins: [preact()],
    }),

    manifest: {
        name: "LLM companion",
        action: {
            default_title: 'Your friendly surfing companion',
        },
        web_accessible_resources: [
            {
                matches: ['*://*/*'],
                resources: []
            },
        ],
        permissions: ['storage', "activeTab"],
    }
});
