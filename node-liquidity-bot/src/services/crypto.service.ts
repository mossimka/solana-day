import * as crypto from 'crypto';

export class CryptoService {
    private readonly algorithm = 'aes-256-cbc';
    private readonly key: Buffer;

    constructor() {
        const secret = process.env.ENCRYPTION_SECRET_KEY;
        if (!secret || secret.length !== 32) {
            console.error('CRITICAL: ENCRYPTION_SECRET_KEY is not defined or is not 32 characters long.');
            throw new Error('Encryption key is misconfigured.');
        }
        this.key = Buffer.from(secret, 'utf8');
    }

    encrypt(text: string): { iv: string; encryptedData: string } {
        const iv = crypto.randomBytes(16);  
        const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return {
        iv: iv.toString('hex'),
        encryptedData: encrypted,
        };
    }

    decrypt(encryptedData: string, ivHex: string): string {
        const iv = Buffer.from(ivHex, 'hex');
        const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
        let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
}
