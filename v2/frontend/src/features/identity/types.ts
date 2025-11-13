export interface User {
  id: string;
  email: string;
  displayName: string;
  tenantId: string;
  roles: string[];
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

