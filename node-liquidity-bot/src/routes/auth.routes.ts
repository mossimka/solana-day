import { Router } from 'express';
import { AppDataSource } from '../config/data-source';
import { User } from '../entities/user.entity';
import { AuthService } from '../services/auth.service';
import { AuthController } from '../controllers/auth.controller';

const router = Router();

const userRepository = AppDataSource.getRepository(User);
const authService = new AuthService(userRepository);
const authController = new AuthController(authService);

router.post('/register', (req, res) => authController.register(req, res));
router.post('/login', (req, res) => authController.login(req, res));

export default router;