import { ApplicationError } from '@n8n/errors';
export declare class ChatTriggerAuthorizationError extends ApplicationError {
    readonly responseCode: number;
    constructor(responseCode: number, message?: string);
}
