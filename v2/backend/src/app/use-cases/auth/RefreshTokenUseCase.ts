import type { IUserRepository } from '@/ports/repositories/IUserRepository';
import { JWTService } from '@/infrastructure/auth/JWTService';
import type { AuthResponseDTO } from '@/app/dto/AuthDTO';
import { UserDTO } from '@/app/dto/AuthDTO';

/**
 * Refresh Token Use Case
 * 
 * Erneuert Access Token mit Refresh Token
 */
export class RefreshTokenUseCase {
  constructor(
    private userRepository: IUserRepository,
    private jwtService: JWTService
  ) {}
  
  /**
   * Erneuert Access Token
   * 
   * @throws Error wenn Refresh Token ungültig oder User nicht gefunden
   */
  async execute(refreshToken: string): Promise<AuthResponseDTO> {
    // Verify Refresh Token
    const { userId } = this.jwtService.verifyRefreshToken(refreshToken);
    
    // Find User (tenantId wird aus DB geholt)
    // TODO: Tenant-ID sollte im Refresh Token enthalten sein
    // Für jetzt: Alle Tenants durchsuchen (ineffizient, aber funktional)
    const user = await this.findUserInAllTenants(userId);
    
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }
    
    // Generate New Tokens
    const accessToken = this.jwtService.generateAccessToken(user);
    const newRefreshToken = this.jwtService.generateRefreshToken(user);
    
    // Return DTO
    return {
      accessToken,
      refreshToken: newRefreshToken,
      user: UserDTO.fromDomain(user)
    };
  }
  
  /**
   * Findet User in allen Tenants (Placeholder)
   * TODO: Tenant-ID sollte im Refresh Token enthalten sein
   */
  private async findUserInAllTenants(userId: string): Promise<any> {
    // Placeholder: In Production sollte tenantId im Token sein
    const { prisma } = await import('@/infrastructure/db/client');
    const user = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      include: { tenant: true }
    });
    
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }
    
    return this.userRepository.findById(userId, user.tenantId);
  }
}

