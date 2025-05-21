import { test, expect } from '@playwright/test';

test.describe('Formulaires et interactions', () => {
  test('devrait valider un formulaire de contact', async ({ page }) => {
    // Naviguer vers la page de contact
    await page.goto('/contact');
    
    // Remplir le formulaire
    await page.locator('input[name="name"]').fill('Test User');
    await page.locator('input[name="email"]').fill('test@example.com');
    await page.locator('textarea[name="message"]').fill('Ceci est un message de test');
    
    // Soumettre le formulaire
    await page.locator('button[type="submit"]').click();
    
    // Vérifier qu'un message de confirmation apparaît
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  });
}); 