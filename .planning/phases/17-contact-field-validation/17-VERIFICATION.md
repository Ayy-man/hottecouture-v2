---
phase: 17-contact-field-validation
verified: 2026-02-04T21:00:00Z
status: passed
score: 6/6 must-haves verified
---

# Phase 17: Contact Field Validation Verification Report

**Phase Goal:** Make SMS and Email both mandatory. Add landline to preferred contact options.
**Verified:** 2026-02-04T21:00:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Cannot create a new client without providing a mobile/SMS number | ✓ VERIFIED | dto.ts line 19: `mobile_phone: phoneSchema` (required), client-step.tsx line 227-235: `validateMobilePhone` enforces requirement, line 360-363: form validation blocks submission |
| 2 | Cannot create a new client without providing an email address | ✓ VERIFIED | dto.ts line 20: `email: emailSchema` (already required), client-step.tsx line 237-245: `validateEmail` enforces requirement, line 365-368: form validation blocks submission |
| 3 | Landline phone field is optional when creating a client | ✓ VERIFIED | dto.ts line 18: `phone: phoneSchema.optional()`, client-step.tsx line 216-225: `validatePhone` only validates format if value provided (no required check), line 784: label shows "Téléphone fixe (optionnel)" |
| 4 | Preferred contact dropdown includes Phone (Landline) option alongside Email and SMS | ✓ VERIFIED | client-step.tsx line 849: `<option value='phone'>📞 Téléphone</option>` in dropdown, line 839-842: type cast includes 'phone' |
| 5 | Selecting Phone (Landline) as preferred contact saves 'phone' value to database | ✓ VERIFIED | client-step.tsx line 405: `preferred_contact: formData.preferred_contact` in createClientInDB, intake route line 108: `preferred_contact: client.preferred_contact \|\| 'sms'` in API, migration line 10: CHECK constraint allows 'phone' |
| 6 | Existing clients with missing mobile_phone or email are still viewable and selectable in search | ✓ VERIFIED | client-step.tsx line 300-308: search query includes mobile_phone but doesn't filter by NOT NULL, line 475-484: handleSelectClient accepts any client from search, no validation blocks selecting existing clients |

