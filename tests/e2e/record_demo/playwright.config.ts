import { defineConfig } from '@playwright/test';
import path from 'path';

export default defineConfig({
    testDir: '.',
    outputDir: 'test-results',
    timeout: 120000,
    use: {
        baseURL: 'http://localhost:3000',
        video: 'on',
        headless: true,
        viewport: { width: 1280, height: 720 },
        ignoreHTTPSErrors: true,
    },
});
