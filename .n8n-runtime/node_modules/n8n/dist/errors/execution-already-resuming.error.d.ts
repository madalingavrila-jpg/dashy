import { OperationalError } from 'n8n-workflow';
export declare class ExecutionAlreadyResumingError extends OperationalError {
    constructor(executionId: string);
}
