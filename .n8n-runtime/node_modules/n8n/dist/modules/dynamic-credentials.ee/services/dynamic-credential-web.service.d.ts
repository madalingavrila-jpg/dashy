import { AuthService } from '../../../auth/auth.service';
import { ICredentialContext } from 'n8n-workflow';
import { Request } from 'express';
export declare class DynamicCredentialWebService {
    private readonly authService;
    constructor(authService: AuthService);
    private buildCookieCredentialContext;
    getCredentialContextFromRequest(req: Request): ICredentialContext;
}
