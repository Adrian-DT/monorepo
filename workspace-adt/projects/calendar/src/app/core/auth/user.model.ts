export type UserRole = 'USER' | 'ADMIN';

export interface User {
  id: string;
  username: string;
  displayName: string;
  email: string;
  role: UserRole;
  active: boolean;
}
