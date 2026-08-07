import { Response } from 'express';
import { JwtService } from '../../services/jwt.service';
export interface OAuthSessionPayload {
    clientId: string;
    redirectUri: string;
    codeChallenge: string;
    state: string | null;
}
export declare class OAuthSessionService {
    private readonly jwtService;
    constructor(jwtService: JwtService);
    createSession(res: Response, payload: OAuthSessionPayload): void;
    verifySession(sessionToken: string): OAuthSessionPayload;
    clearSession(res: Response): void;
    getSessionToken(cookies: Record<string, string | undefined>): string | undefined;
}
