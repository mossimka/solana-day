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

  async login(username: string, password: string): Promise<{ accessToken: string }> {
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

    const payload = { userId: user.id, username: user.username };
    const accessToken = jwt.sign(payload, jwtSecret, { expiresIn: '1d' });

    return { accessToken };
  }

  async refreshToken(refreshToken: string): Promise<string> {
    // In a real implementation, you would:
    // 1. Verify the refresh token
    // 2. Check if it's not expired
    // 3. Generate a new access token
    
    // For now, we'll do a simple validation
    if (!refreshToken) {
      throw new Error('Invalid refresh token');
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('Server configuration error: JWT_SECRET is not set.');
    }

    try {
      // Verify the refresh token
      const decoded = jwt.verify(refreshToken, jwtSecret) as any;
      
      // Generate new access token
      const payload = { userId: decoded.userId, username: decoded.username };
      const newAccessToken = jwt.sign(payload, jwtSecret, { expiresIn: '1d' });
      
      return newAccessToken;
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }
}