"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const jwt = __importStar(require("jsonwebtoken"));
class AuthController {
    constructor(authService) {
        this.authService = authService;
    }
    async register(req, res) {
        try {
            const { username, password } = req.body;
            if (!username || !password) {
                return res.status(400).json({ message: 'Username and password are required' });
            }
            const user = await this.authService.register(username, password);
            res.status(201).json(user);
        }
        catch (error) {
            if (error instanceof Error) {
                res.status(409).json({ message: error.message }); // 409 Conflict for existing user
            }
            else {
                res.status(500).json({ message: 'An unexpected error occurred' });
            }
        }
    }
    async login(req, res) {
        try {
            const { username, password } = req.body;
            if (!username || !password) {
                return res.status(400).json({ message: 'Username and password are required' });
            }
            const tokens = await this.authService.login(username, password);
            // Set both tokens as httpOnly cookies for maximum security
            res.cookie('accessToken', tokens.accessToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 15 * 60 * 1000 // 15 minutes
            });
            res.cookie('refreshToken', tokens.refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
            });
            // Return only user info (no tokens in response body)
            res.json({
                message: 'Login successful',
                user: tokens.user
            });
        }
        catch (error) {
            if (error instanceof Error) {
                res.status(401).json({ message: error.message }); // 401 Unauthorized for bad credentials
            }
            else {
                res.status(500).json({ message: 'An unexpected error occurred' });
            }
        }
    }
    async logout(req, res) {
        try {
            const refreshToken = req.cookies.refreshToken;
            if (refreshToken) {
                try {
                    // Decode refresh token to get user ID and invalidate it
                    const refreshSecret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
                    const decoded = jwt.verify(refreshToken, refreshSecret);
                    if (decoded.userId) {
                        await this.authService.logout(decoded.userId);
                    }
                }
                catch (error) {
                    // If token is invalid, just continue with clearing cookies
                    console.error('Error invalidating refresh token:', error);
                }
            }
            // Clear both httpOnly cookies
            res.clearCookie('accessToken');
            res.clearCookie('refreshToken');
            res.json({ message: 'Logged out successfully' });
        }
        catch (error) {
            if (error instanceof Error) {
                res.status(500).json({ message: error.message });
            }
            else {
                res.status(500).json({ message: 'An unexpected error occurred' });
            }
        }
    }
    async refresh(req, res) {
        try {
            const refreshToken = req.cookies.refreshToken;
            if (!refreshToken) {
                return res.status(401).json({ message: 'Refresh token not found' });
            }
            const tokens = await this.authService.refreshToken(refreshToken);
            // Set new tokens as httpOnly cookies
            res.cookie('accessToken', tokens.accessToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 15 * 60 * 1000 // 15 minutes
            });
            res.cookie('refreshToken', tokens.refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
            });
            // Return success message (no tokens in response body)
            res.json({ message: 'Tokens refreshed successfully' });
        }
        catch (error) {
            // Clear invalid refresh token cookie
            res.clearCookie('refreshToken');
            res.clearCookie('accessToken');
            if (error instanceof Error) {
                res.status(401).json({ message: error.message });
            }
            else {
                res.status(500).json({ message: 'An unexpected error occurred' });
            }
        }
    }
}
exports.AuthController = AuthController;
