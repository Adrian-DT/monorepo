export type UserRole = 'USER' | 'ADMIN';

export interface User {
  id: string;
  username: string;
  displayName: string;
  email: string;
  role: UserRole;
  active: boolean;
}

export interface UserSummary {
  id: string;
  username: string;
  displayName: string;
}

export interface UserRequest {
  username: string;
  displayName: string;
  email: string;
  role: UserRole;
}

export interface CreateUserResult {
  user: User;
  invitationSent: boolean;
}

export interface InvitationResult {
  invitationSent: boolean;
}
