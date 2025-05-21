import { test, expect } from '@playwright/test';

test.describe('Tests de responsive design', () => {
  test('devrait avoir un affichage adapté sur mobile', async ({ page }) => {
    // Définir la taille d'écran mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Vérifier que le menu hamburger est visible sur mobile
    const mobileMenu = page.locator('[data-testid="mobile-menu-button"]');
    await expect(mobileMenu).toBeVisible();
    
    // Ouvrir le menu mobile
    await mobileMenu.click();
    
    // Vérifier que les liens de navigation sont maintenant visibles
    const navLinks = page.locator('[data-testid="mobile-nav-links"]');
    await expect(navLinks).toBeVisible();
  });
  
  test('devrait avoir un affichage adapté sur tablette', async ({ page }) => {
    // Définir la taille d'écran tablette
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    
    // Vérifier des éléments spécifiques à la mise en page tablette
    // Par exemple, une grille de 2 colonnes au lieu de 1 sur mobile ou 3 sur desktop
    const gridItems = page.locator('[data-testid="grid-item"]');
    await expect(gridItems).toHaveCount(2);
  });
  
  test('devrait avoir un affichage adapté sur desktop', async ({ page }) => {
    // Définir la taille d'écran desktop
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    
    // Vérifier que le menu de navigation horizontal est visible
    const desktopNav = page.locator('[data-testid="desktop-nav"]');
    await expect(desktopNav).toBeVisible();
    
    // Vérifier l'absence du menu hamburger sur desktop
    const mobileMenu = page.locator('[data-testid="mobile-menu-button"]');
    await expect(mobileMenu).not.toBeVisible();
  });
}); 