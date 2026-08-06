import { NotFoundError } from '../../../errors/response-errors/not-found.error';
export declare class DataTableColumnNotFoundError extends NotFoundError {
    constructor(dataTableId: string, columnId: string);
}
