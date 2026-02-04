---
phase: 22-audit-gap-closure
plan: 03
status: complete
---

## Summary

Ported "Add Custom Type" section from old garments-step.tsx into merged garment-services-step.tsx.

### Changes Made

**src/components/intake/garment-services-step.tsx:**
- Added state variables: showAddCustomForm, customTypeName, customTypeCategory
- Added customTypesCount computed value (filters garmentTypes for is_custom && is_active)
- Added handleCreateCustomType function:
  - POSTs to /api/admin/garment-types
  - Reloads garment types after creation
  - Auto-selects newly created type
  - Resets form state
- Added custom type form UI inside garment type dropdown:
  - "Ajouter un type personnalise..." button with + icon
  - Inline form with name input, category selector (8 French options)
  - Enter key submits, Escape key cancels
  - Create/Cancel buttons with 44px touch targets
  - 10-type limit enforced with "Limite atteinte" visual feedback
  - All labels in French
  - touch-manipulation class for mobile

### Verification
- handleCreateCustomType function confirmed present
- showAddCustomForm state variable confirmed
- customTypesCount computed value confirmed
- "Ajouter un type personnalise..." button text confirmed
- /api/admin/garment-types API call confirmed
- TypeScript compiles clean (no errors in modified files)
