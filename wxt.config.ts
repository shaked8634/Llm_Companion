import {defineConfig} from 'wxt';
import preact from '@preact/preset-vite';

export default defineConfig({
    srcDir: 'src',
    vite: () => ({
        plugins: [preact()],
        publicDir: 'src/public',
    }),

    manifest: {
        name: "LLM companion",
        action: {
            default_title: 'Your friendly surfing companion',
        },
        web_accessible_resources: [
            {
                matches: ['*://*/*'],
                resources: ['logo.svg']
            },
        ],
        permissions: ['storage', "activeTab"],
    },

    webExt: {
        openConsole: true,
        chromiumArgs: ['--user-data-dir=./.wxt/chrome-data'], // Persist browser data
    }
});
