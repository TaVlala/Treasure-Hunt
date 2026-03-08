// Shared user types used by both the mobile app and admin panel.
// Keep these in sync with the Prisma schema in apps/server/prisma/schema.prisma.

export type UserRole = 'admin' | 'player';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  displayName: string;
  avatarUrl: string | null;
  homeCity: string | null;
  createdAt: string;
}

// Returned from login/register — never includes password
export interface AuthUser extends User {
  accessToken: string;
}
