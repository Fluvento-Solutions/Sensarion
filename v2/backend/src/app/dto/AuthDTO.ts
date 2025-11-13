import type { User } from '@/domain/entities/User';

/**
 * Login DTO
 */
export interface LoginDTO {
  email: string;
  password: string;
}

/**
 * Auth Response DTO
 */
export interface AuthResponseDTO {
  accessToken: string;
  refreshToken: string;
  user: UserDTO;
}

/**
 * User DTO
 */
export interface UserDTO {
  id: string;
  email: string;
  displayName: string;
  tenantId: string;
  roles: string[];
}

export class UserDTO {
  /**
   * Konvertiert Domain-Entity zu DTO
   */
  static fromDomain(user: User): UserDTO {
    return {
      id: user.id as string,
      email: user.email.value,
      displayName: user.displayName,
      tenantId: user.tenantId as string,
      roles: [...user.roles]
    };
  }
}

