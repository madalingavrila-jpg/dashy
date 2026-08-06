import { NotFoundError } from '../../../errors/response-errors/not-found.error';
export declare class DataTableNotFoundError extends NotFoundError {
    constructor(dataTableId: string);
}
