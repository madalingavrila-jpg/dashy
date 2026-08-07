import { z } from 'zod';
export declare const AUTO_PUBLISH_MODE: z.Values<["none", "all", "published"]>;
declare const PullWorkFolderRequestDto_base: import("../../zod-class").ZodClass<{
    autoPublish: "all" | "none" | "published";
    force?: boolean | undefined;
}, {
    force: z.ZodOptional<z.ZodBoolean>;
    autoPublish: z.ZodDefault<z.ZodOptional<z.ZodEnum<["none", "all", "published"]>>>;
}>;
export declare class PullWorkFolderRequestDto extends PullWorkFolderRequestDto_base {
}
export {};
