import type { CreateExecutionPayload, ExecutionDataStorageLocation, ExecutionDeletionCriteria } from '@n8n/db';
import { ExecutionRepository } from '@n8n/db';
import { BinaryDataService, StorageConfig } from 'n8n-core';
import { FsStore } from './execution-data/fs-store';
import type { ExecutionRef } from './execution-data/types';
type DeletionTarget = ExecutionRef & {
    storedAt: ExecutionDataStorageLocation;
};
export declare class ExecutionPersistence {
    private readonly executionRepository;
    private readonly binaryDataService;
    private readonly fsStore;
    private readonly storageConfig;
    constructor(executionRepository: ExecutionRepository, binaryDataService: BinaryDataService, fsStore: FsStore, storageConfig: StorageConfig);
    create(payload: CreateExecutionPayload): Promise<string>;
    hardDelete(target: DeletionTarget | DeletionTarget[]): Promise<void>;
    hardDeleteBy(criteria: ExecutionDeletionCriteria): Promise<void>;
}
export {};
