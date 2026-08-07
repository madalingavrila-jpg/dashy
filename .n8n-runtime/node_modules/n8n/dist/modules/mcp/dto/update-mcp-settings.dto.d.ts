import { z } from 'zod';
declare const UpdateMcpSettingsDto_base: import("@n8n/api-types").ZodClass<{
    mcpAccessEnabled: boolean;
}, {
    mcpAccessEnabled: z.ZodBoolean;
}>;
export declare class UpdateMcpSettingsDto extends UpdateMcpSettingsDto_base {
}
export {};
