import { test, expect } from '@playwright/test';

test.describe('Parcours utilisateur complet', () => {
  test('devrait naviguer à travers le site et interagir avec les fonctionnalités principales', async ({ page }) => {
    // Commencer par la page d'accueil
    await page.goto('/');
    
    // Naviguer vers la page "À propos"
    await page.locator('nav').getByText('À propos').click();
    await expect(page.url()).toContain('/about');
    
    // Naviguer vers la page FAQ
    await page.locator('nav').getByText('FAQ').click();
    await expect(page.url()).toContain('/faq');
    
    // Ouvrir un élément de FAQ
    const faqItem = page.locator('[data-testid="faq-item"]').first();
    await faqItem.click();
    await expect(page.locator('[data-testid="faq-answer"]').first()).toBeVisible();
    
    // Retourner à la page d'accueil
    await page.locator('nav').getByText('Accueil').click();
    await expect(page.url()).not.toContain('/faq');
  });
}); 