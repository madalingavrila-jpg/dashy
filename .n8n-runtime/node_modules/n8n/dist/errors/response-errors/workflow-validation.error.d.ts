import { BadRequestError } from './bad-request.error';
export declare class WorkflowValidationError extends BadRequestError {
    readonly meta: {
        validationError: true;
    };
    constructor(message: string);
}