**Score:** 6/6 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/0038_update_preferred_contact_and_fields.sql` | Database CHECK constraint update to allow 'phone' in preferred_contact | ✓ VERIFIED | EXISTS (17 lines), SUBSTANTIVE (drops old constraint, adds new CHECK with 'phone', includes comment), WIRED (migration file ready for deployment) |
| `src/lib/dto.ts` | Updated Zod schemas with mobile_phone required and phone optional | ✓ VERIFIED | EXISTS (362 lines), SUBSTANTIVE (line 18: phone optional, line 19: mobile_phone required, line 22: preferred_contact enum includes 'phone'), WIRED (imported by client-step.tsx line 6, used by intake API) |
| `src/components/intake/client-step.tsx` | Updated form with mobile_phone required, phone optional, phone in preferred_contact | ✓ VERIFIED | EXISTS (1132 lines), SUBSTANTIVE (lines 227-287: validation functions, lines 728-850: form fields with proper labels and validation, line 402-406: database insert includes mobile_phone and preferred_contact), WIRED (imports ClientCreate from dto.ts, calls supabase insert, used by intake flow) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| src/components/intake/client-step.tsx | src/lib/dto.ts | ClientCreate type shapes form state and validation | ✓ WIRED | Line 6: imports ClientCreate, line 46: formData typed as ClientCreate, ensures form structure matches schema |
| src/components/intake/client-step.tsx | supabase client.insert | createClientInDB inserts mobile_phone to database | ✓ WIRED | Line 402: `mobile_phone: (formData.mobile_phone \|\| '').trim() \|\| null` passed to insert, line 405: preferred_contact passed to insert |
| src/lib/dto.ts | src/app/api/intake/route.ts | intakeRequestSchema validates incoming client data | ✓ WIRED | intake/route.ts line 106: `mobile_phone: client.mobile_phone \|\| null` in API insert, line 108: `preferred_contact: client.preferred_contact \|\| 'sms'` in API insert, inherits validation from clientCreateSchema |

### Requirements Coverage

From ROADMAP.md Phase 17 Success Criteria:

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Both SMS and Email required for new clients | ✓ SATISFIED | dto.ts makes both required, client-step.tsx enforces validation, form blocks submission without both |
| Landline phone option in preferred contact | ✓ SATISFIED | Dropdown includes 📞 Téléphone option, saves 'phone' to database, CHECK constraint allows 'phone' |
| Existing clients without both fields still viewable | ✓ SATISFIED | Search queries don't filter by NOT NULL, handleSelectClient accepts any client, no validation blocks selection |

### Anti-Patterns Found

**None found.** All implementations are substantive with no stub patterns detected.

Checked patterns:
- No TODO/FIXME/placeholder comments in modified files
- No empty return statements
- No console.log-only implementations
- All validation functions have real logic
- All form fields properly wired to handlers

### Human Verification Required

#### 1. Mobile/SMS Field Validation UX

**Test:** Navigate to intake form, click "Créer Nouveau Client", try to submit without mobile number
**Expected:** Red error message "Le numéro mobile/SMS est requis" appears below Mobile/SMS field, form does not submit
**Why human:** Need to verify visual error display and user experience flow

#### 2. Phone (Landline) Optional Behavior

**Test:** Create new client with mobile/SMS and email, leave landline field empty, submit form
**Expected:** Client creates successfully without error, landline saved as NULL in database
**Why human:** Need to verify optional field doesn't block creation

#### 3. Preferred Contact "Phone" Option

**Test:** Create client, select "📞 Téléphone" from Contact Préféré dropdown, submit
**Expected:** Client saved with preferred_contact='phone', visible when viewing client later
**Why human:** Need to verify database persistence and dropdown behavior

#### 4. Existing Client Search with Missing Fields

**Test:** Search for existing client that has NULL mobile_phone or email (legacy data)
**Expected:** Client appears in search results, can be selected without errors
**Why human:** Need to verify backward compatibility with legacy data

#### 5. Form Field Ordering

**Test:** View create client form
**Expected:** Row 2 shows "Mobile/SMS *" and "Email *" side by side, Row 3 shows "Téléphone fixe (optionnel)" as single field
**Why human:** Need to verify visual layout matches specification

---

## Verification Details

### Level 1: Existence

All required artifacts exist:
- ✓ Migration file: `supabase/migrations/0038_update_preferred_contact_and_fields.sql` (17 lines)
- ✓ Schema definitions: `src/lib/dto.ts` (362 lines)
- ✓ Form component: `src/components/intake/client-step.tsx` (1132 lines)
- ✓ API route: `src/app/api/intake/route.ts` (690 lines)

### Level 2: Substantive

All artifacts are substantive implementations:

**Migration (0038_update_preferred_contact_and_fields.sql):**
- Drops existing CHECK constraint (line 6)
- Adds new CHECK constraint with 'email', 'sms', 'phone' (line 9-10)
- Includes explanatory comment (line 13)
- Documents why no NOT NULL constraints (line 15-17)

**Schema (dto.ts):**
- Line 18: `phone: phoneSchema.optional()` — landline optional
- Line 19: `mobile_phone: phoneSchema` — mobile required (no .optional())
- Line 22: `preferred_contact: z.enum(['email', 'sms', 'phone']).default('sms')` — includes 'phone'
- Line 26: clientUpdateSchema uses .partial() to make updates flexible

**Form Component (client-step.tsx):**
- Lines 227-235: `validateMobilePhone` function with French error message "Le numéro mobile/SMS est requis"
- Lines 216-225: `validatePhone` checks format only if value provided (no required check)
- Lines 275-287: `handleMobilePhoneChange` with real-time validation
- Lines 728-776: Form fields properly ordered (Mobile/SMS Row 2, Phone Row 3)
- Line 734: Label "Mobile/SMS *" with asterisk
- Line 784: Label "Téléphone fixe (optionnel)" without asterisk
- Line 849: Dropdown option `<option value='phone'>📞 Téléphone</option>`
- Lines 360-363: Form validation blocks submission if mobile_phone invalid
- Lines 402-406: Database insert includes mobile_phone and preferred_contact

**API Route (intake/route.ts):**
- Line 106: `mobile_phone: client.mobile_phone || null` in client insert
- Line 108: `preferred_contact: client.preferred_contact || 'sms'` in client insert

### Level 3: Wired

All key connections verified:

**ClientCreate Type Flow:**
- client-step.tsx imports ClientCreate from dto.ts (line 6)
- formData state typed as ClientCreate (line 46)
- Ensures form structure matches schema definition

**Database Insert Flow:**
- client-step.tsx line 402: mobile_phone passed to supabase insert
- client-step.tsx line 405: preferred_contact passed to supabase insert
- intake/route.ts line 106-108: API also inserts mobile_phone and preferred_contact

**Validation Flow:**
- dto.ts clientCreateSchema defines mobile_phone as required
- intakeRequestSchema (line 88-95) uses clientCreateSchema for client validation
- API inherits validation from schema definitions

**Search Flow:**
- client-step.tsx line 303: SELECT includes mobile_phone field
- Line 306: WHERE clause searches mobile_phone with .ilike
- No NOT NULL filters — existing clients with missing data remain searchable

### TypeScript Compilation

```bash
npx tsc --noEmit
# Exit code: 0 (success)
# No errors or warnings
```

All type definitions consistent across dto.ts, client-step.tsx, and intake route.

---

## Summary

**All 6 must-haves verified.** Phase 17 goal fully achieved.

**Evidence-based verification:**
- Mobile/SMS field is required (Zod schema enforces, UI validates, form blocks submission)
- Email field remains required (existing behavior maintained)
- Landline phone is optional (schema uses .optional(), UI shows "optionnel", validation only checks format if provided)
- Preferred contact dropdown includes "📞 Téléphone" option (line 849)
- Selecting "phone" persists to database (migration allows 'phone', API saves value)
- Existing clients with missing fields remain searchable (search queries don't filter by NOT NULL)

**No blockers found.** All implementations substantive and properly wired.

**Human verification recommended** for UX validation (error messages, form layout, database persistence) but automated structural verification confirms all code exists and is connected correctly.

---

_Verified: 2026-02-04T21:00:00Z_
_Verifier: Claude (gsd-verifier)_
