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
      res.json(token);
    } catch (error) {
      if (error instanceof Error) {
        res.status(401).json({ message: error.message }); // 401 Unauthorized for bad credentials
      } else {
        res.status(500).json({ message: 'An unexpected error occurred' });
      }
    }
  }
}