import { ErrorReporter, StorageConfig } from 'n8n-core';
import type { ExecutionDataStore, ExecutionRef, ExecutionDataPayload, ExecutionDataBundle } from './types';
export declare class FsStore implements ExecutionDataStore {
    private readonly storageConfig;
    private readonly errorReporter;
    constructor(storageConfig: StorageConfig, errorReporter: ErrorReporter);
    init(): Promise<void>;
    write(ref: ExecutionRef, payload: ExecutionDataPayload): Promise<void>;
    read(ref: ExecutionRef): Promise<ExecutionDataBundle | null>;
    delete(ref: ExecutionRef | ExecutionRef[]): Promise<void>;
    private resolveExecutionDir;
    private resolveBundlePath;
    private isFileNotFound;
}
