describe('Exemple de test', () => {
  it('devrait fonctionner correctement', () => {
    expect(1 + 1).toBe(2);
  });

  it('devrait pouvoir vérifier des chaînes de caractères', () => {
    expect('NoRug').toContain('Rug');
  });
}); 