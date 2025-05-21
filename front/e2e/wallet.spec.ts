import { test, expect } from '@playwright/test';

test.describe('Fonctionnalités du portefeuille', () => {
  test('devrait afficher le bouton de connexion au portefeuille', async ({ page }) => {
    await page.goto('/');
    const walletButton = page.locator('[data-testid="connect-wallet-button"]');
    await expect(walletButton).toBeVisible();
  });

  test('devrait ouvrir le modal de sélection de portefeuille', async ({ page }) => {
    await page.goto('/');
    const walletButton = page.locator('[data-testid="connect-wallet-button"]');
    await walletButton.click();
    
    // Vérifier que le modal de sélection de portefeuille s'ouvre
    const walletModal = page.locator('[data-testid="wallet-adapter-modal"]');
    await expect(walletModal).toBeVisible();
    
    // Vérifier qu'au moins une option de portefeuille est affichée
    const walletOptions = page.locator('[data-testid="wallet-adapter-button"]');
    await expect(walletOptions.first()).toBeVisible();
  });
}); 