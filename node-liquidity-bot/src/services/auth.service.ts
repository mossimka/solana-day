import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';

export class AuthService {
  constructor(private userRepository: Repository<User>) {}

  async register(username: string, password: string): Promise<Omit<User, 'password'>> {
    const existingUser = await this.userRepository.findOne({ where: { username } });
    if (existingUser) {
      throw new Error('Username already exists');
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const newUser = this.userRepository.create({
      username,
      password: hashedPassword,
    });
    await this.userRepository.save(newUser);

    const { password: _, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
  }

  async login(username: string, password: string): Promise<{ accessToken: string; refreshToken: string; user: Omit<User, 'password'> }> {
    const user = await this.userRepository.findOne({ where: { username } });
    if (!user) {
      throw new Error('Invalid username or password');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid username or password');
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('Server configuration error: JWT_SECRET is not set.');
    }
    
    const refreshSecret = process.env.JWT_REFRESH_SECRET || jwtSecret;

    // Generate access token (short-lived, 15 minutes)
    const accessPayload = { userId: user.id, username: user.username, type: 'access' };
    const accessToken = jwt.sign(accessPayload, jwtSecret, { expiresIn: '15m' });

    // Generate refresh token (long-lived, 7 days)
    const refreshPayload = { userId: user.id, type: 'refresh', tokenVersion: Date.now() };
    const refreshToken = jwt.sign(refreshPayload, refreshSecret, { expiresIn: '7d' });

    // Store refresh token hash in user record for security
    const refreshTokenHash = await bcrypt.hash(refreshToken, 5);
    await this.userRepository.update(user.id, { refreshTokenHash });

    // Return user info along with tokens
    const { password: _, refreshTokenHash: __, ...userWithoutPassword } = user;
    return { accessToken, refreshToken, user: userWithoutPassword };
  }

  async logout(userId: number): Promise<void> {
    // Invalidate refresh token by clearing it from the database
    await this.userRepository.update(userId, { refreshTokenHash: undefined });
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('Server configuration error: JWT_SECRET is not set.');
    }
    
    const refreshSecret = process.env.JWT_REFRESH_SECRET || jwtSecret;

    try {
      // Verify the refresh token
      const decoded = jwt.verify(refreshToken, refreshSecret) as any;
      
      // Check if it's a refresh token
      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      // Get user from database
      const user = await this.userRepository.findOne({ where: { id: decoded.userId } });
      if (!user || !user.refreshTokenHash) {
        throw new Error('User not found or no refresh token');
      }

      // Verify the refresh token matches the stored hash
      const isValidRefreshToken = await bcrypt.compare(refreshToken, user.refreshTokenHash);
      if (!isValidRefreshToken) {
        throw new Error('Invalid refresh token');
      }

      // Generate new access token
      const accessPayload = { userId: user.id, username: user.username, type: 'access' };
      const newAccessToken = jwt.sign(accessPayload, jwtSecret, { expiresIn: '15m' });

      // Generate new refresh token
      const refreshPayload = { userId: user.id, type: 'refresh', tokenVersion: Date.now() };
      const newRefreshToken = jwt.sign(refreshPayload, refreshSecret, { expiresIn: '7d' });

      // Update refresh token hash in database
      const newRefreshTokenHash = await bcrypt.hash(newRefreshToken, 5);
      await this.userRepository.update(user.id, { refreshTokenHash: newRefreshTokenHash });

      return { accessToken: newAccessToken, refreshToken: newRefreshToken };
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }
}