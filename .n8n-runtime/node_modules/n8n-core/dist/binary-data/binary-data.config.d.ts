import { ExecutionsConfig } from '@n8n/config';
import { z } from 'zod';
import { InstanceSettings } from '../instance-settings';
import { StorageConfig } from '../storage.config';
export declare const BINARY_DATA_MODES: readonly ["default", "filesystem", "s3", "database"];
declare const binaryDataModesSchema: z.ZodEnum<["default", "filesystem", "s3", "database"]>;
declare const availableModesSchema: z.ZodPipeline<z.ZodEffects<z.ZodString, string[], string>, z.ZodArray<z.ZodEnum<["default", "filesystem", "s3", "database"]>, "many">>;
export declare class BinaryDataConfig {
    availableModes: z.infer<typeof availableModesSchema>;
    mode: z.infer<typeof binaryDataModesSchema>;
    localStoragePath: string;
    signingSecret: string;
    dbMaxFileSize: number;
    constructor({ encryptionKey }: InstanceSettings, executionsConfig: ExecutionsConfig, storageConfig: StorageConfig);
}
export {};
