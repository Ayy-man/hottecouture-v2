export enum UserRole {
  OWNER = 'owner',
  SEAMSTRESS = 'seamstress',
  CUSTOM = 'custom',
  CLERK = 'clerk',
}

export type UserRoleType = keyof typeof UserRole

export const USER_ROLES = Object.values(UserRole)

export function isValidRole(role: string): role is UserRole {
  return USER_ROLES.includes(role as UserRole)
}

export function getRoleDisplayName(role: UserRole): string {
  switch (role) {
    case UserRole.OWNER:
      return 'Owner'
    case UserRole.SEAMSTRESS:
      return 'Seamstress'
    case UserRole.CUSTOM:
      return 'Custom'
    case UserRole.CLERK:
      return 'Clerk'
    default:
      return 'Unknown'
  }
}

export function getRoleDescription(role: UserRole): string {
  switch (role) {
    case UserRole.OWNER:
      return 'Full access to all features and settings'
    case UserRole.SEAMSTRESS:
      return 'Access to production and order management'
    case UserRole.CUSTOM:
      return 'Custom role with specific permissions'
    case UserRole.CLERK:
      return 'Access to customer service and basic operations'
    default:
      return 'No description available'
  }
}
