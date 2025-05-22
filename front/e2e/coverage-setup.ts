import { test as base, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// Extension du type Page pour inclure la couverture
type PageWithCoverage = Page & {
  coverage?: {
    startJSCoverage: () => Promise<void>;
    stopJSCoverage: () => Promise<any[]>;
  };
};

// Création de fixtures personnalisées pour la couverture
const test = base.extend({
  page: async ({ page }, use) => {
    const pageWithCoverage = page as PageWithCoverage;

    // Avant chaque test, démarrer la collecte de couverture
    try {
      await pageWithCoverage.coverage?.startJSCoverage();
      console.log('✅ Collecte de couverture démarrée');
    } catch (error) {
      console.warn('⚠️ Impossible de démarrer la collecte de couverture:', error);
    }

    // Exécuter le test
    await use(page);

    // Après chaque test, arrêter la collecte et sauvegarder les données
    try {
      const coverage = await pageWithCoverage.coverage?.stopJSCoverage();
      if (coverage && coverage.length > 0) {
        console.log(`✅ Couverture collectée pour ${coverage.length} fichiers`);
        
        // Créer le répertoire de couverture s'il n'existe pas
        const coverageDir = path.join(process.cwd(), 'coverage');
        if (!fs.existsSync(coverageDir)) {
          fs.mkdirSync(coverageDir, { recursive: true });
        }
        
        // Sauvegarder les données de couverture
        const coveragePath = path.join(coverageDir, `coverage-${Date.now()}.json`);
        fs.writeFileSync(coveragePath, JSON.stringify(coverage));
        console.log(`✅ Données de couverture sauvegardées dans ${coveragePath}`);
      } else {
        console.warn('⚠️ Aucune donnée de couverture collectée');
      }
    } catch (error) {
      console.warn('⚠️ Erreur lors de la collecte de couverture:', error);
    }
  },
});

// Exporter les objets de test de Playwright avec tous leurs méthodes
export { test, expect };
