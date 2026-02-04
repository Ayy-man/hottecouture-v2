# Phase 17: Contact Field Validation - Research

**Researched:** 2026-02-04
**Domain:** Form validation, database migrations, backward compatibility
**Confidence:** HIGH

## Summary

Phase 17 requires making SMS (mobile_phone) and Email both mandatory fields while adding landline phone as an optional contact preference. The current codebase uses Zod for validation with phone (required) and email (required) already enforced in the DTO layer, but the database schema allows NULL values. A mobile_phone field already exists (added in migration 0035) but is optional.

The key challenge is implementing a backward-compatible migration that enforces new validation rules while preserving access to existing client records that lack SMS/email data. This requires a multi-layer validation strategy: mandatory validation for NEW clients, permissive validation for EXISTING clients, and clear UI feedback distinguishing between complete and incomplete records.

**Primary recommendation:** Implement validation at the application layer (Zod schemas + React forms) rather than database constraints, use separate schemas for create vs update/read operations, and add UI indicators for clients missing required fields.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Zod | ^3.22.0 | Schema validation | Already in use, TypeScript-first, runtime type safety |
| React (Next.js) | Latest | UI framework | Project foundation |
| Supabase/PostgreSQL | Latest | Database | Project data layer |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @supabase/supabase-js | ^2.39.0 | Database client | All database operations |
| TypeScript | Latest | Type safety | Compile-time validation |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Zod | Yup | Less TypeScript-native, more verbose |
| Zod | Joi | Server-side focused, less type inference |
| Application-layer validation | Database constraints | Would break existing clients, no graceful degradation |

**Installation:**
No new packages needed - Zod already installed.

## Architecture Patterns

### Recommended Validation Structure
```
src/
├── lib/
│   ├── dto.ts                    # Zod schemas (create vs read)
│   └── clients/
│       ├── client-types.ts       # Type definitions
│       └── client-service.ts     # Business logic
├── components/
│   └── intake/
│       └── client-step.tsx       # Form with real-time validation
└── supabase/
    └── migrations/
        └── 00XX_*.sql            # Optional: add check constraints
```

### Pattern 1: Separate Schemas for Create vs Read
**What:** Different Zod schemas for creating new records vs reading existing ones
**When to use:** When validation rules change and backward compatibility is needed
**Example:**
```typescript
// Source: Current codebase analysis + Zod best practices

// FOR NEW CLIENTS - Strict validation
export const clientCreateSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(100),
  last_name: z.string().min(1, 'Last name is required').max(100),
  phone: phoneSchema, // REQUIRED (landline/primary)
  mobile_phone: phoneSchema.min(1, 'Mobile/SMS number is required'), // NOW REQUIRED
  email: emailSchema, // REQUIRED
  language: z.enum(['fr', 'en']).default('fr'),
  preferred_contact: z.enum(['email', 'sms', 'phone']).default('sms'), // ADD 'phone'
  newsletter_consent: z.boolean().default(false),
});

// FOR EXISTING CLIENTS - Permissive validation
export const clientReadSchema = z.object({
  // ... same fields but mobile_phone and email are optional
  mobile_phone: phoneSchema.optional().nullable(),
  email: emailSchema.optional().nullable(),
  // ... allows reading legacy data
});

// FOR UPDATES - Conditional validation
export const clientUpdateSchema = clientCreateSchema
  .partial()
  .refine(
    (data) => {
      // If updating contact fields, enforce completeness
      if (data.mobile_phone || data.email) {
        return data.mobile_phone && data.email;
      }
      return true;
    },
    {
      message: 'Both mobile phone and email are required',
    }
  );
```

### Pattern 2: UI Validation with Visual Feedback
**What:** Real-time form validation with clear required field indicators
**When to use:** All user-facing forms where data completeness matters
**Example:**
```typescript
// Source: React Hook Form + Zod integration patterns 2026

// In client-step.tsx
const validateMobilePhone = (phone: string): string | null => {
  if (!phone.trim()) {
    return 'Mobile/SMS number is required for notifications';
  }
  if (!/^\+?[\d\s\-\(\)]+$/.test(phone.trim())) {
    return 'Invalid phone number format';
  }
  return null;
};

// Real-time validation
const handleMobilePhoneChange = (value: string) => {
  setFormData(prev => ({ ...prev, mobile_phone: value }));
  const error = validateMobilePhone(value);
  setErrors(prev => {
    const newErrors = { ...prev };
    if (error) {
      newErrors.mobile_phone = error;
    } else {
      delete newErrors.mobile_phone;
    }
    return newErrors;
  });
};
```

