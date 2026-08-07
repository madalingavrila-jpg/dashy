import { OperationalError } from 'n8n-workflow';
export declare class TaskRequestTimeoutError extends OperationalError {
    description: string;
    constructor({ timeout, isSelfHosted }: {
        timeout: number;
        isSelfHosted: boolean;
    });
}
