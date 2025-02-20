import {defineConfig} from 'wxt';

export default defineConfig({
    extensionApi: 'chrome', // Disable polyfill
    srcDir: 'src',

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
