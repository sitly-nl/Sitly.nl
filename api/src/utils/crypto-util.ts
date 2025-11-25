import * as crypto from 'crypto';

export class CryptoUtil {
    static encryptIv(text: string, secret: string) {
        const iv = crypto.randomBytes(16);
        const key = crypto.createHash('sha256').update(String(secret)).digest('base64').substring(0, 32);

        const cipher = crypto.createCipheriv('aes-256-ctr', key, iv);
        let encrypted = cipher.update(text, 'utf8', 'base64url');
        encrypted += cipher.final('base64url');

        return iv.toString('base64url') + encrypted;
    }

    static decryptIv(encrypted: string, secret: string) {
        if (encrypted.length <= 22) {
            return undefined;
        }

        const iv = encrypted.slice(0, 22);
        const content = encrypted.slice(22);
        const key = crypto.createHash('sha256').update(String(secret)).digest('base64').substring(0, 32);
        const decipher = crypto.createDecipheriv('aes-256-ctr', key, Buffer.from(iv, 'base64url'));

        const decrypted = decipher.update(content, 'base64url', 'utf8');
        return decrypted + decipher.final('utf8');
    }

    static encryptPassword(password: string, salt: string) {
        const sha1 = crypto
            .createHash('sha1')
            .update(salt + password)
            .digest('hex');
        return crypto.createHash('md5').update(sha1).digest('hex');
    }

    static generateHmac(data: string, secret: string) {
        const hmac = crypto.createHmac('sha256', secret);
        return hmac.update(data).digest('hex');
    }
}
