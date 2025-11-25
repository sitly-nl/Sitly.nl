import { User } from './models/user/user.model';
import { sign, verify } from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { BrandCode } from './models/brand-code';
import { Environment } from './services/env-settings.service';
import { genderMap } from './types';
import { GemUser } from './models/gem/gem-user.model';

export enum SitlyTokenType {
    temporary = 'temporary',
    access = 'access',
    gemAccess = 'gemAccess',
}

export interface RecommendationTokenData {
    fosterId: number;
    fosterName: string;
    fosterGender: string;
    fosterAvatar?: string;
    parentFirstName: string;
    authorId?: number;
    type?: SitlyTokenType;
}
export interface SitlyUserTokenData {
    userId: number;
    userName: string | null;
    userUrl: string;
    type?: SitlyTokenType;
}

export interface SitlyUserPasswordResetTokenData {
    email: string;
    type?: SitlyTokenType;
}

export interface GemUserTokenData {
    gemUserId: number;
    userName: string;
    type?: SitlyTokenType;
    brandCode?: BrandCode;
}

export interface TokenObject<T> {
    data: T;
    iat: number;
    jti: string;
    iss: string;
    nbf: number;
    exp: number;
}

type SitlyTokenData = RecommendationTokenData | SitlyUserTokenData | SitlyUserPasswordResetTokenData | GemUserTokenData;

export class SitlyToken {
    static tempToken(user: User, expiry: 'extraShort' | 'short' | 'default' | 'expired' = 'default') {
        let expirySeconds;
        switch (expiry) {
            case 'extraShort':
                expirySeconds = 5 * 60; // 5 minutes
                break;
            case 'short':
                expirySeconds = 1 * 60 * 60; // 1 hour
                break;
            case 'default':
                expirySeconds = 5 * 24 * 60 * 60; // 5 days
                break;
            case 'expired':
                expirySeconds = -1;
                break;
            default:
                return expiry satisfies never;
        }
        return new SitlyToken().create({
            data: {
                brandCode: user.brandCode,
                userId: user.webuser_id,
                userName: user.email,
                userUrl: user.customUser.webuser_url,
            },
            expirySeconds,
            tokenType: SitlyTokenType.temporary,
        });
    }

    static accessToken(user: User) {
        return new SitlyToken().create({
            data: {
                userId: user.webuser_id,
                userName: user.email,
                userUrl: user.customUser.webuser_url,
            },
        });
    }

    static gemAccessToken(user: GemUser) {
        return new SitlyToken().create({
            data: {
                gemUserId: user.user_id,
                userName: user.email,
            },
            expirySeconds: 60 * 60 * 3,
            tokenType: SitlyTokenType.gemAccess,
        });
    }

    static resetPasswordToken(email: string) {
        return new SitlyToken().create({
            data: { email },
            expirySeconds: 60 * 60 * 6, // six  hours
        });
    }

    static recommendationToken(foster: User, firstName: string, author?: User) {
        return new SitlyToken().create({
            data: {
                fosterId: foster.webuser_id,
                fosterName: foster.first_name ?? '',
                fosterGender: genderMap[foster.customUser.gender ?? 'm'],
                fosterAvatar: foster.getAvatarUrl(),
                parentFirstName: firstName,
                ...(author ? { authorId: author.webuser_id } : {}),
            },
        });
    }

    private create({
        data,
        expirySeconds = 60 * 60 * 24 * 365 * 3,
        tokenType = SitlyTokenType.access,
        notBeforeDate,
    }: {
        data: SitlyTokenData;
        expirySeconds?: number;
        tokenType?: SitlyTokenType;
        notBeforeDate?: Date;
    }) {
        const tokenId = Buffer.from(randomBytes(32)).toString('base64'); // base64 created IV (32)
        const issuedAt = (Date.now() / 1000) | 0;
        const notBefore = notBeforeDate ? (notBeforeDate.getTime() / 1000) | 0 : issuedAt;
        const expire = notBefore + expirySeconds; // adding 3 years
        const serverName = 'api.sitly.com';

        data.type = tokenType;

        const tokenData: TokenObject<SitlyTokenData> = {
            iat: issuedAt, // Issued at: time when the token was generated
            jti: tokenId, // Json Token Id: a unique identifier for the token
            iss: serverName, // Issuer
            nbf: notBefore, // Not before
            exp: expire, // Expire
            data,
        };
        return sign(tokenData, Environment.jwtSecret, {
            algorithm: 'HS512',
        });
    }

    read<T = SitlyTokenData>(token: string) {
        try {
            return verify(token, Environment.jwtSecret) as TokenObject<T>;
        } catch {
            return undefined;
        }
    }

    verify<T = SitlyTokenData>(token: string) {
        return verify(token, Environment.jwtSecret) as TokenObject<T>;
    }

    static parseJwt<T>(token: string) {
        const base64Payload = token.split('.')[1];
        if (!base64Payload) {
            return undefined;
        }
        const payload = Buffer.from(base64Payload, 'base64');
        return JSON.parse(payload.toString()) as T;
    }
}