### Pattern 3: Preferred Contact Options
**What:** Extend preferred_contact enum to include 'phone' (landline)
**When to use:** When clients prefer voice calls to SMS/email
**Implementation:**
```sql
-- Migration: Update enum type
ALTER TYPE preferred_contact ADD VALUE IF NOT EXISTS 'phone';

-- Update client table comment
COMMENT ON COLUMN client.preferred_contact IS
  'Preferred method of communication: email, sms, or phone (landline)';
```

```typescript
// Update Zod schema
preferred_contact: z.enum(['email', 'sms', 'phone']).default('sms')

// Update UI select options
<select id='preferredContact' value={formData.preferred_contact}>
  <option value='email'>📧 Email</option>
  <option value='sms'>💬 SMS</option>
  <option value='phone'>📞 Téléphone</option>
</select>
```

### Pattern 4: Backward Compatibility UI Indicators
**What:** Show visual indicators for clients with incomplete contact info
**When to use:** When displaying existing clients who lack required fields
**Example:**
```typescript
// In client display components
function ClientContactStatus({ client }: { client: ClientProfile }) {
  const hasCompleteContact = client.mobile_phone && client.email;

  if (!hasCompleteContact) {
    return (
      <div className="flex items-center gap-1 text-xs text-amber-600">
        <span>⚠️</span>
        <span>Contact info incomplete</span>
      </div>
    );
  }
  return null;
}
```

### Anti-Patterns to Avoid
- **Adding NOT NULL constraints to database**: Would break existing clients, preventing order retrieval
- **Retroactive data validation**: Don't block access to existing clients missing fields
- **Single validation schema**: Need separate create/read schemas for backward compatibility
- **Silent validation failures**: Always show users WHY a field is required

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Phone number validation | Custom regex | Zod phoneSchema + format validation | Handles international formats, edge cases |
| Email validation | Custom regex | Zod emailSchema | RFC-compliant validation |
| Form state management | Custom useState hooks | Existing pattern in client-step.tsx | Already working, consistent |
| Migration patterns | One-step NOT NULL | Expand-migrate-contract pattern | Allows rollback, zero downtime |

**Key insight:** Backward compatibility in database migrations requires multi-step approaches: first add optional fields, then migrate data/update apps, finally add constraints. Never go straight to NOT NULL with existing nullable data.

## Common Pitfalls

### Pitfall 1: Database Constraint Without Data Migration
**What goes wrong:** Adding NOT NULL constraints breaks queries for existing clients
**Why it happens:** Assumption that validation = database constraint
**How to avoid:** Keep database permissive, enforce validation at application layer only
**Warning signs:** Existing order retrieval fails, client search returns errors

### Pitfall 2: Single Schema for All Operations
**What goes wrong:** Can't read existing clients OR can't enforce rules for new ones
**Why it happens:** Using clientCreateSchema for both create and read operations
**How to avoid:** Create separate schemas: clientCreateSchema (strict), clientReadSchema (permissive)
**Warning signs:** Zod validation errors when loading existing clients, or no validation on new clients

### Pitfall 3: Confusing phone vs mobile_phone
**What goes wrong:** User enters landline in mobile_phone field, SMS fails
**Why it happens:** Field labels unclear about landline vs mobile distinction
**How to avoid:** Clear labels: "Téléphone (principal)" for phone, "Mobile/SMS (pour notifications)" for mobile_phone
**Warning signs:** User reports SMS not received, mobile_phone contains landline numbers

### Pitfall 4: Enum Migration Without IF NOT EXISTS
**What goes wrong:** Migration fails if 'phone' value already exists in enum
**Why it happens:** Re-running migrations or manual enum updates
**How to avoid:** Always use `ALTER TYPE ... ADD VALUE IF NOT EXISTS 'phone'`
**Warning signs:** Migration error on deploy, enum constraint violations

### Pitfall 5: Required Field Without Default/Migration
**What goes wrong:** Existing clients can't be updated because mobile_phone is now required
**Why it happens:** Making optional field required without data backfill strategy
**How to avoid:** Either keep field optional at DB level OR provide migration path to populate
**Warning signs:** Update operations fail for old clients, admin panel errors

## Code Examples

Verified patterns from codebase and best practices:

