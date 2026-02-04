---
phase: 22-audit-gap-closure
plan: 02
status: complete
---

## Summary

Added service listing table with three-dot context menu to admin pricing page.

### Changes Made

**src/app/admin/pricing/page.tsx:**
- Added imports: useEffect, DropdownMenu components, MoreHorizontal/Edit/DownloadIcon/Trash2 icons
- Added ServiceRow interface and state variables for service management
- Added fetchServicesList function with useEffect for initial load
- Added handlers: handleStartEdit, handleSaveEdit, handleExportService, handleDeleteService
- Added service table section below Instructions Card with:
  - Loading spinner state
  - Empty state with import prompt
  - Full table with Name, Category, Price, Minutes columns
  - Three-dot (MoreHorizontal) menu per row with Modifier, Exporter, Supprimer
  - Inline edit mode with OK/X buttons
  - CSV export for individual services
  - Soft delete with usage check (French error message)
- Service list refreshes after successful import

### Verification
- DropdownMenu components confirmed present
- French labels (Modifier, Exporter, Supprimer) confirmed
- fetchServicesList function confirmed
- TypeScript compiles clean (no errors in modified files)
