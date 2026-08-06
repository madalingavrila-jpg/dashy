import { ExecutionDataRepository } from '@n8n/db';
import type { ExecutionDataStore, ExecutionRef, ExecutionDataPayload, ExecutionDataBundle } from './types';
export declare class DbStore implements ExecutionDataStore {
    private readonly repository;
    constructor(repository: ExecutionDataRepository);
    write({ executionId }: ExecutionRef, payload: ExecutionDataPayload): Promise<void>;
    read({ executionId }: ExecutionRef): Promise<ExecutionDataBundle | null>;
    delete(ref: ExecutionRef | ExecutionRef[]): Promise<void>;
}
