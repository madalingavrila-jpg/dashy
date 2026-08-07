import type { ICredentialContext } from 'n8n-workflow';
import { ITokenIdentifier } from './identifier-interface';
import { AuthService } from '../../../../auth/auth.service';
export declare class N8NIdentifier implements ITokenIdentifier {
    private readonly authService;
    constructor(authService: AuthService);
    validateOptions(_: Record<string, unknown>): Promise<void>;
    resolve(context: ICredentialContext, _: Record<string, unknown>): Promise<string>;
}
