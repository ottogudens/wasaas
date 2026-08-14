import { test, expect } from '@playwright/test';

test.describe('Smoke Tests - App Web', () => {
  test('Landing page loads and has a login link', async ({ page }) => {
    // Navigate to the root URL (configured in playwright.config.ts)
    await page.goto('/');
    
    // Check if the title or an h1 exists
    await expect(page.locator('h1')).toBeVisible();
    
    // Check for a login or dashboard link
    const loginLink = page.getByRole('link', { name: /ingresar|login|dashboard/i }).first();
    await expect(loginLink).toBeVisible();
  });

  test('Login page loads correctly', async ({ page }) => {
    await page.goto('/login');
    
    // Ensure form fields exist
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /ingresar/i })).toBeVisible();
  });
});