### Updating DTO Schemas
```typescript
// Source: /src/lib/dto.ts (current + modifications needed)

// BEFORE (current)
export const clientCreateSchema = z.object({
  phone: phoneSchema, // Required
  mobile_phone: phoneSchema.optional(), // Optional
  email: emailSchema, // Required
  preferred_contact: z.enum(['email', 'sms']).default('sms'),
});

// AFTER (Phase 17)
export const clientCreateSchema = z.object({
  phone: phoneSchema, // Required - landline/primary
  mobile_phone: phoneSchema.min(1, 'Mobile number required for SMS'), // NOW REQUIRED
  email: emailSchema, // Required (already was)
  preferred_contact: z.enum(['email', 'sms', 'phone']).default('sms'), // ADD 'phone'
  newsletter_consent: z.boolean().default(false),
});

// Add permissive read schema
export const clientReadSchema = clientCreateSchema.extend({
  mobile_phone: phoneSchema.optional().nullable(),
  email: emailSchema.optional().nullable(),
  // Allows reading clients missing these fields
});
```

### Form Validation in React
```typescript
// Source: /src/components/intake/client-step.tsx (modification needed)

// Add mobile_phone validation
const validateMobilePhone = (phone: string): string | null => {
  if (!phone || !phone.trim()) {
    return 'Numéro mobile requis pour les notifications SMS';
  }
  if (!/^\+?[\d\s\-\(\)]+$/.test(phone.trim())) {
    return 'Format de numéro invalide';
  }
  return null;
};

const handleMobilePhoneChange = (value: string) => {
  setFormData(prev => ({ ...prev, mobile_phone: value }));
  const error = validateMobilePhone(value);
  setErrors(prev => {
    const newErrors = { ...prev };
    if (error) {
      newErrors.mobile_phone = error;
    } else {
      delete newErrors.mobile_phone;
    }
    return newErrors;
  });
};

// In JSX - update mobile_phone field
<div>
  <label htmlFor='mobile_phone' className='block text-xs font-medium mb-1'>
    Mobile/SMS <span className='text-red-500'>*</span>
  </label>
  <input
    id='mobile_phone'
    type='tel'
    required
    value={formData.mobile_phone || ''}
    onChange={e => handleMobilePhoneChange(e.target.value)}
    className={`w-full px-3 py-2 border rounded-md ${
      errors.mobile_phone ? 'border-red-500' : 'border-border'
    }`}
    placeholder='+1 (555) 123-4567'
  />
  {errors.mobile_phone && (
    <p className='text-red-500 text-xs mt-1'>{errors.mobile_phone}</p>
  )}
  <p className='text-xs text-muted-foreground mt-1'>
    Requis pour les notifications SMS
  </p>
</div>

// Update preferred_contact options
<select id='preferredContact' value={formData.preferred_contact}>
  <option value='email'>📧 Email</option>
  <option value='sms'>💬 SMS</option>
  <option value='phone'>📞 Téléphone</option>
</select>
```

### Database Migration (Optional Enhancement)
```sql
-- Source: Backward-compatible migration patterns
-- Migration: 00XX_add_landline_contact_option.sql

-- Step 1: Add 'phone' to enum (safe - doesn't affect existing data)
ALTER TYPE preferred_contact ADD VALUE IF NOT EXISTS 'phone';

-- Step 2: Update column comments for clarity
COMMENT ON COLUMN client.phone IS
  'Primary phone number (may be landline or mobile)';
COMMENT ON COLUMN client.mobile_phone IS
  'Mobile phone number specifically for SMS notifications (required for new clients)';
COMMENT ON COLUMN client.preferred_contact IS
  'Preferred method of communication: email, sms, or phone (landline)';

-- DO NOT add NOT NULL constraints - keep backward compatibility
-- Application layer handles validation for new records
```

