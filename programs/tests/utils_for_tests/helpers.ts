// Placeholder pour les fonctions d'aide aux tests 

// Fonctions d'aide pour les tests (génération d'ID aléatoires, parsing de logs, etc.)

export function generateRandomId(): string {
    // Génère un nombre aléatoire suffisamment grand et le convertit en chaîne.
    // Number.MAX_SAFE_INTEGER est 2^53 - 1, ce qui est grand pour un ID.
    // BN peut gérer des nombres plus grands, mais cela devrait suffire pour des ID uniques dans les tests.
    return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString();
}

/**
 * Abrège une adresse PublicKey pour un affichage concis dans les logs.
 * @param publicKey L'adresse PublicKey à abréger.
 * @returns Une chaîne de caractères représentant l'adresse abrégée (ex: "AbCd...Wxyz").
 */
export function shortenAddress(publicKey: { toString: () => string } | string): string {
    const address = typeof publicKey === 'string' ? publicKey : publicKey.toString();
    if (address.length <= 8) return address; // Ne pas abréger si déjà court
    return `${address.substring(0, 4)}...${address.substring(address.length - 4)}`;
}

// Ajoutez d'autres helpers ici au besoin.

export {}; // Assure que le fichier est traité comme un module 