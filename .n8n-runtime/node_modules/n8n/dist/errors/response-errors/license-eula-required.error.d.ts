import { ResponseError } from './abstract/response.error';
export declare class LicenseEulaRequiredError extends ResponseError {
    readonly meta: {
        eulaUrl: string;
    };
    constructor(message: string, meta: {
        eulaUrl: string;
    });
}
