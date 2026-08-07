import type { Request } from 'express';
export interface OriginValidationResult {
    isValid: boolean;
    originInfo?: {
        protocol: 'http' | 'https';
        host: string;
    };
    expectedHost?: string;
    expectedProtocol?: 'http' | 'https';
    rawExpectedHost?: string;
    error?: string;
}
export declare function validateOriginHeaders(headers: Request['headers']): OriginValidationResult;
