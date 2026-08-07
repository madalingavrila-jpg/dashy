export declare class McpOAuthHelpers {
    static buildSuccessRedirectUrl(redirectUri: string, code: string, state: string | null): string;
    static buildErrorRedirectUrl(redirectUri: string, error: string, errorDescription: string, state: string | null): string;
}
