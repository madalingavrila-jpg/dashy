"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataTableColumnNotFoundError = void 0;
const not_found_error_1 = require("../../../errors/response-errors/not-found.error");
class DataTableColumnNotFoundError extends not_found_error_1.NotFoundError {
    constructor(dataTableId, columnId) {
        super(`Could not find the column '${columnId}' in the data table: ${dataTableId}`);
    }
}
exports.DataTableColumnNotFoundError = DataTableColumnNotFoundError;
//# sourceMappingURL=data-table-column-not-found.error.js.map