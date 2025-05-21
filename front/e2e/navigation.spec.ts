import { test, expect } from '@playwright/test';

test.describe('Navigation du site', () => {
  test('devrait charger la page d\'accueil correctement', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/NoRug/);
    await expect(page.locator('h1')).toBeVisible();
  });

  test('devrait permettre de changer de langue', async ({ page }) => {
    await page.goto('/');
    // Chercher le sélecteur de langue
    const languageSwitcher = page.locator('[data-testid="locale-switcher"]');
    await expect(languageSwitcher).toBeVisible();
    
    // Changer la langue
    await languageSwitcher.click();
    // Sélectionner l'anglais si on est en français ou vice versa
    await page.locator('[data-testid="locale-option"]:not(.active)').first().click();
    
    // Vérifier que l'URL a changé pour refléter la nouvelle langue
    await expect(page.url()).toMatch(/\/(en|fr)/);
  });
}); 