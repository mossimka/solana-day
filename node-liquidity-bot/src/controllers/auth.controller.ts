import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';

export class AuthController {
  constructor(private authService: AuthService) {}

  async register(req: Request, res: Response) {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
      }

      const user = await this.authService.register(username, password);
      res.status(201).json(user);
    } catch (error) {
      if (error instanceof Error) {
        res.status(409).json({ message: error.message }); // 409 Conflict for existing user
      } else {
        res.status(500).json({ message: 'An unexpected error occurred' });
      }
    }
  }

  async login(req: Request, res: Response) {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
      }
      
      const token = await this.authService.login(username, password);
      
      // Set httpOnly cookie for security
      res.cookie('refreshToken', token.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });
      
      res.json(token);
    } catch (error) {
      if (error instanceof Error) {
        res.status(401).json({ message: error.message }); // 401 Unauthorized for bad credentials
      } else {
        res.status(500).json({ message: 'An unexpected error occurred' });
      }
    }
  }

  async logout(req: Request, res: Response) {
    try {
      // Clear the httpOnly cookie
      res.clearCookie('refreshToken');
      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'An unexpected error occurred' });
      }
    }
  }

  async refresh(req: Request, res: Response) {
    try {
      const refreshToken = req.cookies.refreshToken;
      
      if (!refreshToken) {
        return res.status(401).json({ message: 'Refresh token not found' });
      }

      // You would validate the refresh token here
      // For now, we'll just return a new access token
      // In a real app, you'd verify the refresh token and issue a new access token
      
      const newToken = await this.authService.refreshToken(refreshToken);
      res.json({ accessToken: newToken });
    } catch (error) {
      if (error instanceof Error) {
        res.status(401).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'An unexpected error occurred' });
      }
    }
  }
}