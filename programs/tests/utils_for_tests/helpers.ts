// Placeholder pour les fonctions d'aide aux tests 

// Fonctions d'aide pour les tests (génération d'ID aléatoires, parsing de logs, etc.)

export function generateRandomId(): string {
    // Génère un nombre aléatoire suffisamment grand et le convertit en chaîne.
    // Number.MAX_SAFE_INTEGER est 2^53 - 1, ce qui est grand pour un ID.
    // BN peut gérer des nombres plus grands, mais cela devrait suffire pour des ID uniques dans les tests.
    return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString();
}

// Ajoutez d'autres helpers ici au besoin.

export {}; // Assure que le fichier est traité comme un module 