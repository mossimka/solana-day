import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: string | jwt.JwtPayload;
}

export const authMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Try to get token from cookie first, then fallback to Authorization header
    let token = req.cookies.accessToken;
    
    // Fallback to Authorization header for compatibility
    if (!token) {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        }
    }

    if (!token) {
        return res.status(401).json({ message: 'Unauthorized: No access token found.' });
    }

    try {
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            console.error("CRITICAL: JWT_SECRET is not defined in .env file!");
            return res.status(500).json({ message: 'Server configuration error.' });
        }
        
        const decoded = jwt.verify(token, jwtSecret) as any;
        
        // Ensure this is an access token, not a refresh token
        if (decoded.type && decoded.type !== 'access') {
            return res.status(403).json({ message: 'Forbidden: Invalid token type.' });
        }
        
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ message: 'Forbidden: Invalid token.' });
    }
};