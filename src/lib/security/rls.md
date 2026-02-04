# Row Level Security (RLS) Policies

This document explains the Row Level Security policies implemented in the Hotte Couture application.

## Overview

Row Level Security (RLS) is enabled on all tables to ensure that users can only access data they are authorized to see. The policies are role-based, using JWT custom claims to determine user permissions.

## User Roles

The application supports the following roles:

- **owner**: Full access to all data and operations
- **seamstress**: Limited access to production-related data
- **custom**: Custom role with specific permissions
- **clerk**: Limited access to customer service operations

## JWT Custom Claims

User roles are stored in JWT custom claims under the `app_role` field. If no role is specified, the system defaults to `owner` for backward compatibility.

### Setting User Roles

Roles are set in the user's JWT token metadata. This can be done through:

1. **Supabase Dashboard**: User Management → Select User → Edit → Raw User Meta Data
2. **Admin API**: Update user metadata programmatically
3. **Future Admin UI**: (To be implemented)

Example JWT payload:
```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "app_role": "seamstress",
  "iat": 1234567890,
  "exp": 1234567890
}
```

## Table Policies

### Client Table (`client`)

**Policy**: `Authenticated users can manage clients`
- **Access**: All authenticated users
- **Operations**: SELECT, INSERT, UPDATE, DELETE
- **Rationale**: All staff need access to client information

### Order Table (`order`)

**Policy**: `Authenticated users can manage orders`
- **Access**: All authenticated users
- **Operations**: SELECT, INSERT, UPDATE, DELETE
- **Rationale**: All staff need access to order information

### Garment Table (`garment`)

**Policy**: `Authenticated users can manage garments`
- **Access**: All authenticated users
- **Operations**: SELECT, INSERT, UPDATE, DELETE
- **Rationale**: All staff need access to garment information

### Service Table (`service`)

**Policies**:
- `Authenticated users can read services` - All authenticated users can SELECT
- `Only owners can modify services` - Only owners can INSERT, UPDATE, DELETE

**Rationale**: Services are core business data that should only be modified by owners, but all staff need to read them.

### Garment Service Table (`garment_service`)

**Policy**: `Authenticated users can manage garment services`
- **Access**: All authenticated users
- **Operations**: SELECT, INSERT, UPDATE, DELETE
- **Rationale**: All staff need to manage service assignments

### Task Table (`task`)

**Policy**: `Authenticated users can manage tasks`
- **Access**: All authenticated users with restrictions
- **Operations**: SELECT, INSERT, UPDATE, DELETE
- **Restrictions**: 
  - Owners can access all tasks
  - Non-owners can only access tasks assigned to them
- **Rationale**: Task visibility should be limited by assignment for non-owners

### Price List Table (`price_list`)

**Policies**:
- `Authenticated users can read price lists` - All authenticated users can SELECT
- `Only owners can modify price lists` - Only owners can INSERT, UPDATE, DELETE

**Rationale**: Pricing is sensitive business data that should only be modified by owners.

### Document Table (`document`)

**Policy**: `Authenticated users can manage documents`
- **Access**: All authenticated users
- **Operations**: SELECT, INSERT, UPDATE, DELETE
- **Rationale**: All staff need access to order-related documents

### Event Log Table (`event_log`)

**Policies**:
- `Authenticated users can insert event logs` - All authenticated users can INSERT
- `Only owners can read event logs` - Only owners can SELECT

**Rationale**: Event logs are sensitive audit data that should only be viewed by owners, but all users can create log entries.

## Helper Functions

### `get_user_role()`
Returns the user's role from JWT claims, defaulting to 'owner' if not present.

### `is_owner()`
Returns true if the current user has the 'owner' role.

### `can_access_task(task_assignee)`
Returns true if the current user can access a specific task:
- Owners can access all tasks
- Non-owners can only access tasks assigned to them

## Security Considerations

### 1. JWT Token Security
- JWT tokens should be signed with a strong secret
- Tokens should have appropriate expiration times
- Role changes require token refresh

### 2. Policy Testing
- Test policies with different user roles
- Verify that users cannot access unauthorized data
- Test edge cases and boundary conditions

### 3. Performance
- RLS policies can impact query performance
- Use indexes to optimize policy evaluation
- Monitor query performance with RLS enabled

### 4. Audit Trail
- All data access is logged in the `event_log` table
- Monitor for unauthorized access attempts
- Regular security audits recommended

## Testing RLS Policies

### Manual Testing
1. Create test users with different roles
2. Verify access patterns match expected behavior
3. Test with different data scenarios

### Automated Testing
```sql
-- Test as owner
SET LOCAL "request.jwt.claims" = '{"app_role": "owner"}';
SELECT * FROM client; -- Should work

-- Test as seamstress
SET LOCAL "request.jwt.claims" = '{"app_role": "seamstress"}';
SELECT * FROM client; -- Should work
SELECT * FROM event_log; -- Should fail

-- Test task access
SET LOCAL "request.jwt.claims" = '{"app_role": "seamstress", "sub": "user-123"}';
SELECT * FROM task WHERE assignee = 'user-123'; -- Should work
SELECT * FROM task WHERE assignee = 'other-user'; -- Should fail
```

## Future Enhancements

### 1. Granular Permissions
- Add more specific permissions (e.g., can_edit_pricing, can_view_reports)
- Implement permission inheritance
- Add resource-specific permissions

### 2. Dynamic Roles
- Allow custom role creation
- Support role hierarchies
- Implement role-based workflows

### 3. Audit Improvements
- Add more detailed audit logging
- Implement real-time security monitoring
- Add security alerting

### 4. Performance Optimization
- Add policy-specific indexes
- Implement policy caching
- Optimize complex policy evaluations

## Troubleshooting

### Common Issues

1. **Policy Not Working**
   - Check if RLS is enabled on the table
   - Verify JWT claims are properly set
   - Check policy syntax and logic

2. **Performance Issues**
   - Add indexes for policy conditions
   - Simplify complex policies
   - Monitor query execution plans

3. **Access Denied Errors**
   - Verify user authentication
   - Check user role assignment
   - Review policy conditions

### Debug Queries

```sql
-- Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- List all policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE schemaname = 'public';

-- Check current user role
SELECT get_user_role();

-- Test policy conditions
SELECT is_owner();
```

## Migration Notes

When updating RLS policies:

1. **Test in Development First**
   - Create test users with different roles
   - Verify all policies work as expected
   - Test with realistic data scenarios

2. **Backup Before Changes**
   - Always backup the database before policy changes
   - Document the current policy state
   - Plan rollback procedures

3. **Gradual Rollout**
   - Consider rolling out changes gradually
   - Monitor for any access issues
   - Have a rollback plan ready

4. **User Communication**
   - Inform users of any permission changes
   - Provide training on new access patterns
   - Document any workflow changes
