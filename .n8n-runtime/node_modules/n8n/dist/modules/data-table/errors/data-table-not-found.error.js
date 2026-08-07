"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataTableNotFoundError = void 0;
const not_found_error_1 = require("../../../errors/response-errors/not-found.error");
class DataTableNotFoundError extends not_found_error_1.NotFoundError {
    constructor(dataTableId) {
        super(`Could not find the data table: '${dataTableId}'`);
    }
}
exports.DataTableNotFoundError = DataTableNotFoundError;
//# sourceMappingURL=data-table-not-found.error.js.map