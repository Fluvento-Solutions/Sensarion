import bcrypt from 'bcryptjs';

/**
 * Password Service
 * 
 * Verwaltet Password-Hashing und -Verification
 */
export class PasswordService {
  private readonly SALT_ROUNDS = 10;
  
  /**
   * Hasht ein Passwort
   */
  async hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }
  
  /**
   * Verifiziert ein Passwort
   */
  async verify(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}

