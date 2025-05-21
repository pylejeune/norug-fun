import { test, expect } from './coverage-setup';

test.describe('Contenu de la page d\'accueil', () => {
  // Augmenter le timeout pour les tests
  test.setTimeout(30000);

  test('devrait afficher le mot "burn" sur la page d\'accueil', async ({ page }) => {
    // Démarrer la collecte de couverture
    await page.evaluate(() => (window as any).startCoverage && (window as any).startCoverage());
    
    // Naviguer vers la page d'accueil avec un timeout généreux
    await page.goto('/', { timeout: 20000 });
    
    // Attendre que la page soit complètement chargée
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    
    // Vérifier que le slogan avec la typewriter animation est visible
    const typewriterContainer = page.locator('.text-center.mb-6');
    await expect(typewriterContainer).toBeVisible({ timeout: 10000 });
    
    // Attendre que le contenu du typewriter ait le temps de s'afficher
    // Note: Le mot "burn" doit avoir une class spécifique "text-red-600 dark:text-red-500"
    await page.waitForTimeout(2000); // Attendre que l'animation du typewriter progresse
    
    // Vérifier si l'élément avec le texte "burn" et la classe de couleur rouge existe
    const burnElement = page.locator('text=burn').filter({ hasText: 'burn' });
    await expect(burnElement).toBeVisible({ timeout: 15000 });
    
    // Alternativement, on peut chercher par la classe spécifique
    const redTextElements = page.locator('.text-red-600, .text-red-500');
    const redElementsCount = await redTextElements.count();

    if (redElementsCount > 0) {
      // Vérifier que tous les éléments rouges ensemble forment "burn."
      const allRedText = await redTextElements.evaluateAll(elements => 
        elements.map(el => el.textContent).join(''));
      expect(allRedText).toBe('burn.');
    } else {
      // Fallback: chercher "burn" dans le contenu de la page
      const textOnPage = await page.textContent('body');
      expect(textOnPage).toContain('burn');
    }
    
    // Récupérer les données de couverture à la fin du test
    const coverage = await page.evaluate(() => (window as any).getCoverage && (window as any).getCoverage());
    console.log('Couverture collectée:', coverage ? Object.keys(coverage).length : 0, 'fichiers');
  });
}); 