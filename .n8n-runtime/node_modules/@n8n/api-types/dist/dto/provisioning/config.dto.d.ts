import { z } from 'zod';
declare const ProvisioningConfigDto_base: import("../../zod-class").ZodClass<{
    scopesProvisionInstanceRole: boolean;
    scopesProvisionProjectRoles: boolean;
    scopesName: string;
    scopesInstanceRoleClaimName: string;
    scopesProjectsRolesClaimName: string;
}, {
    scopesProvisionInstanceRole: z.ZodBoolean;
    scopesProvisionProjectRoles: z.ZodBoolean;
    scopesName: z.ZodString;
    scopesInstanceRoleClaimName: z.ZodString;
    scopesProjectsRolesClaimName: z.ZodString;
}>;
export declare class ProvisioningConfigDto extends ProvisioningConfigDto_base {
}
declare const ProvisioningConfigPatchDto_base: import("../../zod-class").ZodClass<{
    scopesProvisionInstanceRole?: boolean | null | undefined;
    scopesProvisionProjectRoles?: boolean | null | undefined;
    scopesName?: string | null | undefined;
    scopesInstanceRoleClaimName?: string | null | undefined;
    scopesProjectsRolesClaimName?: string | null | undefined;
}, {
    scopesProvisionInstanceRole: z.ZodNullable<z.ZodOptional<z.ZodBoolean>>;
    scopesProvisionProjectRoles: z.ZodNullable<z.ZodOptional<z.ZodBoolean>>;
    scopesName: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    scopesInstanceRoleClaimName: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    scopesProjectsRolesClaimName: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}>;
export declare class ProvisioningConfigPatchDto extends ProvisioningConfigPatchDto_base {
}
export {};
