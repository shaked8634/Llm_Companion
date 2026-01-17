import {defineConfig} from 'vitest/config';
import {WxtVitest} from 'wxt/testing';

export default defineConfig(async () => ({
  plugins: await WxtVitest(),
  test: {
    environment: 'jsdom',
    testTimeout: 60000 // 60 seconds for debugging
  }
}));