### Client Display with Status Indicator
```typescript
// For displaying existing clients with incomplete data

function ClientCard({ client }: { client: ClientProfile }) {
  const missingFields = [];
  if (!client.mobile_phone) missingFields.push('Mobile/SMS');
  if (!client.email) missingFields.push('Email');

  return (
    <div className="border rounded p-3">
      <div className="font-medium">
        {client.first_name} {client.last_name}
      </div>

      {missingFields.length > 0 && (
        <div className="flex items-center gap-1 mt-1 text-xs text-amber-600">
          <span>⚠️</span>
          <span>Manquant: {missingFields.join(', ')}</span>
        </div>
      )}

      <div className="text-sm text-muted-foreground mt-1">
        {client.phone && <div>📞 {client.phone}</div>}
        {client.mobile_phone && <div>📱 {client.mobile_phone}</div>}
        {client.email && <div>📧 {client.email}</div>}
      </div>
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Database constraints for validation | Application-layer validation (Zod) | ~2020-2022 | More flexible, better error messages, allows graceful degradation |
| Single validation schema | Separate create/read schemas | Recent (2024+) | Backward compatibility, progressive enhancement |
| Phone only | Phone + mobile_phone separation | Migration 0035 | Enables SMS vs voice distinction |
| Regex validation | Zod schema validation | Already adopted | Type safety, better DX |

**Deprecated/outdated:**
- Direct NOT NULL constraints without migration path: Modern practice uses expand-migrate-contract
- Single enum type without extensibility: PostgreSQL allows safe enum extension with IF NOT EXISTS
- Form validation without real-time feedback: 2026 standard is immediate validation with clear messages

## Open Questions

Things that couldn't be fully resolved:

1. **Data Quality for Existing Clients**
   - What we know: 100+ existing clients may lack mobile_phone or complete email
   - What's unclear: Should we proactively reach out to complete their data?
   - Recommendation: Add admin panel report showing clients with incomplete contact info, let staff update gradually

2. **SMS Provider Integration**
   - What we know: SMS handled externally via N8N workflows, mobile_phone field ready
   - What's unclear: Does N8N handle validation, or do we need fallback logic?
   - Recommendation: Test N8N workflow with edge cases, ensure graceful failure if mobile_phone missing

3. **Preferred Contact Logic**
   - What we know: New option 'phone' (landline) will be added
   - What's unclear: Should system auto-select based on available fields?
   - Recommendation: Default to 'sms' if mobile_phone present, otherwise 'email', allow manual override

4. **Migration Timeline**
   - What we know: Need to support existing clients indefinitely
   - What's unclear: Is there a deadline to backfill missing data?
   - Recommendation: No forced deadline, use UI warnings to encourage completion

## Sources

### Primary (HIGH confidence)
- Codebase analysis:
  - `/src/lib/dto.ts` - Current Zod schemas
  - `/src/components/intake/client-step.tsx` - Current form implementation
  - `/supabase/migrations/0001_init.sql` - Original schema
  - `/supabase/migrations/0035_add_mobile_phone_to_client.sql` - Mobile phone addition
  - `/src/lib/clients/client-types.ts` - Type definitions and validation
- [Zod Official Documentation](https://zod.dev/api) - Schema validation patterns

### Secondary (MEDIUM confidence)
- [React Hook Form with Zod: Complete Guide for 2026](https://dev.to/marufrahmanlive/react-hook-form-with-zod-complete-guide-for-2026-1em1) - Current best practices
- [Form Validation In TypeScript Using Zod and React Hook Form](https://strapi.io/blog/form-validation-in-typescipt-projects-using-zod-and-react-hook-form) - Validation patterns
- [Backward compatible database changes — PlanetScale](https://planetscale.com/blog/backward-compatible-databases-changes) - Migration patterns
- [Database Design Patterns for Ensuring Backward Compatibility](https://www.pingcap.com/article/database-design-patterns-for-ensuring-backward-compatibility/) - Expand-migrate-contract pattern

### Tertiary (LOW confidence)
- [Understanding Zod Schema Validation with Optional Fields | Medium](https://joodi.medium.com/understanding-zod-schema-validation-with-optional-fields-db4f982f8cec) - Optional field patterns
- [One Source of Truth: Deriving Required Fields from Zod | Keyhole Software](https://keyholesoftware.com/inferring-fields-zod-with-react-hook-form/) - UI generation from schemas

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Zod already in use, patterns established in codebase
- Architecture: HIGH - Based on existing codebase patterns plus industry best practices
- Pitfalls: HIGH - Common migration pitfalls well-documented, backward compatibility critical

**Research date:** 2026-02-04
**Valid until:** ~60 days (stable domain, schemas unlikely to change rapidly)

## Key Recommendations for Planner

1. **Validation Layer Strategy**: Implement at application layer (Zod) NOT database constraints
2. **Schema Separation**: Create separate clientCreateSchema (strict) and clientReadSchema (permissive)
3. **UI Clarity**: Make mobile_phone required with clear label explaining SMS purpose
4. **Backward Compatibility**: Existing clients remain viewable/usable even with incomplete data
5. **Progressive Enhancement**: Add UI warnings for incomplete clients, don't block access
6. **Enum Extension**: Safe to add 'phone' to preferred_contact enum with IF NOT EXISTS
7. **Testing Focus**: Verify existing client workflows still work after changes
