import { expect, test } from '@playwright/test';

test('home page has expected h1', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('h1')).toBeVisible();
});

test('snake board renders with score and high score', async ({ page }) => {
	await page.goto('/');
	// The 6x6 board renders as six rows of Unicode characters.
	await expect(page.locator('.snake-grid-row')).toHaveCount(6);
	await expect(page.getByText('Score:', { exact: true })).toBeVisible();
	await expect(page.getByText('High Score:')).toBeVisible();
});

test('pressing Play reveals the on-screen direction controls', async ({ page }) => {
	await page.goto('/');
	await page.getByRole('button', { name: 'Play' }).click();
	await expect(page.getByRole('button', { name: '↑' })).toBeVisible();
	await expect(page.getByRole('button', { name: '↓' })).toBeVisible();
});
