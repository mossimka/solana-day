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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const bcrypt = __importStar(require("bcrypt"));
const jwt = __importStar(require("jsonwebtoken"));
class AuthService {
    constructor(userRepository) {
        this.userRepository = userRepository;
    }
    async register(username, password) {
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
        const { password: _ } = newUser, userWithoutPassword = __rest(newUser, ["password"]);
        return userWithoutPassword;
    }
    async login(username, password) {
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
        const { password: _, refreshTokenHash: __ } = user, userWithoutPassword = __rest(user, ["password", "refreshTokenHash"]);
        return { accessToken, refreshToken, user: userWithoutPassword };
    }
    async logout(userId) {
        // Invalidate refresh token by clearing it from the database
        await this.userRepository.update(userId, { refreshTokenHash: undefined });
    }
    async refreshToken(refreshToken) {
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            throw new Error('Server configuration error: JWT_SECRET is not set.');
        }
        const refreshSecret = process.env.JWT_REFRESH_SECRET || jwtSecret;
        try {
            // Verify the refresh token
            const decoded = jwt.verify(refreshToken, refreshSecret);
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
        }
        catch (error) {
            throw new Error('Invalid or expired refresh token');
        }
    }
}
exports.AuthService = AuthService;
