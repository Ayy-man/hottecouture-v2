/**
 * Script to check and delete services from the database
 * Run with: node scripts/check-and-delete-services.js
 */

const servicesToDelete = [
  'Bord de rideau pleine largeur',
  'Bord de rideau pleine largeur doublé',
  "Couper rideau en 2 sur la hauteur (ajout d'une",
  'Couper Drans en 2',
];

console.log('🔍 Services to delete:');
servicesToDelete.forEach((name, index) => {
  console.log(`  ${index + 1}. "${name}"`);
});

console.log(
  '\n📝 Note: This script requires the DELETE API endpoint to be called.'
);
console.log(
  '   Use: POST /api/admin/delete-services with body: { "serviceNames": [...] }'
);
