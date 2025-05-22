module.exports = {
  // Extension des fichiers à couvrir
  'extension': ['.js', '.jsx', '.ts', '.tsx'],
  
  // Inclure le code source
  'include': [
    'app/**/*.{js,jsx,ts,tsx}',
    'components/**/*.{js,jsx,ts,tsx}',
    'context/**/*.{js,jsx,ts,tsx}',
    'hooks/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    'utils/**/*.{js,jsx,ts,tsx}',
  ],
  
  // Exclure les fichiers qui ne sont pas pertinents pour la couverture
  'exclude': [
    'node_modules',
    '.next',
    'e2e',
    'test',
    '**/*.d.ts',
    '**/*.spec.{js,jsx,ts,tsx}',
    '**/*.test.{js,jsx,ts,tsx}'
  ],
  
  // Activer la source map pour une meilleure précision
  'sourceMap': true,
  
  // Reporter à utiliser
  'reporter': [
    'lcov',
    'text-summary'
  ],
  
  // Instrumentation à utiliser
  'instrument': true,
  
  // Seuil de couverture minimum (peut être ajusté)
  'check-coverage': false
}; 