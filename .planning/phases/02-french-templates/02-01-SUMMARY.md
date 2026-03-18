---
phase: 02-french-templates
plan: "01"
subsystem: i18n
tags: [french, strings, customer-facing, env-var, phone]
dependency_graph:
  requires: []
  provides: [French order confirmation screen, Env var phone number on track page]
  affects: [src/components/intake/order-summary.tsx, src/app/(protected)/track/[id]/page.tsx]
tech_stack:
  added: []
  patterns: [Hardcoded French strings (project convention), NEXT_PUBLIC_SHOP_PHONE env var pattern]
key_files:
  created: []
  modified:
    - src/components/intake/order-summary.tsx
    - src/app/(protected)/track/[id]/page.tsx
decisions:
  - Hardcoded French strings used (not useTranslations) — matches Phase 19/22-01 codebase convention
  - SHOP_PHONE fallback 514-667-0082 matches portal page pattern exactly
  - Updated status paragraph in "Update the order status as work progresses" to use &apos; entity for apostrophe, matching Next.js JSX convention
metrics:
  duration_seconds: 406
  completed_date: "2026-03-18"
  tasks_completed: 2
  files_modified: 2
---

# Phase 2 Plan 01: French Templates Summary

**One-liner:** Replaced ~30 English customer-facing strings in order-summary.tsx with hardcoded French equivalents and fixed hardcoded phone number in track page to use NEXT_PUBLIC_SHOP_PHONE env var.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Replace all English strings in order-summary.tsx with French | 7001f1d | src/components/intake/order-summary.tsx |
| 2 | Fix hardcoded phone number in track page with env var | 65649f7 | src/app/(protected)/track/[id]/page.tsx |

## What Was Built

### Task 1: order-summary.tsx French strings

Replaced all ~30 English customer-visible strings with French equivalents using hardcoded strings (project convention). Full replacement map:

- "No order data available" → "Aucune donnée de commande disponible"
- "Order Created Successfully!" → "Commande créée avec succès !"
- "Order #{n} has been created successfully" → "La commande #{n} a été créée avec succès"
- "Order Details" → "Détails de la commande"
- "Order #{n} - {date}" → "Commande #{n} - {date}"
- "Order Information" → "Informations de la commande"
- "Order Number:" → "Numéro de commande :"
- "Order ID:" → "Identifiant :"
- "Status:" → "Statut :"
- "Pending" (badge) → "En attente"
- "Pricing Summary" → "Résumé des prix"
- "Subtotal:" → "Sous-total :"
- "Rush Fee:" → "Frais express :"
- "TPS: Canada tax" → "TPS (taxe fédérale)"
- "TVQ: Québec tax" → "TVQ (taxe provinciale)"
- "Tax:" → "Taxe :"
- "Total:" → "Total :"
- "Order QR Code" (CardTitle + img alt) → "Code QR de la commande"
- "Use this QR code to track the order" → "Utilisez ce code QR pour suivre la commande"
- "Order #{n}" (QR caption) → "Commande #{n}"
- "Print Labels" (button) → "Imprimer les étiquettes"
- "New Order" (button) → "Nouvelle commande"
- "What's Next?" → "Prochaines étapes"
- "Print Labels" (step h4) → "Imprimer les étiquettes"
- "Print labels for each garment..." → "Imprimez les étiquettes pour chaque vêtement afin de les suivre tout au long du processus"
- "Start Work" → "Commencer le travail"
- "Begin working on the garments..." → "Commencez à travailler sur les vêtements selon les services sélectionnés"
- "Update Status" → "Mettre à jour le statut"
- "Update the order status as work progresses" → "Mettez à jour le statut de la commande au fur et à mesure de l'avancement"

### Task 2: track/[id]/page.tsx phone number

- Added `const SHOP_PHONE = process.env.NEXT_PUBLIC_SHOP_PHONE || '514-667-0082';` to component function body
- Replaced `href='tel:+15148551234'` with `href={\`tel:${SHOP_PHONE.replace(/-/g, '')}\`}`
- Replaced hardcoded `(514) 855-1234` display with `{SHOP_PHONE}`
- Matches portal page pattern exactly (Phase 25-01 established pattern)

## Deviations from Plan

None — plan executed exactly as written.

## Decisions Made

1. **Hardcoded French strings**: Used direct string literals (not useTranslations) per project convention from Phases 19, 22-01, 24-02. The commented-out `// const t = useTranslations('intake.submit')` line preserved as-is (Phase 10 concern).

2. **Phone fallback 514-667-0082**: Used same fallback as portal page, matching Phase 25-01 convention. The env var `NEXT_PUBLIC_SHOP_PHONE` in Vercel config is the source of truth.

3. **JSX apostrophe entity**: Used `&apos;` in the "l'avancement" string in the "Update Status" step paragraph to be consistent with Next.js JSX escaping pattern (the file already used `&apos;` elsewhere on the track page).

## Self-Check: PASSED

| Item | Status |
|------|--------|
| src/components/intake/order-summary.tsx | FOUND |
| src/app/(protected)/track/[id]/page.tsx | FOUND |
| Commit 7001f1d (order-summary French strings) | FOUND |
| Commit 65649f7 (track page phone env var) | FOUND |
