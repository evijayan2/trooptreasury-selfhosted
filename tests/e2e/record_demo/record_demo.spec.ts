import { test, expect } from '@playwright/test';

async function smoothScroll(page) {
    await page.evaluate(async () => {
        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
        const totalHeight = document.body.scrollHeight;
        // Scroll down in chunks
        for (let i = 0; i < totalHeight; i += 100) {
            window.scrollTo(0, i);
            await delay(100);
        }
        await delay(1000);
        // Scroll up
        window.scrollTo(0, 0);
        await delay(1000);
    });
}

test.describe.serial('Demo Recording', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:3000/login');

        // Handle login if not authenticated
        const isLogin = await page.isVisible('input[name="email"]');
        if (isLogin) {
            await page.fill('input[name="email"]', 'admin@example.com');
            await page.fill('input[name="password"]', 'TroopTreasury2026!');

            // Try to click Submit
            const submitBtn = page.locator('button[type="submit"]');
            if (await submitBtn.isVisible()) {
                await submitBtn.click();
            } else {
                await page.press('input[name="password"]', 'Enter');
            }

            try {
                await page.waitForURL(/.*dashboard.*/, { timeout: 15000 });
            } catch (e) {
                console.log('Navigation timeout, continuing anyway...');
            }
        }

        await page.waitForTimeout(2000); // Hydration wait
    });

    test('1_dashboard', async ({ page }) => {
        await page.goto('http://localhost:3000/dashboardt79-ccc/dashboard');
        await page.waitForTimeout(2000);

        const actions = page.locator('.grid a, .grid button');
        if (await actions.count() > 0) {
            await actions.first().hover();
            await page.waitForTimeout(500);
        }

        await smoothScroll(page);
        await page.waitForTimeout(2000);
    });

    test('2_settings', async ({ page }) => {
        await page.goto('http://localhost:3000/dashboardt79-ccc/settings');
        await page.waitForTimeout(2000);

        const tabs = ['Password', 'Security', 'Roles', 'Permissions', 'Backup', 'Database'];
        for (const t of tabs) {
            const tab = page.locator('button[role="tab"], a').filter({ hasText: new RegExp(t, 'i') }).first();
            if (await tab.isVisible()) {
                await tab.click();
                await page.waitForTimeout(2000);
            }
        }
        await page.waitForTimeout(1000);
    });

    test('3_scouts', async ({ page }) => {
        await page.goto('http://localhost:3000/dashboardt79-ccc/dashboard/scouts');
        await page.waitForTimeout(2000);
        await page.mouse.move(300, 300);
        await smoothScroll(page);
    });

    test('4_campouts', async ({ page }) => {
        await page.goto('http://localhost:3000/dashboardt79-ccc/dashboard/campouts');
        await page.waitForTimeout(2000);

        // Try to click "Winter Freeze" or fallback to first
        const campoutName = 'Winter Freeze';
        let row = page.locator('.grid a').filter({ hasText: campoutName }).first();

        if (!(await row.isVisible())) {
            console.log(`Campout "${campoutName}" not found, falling back to first available.`);
            row = page.locator('.grid a').first();
        }

        if (await row.isVisible()) {
            await row.click();
            await page.waitForTimeout(2000);
            await smoothScroll(page);
        }
    });

    test('5_fundraising', async ({ page }) => {
        await page.goto('http://localhost:3000/dashboardt79-ccc/dashboard/fundraising');
        await page.waitForTimeout(2000);

        // Enter a fundraiser if possible
        const row = page.locator('tbody tr, .card, a').filter({ hasText: /Fundraiser/i }).first();
        if (await row.isVisible()) {
            await row.click();
        } else {
            // fallback: try generic row
            const genericRow = page.locator('tbody tr').first();
            if (await genericRow.isVisible()) await genericRow.click();
        }

        await page.waitForTimeout(2000);

        // Tabs
        const tabNames = ['Distribution', 'Direct Sales', 'Sales', 'Tickets'];
        for (const t of tabNames) {
            const tab = page.locator('button[role="tab"]').filter({ hasText: new RegExp(t, 'i') }).first();
            if (await tab.isVisible()) {
                await tab.click();
                await page.waitForTimeout(1500);
            }
        }
    });

    test('6_financial', async ({ page }) => {
        await page.goto('http://localhost:3000/dashboardt79-ccc/dashboard/finance');
        await page.waitForTimeout(2000);

        // Navigate to sub-sections if they appear as links/tabs
        const keywords = ['Budget', 'Transactions', 'IBA'];
        for (const k of keywords) {
            const link = page.locator('a, button').filter({ hasText: new RegExp(k, 'i') }).first();
            if (await link.isVisible()) {
                await link.click();
                await page.waitForTimeout(1500);
                // go back to finance root to click next? Or maybe they are tabs.
                // If links navigate away, we need to go back.
                // Assume they are tabs or we just visit one.
            }
        }
        await smoothScroll(page);
    });

});
