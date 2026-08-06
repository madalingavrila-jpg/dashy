import { z } from 'zod';
export declare const filterSchema: z.ZodObject<{
    parentFolderId: z.ZodOptional<z.ZodString>;
    name: z.ZodOptional<z.ZodString>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    excludeFolderIdAndDescendants: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    name?: string | undefined;
    tags?: string[] | undefined;
    parentFolderId?: string | undefined;
    excludeFolderIdAndDescendants?: string | undefined;
}, {
    name?: string | undefined;
    tags?: string[] | undefined;
    parentFolderId?: string | undefined;
    excludeFolderIdAndDescendants?: string | undefined;
}>;
declare const ListFolderQueryDto_base: import("../../zod-class").ZodClass<{
    skip: number;
    take: number;
    filter?: {
        name?: string | undefined;
        tags?: string[] | undefined;
        parentFolderId?: string | undefined;
        excludeFolderIdAndDescendants?: string | undefined;
    } | undefined;
    select?: Record<"project" | "path" | "id" | "name" | "createdAt" | "updatedAt" | "tags" | "parentFolder" | "workflowCount" | "subFolderCount", true> | undefined;
    sortBy?: "name:asc" | "name:desc" | "createdAt:asc" | "createdAt:desc" | "updatedAt:asc" | "updatedAt:desc" | undefined;
}, {
    filter: z.ZodEffects<z.ZodOptional<z.ZodString>, {
        name?: string | undefined;
        tags?: string[] | undefined;
        parentFolderId?: string | undefined;
        excludeFolderIdAndDescendants?: string | undefined;
    } | undefined, string | undefined>;
    skip: z.ZodEffects<z.ZodEffects<z.ZodOptional<z.ZodString>, number, string | undefined>, number, string | undefined>;
    take: z.ZodEffects<z.ZodEffects<z.ZodOptional<z.ZodString>, number, string | undefined>, number, string | undefined>;
    select: z.ZodEffects<z.ZodOptional<z.ZodString>, Record<"project" | "path" | "id" | "name" | "createdAt" | "updatedAt" | "tags" | "parentFolder" | "workflowCount" | "subFolderCount", true> | undefined, string | undefined>;
    sortBy: z.ZodOptional<z.ZodEnum<["name:asc", "name:desc", "createdAt:asc", "createdAt:desc", "updatedAt:asc", "updatedAt:desc"]>>;
}>;
export declare class ListFolderQueryDto extends ListFolderQueryDto_base {
}
export {};
