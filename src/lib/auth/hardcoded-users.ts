import { UserRole } from './roles'

export interface HardcodedUser {
  id: string
  email: string
  name: string
  role: UserRole
  firstName: string
  lastName: string
}

export const HARDCODED_USERS: HardcodedUser[] = [
  {
    id: 'audrey-owner',
    email: 'audrey@hottecouture.com',
    name: 'Audrey Owner',
    firstName: 'Audrey',
    lastName: 'Owner',
    role: UserRole.OWNER
  },
  {
    id: 'solange-seamstress',
    email: 'solange@hottecouture.com',
    name: 'Solange Seamstress',
    firstName: 'Solange',
    lastName: 'Seamstress',
    role: UserRole.SEAMSTRESS
  },
  {
    id: 'audrey-anne-seamstress',
    email: 'audreyanne@hottecouture.com',
    name: 'Audrey-Anne Seamstress',
    firstName: 'Audrey-Anne',
    lastName: 'Seamstress',
    role: UserRole.SEAMSTRESS
  }
]

export function getHardcodedUserByEmail(email: string): HardcodedUser | undefined {
  return HARDCODED_USERS.find(user => user.email.toLowerCase() === email.toLowerCase())
}

export function getHardcodedUserById(id: string): HardcodedUser | undefined {
  return HARDCODED_USERS.find(user => user.id === id)
}

export function getAllHardcodedUsers(): HardcodedUser[] {
  return HARDCODED_USERS
}

// For development/testing
export function isHardcodedUser(email: string): boolean {
  return !!getHardcodedUserByEmail(email)
}