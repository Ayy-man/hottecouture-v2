# Database Setup

This directory contains the database migrations and setup scripts for the Hotte Couture application.

## 📁 Structure

```
supabase/
├── migrations/
│   ├── 0001_init.sql                        # Initial database schema
│   ├── 0002-0019_*.sql                      # Feature migrations
│   ├── 0020_fix_get_orders_with_details.sql # Optimized orders RPC function
│   └── 20240101_performance_indexes.sql     # Performance indexes
├── scripts/
│   ├── setup-storage.sql                    # Storage bucket setup
│   └── setup-storage-policies.sql           # Storage RLS policies
└── README.md                                # This file
```

## 🗄️ Database Schema

### Core Tables

- **client**: Customer information and contact details
- **order**: Orders with pricing, status, and tracking
- **garment**: Individual garments within orders
- **service**: Available services and pricing
- **garment_service**: Junction table linking garments to services
- **task**: Work tasks and time tracking
- **price_list**: Pricing configurations
- **document**: File attachments and documents
- **event_log**: Audit trail and activity logging

### Key Features

- **UUID Primary Keys**: All tables use UUID primary keys for better security
- **Generated Columns**: Balance due is automatically calculated
- **JSONB Support**: Flexible data storage for notes and metadata
- **Row Level Security**: Enabled on all tables for data protection
- **Comprehensive Indexing**: Optimized for common query patterns

## 🚀 Setup Instructions

### 1. Run Database Migration

1. Open your Supabase project dashboard
2. Go to SQL Editor
3. Copy and paste the contents of `migrations/0001_init.sql`
4. Execute the script

### 2. Setup Storage Buckets

1. In the SQL Editor, run the contents of `scripts/setup-storage.sql`
2. This will create the required storage buckets and policies

### 3. Verify Setup

Check that the following are created:
- All tables with proper relationships
- Storage buckets: `photos`, `labels`, `receipts`, `docs`
- Default services and price lists
- RLS policies are active

## 📦 Storage Buckets

### Bucket Configuration

| Bucket | Purpose | Max Size | Allowed Types |
|--------|---------|----------|---------------|
| `photos` | Garment photos | 10MB | JPEG, PNG, WebP, GIF |
| `labels` | Label images | 5MB | JPEG, PNG, WebP, PDF |
| `receipts` | Receipt images | 5MB | JPEG, PNG, PDF |
| `docs` | Documents | 20MB | PDF, DOC, DOCX, TXT |

### Security

- All buckets are private (not public)
- Access requires authentication
- Signed URLs are used for file access
- RLS policies control access permissions

## 🔧 Usage

### TypeScript Integration

The application includes a `StorageService` class for easy file management:

```typescript
import { storageService } from '@/lib/storage'

// Upload a file
const file = new File([...], 'photo.jpg')
const result = await storageService.uploadFile({
  bucket: 'photos',
  path: 'garments/photo_123.jpg',
  file
})

// Get a signed URL
const url = await storageService.getSignedUrl({
  bucket: 'photos',
  path: 'garments/photo_123.jpg',
  expiresIn: 3600 // 1 hour
})
```

### Database Queries

Use the Supabase client for database operations:

```typescript
import { createClient } from '@/lib/supabase/server'

const supabase = createClient()

// Get orders with client information
const { data: orders } = await supabase
  .from('order')
  .select(`
    *,
    client:client_id(*),
    garments(*)
  `)
  .eq('status', 'pending')
```

### RPC Functions

#### `get_orders_with_details`

Optimized function to fetch orders with all related data in a single query. Used by the board page for efficient data loading.

```typescript
const { data: orders } = await supabase.rpc('get_orders_with_details', {
  p_limit: 50,
  p_offset: 0,
  p_client_id: null  // Optional: filter by client
})
```

**Returns:**
- Order details (id, order_number, status, rush, due_date, total_cents, etc.)
- Client info (first_name, last_name, phone, email)
- Garments array with nested services
- Counts (total_garments, total_services)

**Technical Notes:**
- Uses `LANGUAGE sql` (not PL/pgSQL) to avoid variable scoping issues
- Uses table aliases in subqueries to prevent ambiguous column references
- Returns JSONB for garments array for flexible nested data

## 🔒 Security Considerations

1. **Row Level Security**: All tables have RLS enabled
2. **Authentication Required**: All operations require valid authentication
3. **Private Storage**: Files are not publicly accessible
4. **Signed URLs**: Temporary access to files via signed URLs
5. **Input Validation**: Validate all inputs before database operations

## 📊 Performance

### Indexes

The migration includes indexes for:
- Foreign key relationships
- Common query patterns
- Search fields (email, phone, order number)
- Status and date filtering

### Optimization Tips

1. Use `select()` to limit returned columns
2. Add `limit()` and `offset()` for pagination
3. Use `eq()`, `gte()`, `lte()` for efficient filtering
4. Consider adding composite indexes for complex queries

## 🐛 Troubleshooting

### Common Issues

1. **RLS Policy Errors**: Ensure user is authenticated
2. **Storage Upload Fails**: Check file size and type limits
3. **Foreign Key Violations**: Verify referenced records exist
4. **Permission Denied**: Check RLS policies and user roles
5. **RPC Function "column reference is ambiguous"**: Use `LANGUAGE sql` instead of `LANGUAGE plpgsql`, and use table aliases in all subqueries
6. **RPC Function "column does not exist"**: Verify column names match the actual schema (e.g., `total_cents` not `price_cents`)

### Debug Queries

```sql
-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'client';

-- View storage buckets
SELECT * FROM storage.buckets;

-- Check table structure
\d client
```

## 🔄 Future Migrations

When adding new migrations:

1. Create new files in `migrations/` directory
2. Use sequential numbering (0002_, 0003_, etc.)
3. Include both `up` and `down` migrations if needed
4. Test migrations on a copy of production data
5. Document any breaking changes

## 📝 Notes

- All monetary values are stored in cents to avoid floating-point precision issues
- The `order` table is quoted because "order" is a reserved SQL keyword
- Generated columns (like `balance_due_cents`) are automatically calculated
- Event logging is built-in for audit trails
- The schema supports both alteration and custom work orders
