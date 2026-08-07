import { z } from 'zod';
declare const ApproveConsentRequestDto_base: import("@n8n/api-types").ZodClass<{
    approved: boolean;
}, {
    approved: z.ZodBoolean;
}>;
export declare class ApproveConsentRequestDto extends ApproveConsentRequestDto_base {
}
export {};
