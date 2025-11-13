import type { IUserRepository } from '@/ports/repositories/IUserRepository';
import { Email } from '@/domain/value-objects/Email';
import { PasswordService } from '@/infrastructure/auth/PasswordService';
import { JWTService } from '@/infrastructure/auth/JWTService';
import type { LoginDTO, AuthResponseDTO } from '@/app/dto/AuthDTO';
import { UserDTO } from '@/app/dto/AuthDTO';

/**
 * Login Use Case
 * 
 * Authentifiziert einen Benutzer und gibt JWT + Refresh Token zurück
 */
export class LoginUseCase {
  constructor(
    private userRepository: IUserRepository,
    private passwordService: PasswordService,
    private jwtService: JWTService
  ) {}
  
  /**
   * Führt Login aus
   * 
   * @throws Error wenn User nicht gefunden oder Passwort falsch
   */
  async execute(dto: LoginDTO, tenantId: string): Promise<AuthResponseDTO> {
    // Find User
    const email = Email.create(dto.email);
    const user = await this.userRepository.findByEmail(email.value, tenantId);
    
    if (!user) {
      throw new Error(`User with email ${dto.email} not found in tenant ${tenantId}`);
    }
    
    // Verify Password
    const isValid = await this.passwordService.verify(dto.password, user.passwordHash);
    if (!isValid) {
      throw new Error('Invalid password');
    }
    
    // Generate Tokens
    const accessToken = this.jwtService.generateAccessToken(user);
    const refreshToken = this.jwtService.generateRefreshToken(user);
    
    // Return DTO
    return {
      accessToken,
      refreshToken,
      user: UserDTO.fromDomain(user)
    };
  }
}

