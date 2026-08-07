import type { IPinData, IConnections, IDataObject, INode, IWorkflowSettings } from 'n8n-workflow';
import { z } from 'zod';
export declare const WORKFLOW_NAME_MAX_LENGTH = 128;
export declare const workflowNameSchema: z.ZodString;
export declare const workflowDescriptionSchema: z.ZodNullable<z.ZodString>;
export declare const workflowNodesSchema: z.ZodType<INode[], z.ZodTypeDef, INode[]>;
export declare const workflowConnectionsSchema: z.ZodType<IConnections, z.ZodTypeDef, IConnections>;
export declare const workflowSettingsSchema: z.ZodType<IWorkflowSettings, z.ZodTypeDef, IWorkflowSettings>;
export declare const workflowStaticDataSchema: z.ZodEffects<z.ZodType<IDataObject | null, z.ZodTypeDef, IDataObject | null>, IDataObject | null, unknown>;
export declare const workflowPinDataSchema: z.ZodType<IPinData | null, z.ZodTypeDef, IPinData | null>;
export declare const workflowMetaSchema: z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
export declare const baseWorkflowShape: {
    readonly name: z.ZodString;
    readonly description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    readonly nodes: z.ZodType<INode[], z.ZodTypeDef, INode[]>;
    readonly connections: z.ZodType<IConnections, z.ZodTypeDef, IConnections>;
    readonly settings: z.ZodOptional<z.ZodType<IWorkflowSettings, z.ZodTypeDef, IWorkflowSettings>>;
    readonly staticData: z.ZodOptional<z.ZodEffects<z.ZodType<IDataObject | null, z.ZodTypeDef, IDataObject | null>, IDataObject | null, unknown>>;
    readonly meta: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
    readonly pinData: z.ZodOptional<z.ZodType<IPinData | null, z.ZodTypeDef, IPinData | null>>;
    readonly hash: z.ZodOptional<z.ZodString>;
    readonly parentFolderId: z.ZodOptional<z.ZodString>;
    readonly parentFolder: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
    }, {
        id: string;
        name: string;
    }>>>;
    readonly tags: z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodArray<z.ZodString, "many">, z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
    }, {
        id: string;
        name: string;
    }>, "many">]>, string[], string[] | {
        id: string;
        name: string;
    }[]>>;
    readonly uiContext: z.ZodOptional<z.ZodString>;
    readonly aiBuilderAssisted: z.ZodOptional<z.ZodBoolean>;
    readonly expectedChecksum: z.ZodOptional<z.ZodString>;
    readonly autosaved: z.ZodOptional<z.ZodBoolean>;
};
